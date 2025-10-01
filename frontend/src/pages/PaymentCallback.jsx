// PaymentCallback.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your payment, please wait...");
  const inProgress = useRef(false); // prevents duplicate calls
  const mounted = useRef(true);
  const liveRef = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get("reference");
      const token = localStorage.getItem("token") || localStorage.getItem("access") || "";

      if (!reference) {
        console.warn("No reference found in URL. Redirecting to dashboard.");
        setMessage("No payment reference found — returning to dashboard...");
        // short delay so screen reader / user can hear message
        setTimeout(() => {
          try {
            navigate("/dashboard", { replace: true });
          } catch (e) {
            window.location.href = "/dashboard";
          }
        }, 800);
        return;
      }

      // Prevent duplicate/parallel verification attempts
      if (inProgress.current) {
        console.log("Verification already in progress for reference:", reference);
        return;
      }
      inProgress.current = true;

      setMessage("Verifying payment...");

      // Use AbortController to cancel request if unmounted
      const controller = new AbortController();

      try {
        console.log("Verifying payment reference:", reference);

        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/wallet/verify/${encodeURIComponent(reference)}`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            timeout: 15000,
            signal: controller.signal,
          }
        );

        console.log("Payment verify response:", res?.data);

        if (!mounted.current) return;

        // Prefer friendly msg from backend, otherwise fallback
        const successMsg = res.data?.msg || "Payment verified. Redirecting to dashboard...";
        setMessage(successMsg);

        // allow screen reader speak then navigate
        setTimeout(() => {
          try {
            navigate("/dashboard", { replace: true });
          } catch (err) {
            window.location.href = "/dashboard";
          }
        }, 700);
      } catch (err) {
        if (!mounted.current) return;

        // distinguish timeout/abort vs server response
        if (axios.isCancel(err)) {
          console.warn("Payment verify request cancelled");
          setMessage("Verification cancelled.");
          setTimeout(() => {
            try { navigate("/dashboard", { replace: true }); } catch (e) { window.location.href = "/dashboard"; }
          }, 700);
          inProgress.current = false;
          return;
        }

        console.error("Payment verification failed:", err);

        // prefer structured message from backend
        const backendMsg = err?.response?.data?.msg || err?.response?.data?.message;
        const errMsg = backendMsg || err?.message || "Verification failed. Returning to dashboard.";

        setMessage(errMsg + " — returning to dashboard...");

        // If backend provides a 4xx and message, navigate after a little longer so screen reader can finish
        setTimeout(() => {
          try {
            navigate("/dashboard", { replace: true });
          } catch (e) {
            window.location.href = "/dashboard";
          }
        }, 1200);
      } finally {
        inProgress.current = false;
        // abort controller cleanup
        try { controller.abort(); } catch (e) { /* ignore */ }
      }
    };

    verifyPayment();

    // cleanup: nothing else required since we abort in finally and mounted flag handles early exits
  }, [searchParams, navigate]);

  // update live region for screen readers
  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = message;
  }, [message]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <p className="text-lg font-medium">{message}</p>

        <div aria-live="polite" ref={liveRef} className="sr-only" />

        <p className="mt-4 text-sm text-gray-500">
          If you are not redirected automatically,{" "}
          <a href="/dashboard" className="underline">
            click here
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default PaymentCallback;
