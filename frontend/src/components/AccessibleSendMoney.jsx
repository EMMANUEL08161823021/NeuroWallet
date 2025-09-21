import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
import FingerprintConsole from "./FingerprintConsole/FingerprintConsole";
import axios from "axios";

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

function parseAmountFromSpeech(transcript) {
  const digits = transcript.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (digits) return parseFloat(digits[1].replace(/,/g, ""));
  return null; // fallback to manual entry
}

export default function AccessibleSendMoney({ defaultFromAccountId = "PRIMARY_ACCOUNT_ID" }) {
  const webcamRef = useRef(null);
  const liveRef = useRef(null);
  const holdTimer = useRef(null);
  const idempotencyRef = useRef(null);

  const [stage, setStage] = useState("idle");
  const [status, setStatus] = useState("Ready");
  const [ocrText, setOcrText] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("emmanueloguntolu48@gmail.com");

  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = status;
  }, [status]);

  const startCamera = () => {
    setStage("camera");
    setStatus("Camera opened. Point at account details and tap Snap.");
    speak("Camera opened. Point at account details and tap Snap.");
  };

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
      setOcrText(data.text);

      const accMatch = data.text.match(/\b\d{9,12}\b/);
      const bankMatch = data.text.match(/\b(Access|GTB|UBA|Zenith|First\s*Bank|Union|Fidelity|Ecobank|Polaris|Sterling|FCMB|Wema|Stanbic|GTBank)\b/i);

      if (!accMatch || !bankMatch) {
        setStatus("Could not detect account or bank. Try again.");
        speak("Could not detect account or bank. Try again.");
        return;
      }

      setAccountNumber(accMatch[0]);
      setBankName(bankMatch[0]);
      setStage("amount");

      setStatus("Account details captured. Please enter or speak the amount.");
      speak(`Account number ${accMatch[0].split("").join("-")}, ${bankMatch[0]}. How much do you want to send?`);
    } catch (err) {
      console.error("OCR error:", err);
      setStatus("OCR failed. Try again.");
      speak("OCR failed. Please try again.");
    }
  };

  const listenForAmount = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("Listening for amount...");
      speak("Listening for amount. Please say the amount now.");
    };

    recognition.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript;
      const parsed = parseAmountFromSpeech(transcript);

      if (parsed && !isNaN(parsed)) {
        setAmount(String(parsed));
        setStage("confirm");
        setStatus(`Amount set to ₦${parsed}`);
        speak(`Amount set to naira ${parsed}. Place your finger to confirm.`);
      } else {
        setStatus("Could not understand amount. Please type or speak again.");
        speak("Could not understand the amount. Please try again.");
      }
    };

    recognition.onerror = (err) => {
      console.error(err);
      setStatus("Voice recognition error");
      speak("Voice recognition error. Please try again.");
    };

    recognition.start();
  };

  const genIdempotency = () => {
    const key = window.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    idempotencyRef.current = key;
    return key;
  };

  const handleFund = async () => {
    if (!amount || !accountNumber) {
      setStatus("Missing account or amount.");
      speak("Missing account or amount.");
      return;
    }

    setStage("sending");
    setStatus("Processing transfer...");
    speak("Processing transfer. Please wait.");

    try {
      const idemp = genIdempotency();
      const token = localStorage.getItem("access") || "";

      const resp = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/wallet/fund`,
        { email, amount },
        { headers: token ? { Authorization: `Bearer ${token}`, "Idempotency-Key": idemp } : { "Idempotency-Key": idemp } }
      );

      setStatus("Transfer initialized. Redirecting to payment...");
      speak("Transfer initialized. Redirecting to payment...");
      window.location.href = resp.data.data.authorization_url;
    } catch (err) {
      console.error(err);
      setStatus("Transfer failed");
      speak("Transfer failed. Please try again.");
      setStage("done");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 rounded-lg shadow-lg border dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-gray-100 flex flex-col gap-4">

      {/* Status */}
      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium">
        <span className="font-bold">Status:</span> {status}
      </div>

      {/* OCR Debug */}
      <details className="text-xs text-gray-500 dark:text-gray-400">
        <summary className="cursor-pointer">OCR Debug</summary>
        <pre className="whitespace-pre-wrap">{ocrText || "—"}</pre>
      </details>

      {/* Stage UI */}
      {stage === "idle" && (
        <button onClick={startCamera} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg shadow-md">Send Money</button>
      )}

      {stage === "camera" && (
        <div className="space-y-3">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/png"
            videoConstraints={{ facingMode: "environment" }}
            className="rounded-lg w-full h-60 object-cover border border-gray-200 dark:border-gray-700 shadow-md"
          />
          <div className="flex gap-3">
            <button onClick={snapAndOcr} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg shadow-md">Snap</button>
            <button onClick={() => { setStage("idle"); setStatus("Cancelled"); speak("Cancelled"); }} className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {stage === "amount" && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h2 className="font-semibold mb-2">Fund Wallet</h2>
            <p>Bank: <span className="font-medium">{bankName || "Not found"}</span></p>
            <p>Account: <span className="font-medium">{accountNumber || "Not found"}</span></p>
          </div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (NGN)" inputMode="numeric" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"/>
          <button onClick={listenForAmount} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg shadow-md">Speak Amount</button>
        </div>
      )}

      {stage === "confirm" && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h2 className="font-semibold mb-2">Confirm Transfer</h2>
            <p>Email: <span className="font-medium">{email}</span></p>
            <p>Bank: <span className="font-medium">{bankName}</span></p>
            <p>Account: <span className="font-medium">{accountNumber}</span></p>
            <p>Amount: <span className="font-medium">₦{amount}</span></p>
          </div>
          <FingerprintConsole onConfirm={handleFund} onCancel={() => { setStage("idle"); setStatus("Cancelled"); speak("Cancelled"); }}/>
        </div>
      )}

      {stage === "sending" && <p className="text-center animate-pulse font-medium text-lg">Processing transfer...</p>}
    </div>
  );
}
