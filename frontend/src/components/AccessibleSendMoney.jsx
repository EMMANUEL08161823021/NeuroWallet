import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
// import FingerprintConsole from "./FingerprintConsole/FingerprintConsole";
import axios from "axios";
import { Fingerprint } from "lucide-react";

// Text-to-speech helper
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

// --- Utility functions ---
function bufToB64Url(buf) {
  if (!buf) return "";
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64UrlToBuf(b64url) {
  if (!b64url) return null;
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

// crude number-from-speech parser
function parseAmountFromSpeech(transcript) {
  const digits = transcript.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (digits) return parseFloat(digits[1].replace(/,/g, ""));
  return null;
}

export default function AccessibleSendMoney({ defaultFromAccountId = "PRIMARY_ACCOUNT_ID" }) {
  const webcamRef = useRef(null);
  const liveRef = useRef(null);
  const holdTimer = useRef(null);
  const idempotencyRef = useRef(null);

  const [stage, setStage] = useState("amount");
  const [ocrText, setOcrText] = useState("");
  const [accountNumber, setAccountNumber] = useState("0687158934");
  const [bankName, setBankName] = useState("GTB");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Ready");
  const pressStartTime = useRef(null);
  const touchStartX = useRef(null);
  const [listening, setListening] = useState(false);

  const email = "emmanueloguntolu48@gmail.com"; // Example email

  // Update live region for screen readers
  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = status;
  }, [status]);

  // --- Step 1: Start Camera ---
  const startCamera = () => {
    setStatus("Camera opened. Point at account details and tap 'Snap'.");
    speak("Camera opened. Point at account details and tap snap.");
    setStage("camera");
  };

  // --- Step 2: Snap and OCR ---
  const snapAndOcr = async () => {
    setStatus("Capturing image...");
    speak("Capturing image");
    const image = webcamRef.current.getScreenshot();
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
      setOcrText(text);

      const accMatch = text.match(/\b\d{9,12}\b/);
      const bankMatch = text.match(/\b(Access|GTB|UBA|Zenith|First\s+Bank|Union|Fidelity|Ecobank|Polaris|Sterling|FCMB|Wema|Stanbic|GTBank)\b/i);

      if (!accMatch || !bankMatch) {
        setStage("camera");
        setStatus("Account or bank not detected. Try again.");
        speak("Account or bank not detected. Please try again.");
      } else {
        setAccountNumber(accMatch[0]);
        setBankName(bankMatch[0]);
        setStage("amount");
        setStatus("Account captured. Please enter or speak the amount.");
        speak(`Account number captured. Bank ${bankMatch[0]}. How much do you want to send?`);
      }
    } catch (err) {
      setStatus("OCR failed. Try again.");
      speak("Scanning failed. Please try again.");
      console.error(err);
    }
  };

  // --- Step 3: Listen for amount ---
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
      setListening(true);
      setStatus("Listening for amount...");
      speak("Listening for amount. Please say the amount now.");
    };

    recognition.onresult = (ev) => {
      setListening(false);
      const transcript = ev.results[0][0].transcript;
      const parsed = parseAmountFromSpeech(transcript);
      if (parsed && !isNaN(parsed)) {
        setAmount(String(parsed));
        setStatus(`Amount set to ₦${parsed}`);
        speak(`Amount set to ${parsed} naira`);
        setStage("confirm");
        speak(`You are sending naira ${parsed} to ${bankName}, account number ${accountNumber}. Place your finger to confirm.`);
      } else {
        setStatus("Could not understand amount. Please try again.");
        speak("Could not understand the amount. Please try again.");
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setStatus("Voice recognition error");
      speak("Voice recognition error. Please try again.");
    };

    recognition.start();
  };

  // 🎤 Voice Recognition
  const startVoiceCommand = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript;
      setStatus(`Command: "${command}"`);
      speak(`You said: ${command}`);
    };

    recognition.onerror = () => {
      speak("Sorry, I couldn't understand.");
    };
  };

  // 🔊 Text-to-Speech
  const speak = (text) => {
    const synth = window.speechSynthesis;
    synth.speak(new SpeechSynthesisUtterance(text));
  };

  const handleFund = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Step 1: Initiate funding on backend
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/fund`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { authorization_url, reference } = res.data.data; // get Paystack URL & reference

      // Step 2: Open Paystack payment in new tab/window
      window.open(authorization_url, "_blank");

      // Step 3: Poll backend to verify payment (or call after redirect)
      const interval = setInterval(async () => {
        try {
          const verifyRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/wallet/verify/${reference}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (verifyRes.data.balance !== undefined) {
            clearInterval(interval);
            setStatus("✅ Transfer Successful");
            speak("Transfer successful");
          }
        } catch (err) {
          console.error("Error verifying payment:", err);
        }
      }, 2000); // check every 2 seconds
    } catch (err) {
      console.error(err);
      setStatus("❌ Transfer Failed");
      speak("Transfer failed");
    }
  };


  const handlePressStart = () => {
    pressStartTime.current = Date.now();
  };

  const handlePressEnd = async () => {
    if (!pressStartTime.current) return;

    const pressDuration = Date.now() - pressStartTime.current;

    // Tap (short press)
    if (pressDuration < 1000) {
      setStatus("Tap detected - try long press to confirm");
    } else {
      // Long press → WebAuthn authentication
      try {
        setStatus("Authenticating...");
        
        const email = localStorage.getItem("email"); // must be stored earlier
        if (!email) throw new Error("No email found for authentication");

        // 1️⃣ Generate authentication options
        const optsRes = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/webauthn/generate-authentication-options`,
          { email }
        );
        const options = optsRes.data;

        // Convert challenge + allowCredentials IDs to ArrayBuffer
        options.challenge = b64UrlToBuf(options.challenge);
        options.allowCredentials = options.allowCredentials.map((cred) => ({
          ...cred,
          id: b64UrlToBuf(cred.id),
        }));

        // 2️⃣ Trigger WebAuthn
        const assertion = await navigator.credentials.get({ publicKey: options });

        // Convert rawId + authenticatorData etc. to base64url for backend
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

        // 3️⃣ Verify on backend
        const verifyRes = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/webauthn/verify-authentication`,
          { email, assertionResponse: authResponse }
        );

        if (verifyRes.data.verified && verifyRes.data.token) {
          localStorage.setItem("token", verifyRes.data.token);
          setStatus("✅ Authenticated. Proceeding to fund...");
          
          // 4️⃣ Call fund function
          await handleFund(); // <-- your existing fund logic
        } else {
          setStatus("❌ Authentication failed");
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ Authentication error: " + err.message);
      }
    }

    pressStartTime.current = null;
  };

  return (
    <div className="relative bg-white dark:bg-gray-900 dark:text-gray-100 flex flex-col gap-4">
      {/* Live region for screen readers */}
      <div aria-live="polite" ref={liveRef} className="sr-only" />

      {/* Status */}
      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium">
        <span className="font-bold">Status:</span> {status}
      </div>

      {/* OCR Debug */}
      <details className="text-xs text-gray-500 dark:text-gray-400">
        <summary className="cursor-pointer">OCR Debug</summary>
        <pre className="whitespace-pre-wrap">{ocrText || "—"}</pre>
      </details>

      {/* Stage-based content */}
      {stage === "idle" && (
        <div className="space-y-4 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Tap the button to start sending money. The app will guide you with voice and screen reader messages.
          </p>
          <button
            onClick={startCamera}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg shadow-md transition-all"
          >
            Send Money
          </button>
        </div>
      )}

      {stage === "camera" && (
        <div className="space-y-4">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/png"
            videoConstraints={{ facingMode: "environment" }}
            className="rounded-lg w-full h-60 object-cover border border-gray-200 dark:border-gray-700 shadow-md"
          />
          <div className="flex gap-3">
            <button onClick={snapAndOcr} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg shadow-md">
              Snap
            </button>
            <button
              onClick={() => { setStage("idle"); setStatus("Cancelled"); speak("Cancelled"); }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 rounded-lg shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "amount" && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Fund Wallet</h2>
            <p><strong>Detected:</strong></p>
            <p>Bank: <span className="font-medium">{bankName || "Not found"}</span></p>
            <p>Account: <span className="font-medium">{accountNumber || "Not found"}</span></p>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">Or type amount below</p>
          <button 
          onClick={listenForAmount}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg shadow-md transition-all"

          >Speak Amount
          </button>
          {/* <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (NGN)"
            inputMode="numeric"
            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
          /> */}
        </div>
      )}

      {stage === "sending" && (
        <div className="text-center space-y-3">
          <p className="font-medium text-lg animate-pulse">Processing transfer...</p>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-4 text-center">
          <p className="font-semibold text-green-600">{status}</p>
          <button
            onClick={() => { setStage("idle"); setStatus("Ready"); setAccountNumber(""); setBankName(""); setAmount(""); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg shadow-md transition-all"
          >
            Done
          </button>
        </div>
      )}

      {/* Confirm details shown above the console */}
      {stage === "confirm" && (
        <div className="fixed bottom-24 left-0 w-full px-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h2 className="font-semibold mb-2">Confirm Transfer</h2>
            <p>Email: <span className="font-medium">{email}</span></p>
            <p>Bank: <span className="font-medium">{bankName}</span></p>
            <p>Account: <span className="font-medium">{accountNumber}</span></p>
            <p>Amount: <span className="font-medium">₦{amount}</span></p>
          </div>
        </div>
      )}

      <div className="fixed w-full bottom-4 left-0 flex flex-col items-center gap-1">
        {/* Fingerprint Button */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Tap to speak. Hold to confirm transfer. Swipe left to cancel."
          onMouseDown={handlePressStart}      // start timer for long press
          onMouseUp={handlePressEnd}          // end press → decide tap vs long press
          onTouchStart={handlePressStart}     // same for touch devices
          onTouchEnd={handlePressEnd}         // same for touch devices
          className="w-40 h-40 rounded-full bg-blue-600 active:bg-blue-700 
                    flex items-center justify-center shadow-2xl text-white select-none"
        >
          <Fingerprint size={80} strokeWidth={1.5} />
        </div>

        {/* Status text */}
        <div className="mt-2 text-base font-medium text-center">{status}</div>
      </div>

    </div>

  );
}
