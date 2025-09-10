// AuthCallback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token");
    const to = hash.get("to") || "/dashboard";

    if (token) {
      localStorage.setItem("access", token);
      navigate(to);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return <div>Finishing login…</div>;
}
