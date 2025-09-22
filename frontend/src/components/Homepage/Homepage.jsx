import { useState, useEffect, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import FundWallet from "../../pages/FundWallet";
import Transfer from "../../pages/Transfer";
import axios from "axios";
import AccessibleSendMoney from "../AccessibleSendMoney";




// GestureButton component to handle tap, double tap, and swipe
const GestureButton = ({ onTap, onDoubleTap, onSwipe }) => {
  const buttonRef = useRef(null);
  let tapCount = 0;
  let touchStartX = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    tapCount++;
    setTimeout(() => {
      if (tapCount === 1) {
        onTap();
      } else if (tapCount === 2) {
        onDoubleTap();
      }
      tapCount = 0;
    }, 300);
  };

  const handleTouchMove = (e) => {
    const touchEndX = e.touches[0].clientX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 50) {
      onSwipe(diff > 0 ? "right" : "left");
    }
  };

  // return (
  //   <button
  //   style={{width: '100%', padding: '40px'}}
  //     ref={buttonRef}
  //     onTouchStart={handleTouchStart}
  //     onTouchMove={handleTouchMove}
  //     className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
  //     aria-label="Interact with gestures: tap to speak commands, double tap to cancel, swipe to confirm"
  //   >
  //     Interact
  //   </button>
  // );
};

const Homepage = () => {
  const [amount, setAmount] = useState("");
  const [numericAmount, setNumericAmount] = useState(null);
  const [description, setDescription] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [speechMode, setSpeechMode] = useState(null); // null, "command"
  const [listeningForAmount, setListeningForAmount] = useState(false); // New state for amount listening

  const beneficiaries = [
    { name: "Emmanuel", provider: "Palmpay", account: "7082659880" },

  ];


  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
      const fetchWallet = async () => {
      try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/wallet/me`, {
          headers: { Authorization: `Bearer ${token}` }
          });
          setBalance(res.data.balance);
          setTransactions(res.data.transactions);
      } catch (err) {
          console.error(err);
      }
      };
      fetchWallet();
  }, []);

  const filteredBeneficiaries = beneficiaries.filter((b) =>
    `${b.name} ${b.provider}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setError("Your browser does not support speech recognition. Please use Chrome.");
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    if (transcript && speechMode) {
      const command = transcript.toLowerCase().trim();
      if (speechMode === "command") {
        switch (command) {
          case "one":
            setListeningForAmount(true); // Show "Listening..." for amount
            const fixedAmount = "2000.00";
            setNumericAmount(fixedAmount);
            setAmount(fixedAmount);
            const amountUtterance = new SpeechSynthesisUtterance("Your Account Balance is $2000");
            window.speechSynthesis.speak(amountUtterance);
            setSpeechMode(null);
            setListeningForAmount(false); // Hide "Listening..." after setting amount
            break;
          case "A":
            console.log(selectedBeneficiary);
            
            if (selectedBeneficiary) {
              const nameUtterance = new SpeechSynthesisUtterance(`Name: ${selectedBeneficiary.name}`);
              window.speechSynthesis.speak(nameUtterance);
            } else {
              setError("No beneficiary selected.");
            }
            setSpeechMode(null);
            break;
          case "B":
            if (selectedBeneficiary) {
              const providerUtterance = new SpeechSynthesisUtterance(`Provider: ${selectedBeneficiary.provider}`);
              window.speechSynthesis.speak(providerUtterance);
            } else {
              setError("No beneficiary selected.");
            }
            setSpeechMode(null);
            break;
          case "C":
            if (selectedBeneficiary) {
              const accountUtterance = new SpeechSynthesisUtterance(`Account number: ${selectedBeneficiary.account}`);
              window.speechSynthesis.speak(accountUtterance);
            } else {
              setError("No beneficiary selected.");
            }
            setSpeechMode(null);
            break;
          default:
            setError("Invalid command. Say '1' for amount, 'A' for name, 'B' for provider, or 'C' for account number.");
            setSpeechMode(null);
        }
      }
      resetTranscript();
    }
  }, [transcript, speechMode, selectedBeneficiary]);

  useEffect(() => {
    if (selectedBeneficiary) {
      const utterance = new SpeechSynthesisUtterance(
        `Selected beneficiary: ${selectedBeneficiary.name}, ${selectedBeneficiary.provider}, account number ${selectedBeneficiary.account}`
      );
      window.speechSynthesis.speak(utterance);
    }
  }, [selectedBeneficiary]);

  const startListening = (mode) => {
    if (!browserSupportsSpeechRecognition) return;
    resetTranscript();
    setError("");
    setSpeechMode(mode);
    SpeechRecognition.startListening({ continuous: false, language: "en-US" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numericAmount === null || isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please provide a valid amount.");
      return;
    }
    const confirmationText = `Transferring $${numericAmount} to ${selectedBeneficiary.name}`;
    const utterance = new SpeechSynthesisUtterance(confirmationText);
    window.speechSynthesis.speak(utterance);
    alert(confirmationText);
    setAmount("");
    setNumericAmount(null);
    setDescription("");
    resetTranscript();
  };


  const handleDoubleTap = () => {
    setAmount("");
    setNumericAmount(null);
    setSelectedBeneficiary(null);
    setError("");
    setSpeechMode(null);
    setListeningForAmount(false);
    resetTranscript();
    const cancelUtterance = new SpeechSynthesisUtterance("Transaction attempt canceled.");
    window.speechSynthesis.speak(cancelUtterance);
  };

  const handleSwipe = (direction) => {
    if (direction === "right") {
      navigator.vibrate(200); // Single vibration for swipe detected
      if (selectedBeneficiary && numericAmount) {
        const confirmationText = `Transferring $${numericAmount} to ${selectedBeneficiary.name}`;
        const confirmUtterance = new SpeechSynthesisUtterance(confirmationText);
        window.speechSynthesis.speak(confirmUtterance);
        navigator.vibrate([200, 100, 200]); // Double vibration for confirmation
        alert(confirmationText);
      } else {
        setError("Please select a beneficiary and specify an amount first.");
      }
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-screen">
      <div className="p-6 rounded-lg h-screen shadow-md max-w-lg mx-auto border-2 border-black">
        <div className="flex py-2 justify-between">
          <h2>Dashboard</h2>
          <h3>Wallet Balance: ₦{balance}</h3>
        </div>

        <AccessibleSendMoney/>

        <GestureButton
          onTap={() => startListening("command")}
          onDoubleTap={handleDoubleTap}
          onSwipe={handleSwipe}
        />
      </div>
    </div>
  );
};

export default Homepage;