import { useSwipeable } from "react-swipeable";
import { useState } from "react";
import HomePage from "../Homepage/HomePage";
import Transactions from "../Transaction/Transaction";
import Profile from "../Profile/Profile";
import Settings from "../Settings/Settings";
import FingerprintConsole from "../FingerPrintConsole";

export default function Dashboard() {
  const [index, setIndex] = useState(0);
  const pages = [<HomePage />, <Transactions />, <Profile />, <Settings />];

  const handlers = useSwipeable({
    onSwipedLeft: () => setIndex((i) => Math.min(i + 1, pages.length - 1)),
    onSwipedRight: () => setIndex((i) => Math.max(i - 1, 0)),
    trackMouse: true, // allows desktop testing with mouse
  });

  return (
    <div {...handlers} className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {pages[index]}
      
      {/* Optional: navigation dots */}
      <div className="fixed bottom-4 w-full flex justify-center gap-2">

        <FingerprintConsole/>
        {/* {["🏠","💳","👤","⚙️"].map((icon, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`text-2xl ${index === i ? "opacity-100" : "opacity-40"}`}
          >
            {icon}
          </button>
        ))} */}
      </div>
    </div>
  );
}
