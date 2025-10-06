import React, { useRef, useState } from "react";
import { Fingerprint } from "lucide-react";

export default function FingerprintConsole(
  { handlePressStart, handlePressEnd, setMode, speak, onFund, listenForAmount }) {

  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const pointerIdRef = useRef(null);
  const movedRef = useRef(false);       // <--- track if pointer moved (to distinguish tap vs swipe)
  const downTimeRef = useRef(0);        // <--- optional: measure press duration
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);

  const HORIZ_THRESHOLD = 80;
  const VERT_THRESHOLD = 80;
  const TAP_MOVE_THRESHOLD = 10; // pixels — max move allowed to still consider it a tap
  const SNAP = 120;
  const SNAP_UP = 140;
  const RESET_DELAY = 700;

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    movedRef.current = false;
    downTimeRef.current = Date.now();

    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    handlePressStart?.();

    // block parent listeners
    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (startXRef.current == null || startYRef.current == null) return;
    const dx = e.clientX - startXRef.current;
    const dy = startYRef.current - e.clientY; // positive when swiping up

    // mark moved if beyond tiny threshold (so small tremors aren't treated as swipes)
    if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) {
      movedRef.current = true;
    }

    setPosX(dx);
    setPosY(Math.max(0, dy)); // only upward movement
    e.stopPropagation();
    e.preventDefault();
  };

  const finish = (clientX, clientY, e) => {
    if (startXRef.current == null || startYRef.current == null) return;
    const dx = clientX - startXRef.current;
    const dy = startYRef.current - clientY; // positive when moved up

    // prioritize horizontal if clearly horizontal, else vertical
    if (Math.abs(dx) > HORIZ_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        setMode?.("external");
        speak?.("External Transfer selected");
        setPosX(SNAP);
      } else {
        setMode?.("internal");
        speak?.("Internal Transfer selected");
        setPosX(-SNAP);
      }
    } else if (dy > VERT_THRESHOLD) {
      // Swipe up → fund wallet
      onFund?.();
      speak?.("Funding wallet");
      setMode?.("fund");
      speak?.("Fund Wallet selected, tap to say amount");
      setPosY(SNAP_UP);
    } else {
      // small movement — snap back (tap behavior is handled in onClick)
      setPosX(0);
      setPosY(0);
    }

    setTimeout(() => {
      setPosX(0);
      setPosY(0);
    }, RESET_DELAY);

    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    handlePressEnd?.();

    startXRef.current = null;
    startYRef.current = null;
    pointerIdRef.current = null;

    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerUp = (e) => finish(e.clientX, e.clientY, e);

  // Click handler: treat as a tap if pointer didn't move much.
  const onClick = (e) => {
    // ensure this click does not bubble to parent page handlers
    e.stopPropagation();
    e.preventDefault();

    // if the pointer moved more than TAP_MOVE_THRESHOLD, this is part of a swipe — ignore
    if (movedRef.current) return;

    // Good tap — call the listenForAmount function (if provided)
    if (typeof listenForAmount === "function") {
      try {
        listenForAmount();
        speak?.("Listening for amount");
      } catch (err) {
        console.warn("listenForAmount failed", err);
      }
    } else {
      speak?.("Voice amount input not available");
    }
  };

  return (
    <div className="fixed bottom-4 left-0 w-full flex items-center justify-center px-4 z-[1000]">
      <div className="max-w-4xl flex items-center justify-center">
        <div
          role="button"
          tabIndex={0}
          aria-label="Swipe left for internal, swipe right for external, swipe up to fund wallet. Tap to speak amount. Hold to confirm"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={onClick} // <-- quick tap triggers listenForAmount
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              handlePressStart?.();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") {
              handlePressEnd?.();
              // treat key activation as tap if no movement
              if (!movedRef.current) {
                if (typeof listenForAmount === "function") {
                  listenForAmount();
                  speak?.("Listening for amount");
                } else {
                  speak?.("Voice amount input not available");
                }
              }
            }
          }}
          style={{
            transform: `translate(${posX}px, ${-posY}px)`,
            transition: startXRef.current ? "none" : "transform 0.25s ease-out",
            touchAction: "pan-y",    // allow vertical scroll while enabling horizontal detection
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          className="w-36 h-36 rounded-full bg-blue-700 flex items-center justify-center text-white shadow-2xl select-none outline-none"
        >
          <Fingerprint size={56} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
