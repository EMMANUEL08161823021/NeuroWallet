// src/components/FingerprintConsole.jsx
import { useState, useRef } from "react";

export default function FingerprintConsole() {
  const [status, setStatus] = useState("Ready");
  const pressTimer = useRef(null);

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

  // 👆 Handle Tap vs Hold
  const handlePress = () => {
    pressTimer.current = setTimeout(() => {
      performTransfer(); // long hold
    }, 1000);
  };

  const handleRelease = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      if (status === "Ready") startVoiceCommand(); // tap
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <button
        onMouseDown={handlePress}
        onMouseUp={handleRelease}
        onTouchStart={handlePress}
        onTouchEnd={handleRelease}
        className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl active:bg-blue-700 transition text-6xl"
      >
        🔒
      </button>
      <p className="mt-2 text-xl">{status}</p>
    </div>
  );
}
