import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
import axios from "axios";
import { Fingerprint } from "lucide-react";
import { useApp } from "../context/AppContext";

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

export default function AccessibleSendMoney({ defaultFromAccountId = "PRIMARY_ACCOUNT_ID" }) {
  const webcamRef = useRef(null);
  const liveRef = useRef(null);
  const pressStartTime = useRef(null);
  const mounted = useRef(true);

  // stages: idle | camera | amount | confirm | sending | done
  const [stage, setStage] = useState("idle");
  const [ocrText, setOcrText] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Ready");
  const [loadingResolve, setLoadingResolve] = useState(false);
  const [loadingRecipient, setLoadingRecipient] = useState(false);

  // Internal transfer fields
  const [mode, setMode] = useState("external"); // "external" (bank) | "internal" (email)
  const [phone, setPhone] = useState("");
  const [recipientNameInternal, setRecipientNameInternal] = useState("");

  const { user } = useApp();
  const email = user?.email;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = status;
  }, [status]);

  // Start camera
  const startCamera = () => {
    setStatus("Camera opened. Point at account details and tap 'Snap'.");
    speak("Camera opened. Point at account details and tap snap.");
    setStage("camera");
  };

  // OCR snap
  const snapAndOcr = async () => {
    setStatus("Capturing image...");
    speak("Capturing image");
    const image = webcamRef.current?.getScreenshot();
    if (!image) {
      setStatus("Unable to capture image.");
      speak("Unable to capture image. Try again.");
      return;
    }

    setStatus("Scanning image...");
    speak("Scanning image. Please hold still.");
    try {
      const { data } = await Tesseract.recognize(image, "eng");
      const text = data?.text || "";
      if (!mounted.current) return;
      setOcrText(text);

      const accMatch = text.match(/\b\d{9,12}\b/);
      const bankMatch = text.match(/\b(Access|GTB|GTBank|UBA|Zenith|First\s+Bank|Union|Fidelity|Ecobank|Polaris|Sterling|FCMB|Wema|Stanbic|GTBank)\b/i);

      if (!accMatch || !bankMatch) {
        setStage("camera");
        setStatus("Account or bank not detected. Try again or enter manually.");
        speak("Account or bank not detected. Please try again or enter manually.");
        return;
      }

      const acc = accMatch[0].trim();
      const bankRaw = bankMatch[0].trim();
      if (!mounted.current) return;
      setAccountNumber(acc);
      setBankName(bankRaw);

      const mapped = mapBankNameToCode(bankRaw);
      setBankCode(mapped || "");
      if (!mapped) {
        setStatus(`Detected bank "${bankRaw}" — please select bank code manually.`);
        speak(`Detected bank ${bankRaw} — please select bank from the list.`);
        setStage("amount");
        return;
      }

      // Resolve + create recipient (external flow)
      await resolveAccountAndCreateRecipient(acc, mapped);
    } catch (err) {
      console.error(err);
      if (!mounted.current) return;
      setStatus("OCR failed. Try again.");
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
    setLoadingResolve(true);
    setStatus("Resolving account...");
    try {
      const token = localStorage.getItem("token");
      const resolveRes = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/resolve-account`,
        {
          params: { account_number: accNum, bank_code: bCode },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      if (!mounted.current) return;
      const account_name = resolveRes.data.data?.account_name || "";
      setResolvedName(account_name);
      setStatus(`Account resolved: ${account_name}`);
      speak(`Account resolved: ${account_name}`);

      // Create recipient
      setLoadingRecipient(true);
      const createRes = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/recipient`,
        { name: account_name, account_number: accNum, bank_code: bCode },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      if (!mounted.current) return;
      const r = createRes.data.recipient || createRes.data.data || createRes.data;
      const code = r.recipient_code || r.recipientCode || r.recipient || r.code || r.recipient_code;
      setRecipientCode(code);
      setStatus("Recipient created. Ready to set amount.");
      setStage("amount");
      speak("Recipient created. How much would you like to send?");
    } catch (err) {
      console.error("Resolve/create recipient error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setStatus("Could not resolve or create recipient. Please verify details.");
      speak("Could not resolve or create recipient. Please verify details or try again.");
      setStage("amount");
    } finally {
      if (mounted.current) {
        setLoadingResolve(false);
        setLoadingRecipient(false);
      }
    }
  }

  // Internal recipient lookup by email (optional helper)
  const lookupInternalRecipient = async () => {
    if (!phone) {
      setStatus("Please enter recipient phone number to lookup.");
      return;
    }
    setStatus("Looking up recipient...");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/lookup`, {
        params: { phone: phone },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      });
      if (!mounted.current) return;
      const userData = res.data.user || res.data.data || res.data;
      setRecipientNameInternal(userData?.name || userData?.fullName || "");
      setStatus("Recipient found.");
      speak("Recipient found");
    } catch (err) {
      console.warn("Lookup failed:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setRecipientNameInternal("");
      setStatus("Recipient not found. You can still proceed — backend will validate.");
      speak("Recipient not found. You can still proceed.");
    }
  };

  // Listen for spoken amount (shared)
  const listenForAmount = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Voice input not supported.");
      speak("Voice input not supported. Please type the amount.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("Listening for amount...");
      speak("Listening for amount. Please say the amount now.");
    };

    recognition.onresult = (ev) => {
      if (!mounted.current) return;
      const transcript = ev.results[0][0].transcript;
      const parsed = parseAmountFromSpeech(transcript);
      if (parsed && !isNaN(parsed)) {
        setAmount(String(parsed));
        setStatus(`Amount set to ₦${parsed}`);
        speak(`Amount set to ${parsed} naira`);
        setStage("confirm");
        speak(`You are sending naira ${parsed} to ${mode === "internal" ? toEmail || recipientNameInternal || "recipient" : resolvedName || accountNumber}. Press and hold to confirm.`);
      } else {
        setStatus("Could not understand amount. Please try again.");
        speak("Could not understand the amount. Please try again.");
      }
    };

    recognition.onerror = () => {
      if (!mounted.current) return;
      setStatus("Voice recognition error");
      speak("Voice recognition error. Please try again.");
    };

    recognition.start();
  };

  // Transfer action (branch internal vs external)
  const doInternalTransfer = async () => {
    try {
      const token = localStorage.getItem("token");
      setStatus("Initiating internal transfer...");
      setStage("sending");
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/internal-transfer`,
        { phone, amount: Number(amount) },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!mounted.current) return;
      setStatus(res.data?.message || "Internal transfer successful");
      speak("Transfer successful");
      setStage("done");
    } catch (err) {
      console.error("Internal transfer error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      const message = err?.response?.data?.msg || err?.response?.data?.message || err?.message || "Transfer failed";
      setStatus("❌ " + message);
      speak("Transfer failed");
      setStage("confirm");
    }
  };

  const doExternalTransfer = async () => {
    try {
      const token = localStorage.getItem("token");
      setStatus("Initiating external transfer...");
      setStage("sending");
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/transfer`,
        { recipient_code: recipientCode, amount: Number(amount) },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!mounted.current) return;
      setStatus("✅ Transfer initiated");
      speak("Transfer initiated. We will notify you when it completes.");
      setStage("done");
    } catch (err) {
      console.error("Transfer error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setStatus("❌ Transfer failed");
      speak("Transfer failed. Please try again.");
      setStage("confirm");
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

    if (pressDuration < 1000) {
      setStatus("Tap detected - try long press to confirm");
      speak("Tap detected - try long press to confirm");
      return;
    }

    // Long press → WebAuthn authentication then do transfer (internal or external)
    await authenticateAndTransfer();
  };

  const authenticateAndTransfer = async () => {
    try {
      setStatus("Authenticating...");
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
        setStatus("❌ Authentication failed");
        speak("Authentication failed");
        return;
      }

      if (verifyRes.data.token) localStorage.setItem("token", verifyRes.data.token);
      if (!mounted.current) return;
      setStatus("✅ Authenticated. Proceeding with transfer...");
      speak("Authenticated. Proceeding with transfer.");

      // Branch
      if (mode === "internal") {
        await doInternalTransfer();
      } else {
        await doExternalTransfer();
      }
    } catch (err) {
      console.error("Auth/transfer error:", err?.response?.data || err.message);
      if (!mounted.current) return;
      setStatus("❌ Authentication error: " + (err.message || "unknown"));
      speak("Authentication error. Please try again.");
    }
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 dark:text-gray-100 flex flex-col gap-4 p-4">
      <div aria-live="polite" ref={liveRef} className="sr-only" />

      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium">
        <span className="font-bold">Status:</span> {status}
      </div>

      <details className="text-xs text-gray-500 dark:text-gray-400">
        <summary className="cursor-pointer">OCR Debug</summary>
        <pre className="whitespace-pre-wrap">{ocrText || "—"}</pre>
      </details>

      {/* Mode switch */}
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded ${mode === "external" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("external")}
        >
          External (Bank via Camera)
        </button>
        <button
          className={`flex-1 py-2 rounded ${mode === "internal" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("internal")}
        >
          Internal (Email)
        </button>
      </div>

      {mode === "external" && stage !== "camera" && (
        <div className="space-y-2 text-sm">
          <p className="text-sm text-gray-600">Use camera to capture account details (bank + account number)</p>
          <button onClick={startCamera} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg">Open Camera</button>
        </div>
      )}

      {mode === "camera" && stage === "camera" && (
        <div className="space-y-4">
          <Webcam audio={false} ref={webcamRef} screenshotFormat="image/png" videoConstraints={{ facingMode: "environment" }} className="rounded-lg w-full h-60 object-cover" />
          <div className="flex gap-3">
            <button onClick={snapAndOcr} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg">Snap</button>
            <button onClick={() => { setStage("idle"); setStatus("Cancelled"); speak("Cancelled"); }} className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {mode === "internal" && (
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <label className="text-sm font-medium">Recipient Email</label>
          <div className="flex gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 p-2 border rounded" placeholder="+2347031288633" />
            <button onClick={lookupInternalRecipient} className="px-3 py-2 rounded bg-gray-200">Find</button>
          </div>
          {recipientNameInternal && <p className="text-sm">Found: <strong>{recipientNameInternal}</strong></p>}
        </div>
      )}

      {mode === "external" && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Make External Transfer</h2>
          <p>Bank: <span className="font-medium">{bankName || "Not found"}</span></p>
          <p>Bank code: <span className="font-medium">{bankCode || "Not mapped"}</span></p>
          <p>Account: <span className="font-medium">{accountNumber || "Not found"}</span></p>
          <p>Name: <span className="font-medium">{resolvedName || "Checking..."}</span></p>
        </div>
      )}

      {/* Shared amount input + voice */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Or speak amount</p>
        <div className="flex gap-2">
          <button onClick={listenForAmount} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg">Speak Amount</button>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (NGN)" className="w-40 p-2 border rounded" />
        </div>
        <div className="text-sm text-gray-500">Amount: ₦{amount || "—"}</div>
      </div>

      {stage === "confirm" && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="font-semibold mb-2">Confirm Transfer</h2>

          {mode === "internal" ? (
            <>
              <p>Recipient: <span className="font-medium">{phone}</span></p>
              <p>Name: <span className="font-medium">{recipientNameInternal || "—"}</span></p>
            </>
          ) : (
            <>
              <p>Bank: <span className="font-medium">{bankName}</span></p>
              <p>Account: <span className="font-medium">{accountNumber}</span></p>
              <p>Name: <span className="font-medium">{resolvedName}</span></p>
            </>
          )}

          <p>Amount: <span className="font-medium">₦{amount}</span></p>
          <p className="mt-3 text-sm text-gray-600">Hold the fingerprint button to authenticate and send.</p>
        </div>
      )}

      {stage === "sending" && <div className="text-center">Processing transfer...</div>}
      {stage === "done" && (
        <div className="text-center">
          <p className="font-semibold text-green-600">{status}</p>
          <button onClick={() => {
            setStage("idle"); setStatus("Ready"); setAccountNumber(""); setBankName(""); setAmount(""); setResolvedName(""); setRecipientCode(""); setToEmail(""); setRecipientNameInternal("");
          }} className="w-full bg-blue-600 text-white py-3 rounded-lg mt-3">Done</button>
        </div>
      )}

      {/* Fingerprint Button */}
      <div className="fixed w-full bottom-4 left-0 flex flex-col items-center gap-1">
        <div role="button" tabIndex={0} aria-label="Hold to confirm transfer" onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} className="w-40 h-40 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xl select-none">
          <Fingerprint size={80} strokeWidth={1.5} />
        </div>
        <div className="mt-2 text-base font-medium text-center">{status}</div>
      </div>
    </div>
  );
}
