// src/components/Dashboard.jsx
import { useSwipeable } from "react-swipeable";
import { useState, useEffect, useRef } from "react";
import HomePage from "../Homepage/Homepage.jsx";
import Transactions from "../Transaction/Transaction.jsx";
import Profile from "../Profile/Profile.jsx";
import Settings from "../Settings/Settings.jsx";

export default function Dashboard() {
  const [index, setIndex] = useState(0);
  const pages = [<HomePage />, <Transactions />, <Profile />, <Settings />];
  const labels = ["Home", "Transactions", "Profile", "Settings", "Send"];

  // ref to remember whether the swipe started inside the allowed area
  const allowSwipeRef = useRef(true);

  // percent of viewport height that should be swipeable from the top.
  // 0.65 => top 65% swipeable, bottom 35% NOT swipeable.
  const SWIPE_PERCENT = 0.60;

  useEffect(() => {
    const message = `You are now on the ${labels[index]} page`;
    const msg = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.cancel(); // stop overlap
    window.speechSynthesis.speak(msg);

    const liveRegion = document.getElementById("live-region");
    if (liveRegion) liveRegion.textContent = message;
  }, [index]);

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      if (!allowSwipeRef.current) return;
      setIndex((i) => Math.min(i + 1, pages.length - 1));
    },
    onSwipedRight: (eventData) => {
      if (!allowSwipeRef.current) return;
      setIndex((i) => Math.max(i - 1, 0));
    },
    trackMouse: true,
    trackTouch: true,
  });

  // Decide allowSwipeRef when gesture starts
  const handleStartPosition = (startY) => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const allowedY = vh * SWIPE_PERCENT; // top px that's allowed
    allowSwipeRef.current = startY <= allowedY;
    // optional: console.log("startY", startY, "allowedY", allowedY, "allowSwipe", allowSwipeRef.current);
  };

  // bind to top-level touchstart / mousedown so we can gate the swipe
  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) {
      allowSwipeRef.current = true;
      return;
    }
    handleStartPosition(t.clientY);
  };

  const onMouseDown = (e) => {
    handleStartPosition(e.clientY);
  };

  // UI: compute the bottom demarkation height (35%)
  const bottomPercent = Math.round((1 - SWIPE_PERCENT) * 100);

  return (
    <div
      {...handlers}
      onTouchStart={onTouchStart}
      onMouseDown={onMouseDown}
      className="relative min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    >
      {/* Current page */}
      <div className="min-h-screen">{pages[index]}</div>

      {/* Hidden live region for screen readers */}
      <div id="live-region" aria-live="polite" className="sr-only"></div>

      {/* Visual demarcation for non-swipe zone (bottom 35%) */}
      <div
        aria-hidden="true"
        style={{ height: `${bottomPercent}vh` }}
        className="fixed bottom-0 left-0 right-0 pointer-events-none"
      >
      </div>
    </div>
  );
}
