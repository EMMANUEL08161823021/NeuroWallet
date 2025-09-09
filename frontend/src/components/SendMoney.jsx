import { useState, useRef } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
import FingerprintConsole from "../components/FingerprintConsole/FingerprintConsole";

export default function SendMoney() {
  const webcamRef = useRef(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [step, setStep] = useState("camera"); // "camera" → "amount" → "confirm" → "done"

  // 📸 Step 1: Snap account details
  const captureAccountDetails = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setStatus("🔎 Scanning account details...");
    const { data: { text } } = await Tesseract.recognize(imageSrc, "eng");

    // crude parsing
    const accNumMatch = text.match(/\b\d{10}\b/);
    const bankMatch = text.match(/\b(Access|GTB|UBA|Zenith|First|Union|Fidelity|Ecobank)\b/i);

    setAccountNumber(accNumMatch ? accNumMatch[0] : "Not found");
    setBankName(bankMatch ? bankMatch[0] : "Unknown Bank");

    setStep("amount");

    const msg = new SpeechSynthesisUtterance(
      "Account details captured. How much do you want to send?"
    );
    window.speechSynthesis.speak(msg);
  };

  // 🎤 Step 2: Voice input for amount
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

  // 🛡️ Step 3: Fingerprint to confirm
  const confirmTransfer = () => {
    if (accountNumber && bankName && amount) {
      const msg = new SpeechSynthesisUtterance(
        `Transfer of ₦${amount} to ${bankName}, account number ${accountNumber}, successful.`
      );
      window.speechSynthesis.speak(msg);

      const successSound = new Audio("/sounds/success.mp3");
      successSound.play();

      setStatus("✅ Transfer Successful");
      setStep("done");
    } else {
      const msg = new SpeechSynthesisUtterance("Transfer failed. Missing details.");
      window.speechSynthesis.speak(msg);

      const failSound = new Audio("/sounds/fail.mp3");
      failSound.play();

      setStatus("❌ Transfer Failed");
      setStep("done");
    }
  };

  return (
    <div className="p-6 flex flex-col items-center space-y-6">
      <h1 className="text-2xl font-bold">Send Money</h1>

      {/* Step 1: Camera */}
      {step === "camera" && (
        <>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/png"
            className="w-80 h-60 rounded-lg shadow"
          />
          <button
            onClick={captureAccountDetails}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Snap Account Details
          </button>
        </>
      )}

      {/* Step 2: Voice amount */}
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

      {/* Captured details */}
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
