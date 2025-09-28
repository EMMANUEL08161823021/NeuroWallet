// FingerprintConsole.jsx (or inside AccessibleSendMoney where the button is)
import { useRef, useState } from "react";
import { Fingerprint } from "lucide-react";

export default function FingerprintConsole({ handlePressStart, handlePressEnd, setMode, speak }) {
  const startXRef = useRef(null);
  const pointerIdRef = useRef(null);
  const [pos, setPos] = useState(0);

  const SWIPE_THRESHOLD = 80;
  const SNAP = 120;
  const RESET_DELAY = 700;

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;

    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    handlePressStart?.();

    // block parent listeners
    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (startXRef.current == null) return;
    setPos(e.clientX - startXRef.current);
    e.stopPropagation();
    e.preventDefault();
  };

  const finish = (clientX, e) => {
    if (startXRef.current == null) return;
    const dx = clientX - startXRef.current;
    if (dx > SWIPE_THRESHOLD) {
      setMode?.("external"); speak?.("External selected"); setPos(SNAP);
    } else if (dx < -SWIPE_THRESHOLD) {
      setMode?.("internal"); speak?.("Internal selected"); setPos(-SNAP);
    } else {
      setPos(0);
    }

    setTimeout(() => setPos(0), RESET_DELAY);

    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    handlePressEnd?.();

    startXRef.current = null;
    pointerIdRef.current = null;

    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerUp = (e) => finish(e.clientX, e);

  return (
    <div className="fixed bottom-4 left-0 w-full flex items-center justify-center px-4 z-[1000]">
      <div className="max-w-4xl flex items-center justify-center">
        <div
          role="button"
          tabIndex={0}
          aria-label="Swipe left for internal, swipe right for external. Hold to confirm"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") handlePressStart?.(); }}
          onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") handlePressEnd?.(); }}
          style={{
            transform: `translateX(${pos}px)`,
            transition: startXRef.current ? "none" : "transform 0.25s ease-out",
            touchAction: "pan-y",    // critical: allow vertical scroll, block horizontal OS gestures on many browsers
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
