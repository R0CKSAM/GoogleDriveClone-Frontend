import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/* ---------------- ENV + helpers ---------------- */

// Read base from Vite env and trim trailing slashes
const RAW = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

// If someone sets https://localhost:4000 by mistake, force http for dev
const API_BASE = RAW.startsWith("https://localhost:")
  ? RAW.replace(/^https:\/\//, "http://")
  : RAW;

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

// Small fetch with timeout so UI doesn’t hang forever
function timeoutFetch(url, options = {}, ms = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// Helpful logs once
console.log("[Auth] VITE_API_BASE =", API_BASE);
console.log("[Auth] origin =", ORIGIN);

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

  // live diagnostics
  const [diag, setDiag] = useState({ lastUrl: "", status: "", note: "" });

  const canSubmit = useMemo(() => {
    if (mode === "signup" && password !== confirm) return false;
    return !!email && !!password;
  }, [mode, email, password, confirm]);

  async function httpPost(path, body) {
    if (!API_BASE) {
      const m = "VITE_API_BASE is not defined. Add it in .env and restart the dev server.";
      console.error(m);
      setDiag((d) => ({ ...d, lastUrl: "(missing API_BASE)", status: "ENV_ERROR", note: m }));
      throw new Error(m);
    }
    const url = `${API_BASE}${path}`;
    setDiag({ lastUrl: url, status: "REQUESTING", note: "" });

    try {
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
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        // non-JSON error bodies are fine
      }

      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}: ${text || "Request failed"}`;
        setDiag({ lastUrl: url, status: `HTTP_${res.status}`, note: msg });
        throw new Error(msg);
      }

      setDiag({ lastUrl: url, status: "OK", note: "" });
      return data;
    } catch (e) {
      const note =
        e.name === "AbortError"
          ? "Timed out (no response). Is the backend up/reachable?"
          : e.message?.includes("Failed to fetch")
          ? "Failed to fetch (possible CORS or wrong URL). Check Network tab & CORS allow list."
          : e.message || "Request failed";
      setDiag((d) => ({ ...d, status: "NETWORK_ERROR", note }));
      throw e;
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);
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
    setErr("");
    setOk("");
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
    setErr("");
    setOk("");
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

  async function testApi() {
    setErr("");
    setOk("");
    if (!API_BASE) {
      setDiag({
        lastUrl: "(missing API_BASE)",
        status: "ENV_ERROR",
        note: "Define VITE_API_BASE and restart dev server.",
      });
      return;
    }
    const url = `${API_BASE}/`;
    setDiag({ lastUrl: url, status: "REQUESTING", note: "Testing health endpoint…" });
    try {
      const res = await timeoutFetch(url, {}, 10000);
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {}
      setDiag({ lastUrl: url, status: `HTTP_${res.status}`, note: JSON.stringify(json || text) });
      if (res.ok) setOk("Backend reachable from browser.");
      else setErr("Health check returned non-OK.");
    } catch (e) {
      setDiag({ lastUrl: url, status: "NETWORK_ERROR", note: e.message || "Failed to fetch" });
      setErr("Could not reach backend from browser (CORS/URL/network).");
    }
  }

  const onSubmit = mode === "login" ? handleLogin : handleSignup;

  return (
    <div className="min-h-[92vh] flex items-center justify-center px-4 bg-gradient-to-br from-rose-50 via-white to-purple-50">
      <div className="w-full max-w-md bg-white/90 backdrop-blur shadow-xl rounded-2xl p-6 border border-purple-100">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          <span className="bg-gradient-to-r from-purple-700 to-rose-700 bg-clip-text text-transparent">
            Welcome to GClone Drive
          </span>
        </h1>

        {/* Mode toggle */}
        <div className="mb-6 grid grid-cols-2 p-1 rounded-full bg-rose-50 border border-rose-100">
          <button
            className={`py-2 rounded-full text-sm transition ${
              mode === "login"
                ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow"
                : "text-rose-700 hover:bg-rose-100"
            }`}
            onClick={() => {
              setMode("login");
              setErr("");
              setOk("");
            }}
            type="button"
          >
            Log in
          </button>
          <button
            className={`py-2 rounded-full text-sm transition ${
              mode === "signup"
                ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow"
                : "text-rose-700 hover:bg-rose-100"
            }`}
            onClick={() => {
              setMode("signup");
              setErr("");
              setOk("");
            }}
            type="button"
          >
            Create account
          </button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg px-3 py-2 outline-none border-gray-300 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
            required
          />

          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPw ? "text" : "password"}
              placeholder={mode === "login" ? "Password" : "Create password"}
              className="w-full border rounded-lg px-3 py-2 pr-16 outline-none border-gray-300 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-purple-700 hover:text-rose-700"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {mode === "signup" && (
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type={showPw ? "text" : "password"}
              placeholder="Confirm password"
              className="w-full border rounded-lg px-3 py-2 outline-none border-gray-300 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
              required
            />
          )}

          {err && <p className="text-rose-600 text-sm">{err}</p>}
          {ok && <p className="text-green-600 text-sm">{ok}</p>}

          <div className="flex items-center justify-between pt-1">
            <button
              disabled={loading || !canSubmit}
              className="bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg shadow transition"
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
                className="text-sm text-purple-700 hover:text-rose-700 underline-offset-2 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
        </form>

        {/* Forgot password modal */}
        {forgotOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm border border-purple-100">
              <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-purple-700 to-rose-700 bg-clip-text text-transparent">
                Reset password
              </h2>
              <form onSubmit={handleForgot} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full border rounded-lg px-3 py-2 outline-none border-gray-300 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
                  required
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="border px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="bg-gradient-to-r from-purple-600 to-rose-600 text-white px-3 py-1.5 rounded-lg shadow hover:from-purple-700 hover:to-rose-700">
                    Send link
                  </button>
                </div>
              </form>
              <p className="text-xs text-gray-500 mt-3">
                You’ll receive an email with a reset link.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
