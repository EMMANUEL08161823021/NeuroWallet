import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";

/**
 * AccessibleSendMoney
 *
 * Flow implemented:
 * 1. User clicks "Send Money" -> camera opens automatically
 * 2. Snap image -> OCR extracts account number + bank name
 * 3. App asks "How much do you want to send?" -> listens via SpeechRecognition
 * 4. App reads back amount -> "You are sending..."
 * 5. Fingerprint console: tap = cancel, hold = confirm (900ms)
 * 6. On confirm: call /api/transfers with Idempotency-Key, play success/fail sound and announce result
 *
 * Note: Replace fetch URLs and Authorization header with your token handling.
 */

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) {
    // ignore if unavailable
    // console.warn("Speech synth not available", e);
  }
}

// crude number-from-words attempt (best-effort)
function parseAmountFromSpeech(transcript) {
  // prefer explicit digits first
  const digits = transcript.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (digits) return parseFloat(digits[1].replace(/,/g, ""));

  // simple words-to-number parsing for common cases:
  const map = {
    zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
    twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90,
    hundred:100, thousand:1000, million:1000000
  };
  const tokens = transcript.toLowerCase().replace(/-/g,' ').split(/\s+/);
  let total = 0;
  let current = 0;
  for (const t of tokens) {
    if (map[t] !== undefined) {
      const val = map[t];
      if (val >= 100) {
        current = Math.max(1, current) * val;
      } else {
        current += val;
      }
    } else if (t === "and") {
      continue;
    } else {
      // ignore tokens like 'naira'
    }
  }
  if (current > 0) total += current;
  return total > 0 ? total : null;
}

export default function AccessibleSendMoney({ defaultFromAccountId = "PRIMARY_ACCOUNT_ID" }) {
  const webcamRef = useRef(null);
  const [stage, setStage] = useState("idle"); // idle -> camera -> ocr -> amount -> confirm -> sending -> done
  const [ocrText, setOcrText] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Ready");
  const [listening, setListening] = useState(false);
  const holdTimer = useRef(null);
  const idempotencyRef = useRef(null);

  // live region ref for screen readers
  const liveRef = useRef(null);
  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = status;
  }, [status]);

  // Step 1: open camera
  const startCamera = () => {
    setStatus("Camera opened. Point at account details and tap 'Snap'.");
    speak("Camera opened. Point at account details and tap snap.");
    setStage("camera");
  };

  // Step 2: take snapshot and OCR
  const snapAndOcr = async () => {
    try {
      setStatus("Capturing image...");
      speak("Capturing image");
      const image = webcamRef.current.getScreenshot();
      if (!image) {
        setStatus("Unable to capture image.");
        speak("Unable to capture image. Try again.");
        return;
      }

      setStatus("Scanning image. This may take a few seconds...");
      speak("Scanning image. Please hold still.");

      const { data } = await Tesseract.recognize(image, "eng", { logger: m => {/* optional logging */} });
      const text = data?.text || "";
      setOcrText(text);

      // crude regex: Nigerian account numbers often 10 digits; fallback to 9-12 digits
      const accMatch = text.match(/\b\d{9,12}\b/);
      const bankMatch = text.match(/\b(Access|GTB|UBA|Zenith|First\s+Bank|FirstBank|Union|Fidelity|Ecobank|Polaris|Sterling|FCMB|Wema|Stanbic|GTBank)\b/i);

      setAccountNumber(accMatch ? accMatch[0] : "");
      setBankName(bankMatch ? bankMatch[0] : "");

      // setStage("amount");
      listenForAmount();
      setStatus(`Captured ${accMatch ? "account number" : "no account found"} ${bankMatch ? "and bank" : ""}. Asking for amount.`);
      speak(bankMatch ? `Account number ${accMatch ? accMatch[0].split('').join('-') : 'not found'}, ${bankMatch[0]}. How much do you want to send?` : "Account details captured. How much do you want to send?");
      // wait a moment for TTS to finish then start listening? we'll let user press Speak Amount
    } catch (err) {
      console.error("OCR error", err);
      setStatus("OCR failed. Try again.");
      speak("Scanning failed. Please try again.");
    }
  };

  // Step 3: listen for amount
  const listenForAmount = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Voice input not supported on this device.");
      speak("Voice input not supported on this device. Please type the amount.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatus("Listening for amount...");
      speak("Listening for amount. How much do you wanna send to the receipent. Please say the amount now.");
    };

    recognition.onresult = (ev) => {
      setListening(false);
      const transcript = ev.results[0][0].transcript;
      const parsed = parseAmountFromSpeech(transcript);
      if (parsed && !isNaN(parsed)) {
        setAmount(String(parsed));
        setStatus(`Amount set to ₦${parsed}`);
        speak(`Amount set to naira ${parsed}`);
        setStage("confirm");
        // read full confirmation
        const confirmMsg = `You are sending naira ${parsed} to ${bankName || 'the recipient'}, account number ${accountNumber || 'unknown'}. Place your finger to confirm.`;
        setTimeout(()=> speak(confirmMsg), 500);
      } else {
        setStatus("Could not understand amount. Please try again.");
        speak("Could not understand the amount. Please try again.");
      }
    };

    recognition.onerror = (err) => {
      console.error("Speech error", err);
      setListening(false);
      setStatus("Voice recognition error");
      speak("Voice recognition error. Please try again.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  // generate idempotency key
  const genIdempotency = () => {
    const k = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    idempotencyRef.current = k;
    return k;
  };

  // perform transfer: call backend
  const performTransfer = async () => {
    if (!accountNumber || !amount) {
      setStatus("Missing account number or amount.");
      speak("Missing account number or amount.");
      return;
    }
    setStage("sending");
    setStatus("Processing transfer...");
    speak("Processing transfer. Please wait.");

    const payload = {
      fromAccountId: defaultFromAccountId,
      toAccountNumber: accountNumber,
      amount: Number(amount),
      memo: "Mobile transfer",
    };

    const idemp = genIdempotency();

    try {
      // adapt URL & auth
      const token = localStorage.getItem("access") || "";
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || ""}/api/transfers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemp,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (resp.ok) {
        setStatus("Transfer successful");
        speak("Transfer successful");
        // play success sound
        try { new Audio("/sounds/success.mp3").play(); } catch {}
        setStage("done");
      } else {
        setStatus(data?.error?.message || "Transfer failed");
        speak(`Transfer failed. ${data?.error?.message || ""}`);
        try { new Audio("/sounds/fail.mp3").play(); } catch {}
        setStage("done");
      }
    } catch (err) {
      console.error("Transfer error", err);
      setStatus("Network error during transfer");
      speak("Transfer failed due to network error. Please try again.");
      try { new Audio("/sounds/fail.mp3").play(); } catch {}
      setStage("done");
    }
  };

  // Fingerprint console handlers: tap = cancel, hold = confirm
  const handlePressStart = () => {
    // start timer for long press
    holdTimer.current = setTimeout(async () => {
      // long hold confirmed
      setStatus("Confirming with fingerprint...");
      speak("Confirming. Please complete the fingerprint.");
      // In production, trigger WebAuthn biometric flow here and verify; for now we proceed
      await performTransfer();
    }, 900); // 900ms threshold
  };

  const handlePressEnd = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      // if released before threshold => treat as tap -> cancel
      if (stage === "confirm") {
        setStatus("Transaction cancelled");
        speak("Transaction cancelled");
        setStage("idle");
        setAccountNumber("");
        setBankName("");
        setAmount("");
      }
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white dark:bg-gray-900 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-4">Send Money (Accessible)</h2>

      {/* live region for screen readers */}
      <div aria-live="polite" ref={liveRef} className="sr-only" />

      {/* status visible for everyone */}
      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">
        <strong>Status:</strong> {status}
      </div>

      {/* debug / extracted OCR text */}
      <details className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <summary>OCR debug</summary>
        <pre className="whitespace-pre-wrap text-xs">{ocrText || "—"}</pre>
      </details>

      {/* Stage-based UI */}
      {stage === "idle" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tap the button to start sending money. The app will guide you with
            voice and screen reader messages.
          </p>
          <button
            onClick={startCamera}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-lg"
            aria-label="Start send money flow"
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
            className="rounded-lg w-full h-60 object-cover border border-gray-200 dark:border-gray-700"
          />
          <div className="flex gap-2">
            <button
              onClick={snapAndOcr}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg"
            >
              Snap
            </button>
            <button
              onClick={() => {
                setStage("idle");
                setStatus("Cancelled");
                speak("Cancelled");
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "amount" && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p><strong>Detected:</strong></p>
            <p>Bank: <span className="font-medium">{bankName || "Not found"}</span></p>
            <p>Account: <span className="font-medium">{accountNumber || "Not found"}</span></p>
          </div>

          {/* <button
            onClick={listenForAmount}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
            aria-label="Speak amount"
          >
            Speak Amount
          </button> */}
          <p className="text-sm text-gray-500 dark:text-gray-400">Or type amount below</p>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (NGN)"
            inputMode="numeric"
            className="w-full p-2 border rounded bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {stage === "confirm" && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p><strong>Confirm Transfer</strong></p>
            <p>Bank: <span className="font-medium">{bankName}</span></p>
            <p>Account: <span className="font-medium">{accountNumber}</span></p>
            <p>Amount: <span className="font-medium">₦{amount}</span></p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Place your finger on the fingerprint console below to confirm.  
            Or double-tap Cancel transaction.
          </p>
        </div>
      )}

      {stage === "sending" && (
        <div className="space-y-3">
          <p className="font-medium">Processing transfer...</p>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-4">
          <p className="font-semibold">{status}</p>
          <button
            onClick={() => {
              setStage("idle");
              setStatus("Ready");
              setAccountNumber("");
              setBankName("");
              setAmount("");
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
          >
            Done
          </button>
        </div>
      )}
    </div>

  );
}
