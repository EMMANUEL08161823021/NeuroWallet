import React, { useReducer, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
import axios from "axios";
import { Fingerprint } from "lucide-react";
import { useApp } from "../context/AppContext";
import FingerprintConsole from "./FingerprintConsole";

// Convert ArrayBuffer → base64url
function bufToB64Url(buf) {
  if (!buf) return "";
  let binary = "";
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
// Convert base64url → ArrayBuffer
function b64UrlToBuf(b64url) {
  if (!b64url) return null;
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

// crude number-from-speech parser
function parseAmountFromSpeech(transcript) {
  const digits = transcript.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (digits) return parseFloat(digits[1].replace(/,/g, ""));
  return null;
}

// Small mapping of common bank name matches -> bank code (NIGERIAN)
const BANK_NAME_TO_CODE = {
  gtbank: "058",
  gtb: "058",
  access: "044",
  accessbank: "044",
  uba: "033",
  zenith: "057",
  firstbank: "011",
  "first bank": "011",
  union: "032",
  fidelity: "070",
  ecobank: "050",
  polaris: "076",
  sterling: "232",
  fcmb: "214",
  wema: "035",
  stanbic: "221",
  "gtbank plc": "058"
};

const initialState = {
  stage: "idle", // idle | camera | amount | confirm | sending | done
  ocrText: "",
  accountNumber: "",
  bankName: "",
  bankCode: "",
  resolvedName: "",
  recipientCode: "",
  amount: "",
  fundAmount: "",
  funding: false,
  status: "Ready",
  loading: { resolve: false, recipient: false },
  position: 0,
  mode: "external", // external | internal | fund
  phone: "",
  recipientNameInternal: "",
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_LOADING":
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };
    case "SET_STAGE":
      return { ...state, stage: action.stage };
    case "MERGE":
      return { ...state, ...action.payload };
    case "RESET":
      return { ...initialState, status: action.status || initialState.status };
    default:
      return state;
  }
}

export default function AccessibleSendMoney({ defaultFromAccountId = "PRIMARY_ACCOUNT_ID" }) {
  const webcamRef = useRef(null);
  const liveRef = useRef(null);
  const pressStartTime = useRef(null);
  const mounted = useRef(true);
  const touchStartX = useRef(null);

  const [state, dispatch] = useReducer(reducer, initialState);

  const { user } = useApp();
  const email = user?.email;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = state.status;
  }, [state.status]);

  // small helpers so we don't sprinkle dispatch calls everywhere
  const setField = (field, value) => dispatch({ type: "SET_FIELD", field, value });
  const setLoading = (key, value) => dispatch({ type: "SET_LOADING", key, value });
  const setStage = (stage) => dispatch({ type: "SET_STAGE", stage });
  const merge = (payload) => dispatch({ type: "MERGE", payload });
  const resetAll = (status = "Ready") => dispatch({ type: "RESET", status });

  // Start camera
  const startCamera = () => {
    setField("status", "Camera opened. Point at account details and tap 'Snap'.");
    speak("Camera opened. Point at account details and tap snap.");
    setStage("camera");
  };

  // OCR snap
  const snapAndOcr = async () => {
    setField("status", "Capturing image...");
    speak("Capturing image");
    const image = webcamRef.current?.getScreenshot();
    if (!image) {
      setField("status", "Unable to capture image.");
      speak("Unable to capture image. Try again.");
      return;
    }

    setField("status", "Scanning image...");
    speak("Scanning image. Please hold still.");
    try {
      const { data } = await Tesseract.recognize(image, "eng");
      const text = data?.text || "";
      if (!mounted.current) return;
      setField("ocrText", text);

      const accMatch = text.match(/\b\d{9,12}\b/);
      const bankMatch = text.match(/\b(Access|GTB|GTBank|UBA|Zenith|First\s+Bank|Union|Fidelity|Ecobank|Polaris|Sterling|FCMB|Wema|Stanbic|GTBank)\b/i);

      if (!accMatch || !bankMatch) {
        setStage("camera");
        setField("status", "Account or bank not detected. Try again or enter manually.");
        speak("Account or bank not detected. Please try again or enter manually.");
        return;
      }

      const acc = accMatch[0].trim();
      const bankRaw = bankMatch[0].trim();
      if (!mounted.current) return;
      setField("accountNumber", acc);
      setField("bankName", bankRaw);

      const mapped = mapBankNameToCode(bankRaw);
      setField("bankCode", mapped || "");
      if (!mapped) {
        setField("status", `Detected bank "${bankRaw}" — please select bank code manually.`);
        speak(`Detected bank ${bankRaw} — please select bank from the list.`);
        setStage("amount");
        return;
      }

      // Resolve + create recipient (external flow)
      await resolveAccountAndCreateRecipient(acc, mapped);
    } catch (err) {
      console.error(err);
      if (!mounted.current) return;
      setField("status", "OCR failed. Try again.");
      speak("Scanning failed. Please try again.");
    }
  };

  function mapBankNameToCode(rawName) {
    if (!rawName) return null;
    const key = rawName.toString().toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
    return BANK_NAME_TO_CODE[key] || null;
  }

  // Resolve account (server->Paystack) and optionally create recipient
  async function resolveAccountAndCreateRecipient(accNum, bCode) {
    setLoading("resolve", true);
    setField("status", "Resolving account...");
    try {
      const token = localStorage.getItem("token");
      const resolveRes = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/resolve-account`,
        {
          params: { account_number: accNum, bank_code: bCode },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      if (!mounted.current) return;
      const account_name = resolveRes.data.data?.account_name || "";
      setField("resolvedName", account_name);
      setField("status", `Account resolved: ${account_name}`);
      speak(`Account resolved: ${account_name}`);

      // Create recipient
      setLoading("recipient", true);
      const createRes = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/recipient`,
        { name: account_name, account_number: accNum, bank_code: bCode },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      if (!mounted.current) return;
      const r = createRes.data.recipient || createRes.data.data || createRes.data;
      const code = r.recipient_code || r.recipientCode || r.recipient || r.code || r.recipient_code;
      setField("recipientCode", code);
      setField("status", "Recipient created. Ready to set amount.");
      setStage("amount");
      speak("Recipient created. How much would you like to send?");
    } catch (err) {
      console.error("Resolve/create recipient error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setField("status", "Could not resolve or create recipient. Please verify details.");
      speak("Could not resolve or create recipient. Please verify details or try again.");
      setStage("amount");
    } finally {
      if (mounted.current) {
        setLoading("resolve", false);
        setLoading("recipient", false);
      }
    }
  }

  // Internal recipient lookup by phone (optional helper)
  const lookupInternalRecipient = async () => {
    if (!state.phone) {
      setField("status", "Please enter recipient phone number to lookup.");
      return;
    }
    setField("status", "Looking up recipient...");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/lookup`, {
        params: { phone: state.phone },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      if (!mounted.current) return;
      const userData = res.data.user || res.data.data || res.data;
      setField("recipientNameInternal", userData?.name || userData?.fullName || "");
      setField("status", "Recipient found.");
      speak("Recipient found, Tap the button to say amount");
    } catch (err) {
      console.warn("Lookup failed:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setField("recipientNameInternal", "");
      setField("status", "Recipient not found. You can still proceed — backend will validate.");
      speak("Recipient not found. You can still proceed.");
    }
  };

  // Listen for spoken amount (shared)
  const listenForAmount = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setField("status", "Voice input not supported.");
      speak("Voice input not supported. Please type the amount.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setField("status", "Listening for amount...");
      speak("Listening for amount. Please say the amount now.");
    };

    recognition.onresult = (ev) => {
      if (!mounted.current) return;
      const transcript = ev.results[0][0].transcript;
      const parsed = parseAmountFromSpeech(transcript);
      if (parsed && !isNaN(parsed)) {
        setField("amount", String(parsed));
        setField("status", `Amount set to ₦${parsed}`);
        speak(`Amount set to ${parsed} naira`);
        setStage("confirm");
        speak(`You are sending naira ${parsed} to ${state.mode === "internal" ? state.phone || state.recipientNameInternal || "recipient" : state.resolvedName || state.accountNumber}. Press and hold to confirm.`);
      } else {
        setField("status", "Could not understand amount. Please try again.");
        speak("Could not understand the amount. Please try again.");
      }
    };

    recognition.onerror = () => {
      if (!mounted.current) return;
      setField("status", "Voice recognition error");
      speak("Voice recognition error. Please try again.");
    };

    recognition.start();
  };

  // Transfer action (branch internal vs external)
  const doInternalTransfer = async () => {
    try {
      const token = localStorage.getItem("token");
      setField("status", "Initiating internal transfer...");
      setStage("sending");
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/internal-transfer`,
        { phone: state.phone, amount: Number(state.amount) },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!mounted.current) return;
      setField("status", res.data?.message || "Internal transfer successful");
      speak("Transfer successful");
      setStage("done");
    } catch (err) {
      console.error("Internal transfer error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      const message = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "Transfer failed";
      setField("status", "❌ " + message);
      speak("Transfer failed");
      setStage("confirm");
    }
  };

  const doExternalTransfer = async () => {
    try {
      const token = localStorage.getItem("token");
      setField("status", "Initiating external transfer...");
      setStage("sending");
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/transfer`,
        { recipient_code: state.recipientCode, amount: Number(state.amount) },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!mounted.current) return;
      setField("status", "✅ Transfer initiated");
      speak("Transfer initiated. We will notify you when it completes.");
      setStage("done");
    } catch (err) {
      console.error("Transfer error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setField("status", "❌ Transfer failed");
      speak("Transfer failed. Please try again.");
      setStage("confirm");
    }
  };
  // Open fund modal / quick top-up
  const onFund = () => {
    setField("status", "Opening fund dialog...");
    setField("fundAmount", "");
    setStage("fund");
    speak("Open fund wallet. How much would you like to add?");
  };

  // Perform funding (example endpoint). Adjust endpoint/backend as needed.
  const fundWallet = async () => {
    if (!state.amount || Number(state.amount) <= 0) {
      setField("status", "Please enter a valid amount to fund.");
      speak("Please enter a valid amount to fund.");
      return;
    }

    const amount = Number(state.amount);

  
    setField("funding", true);
    setField("status", "Funding wallet...");
    try {
      const token = localStorage.getItem("token");

      
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/wallet/fund`, 
        { amount }, 
        { headers: { Authorization: `Bearer ${token}` } } 
      ); 
      const { authorization_url, reference } = res.data.data;
      // get Paystack URL & reference // Step 2: Open Paystack payment in new tab/window 
      window.open(authorization_url, "_blank");
      // Step 3: Poll backend to verify payment (or call after redirect) 
      const interval = setInterval(async () => { 
        try { 
          const verifyRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/wallet/verify/${reference}`, 
          { headers: { Authorization: `Bearer ${token}` } }); 
          if (verifyRes.data.balance !== undefined) { 
            clearInterval(interval); 
            setStatus("✅ Transfer Successful"); 
            speak("Transfer successful"); 
          }
        } catch (err){
          console.log("error:", err);
          
        }
      })   

      
      if (!mounted.current) return;
      // setField("status", res.data?.message || "Wallet funded successfully");
      // speak("Wallet funded successfully");
      // setStage("done");
    } catch (err) {
      console.error("Fund error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setField("status", "❌ Funding failed. Please try again.");
      speak("Funding failed. Please try again.");
      setStage("idle");
    } finally {
      if (mounted.current) setField("funding", false);
    }
  };


  // Long press logic
  const handlePressStart = () => {
    pressStartTime.current = Date.now();
  };

  const handlePressEnd = async () => {
    if (!pressStartTime.current) return;
    const pressDuration = Date.now() - pressStartTime.current;
    pressStartTime.current = null;

    if (pressDuration > 2000)

    // Long press → WebAuthn authentication then do transfer (internal or external)
    await authenticateAndTransfer();
  };

  const authenticateAndTransfer = async () => {

    try {
      setField("status", "Authenticating...");
      const token = localStorage.getItem("token");
      const optRes = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/webauthn/generate-authentication-options`,
        { email },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      const options = optRes.data;
      options.challenge = b64UrlToBuf(options.challenge);
      options.allowCredentials = (options.allowCredentials || []).map((cred) => ({
        ...cred,
        id: b64UrlToBuf(cred.id),
      }));

      const assertion = await navigator.credentials.get({ publicKey: options });

      const authResponse = {
        id: assertion.id,
        rawId: bufToB64Url(assertion.rawId),
        response: {
          authenticatorData: bufToB64Url(assertion.response.authenticatorData),
          clientDataJSON: bufToB64Url(assertion.response.clientDataJSON),
          signature: bufToB64Url(assertion.response.signature),
          userHandle: bufToB64Url(assertion.response.userHandle),
        },
        type: assertion.type,
      };

      const verifyRes = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/webauthn/verify-authentication`,
        { email, assertionResponse: authResponse },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      if (!verifyRes.data.verified || !verifyRes.data.token) {
        if (!mounted.current) return;
        setField("status", "❌ Authentication failed");
        speak("Authentication failed");
        return;
      }

      if (verifyRes.data.token) localStorage.setItem("token", verifyRes.data.token);
      if (!mounted.current) return;
      setField("status", "✅ Authenticated. Proceeding with transfer...");
      speak("Authenticated. Proceeding with transfer.");

      if (state.mode === "internal") {
        await doInternalTransfer();
      } else if (state.mode === "external") {
        await doExternalTransfer();
      } else if (state.mode === "fund") {
        await fundWallet();
      } else {
        throw new Error(`Unsupported mode: ${state.mode}`);
      }

    } catch (err) {
      console.error("Auth/transfer error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setField("status", "❌ Authentication error: " + (err.message || "unknown"));
      speak("Authentication error. Please try again.");
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current !== null) {
      const deltaX = e.touches[0].clientX - touchStartX.current;
      setField("position", deltaX);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;

    if (deltaX > 80) {
      // Swipe right → internal
      setField("mode", "internal");
      speak("External transfer selected");
      setField("position", 120);
    } else if (deltaX < -80) {
      // Swipe left → external
      setField("mode", "external");
      speak("Internal transfer selected");
      setField("position", -120);
    }

    // Reset back to center after 0.8s
    setTimeout(() => setField("position", 0), 800);
    touchStartX.current = null;
  };

  // local setter to pass down to the FingerprintConsole
  const setModeLocal = (m) => setField("mode", m);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 dark:text-gray-100 flex flex-col gap-4" aria-labelledby="sendMoneyTitle">
      {/* <h1 id="sendMoneyTitle" className="sr-only">Send Money</h1> */}

      <div aria-live="polite" ref={liveRef} className="sr-only" />

      {/* Status */}
      <div className="w-full p-3 rounded-lg bg-black text-white text-lg font-semibold" role="status" aria-atomic="true">
        Status: <span className="ml-2">{state.status}</span>
      </div>

      {/* Content area */}
      {/* Content area */}
      <div className="flex-1 flex flex-col gap-4" aria-live="polite">

        {/* top controls: phone input or camera info */}
        {state.mode === "internal" && (
          <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg" aria-labelledby="recipient-phone-label">
            <label id="recipient-phone-label" htmlFor="toPhone" className="block text-lg font-semibold mb-2">
              Recipient phone
            </label>

            <div className="flex gap-2">
              <input
                id="toPhone"
                inputMode="tel"
                value={state.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+2348012345678"
                className="flex-1 p-3 text-lg rounded border focus:ring-4 focus:ring-blue-300"
                aria-describedby="phoneHelp"
                aria-label="Recipient phone number"
              />
              <button
                onClick={lookupInternalRecipient}
                className="px-4 py-3 rounded-lg bg-gray-800 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Find recipient by phone"
                disabled={!state.phone || state.lookuping}
              >
                {state.lookuping ? "Finding…" : "Find"}
              </button>
            </div>

            <p id="phoneHelp" className="mt-2 text-base">
              {state.recipientNameInternal
                ? <>Found: <strong>{state.recipientNameInternal}</strong></>
                : "Tip: Use digits only or press the Speak button to enter recipient by voice."}
            </p>
          </section>
        )}

        {state.mode === "external" && (
          <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg" aria-labelledby="external-transfer-label">
            <h2 id="external-transfer-label" className="text-lg font-semibold mb-2">External transfer (camera)</h2>

            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="flex-1 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                aria-label="Open back camera to scan account number"
              >
                Open Camera (Back)
              </button>
            </div>

            {state.stage === "camera" && (
              <div className="mt-3">
                <div className="rounded overflow-hidden border" aria-hidden>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/png"
                    videoConstraints={{ facingMode: "environment" }}
                    className="w-full h-56 object-cover"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={snapAndOcr}
                    className="flex-1 py-3 rounded-lg bg-indigo-700 text-white font-semibold"
                    aria-label="Snap picture to scan account details"
                  >
                    {state.scanning ? "Scanning…" : "Snap"}
                  </button>

                  <button
                    onClick={() => { setStage("idle"); setField("status", "Cancelled"); speak("Cancelled"); }}
                    className="flex-1 py-3 rounded-lg bg-gray-300 text-black"
                    aria-label="Cancel camera"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {state.stage !== "camera" && (
              <div className="mt-3 text-base">
                <p>Bank: <strong>{state.bankName || "Not found"}</strong></p>
                <p>Account: <strong>{state.accountNumber || "Not found"}</strong></p>
                <p>Name: <strong>{state.resolvedName || "Not found"}</strong></p>
              </div>
            )}
          </section>
        )}

        {state.mode === "fund" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl" role="region" aria-labelledby="fund-wallet-label">
            <h3 id="fund-wallet-label" className="text-lg font-bold mb-2">Fund Wallet</h3>
            <p className="text-sm">Enter amount to add to your wallet.</p>
          </div>
        )}

        {/* amount area (shared) */}
        <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg" aria-labelledby="amount-label">
          <label id="amount-label" className="block text-lg font-semibold mb-2">Amount</label>

          <div className="flex gap-2 items-center">
            <button
              onClick={listenForAmount}
              className="flex-1 py-3 rounded-lg bg-green-600 text-white font-semibold"
              aria-label="Speak amount in naira"
            >
              🎤 Speak
            </button>

            <input
              type="tel"
              inputMode="numeric"
              value={state.amount}
              onChange={(e) => setField("amount", e.target.value)}
              placeholder="Amount (NGN)"
              className="w-44 p-3 text-lg rounded border focus:ring-4"
              aria-label="Amount in naira"
            />
          </div>

          {/* quick presets to speed input for motor-impaired users */}
          <div className="mt-3 flex gap-2">
            {[1000, 2000, 5000, 10000].map((val) => (
              <button
                key={val}
                onClick={() => setField("amount", String(val))}
                className="px-3 py-1 rounded-md  bg-gray-200 dark:bg-gray-400 hover:bg-gray-300 text-sm"
                aria-label={`Quick amount ${val} naira`}
              >
                ₦{val}
              </button>
            ))}
          </div>

          <div className="mt-2 text-lg">Amount: <strong>₦{state.amount || "—"}</strong></div>
        </section>

        {/* confirm summary */}
        {state.stage === "confirm" && (
          <section role="region" aria-label="Confirm transfer" className="bg-white dark:bg-gray-800 border-2 border-yellow-400 p-4 rounded-lg">
            <h3 className="text-xl font-bold mb-2">Confirm</h3>

            {state.mode === "internal" ? (
              <>
                <p className="text-lg">Recipient phone: <strong>{state.phone}</strong></p>
                <p className="text-lg">Name: <strong>{state.recipientNameInternal || "—"}</strong></p>
              </>
            ) : (
              <>
                <p className="text-lg">Bank: <strong>{state.bankName}</strong></p>
                <p className="text-lg">Account: <strong>{state.accountNumber}</strong></p>
                <p className="text-lg">Name: <strong>{state.resolvedName}</strong></p>
              </>
            )}
            

            <p className="text-lg mt-2">Amount: <strong>₦{state.amount}</strong></p>
            <p className="mt-3 text-base">Hold the button below to authenticate and send. Tap to cancel.</p>

            <div className="mt-3 flex gap-2">
              {/* Cancel button */}
              <button
                onClick={() => { setStage("idle"); setField("status", "Cancelled"); speak("Transaction cancelled"); }}
                className="flex-1 py-3 rounded-lg bg-gray-300 dark:bg-gray-400 text-white"
                aria-label="Cancel transaction"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* processing / done */}
        {state.stage === "sending" && <div className="p-4 rounded-lg bg-gray-100 text-center text-lg">Processing transfer…</div>}

        {state.stage === "done" && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-gray-800 text-center">
            <p className="text-2xl font-bold text-green-700">{state.status}</p>
            <button onClick={() => resetAll("Ready")} className="mt-3 w-full py-3 rounded-lg bg-blue-600 text-white font-semibold">Done</button>
          </div>
        )}

      </div>


      {/* Bottom control row: Internal left | Fingerprint center | External right */}
      <FingerprintConsole
        setMode={setModeLocal}
        speak={speak}
        handlePressStart={handlePressStart}
        handlePressEnd={handlePressEnd}
        onFund={onFund}
      />

    </main>
  );
}
