// src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Mail, Lock, Eye, EyeOff, Info } from "lucide-react";

/* ---------------- ENV + helpers ---------------- */

// Read base from Vite env and trim trailing slashes
const RAW = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

// If someone sets https://localhost:4000 by mistake, force http for dev
const API_BASE = RAW.startsWith("https://localhost:")
  ? RAW.replace(/^https:\/\//, "http://")
  : RAW;

function timeoutFetch(url, options = {}, ms = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

/* ---------------- Component ---------------- */

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const canSubmit = useMemo(() => {
    if (mode === "signup" && password !== confirm) return false;
    return !!email && !!password;
  }, [mode, email, password, confirm]);

  async function httpPost(path, body) {
    if (!API_BASE) throw new Error("VITE_API_BASE is not defined. Add it in .env and restart dev server.");
    const url = `${API_BASE}${path}`;
    const res = await timeoutFetch(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      15000
    );

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}

    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}: ${text || "Request failed"}`;
      throw new Error(msg);
    }
    return data;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErr(""); setOk(""); setLoading(true);
    try {
      const { session } = await httpPost("/api/auth/login", { email, password });
      if (!session?.access_token) throw new Error("No access token returned");
      login(session.access_token);
      navigate("/", { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setErr(""); setOk("");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");
    setLoading(true);
    try {
      await httpPost("/api/auth/signup", { email, password });
      const { session } = await httpPost("/api/auth/login", { email, password });
      if (!session?.access_token) throw new Error("No access token returned");
      login(session.access_token);
      navigate("/", { replace: true });
    } catch (e) {
      setErr(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      // Only works if backend adds POST /api/auth/forgot
      const data = await httpPost("/api/auth/forgot", { email: forgotEmail || email });
      setOk(data.message || "If this email exists, a reset link has been sent.");
      setForgotOpen(false);
    } catch (e) {
      setErr(
        e.message?.includes("404")
          ? "Password reset not enabled on the backend yet. Add POST /api/auth/forgot."
          : e.message || "Failed to start password reset"
      );
      setForgotOpen(false);
    }
  }

  const onSubmit = mode === "login" ? handleLogin : handleSignup;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-rose-50 via-white to-purple-50">
      <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        {/* Brand + Welcome */}
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-purple-100">
            <LogoMark className="h-10 w-10" />
            <span className="bg-gradient-to-r from-purple-700 to-rose-700 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              Sam Gdrive
            </span>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-gray-900">
            {mode === "login" ? "Welcome" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login" ? "Log in to continue." : "It only takes a minute."}
          </p>
        </div>

        {/* Centered tabs */}
        <div className="mt-6 flex justify-center">
          <div className="grid w-[320px] grid-cols-2 rounded-full border border-rose-100 bg-rose-50 p-1">
            <button
              type="button"
              className={`rounded-full py-2 text-sm transition ${
                mode === "login"
                  ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow"
                  : "text-rose-700 hover:bg-rose-100"
              }`}
              onClick={() => { setMode("login"); setErr(""); setOk(""); }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`rounded-full py-2 text-sm transition ${
                mode === "signup"
                  ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow"
                  : "text-rose-700 hover:bg-rose-100"
              }`}
              onClick={() => { setMode("signup"); setErr(""); setOk(""); }}
            >
              Create account
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div aria-live="polite" className="mt-4 space-y-2">
          {err && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}
          {ok && !err && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {ok}
            </div>
          )}
        </div>

        {/* Form */}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">
              {mode === "login" ? "Password" : "Create password"}
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPw ? "text" : "password"}
                placeholder={mode === "login" ? "Your password" : "At least 6 characters"}
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-12 py-2 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-purple-700 hover:bg-purple-50"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {mode === "signup" && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Confirm password</span>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showPw ? "text" : "password"}
                placeholder="Re-enter password"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
                required
              />
            </label>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              disabled={loading || !canSubmit}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-rose-600 px-4 py-2 text-sm text-white shadow transition hover:from-purple-700 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setErr("");
                  setOk("");
                  setForgotEmail(email);
                }}
                className="text-sm text-purple-700 underline-offset-2 hover:text-rose-700 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
        </form>

        {/* Helper note */}
        <div className="mt-4 inline-flex items-center gap-1 text-xs text-gray-500">
          <Info className="h-3.5 w-3.5" />
          Use the same credentials you created during sign up.
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setForgotOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-purple-100 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="reset-title"
              className="mb-3 bg-gradient-to-r from-purple-700 to-rose-700 bg-clip-text text-lg font-semibold text-transparent"
            >
              Reset password
            </h2>
            <form onSubmit={handleForgot} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
                  required
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="rounded-lg bg-gradient-to-r from-purple-600 to-rose-600 px-3 py-1.5 text-sm text-white shadow hover:from-purple-700 hover:to-rose-700">
                  Send link
                </button>
              </div>
            </form>
            <p className="mt-3 text-xs text-gray-500">You’ll receive an email with a reset link.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* Minimal, professional logo (matches Dashboard) */
function LogoMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Sam Gdrive logo">
      <defs>
        <linearGradient id="sgd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <path
        d="M4 8.6c0-.7.37-1.35.98-1.7l6-3.3a2 2 0 0 1 2.04 0l6 3.3c.61.35.98 1.01.98 1.7v6.8c0 .7-.37 1.35-.98 1.7l-6 3.3a2 2 0 0 1-2.04 0l-6-3.3A1.98 1.98 0 0 1 4 15.4V8.6z"
        fill="url(#sgd)"
      />
      <path d="M8 12h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}
