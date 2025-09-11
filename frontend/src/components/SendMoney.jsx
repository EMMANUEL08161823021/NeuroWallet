"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FingerprintConsole from "../components/FingerprintConsole/FingerprintConsole";

// ✅ Load QR Scanner only on client
const QrReader = dynamic(() => import("react-qr-reader").then((mod) => mod.QrReader), {
  ssr: false,
});

export default function SendMoney() {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [step, setStep] = useState("camera"); // camera → amount → confirm → done

  // 📸 Step 1: QR Scan
  const handleScan = (result) => {
    if (result?.text) {
      // Example QR data: "ACC:1234567890|BANK:GTB"
      const parts = result.text.split("|");
      const acc = parts.find((p) => p.startsWith("ACC:"))?.replace("ACC:", "");
      const bank = parts.find((p) => p.startsWith("BANK:"))?.replace("BANK:", "");

      setAccountNumber(acc || "Not found");
      setBankName(bank || "Unknown Bank");
      setStep("amount");

      const msg = new SpeechSynthesisUtterance(
        "Account details captured. How much do you want to send?"
      );
      window.speechSynthesis.speak(msg);
    }
  };

  // 🎤 Step 2: Voice for Amount
  const listenForAmount = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";

    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      const value = spoken.replace(/[^0-9.]/g, "");
      setAmount(value);
      setStep("confirm");

      const msg = new SpeechSynthesisUtterance(
        `You are sending ₦${value} to ${bankName}, account number ${accountNumber}. Place your finger to confirm.`
      );
      window.speechSynthesis.speak(msg);
    };

    recognition.start();
  };

  // 🛡️ Step 3: Fingerprint confirm
  const confirmTransfer = () => {
    if (accountNumber && bankName && amount) {
      const msg = new SpeechSynthesisUtterance(
        `Transfer of ₦${amount} to ${bankName}, account number ${accountNumber}, successful.`
      );
      window.speechSynthesis.speak(msg);
      setStatus("✅ Transfer Successful");
      setStep("done");
    } else {
      const msg = new SpeechSynthesisUtterance("Transfer failed. Missing details.");
      window.speechSynthesis.speak(msg);
      setStatus("❌ Transfer Failed");
      setStep("done");
    }
  };

  return (
    <div className="p-6 flex flex-col items-center space-y-6">
      <h1 className="text-2xl font-bold">Send Money (QR)</h1>

      {/* Step 1: QR Camera */}
      {step === "camera" && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-4">
          <QrReader
            constraints={{ facingMode: "environment" }} // ✅ back camera
            scanDelay={500}
            onResult={handleScan}
            className="w-full h-64 rounded-xl"
          />
        </div>
      )}

      {/* Step 2: Voice Amount */}
      {step === "amount" && (
        <button
          onClick={listenForAmount}
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Speak Amount
        </button>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <div onClick={confirmTransfer} className="w-full">
          <FingerprintConsole />
        </div>
      )}

      {/* Captured Details */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg w-full text-center">
        <p><strong>Account Number:</strong> {accountNumber}</p>
        <p><strong>Bank Name:</strong> {bankName}</p>
        <p><strong>Amount:</strong> ₦{amount}</p>
      </div>

      {/* Status */}
      <p className="text-lg font-semibold">{status}</p>
    </div>
  );
}
