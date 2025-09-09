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
      <div
        role="button"
        tabIndex={0}
        aria-label="Voice command: tap to speak. Hold to confirm transfer"
        onMouseDown={handlePress}
        onMouseUp={handleRelease}
        onTouchStart={handlePress}
        onTouchEnd={handleRelease}
        // onKeyDown={(e) => { if (e.key === "Enter") startListening(); }}
        className="w-40 h-40 rounded-full bg-blue-600  active:bg-blue-700 flex items-center justify-center shadow-2xl"
        >
        <div className="text-center">
          <div className="text-4xl">🔊</div>
          <div className="mt-2 text-lg font-semibold">Tap to Speak</div>
          <div className="text-sm mt-1">Hold to Confirm</div>
        </div>
      </div>
      
      {/* <p className="mt-2 text-xl">{status}</p> */}
    </div>
  );
}

      
