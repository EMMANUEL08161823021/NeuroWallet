// src/pages/MagicCallback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MagicCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const nonce = params.get("nonce");
      const redirect = params.get("redirect") || "/dashboard";

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await axios.get(
          `https://neurowallet.onrender.com/api/auth/magic/verify`,
          { params: { token, nonce, redirect } }
        );
        localStorage.setItem("access", res.data.token);
        navigate(redirect);
      } catch {
        navigate("/login");
      }
    })();
  }, [navigate]);

  return <div>Logging you in...</div>;
}
