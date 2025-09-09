// src/components/AccessibleTransfer.jsx
import React, { useState, useRef } from "react";

/**
 * AccessibleTransfer
 *
 * Features:
 * - Tap mic to speak transfer command (voice parsing)
 * - Hold big button for 1s to confirm + send transfer
 * - PIN fallback modal if biometric not available
 * - Speech feedback (speechSynthesis) + aria-live region
 * - Sends POST /api/transfers with Idempotency-Key header
 *
 * Replace fetch URLs / auth logic to suit your app (Authorization header, account IDs, etc.)
 */

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {
    // ignore if not supported
    console.warn("Speech synth not available", e);
  }
}

// small helper to format numbers
function parseAmountWords(text) {
  // super-simple attempt: pick digits or words and convert basic numbers
  // Try to find numbers or words like "fifty thousand" not exhaustive but practical for demo
  const digits = text.match(/(?:\d{1,3}(?:,\d{3})*|\d+(\.\d+)?)/);
  if (digits) return parseFloat(digits[0].replace(/,/g, ""));

  // fallback: map small words
  const smallMap = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    hundred: 100, thousand: 1000, million: 1000000
  };
  const tokens = text.toLowerCase().split(/\s+/);
  let total = 0, current = 0;
  for (let t of tokens) {
    if (smallMap[t] !== undefined) {
      const val = smallMap[t];
      if (val >= 100) {
        current = Math.max(1, current) * val;
      } else current += val;
    } else if (t === "and") continue;
    else {
      // ignore
    }
  }
  total = current;
  if (total > 0) return total;
  return null;
}

export default function AccessibleTransfer({ defaultFromAccountId = "PRIMARY_ACCOUNT_ID" }) {
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [statusMsg, setStatusMsg] = useState("Ready");
  const [listening, setListening] = useState(false);
  const [showPIN, setShowPIN] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const pressTimer = useRef(null);
  const idempotencyKeyRef = useRef(null);

  // voice recognition (tap mic)
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMsg("Voice not supported on this device.");
      speak("Voice commands are not supported on this device.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatusMsg("Listening...");
      speak("Listening. Please say something like, send fifty thousand to Ada.");
    };

    recognition.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript;
      setListening(false);
      setStatusMsg(`Heard: ${transcript}`);
      speak(`You said: ${transcript}`);

      // Very basic parsing: look for "to <name/number>" and an amount
      // Example commands:
      // "Send fifty thousand naira to Ada"
      // "Transfer 5000 to 1002003002"
      const lower = transcript.toLowerCase();

      // try to extract recipient after "to"
      let toMatch = transcript.match(/to\s+([a-z0-9\s]+)/i);
      if (!toMatch) {
        // maybe 'to account 100...' or 'to number 100...'
        toMatch = transcript.match(/to\s+(account|number)?\s*([0-9]{6,})/i);
      }

      const maybeTo = toMatch ? (toMatch[2] || toMatch[1]) : null;
      if (maybeTo) {
        // trim
        const cleaned = maybeTo.trim();
        setToAccount(cleaned);
      }

      // extract amount
      let amt = parseAmountWords(transcript);
      if (!amt) {
        // fallback to numbers
        const digits = transcript.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
        if (digits) amt = parseFloat(digits[1].replace(/,/g, ""));
      }
      if (amt) {
        setAmount(String(amt));
      }

      // If we got both, auto-announce and focus confirmation
      if ((maybeTo || toAccount) && (amt || amount)) {
        const msg = `Ready to send ${amt || amount} naira to ${maybeTo || toAccount}. Hold the confirm button to send.`;
        setStatusMsg(msg);
        speak(msg);
      } else {
        speak("Could not parse recipient or amount. You can edit them manually.");
      }
    };

    recognition.onerror = (err) => {
      setListening(false);
      setStatusMsg("Voice error");
      speak("Voice recognition error. Please try again.");
      console.warn("Speech recognition error", err);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  // generate idempotency key (uuid v4 simple)
  const genIdempotency = () => {
    const k = crypto?.randomUUID ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2,9));
    idempotencyKeyRef.current = k;
    return k;
  };

  // function to attempt biometric auth (WebAuthn) — simplified: if fails, fallback to PIN
  const authenticateBiometric = async () => {
    // NOTE: integrate with your existing backend webauthn endpoints.
    if (!window.PublicKeyCredential) {
      return { ok: false, reason: "webauthn-not-supported" };
    }

    try {
      // In a real flow you'd request assertion options from your backend
      // Here we attempt a simple get() with a random challenge for demo — replace with real flow.
      const options = {
        publicKey: {
          challenge: Uint8Array.from(window.atob("AAAAAAAAAAAAAAAAAAAAAA=="), c => c.charCodeAt(0)),
          timeout: 60000,
          userVerification: "required"
        }
      };
      const cred = await navigator.credentials.get(options);
      if (cred) return { ok: true };
      return { ok: false, reason: "no-credential" };
    } catch (e) {
      console.warn("Biometric auth failed", e);
      return { ok: false, reason: "error" };
    }
  };

  // send transfer to backend
  const sendTransfer = async (usePin = false) => {
    if (busy) return;
    if (!toAccount) {
      speak("Recipient is missing. Please provide recipient account or name.");
      setStatusMsg("Recipient missing");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      speak("Please enter a valid amount.");
      setStatusMsg("Invalid amount");
      return;
    }

    setBusy(true);
    setStatusMsg("Authorizing...");
    speak("Authorizing transfer, please wait.");

    // authenticate
    let authResult = { ok: false };
    if (!usePin) {
      authResult = await authenticateBiometric();
      if (!authResult.ok) {
        // if biometric not available or failed, prompt PIN fallback
        setShowPIN(true);
        setBusy(false);
        setStatusMsg("Fingerprint not available, please enter PIN to continue.");
        speak("Fingerprint not available, please enter PIN to continue.");
        return;
      }
    }

    // Prepare payload
    const payload = {
      fromAccountId: defaultFromAccountId,
      toAccountNumber: toAccount,
      amount: Number(amount),
      memo: memo || ""
    };

    const idemp = genIdempotency();

    try {
      // Use your auth token if available (Authorization Bearer ...)
      const resp = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemp,
          // "Authorization": `Bearer ${yourTokenHere}`
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (resp.ok) {
        setStatusMsg("Transfer successful");
        speak("Transfer successful");
        // clear fields
        setToAccount("");
        setAmount("");
        setMemo("");
      } else {
        console.error("Transfer failed", data);
        setStatusMsg(data?.error?.message || "Transfer failed");
        speak("Transfer failed. " + (data?.error?.message || ""));
      }
    } catch (err) {
      console.error("Send error", err);
      setStatusMsg("Network error");
      speak("Transfer failed due to network error.");
    } finally {
      setBusy(false);
    }
  };

  // UI: hold behavior for confirmation
  const handlePressStart = () => {
    // start timer for long press
    pressTimer.current = setTimeout(async () => {
      // long hold: confirm send
      setStatusMsg("Confirming...");
      // try biometric first
      const result = await authenticateBiometric();
      if (result.ok) {
        await sendTransfer(false);
      } else {
        // fallback to PIN modal
        setShowPIN(true);
        setStatusMsg("Fingerprint not available, please enter PIN.");
        speak("Fingerprint not available, please enter PIN.");
      }
    }, 900); // 900ms threshold => hold to confirm
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      // if release before threshold, treat as tap => open voice
      if (!busy && !listening) {
        startListening();
      }
    }
  };

  // PIN confirm handler
  const handlePinConfirm = async () => {
    // In real app validate pin with backend. Here we simulate then send.
    if (!pin || pin.length < 4) {
      speak("Please enter a valid PIN.");
      setStatusMsg("Invalid PIN");
      return;
    }
    setShowPIN(false);
    setBusy(true);
    setStatusMsg("Verifying PIN...");
    speak("Verifying PIN. Please wait.");
    // simulate verification call to backend
    try {
      // Example: POST /api/pin/verify or login endpoint
      // const verify = await fetch("/api/pin/verify", { method: "POST", body: JSON.stringify({ email, pin })});
      // if ok...
      await new Promise(r => setTimeout(r, 600));
      // proceed with transfer
      await sendTransfer(true);
    } catch (e) {
      console.error(e);
      speak("PIN verification failed");
      setStatusMsg("PIN verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center">
      <h2 className="sr-only">Accessible Transfer Console</h2>

      {/* Live region for screen readers */}
      <div aria-live="polite" className="sr-only" id="transfer-live">
        {statusMsg}
      </div>

      {/* Fields */}
      <label className="w-full mb-3">
        <span className="block text-sm font-medium mb-1">To (account number or recipient name)</span>
        <input
          type="text"
          value={toAccount}
          onChange={(e) => setToAccount(e.target.value)}
          className="w-full p-4 rounded-lg border text-lg"
          aria-label="Recipient account number or name"
          placeholder="e.g. 1002003002 or Ada"
        />
      </label>

      <label className="w-full mb-3">
        <span className="block text-sm font-medium mb-1">Amount (NGN)</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-4 rounded-lg border text-lg"
          aria-label="Amount in naira"
          placeholder="e.g. 5000"
        />
      </label>

      <label className="w-full mb-6">
        <span className="block text-sm font-medium mb-1">Memo (optional)</span>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full p-3 rounded-lg border text-base"
          aria-label="Transfer memo"
          placeholder="e.g. Rent"
        />
      </label>

      {/* Mic + Hold to confirm console */}
      <div className="flex flex-col items-center gap-4">
        <div
          role="button"
          tabIndex={0}
          aria-label="Voice command: tap to speak. Hold to confirm transfer"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onKeyDown={(e) => { if (e.key === "Enter") startListening(); }}
          className="w-56 h-56 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-2xl focus:outline-none focus:ring-4 focus:ring-green-300"
        >
          <div className="text-center">
            <div className="text-6xl">🔊</div>
            <div className="mt-2 text-lg font-semibold">Tap to Speak</div>
            <div className="text-sm mt-1">Hold to Confirm</div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center" aria-hidden={false}>
          <p className="text-lg font-medium">{statusMsg}</p>
          {listening && <p className="text-sm text-gray-600">Listening...</p>}
          {busy && <p className="text-sm text-gray-600">Processing...</p>}
        </div>
      </div>

      {/* PIN modal */}
      {showPIN && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Enter PIN to confirm</h3>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 border rounded mb-4 text-lg"
              aria-label="Enter your PIN"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowPIN(false); setPin(""); }}
                className="px-4 py-2 rounded bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handlePinConfirm}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
