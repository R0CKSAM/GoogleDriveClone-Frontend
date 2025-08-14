import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient"; // see file below
import toast from "react-hot-toast";

export default function Reset() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1) Try the new PKCE flow (?code=...) – harmless if not present
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch (_) {
          // ignore; not all links use PKCE
        }

        // 2) If still no session and we have #access_token / #refresh_token in hash, set it (old links)
        const hash = window.location.hash.startsWith("#")
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();

        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const type = hash.get("type"); // usually "recovery"

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        // 3) Verify session exists
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSessionValid(true);
        } else {
          toast.error("Auth session missing. Please use the latest link from your email.");
        }
      } catch (e) {
        console.error("[Reset] bootstrap error:", e);
        toast.error("Could not validate the reset link.");
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    if (!password || !confirm) return toast.error("Enter and confirm your new password.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password reset successful!");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      console.error("[Reset] updateUser error:", err);
      toast.error(err.message || "Password reset failed.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        Validating session…
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-red-600 font-medium">
          Invalid or expired reset link. Please request a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 flex items-center justify-center px-4">
        {/* Slight lift on larger screens */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-sky-100 p-6 sm:p-8 -translate-y-6 lg:-translate-y-10">
        <h1 className="text-2xl font-semibold text-sky-700 text-center">Reset password</h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-6">
            Choose a new password for your account.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                New password
            </label>
            <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 transition"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm new password
            </label>
            <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 transition"
            />
            </div>

            <button
            type="submit"
            className="w-full rounded-lg px-4 py-2 font-medium text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 active:scale-[.99] transition"
            >
            Reset password
            </button>
        </form>

        {/* Tiny footer helper (optional) */}
        <div className="mt-4 text-center text-xs text-gray-500">
            Make sure your new password is at least 6 characters.
        </div>
        </div>
    </div>
    );
}
