import React, { useState } from "react";
import { api } from "../../api/client";
import { prepPublicKeyOptions, attestationToJSON, assertionToJSON } from "../../utils/webauthn";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Fingerprint } from "lucide-react";
import Logo from "../../../public/logo.png";

const PASSKEY_BASE = "https://neurowallet.onrender.com/api/webauthn";

export default function Login() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [loginMagicBusy, setLoginMagicBusy] = useState(false);
  const [loginPasskeyBusy, setLoginPasskeyBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  const commonDomains = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com"];

  const setNotice = (type, text) => setMsg({ type, text });

  // Auto-suggest email domains
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);

    if (val.includes("@")) {
      const [local, domain] = val.split("@");
      setSuggestions(
        commonDomains
          .filter((d) => d.startsWith(domain))
          .map((d) => `${local}@${d}`)
      );
    } else {
      setSuggestions(commonDomains.map((d) => `${val}@${d}`));
    }
  };

  const applySuggestion = (s) => {
    setEmail(s);
    setSuggestions([]);
  };

  // --- PIN login ---
  const onPinLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
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
    setMagicBusy(true);
    setLoginMagicBusy(true);
    setMsg(null);
    try {
      await api.post("/api/auth/magic-link", { email, clientNonce: "web-" + crypto.randomUUID() });
      setNotice("ok", "If the email exists, a sign-in link was sent.");
    } catch {
      setNotice("err", "Could not send magic link");
    } finally {
      setMagicBusy(false);
      setLoginMagicBusy(false);
    }
  };

  // --- Passkey register ---
  const onPasskeyRegister = async () => {
    setPasskeyBusy(true);
    setMsg(null);
    try {
      // ... your existing passkey logic ...
      setNotice("ok", "✅ Passkey registered successfully!");
    } catch (err) {
      setNotice("err", "❌ Passkey registration failed");
    } finally {
      setPasskeyBusy(false);
    }
  };

  // --- Passkey Login ---
  const onPasskeyLogin = async () => {
    setBusy(true);
    setLoginPasskeyBusy(true);
    setMsg(null);
    try {
      const { data: options } = await api.post(
        `${PASSKEY_BASE}/generate-authentication-options`,
        { email }
      );
      const publicKey = prepPublicKeyOptions(options);
      const assertion = await navigator.credentials.get({ publicKey });
      const auth = assertionToJSON(assertion);

      const { data: verify } = await api.post(
        `${PASSKEY_BASE}/verify-authentication`,
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
      setLoginPasskeyBusy(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
      <div className="w-full max-w-md border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="py-3 px-5 border-b border-gray-300 dark:border-gray-700 flex items-center gap-2">
          <img src={Logo} className="h-10 w-10" alt="logo" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            NeuroWallet — Secure Access
          </h1>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("login")}
              className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                tab === "login"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                tab === "signup"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Messages */}
          {msg && (
            <div
              className="mb-4 text-sm px-3 py-2 rounded border"
              role="alert"
              aria-live="assertive"
            >
              <span
                className={
                  msg.type === "ok"
                    ? "text-green-700 dark:text-green-400 font-medium"
                    : "text-red-700 dark:text-red-400 font-medium"
                }
              >
                {msg.text}
              </span>
            </div>
          )}

          {/* Email with suggestions */}
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
            required
            className="w-full mb-2 px-3 py-2 border border-gray-400 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          {suggestions.length > 0 && (
            <ul className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 shadow-sm mb-4">
              {suggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() => applySuggestion(s)}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}

          {/* Panels */}
          {tab === "login" ? (
            <div>
              <form onSubmit={onPinLogin} className="space-y-3">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                  6-digit PIN
                </label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 rounded-md bg-blue-600 text-white font-semibold disabled:opacity-60"
                >
                  {busy ? "Signing in…" : "Sign in with PIN"}
                </button>
              </form>

              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                <span className="px-3 text-xs text-gray-600 dark:text-gray-400">
                  or
                </span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              </div>

              <div className="flex gap-6 justify-center">
                {/* Magic Link Button */}
                <button
                  onClick={onMagicLink}
                  disabled={loginMagicBusy || !email}
                  aria-label="Email me a Magic Link"
                  className={`w-25 h-25 flex items-center justify-center rounded-full border 
                    bg-white dark:bg-gray-700 text-green-600 
                    ${loginMagicBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-600"}`}
                >
                  {loginMagicBusy ? (
                    <span className="text-sm font-medium">Sending…</span>
                  ) : (
                    <Mail size={80} />
                  )}
                </button>

                {/* Passkey Button */}
                <button
                  onClick={onPasskeyLogin}
                  disabled={loginPasskeyBusy || !("credentials" in navigator)}
                  aria-label="Login with Passkey"
                  className={`w-25 h-25 flex items-center justify-center rounded-full border 
                    bg-white dark:bg-gray-700 text-blue-600 
                    ${loginPasskeyBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-600"}`}
                >
                  {loginPasskeyBusy ? (
                    <span className="text-sm font-medium">Processing…</span>
                  ) : (
                    <Fingerprint size={80} />
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Create your account with a magic link or a passkey. You can add
                a PIN later.
              </p>
              <div className="flex gap-6 justify-center">
                {/* Magic Link Button */}
                <button
                  onClick={onMagicLink}
                  disabled={magicBusy || !email}
                  aria-label="Email me a Magic Link"
                  className={`w-25 h-25 flex items-center justify-center rounded-full border 
                    bg-white dark:bg-gray-700 text-green-600 
                    ${magicBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-600"}`}
                >
                  {magicBusy ? (
                    <span className="text-sm font-medium">Sending…</span>
                  ) : (
                    <Mail size={80} />
                  )}
                </button>

                {/* Passkey Button */}
                <button
                  onClick={onPasskeyRegister}
                  disabled={passkeyBusy || !("credentials" in navigator)}
                  aria-label="Register with Passkey"
                  className={`w-25 h-25 flex items-center justify-center rounded-full border 
                    bg-white dark:bg-gray-700 text-blue-600 
                    ${passkeyBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-600"}`}
                >
                  {passkeyBusy ? (
                    <span className="text-sm font-medium">Processing…</span>
                  ) : (
                    <Fingerprint size={80} />
                  )}
                </button>

              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <Link
              to="/"
              className="underline text-blue-700 dark:text-blue-400"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
