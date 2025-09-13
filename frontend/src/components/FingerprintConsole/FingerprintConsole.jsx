// src/components/FingerprintConsole.jsx
import { useState, useRef } from "react";
import { Fingerprint } from "lucide-react"; // unique fingerprint icon

export default function FingerprintConsole({ onCancel }) {
  const [status, setStatus] = useState("Ready");
  const pressTimer = useRef(null);
  const lastTap = useRef(0);

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

  // 💸 Fake Transfer
  const performTransfer = () => {
    const success = Math.random() > 0.3; // 70% success
    if (success) {
      setStatus("✅ Transfer Successful");
      speak("Transfer successful");
    } else {
      setStatus("❌ Transfer Failed");
      speak("Transfer failed");
    }
  };

  // ❌ Cancel Transaction
  const cancelTransfer = () => {
    setStatus("❌ Transfer Cancelled");
    speak("Transaction cancelled");
    if (onCancel) onCancel();
  };

  // 👆 Handle Press (hold detection)
  const handlePress = () => {
    pressTimer.current = setTimeout(() => {
      performTransfer(); // hold ≥1s → confirm transfer
    }, 1000);
  };

  // 👆 Handle Release (tap / double tap)
  const handleRelease = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }

    const now = Date.now();
    if (now - lastTap.current < 300) {
      cancelTransfer(); // double tap detected
    } else {
      if (status === "Ready") {
        startVoiceCommand(); // single tap
      }
    }
    lastTap.current = now;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Fingerprint Button */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Tap to speak. Hold 1s to confirm transfer. Double tap to cancel."
        onMouseDown={handlePress}
        onMouseUp={handleRelease}
        onTouchStart={handlePress}
        onTouchEnd={handleRelease}
        className="w-40 h-40 rounded-full bg-blue-600 active:bg-blue-700 flex items-center justify-center shadow-2xl text-white"
      >
        <Fingerprint size={80} strokeWidth={1.5} />
      </div>

      {/* Instructions */}
      {/* <div className="text-center text-sm text-gray-600 space-y-1">
        <p>👆 Tap → Speak</p>
        <p>✋ Hold → Confirm</p>
        <p>👆👆 Double Tap → Cancel</p>
      </div> */}

      {/* Status */}
      <div className="mt-2 text-base font-medium">{status}</div>
    </div>
  );
}
