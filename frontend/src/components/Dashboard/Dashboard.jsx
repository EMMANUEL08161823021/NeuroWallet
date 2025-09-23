import { useSwipeable } from "react-swipeable";
import { useState, useEffect } from "react";
import HomePage from "../Homepage/Homepage.jsx";
import Transactions from "../Transaction/Transaction.jsx";
import Profile from "../Profile/Profile.jsx";
import Settings from "../Settings/Settings.jsx";
import { Link } from "react-router-dom";
// import FingerprintConsole from "../FingerprintConsole/FingerprintConsole.jsx";
// import AccessibleSendMoney from "../AccessibleSendMoney.jsx";

export default function Dashboard() {
  const [index, setIndex] = useState(0);
  const pages = [<HomePage />, <Transactions />, <Profile />, <Settings />];
  const labels = ["Home", "Transactions", "Profile", "Settings", "Send"];

  // 🔊 Speak page name + update screen reader region
  useEffect(() => {
    const message = `You are now on the ${labels[index]} page`;

    // Voice feedback
    const msg = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.cancel(); // stop overlap
    window.speechSynthesis.speak(msg);

    // Update live region for screen readers
    const liveRegion = document.getElementById("live-region");
    if (liveRegion) liveRegion.textContent = message;
  }, [index]);

  const handlers = useSwipeable({
    onSwipedLeft: () => setIndex((i) => Math.min(i + 1, pages.length - 1)),
    onSwipedRight: () => setIndex((i) => Math.max(i - 1, 0)),
    trackMouse: true, // allows desktop testing with mouse
  });

  return (
    <div
      {...handlers}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    >
      {/* Current page */}
      {pages[index]}

      {/* 🔊 Hidden live region for screen readers */}
      <div id="live-region" aria-live="polite" className="sr-only"></div>

    </div>
  );
}
