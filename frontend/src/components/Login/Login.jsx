import React, { useState } from "react";
import { api } from "../../api/client";
import { prepPublicKeyOptions, attestationToJSON, assertionToJSON } from "../../utils/webauthn";
import { useNavigate, Link } from "react-router-dom";

const PASSKEY_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/webauthn`; // adjust if your router is mounted elsewhere (e.g. "/webauthn")

export default function Login() {
  const [tab, setTab] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const setNotice = (type, text) => setMsg({ type, text });



  // --- PIN login ---
  const onPinLogin = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.post("/api/pin/login", { email, pin });
      localStorage.setItem("access", data.token);
      setNotice("ok", "Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      setNotice("err", err?.response?.data?.error || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  // --- Magic link ---
  const onMagicLink = async () => {
    setBusy(true); 
    setMsg(null);
    try {
      await api.post("/api/auth/magic-link", { email, clientNonce: "web-" + crypto.randomUUID() });
      setNotice("ok", "If the email exists, a sign-in link was sent.");
    } catch {
      setNotice("err", "Could not send magic link");
    } finally {
      setBusy(false);
    }
  };

  function bufferToBase64URL(buffer) {
    if (!buffer) return null;
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  function attestationToJSON(credential) {
    if (!credential) return null;

    return {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
        attestationObject: bufferToBase64URL(credential.response.attestationObject),
      },
    };
  }



  // --- Passkey Registration (for sign-up, can also be used after login to enroll) ---
  const onPasskeyRegister = async () => {
    setBusy(true);
    setMsg(null);

    try {
      // 1. Get registration options
      const { data: options } = await api.post(
        "https://neurowallet.onrender.com/api/webauthn/generate-registration-options",
        { email }
      );

      // 2. Prepare options
      const publicKey = prepPublicKeyOptions(options);

      // 3. Ask authenticator
      const credential = await navigator.credentials.create({ publicKey });
      if (!credential) throw new Error("No credential created");

      // 4. Convert
      const attestationResponse = attestationToJSON(credential);

      // 5. Send to backend
      const verifyRes = await fetch("https://neurowallet.onrender.com/api/webauthn/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, attestationResponse }),
      });

      const result = await verifyRes.json();
      console.log("Verify result:", result);

      // 6. UI Feedback
      if (result.success) {
        setNotice("ok", "✅ Passkey registered successfully! You can now log in with your device.");
        setTab("login"); // redirect user to login tab
      } else {
        setNotice("err", "❌ Passkey registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Passkey registration error:", err);
      setNotice("err", "⚠️ Something went wrong during registration.");
    } finally {
      setBusy(false);
    }
  };


  const onPasskeyLogin = async () => {
    setBusy(true);
    setMsg(null);

    try {
      // 1️⃣ Get challenge/options from backend
      const { data: options } = await api.post(
        "https://neurowallet.onrender.com/api/webauthn/generate-authentication-options",
        { email }
      );

      const publicKey = prepPublicKeyOptions(options);

      // 2️⃣ Ask authenticator for credentials
      const assertion = await navigator.credentials.get({ publicKey });

      // 3️⃣ Convert ArrayBuffers → base64url for transport
      const auth = assertionToJSON(assertion);

      // 4️⃣ Send to backend for verification
      const { data: verify } = await api.post(
        "https://neurowallet.onrender.com/api/webauthn/verify-authentication",
        {
          email,
          assertionResponse: auth,
        }
      );

      if (verify?.verified) {
        setNotice("ok", "Passkey verified");
        navigate("/dashboard");
      } else {
        setNotice("err", "Passkey authentication failed");
      }
    } catch (e) {
      console.error("Passkey login error:", e);
      setNotice("err", "Passkey authentication failed");
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-lg font-semibold">NeuroWallet — Secure Access</h1>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("login")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${tab==="login" ? "bg-blue-600 text-white":"bg-gray-100 text-gray-700"}`}
            >
              Log in
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`px-3 py-2 rounded-md text-sm font-medium ${tab==="signup" ? "bg-blue-600 text-white":"bg-gray-100 text-gray-700"}`}
            >
              Sign up
            </button>
          </div>

          {msg && (
            <div className={`mb-4 text-sm px-3 py-2 rounded border
              ${msg.type==="ok" ? "bg-green-50 text-green-700 border-green-200":"bg-red-50 text-red-700 border-red-200"}`}>
              {msg.text}
            </div>
          )}

          {/* Shared email field */}
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {tab === "login" && (
            <>
              {/* PIN form */}
              <form onSubmit={onPinLogin} className="space-y-3">
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                  PIN
                </label>
                <input
                  id="pin"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e)=>setPin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy ? "Signing in..." : "Sign in with PIN"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="px-3 text-xs text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Passkey + Magic link */}
              <div className="grid gap-2">
                <button
                  onClick={onPasskeyLogin}
                  disabled={busy || !("credentials" in navigator)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 font-medium disabled:opacity-60"
                >
                  Use Passkey
                </button>
                <button
                  onClick={onMagicLink}
                  disabled={busy || !email}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 font-medium disabled:opacity-60"
                >
                  Email me a magic link
                </button>
              </div>
            </>
          )}

          {tab === "signup" && (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Create your account with a magic link or a passkey. You can add a PIN later.
              </p>
              <div className="grid gap-2">
                <button
                  onClick={onMagicLink}
                  disabled={busy || !email}
                  className="w-full h-10 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  Continue with Email (Magic Link)
                </button>
                <button
                  onClick={onPasskeyRegister}
                  disabled={busy || !("credentials" in navigator)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white hover:bg-gray-50 font-medium disabled:opacity-60"
                >
                  Create Passkey
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Tip: After you’re in, set a 6-digit PIN for quick confirmations.
              </p>
            </>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            <Link to="/" className="underline underline-offset-2 hover:text-gray-800">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
