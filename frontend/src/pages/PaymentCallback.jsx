// PaymentCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your payment, please wait...");

  useEffect(() => {
    let mounted = true;

    const verifyPayment = async () => {
      const reference = searchParams.get("reference");
      const token = localStorage.getItem("token") || localStorage.getItem("access") || "";

      if (!reference) {
        console.warn("No reference found in URL. Redirecting to dashboard.");
        setMessage("No payment reference found — returning to dashboard...");
        // short delay so screen reader / user can hear message
        setTimeout(() => {
          try { navigate("/dashboard", { replace: true }); } catch (e) { window.location.href = "/dashboard"; }
        }, 800);
        return;
      }

      setMessage("Verifying payment...");

      try {
        console.log("Verifying payment reference:", reference);
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL || ""}/api/wallet/verify/${encodeURIComponent(reference)}`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            timeout: 15000,
          }
        );

        console.log("Payment verify response:", res?.data);
        if (!mounted) return;

        // show success to user briefly (avoid blocking with alert)
        setMessage(res.data?.msg || "Payment verified. Redirecting to dashboard...");
        // give screen reader a moment to read message
        setTimeout(() => {
          try {
            // prefer SPA navigation
            navigate("/dashboard", { replace: true });
          } catch (err) {
            // fallback to hard navigation if SPA nav fails
            window.location.href = "/dashboard";
          }
        }, 700);
      } catch (err) {
        console.error("Payment verification failed:", err);
        if (!mounted) return;

        const errMsg = err?.response?.data?.msg || err?.message || "Verification failed";
        setMessage(errMsg + " — returning to dashboard...");
        // navigate back anyway after a short pause
        setTimeout(() => {
          try { navigate("/dashboard", { replace: true }); } catch (e) { window.location.href = "/dashboard"; }
        }, 1200);
      }
    };

    verifyPayment();

    return () => { mounted = false; };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <p className="text-lg font-medium">{message}</p>
        <p className="mt-4 text-sm text-gray-500">If you are not redirected automatically, <a href="/dashboard" className="underline">click here</a>.</p>
      </div>
    </div>
  );
};

export default PaymentCallback;
