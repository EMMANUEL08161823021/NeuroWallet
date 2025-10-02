import React, { useRef, useState } from "react";
import AccessibleSendMoney from "../AccessibleSendMoney";
import { useApp } from "../../context/AppContext";

export default function Homepage() {
  const { balance, refreshBalance } = useApp(); // refreshBalance optional
  const [loading, setLoading] = useState(false);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

  const format = (val) => {
    const n = Number(val ?? 0);
    if (Number.isNaN(n)) return String(val ?? "0");
    return n.toLocaleString("en-NG");
  };

  const spokenMessage = (val) => `Your wallet balance is ${format(val)} naira.`;

  function speakText(text) {
    if (typeof window === "undefined") return;
    const synth = synthRef.current;
    if (!synth) return;
    try {
      if (synth.speaking || synth.pending) synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = navigator?.language || "en-NG";
      synth.speak(utter);
    } catch (err) {
      console.warn("TTS error", err);
    }
  }

  // Handler for tapping the page area (ignores clicks on interactive elements
  // and on elements marked with data-skip-speak)
  async function handlePageTap(e) {
    // ignore taps that are inside interactive elements
    speakText(spokenMessage(balance));
    const interactive = e.target.closest(
      "button, a, input, textarea, select, [role='button'], [role='link'], [contenteditable='true']"
    );
    if (interactive) return;

    // ignore taps on elements that explicitly opt-out
    if (e.target.closest("[data-skip-speak]")) return;



    setLoading(true);
    try {
      if (typeof refreshBalance === "function") {
        await refreshBalance(); // get freshest balance (assumed to update context)
      }
      // speak after refresh (or immediately if no refresh fn)
      speakText(spokenMessage(balance));
    } catch (err) {
      console.error("Failed to refresh balance", err);
      speakText(spokenMessage(balance));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={handlePageTap}
      className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen"
      role="button"
      aria-label="Tap the page background to hear wallet balance"
    >
      <div className="p-6 rounded-lg shadow-md max-w-lg mx-auto border-2 border-black">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dashboard</h2>

          <div className="flex items-center gap-3">

            <button
              onClick={(ev) => {
                ev.stopPropagation(); // keep button taps from triggering page tap
                // do reveal / refresh logic here if needed
              }}
              className="px-4 py-2 rounded-lg border bg-white dark:bg-gray-800"
            >
              {loading ? "Refreshing…" : `Balance: ₦${format(balance)}`}
            </button>
          </div>
        </div>

        <hr className="my-4" />

        {/* Wrap and opt-out so taps inside AccessibleSendMoney won't trigger page tap */}
        <div data-skip-speak onClick={(e) => e.stopPropagation()}>
          <AccessibleSendMoney />
        </div>
      </div>
    </div>
  );
}
