// src/components/FingerprintConsole.jsx
import { useState, useRef } from "react";
import { Fingerprint } from "lucide-react";

export default function FingerprintConsole({ onCancel, onConfirm }) {
  const [status, setStatus] = useState("Ready");
  const pressStartTime = useRef(null);
  const touchStartX = useRef(null);

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
    const success = Math.random() > 0.3;
    if (success) {
      setStatus("✅ Transfer Successful");
      speak("Transfer successful");

      if (onConfirm) onConfirm(); // ✅ Call handleFund from parent
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

  // 👆 Handle press (for tap/hold)
  const handlePress = () => {
    pressStartTime.current = Date.now();
    performTransfer();
  };

  const handleRelease = () => {
    if (!pressStartTime.current) return;
    const pressDuration = Date.now() - pressStartTime.current;

    if (pressDuration < 1000) {
      startVoiceCommand(); // Tap
    } else {
      performTransfer(); // Hold confirm
    }
    pressStartTime.current = null;
  };

  // 👉 Handle swipe cancel
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    pressStartTime.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;

    if (deltaX < -50) {
      // Swiped left
      cancelTransfer();
    } else {
      handleRelease();
    }

    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Tap to speak. Hold to confirm transfer. Swipe left to cancel."
        onMouseDown={handlePress}
        onMouseUp={handleRelease}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-40 h-40 rounded-full bg-blue-600 active:bg-blue-700 flex items-center justify-center shadow-2xl text-white select-none"
      >
        <Fingerprint size={80} strokeWidth={1.5} />
      </div>
      {/* Status */}
      <div className="mt-2 text-base font-medium">{status}</div>
    </div>
  );
}
