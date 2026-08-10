import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, KeyRound } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

// Reached two ways:
// 1. Supabase redirects here after someone clicks the "reset password" link
//    in their email — supabase-js auto-detects the recovery token in the URL
//    and fires a PASSWORD_RECOVERY auth event, giving us a real session we
//    can use to set a new password.
// 2. Someone navigates here directly without a recovery session — in that
//    case we just show the "enter your email" form instead.
export default function ResetPassword() {
  const { session, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [isRecovery, setIsRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSetPassword(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password needs to be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setNotice("Password updated! Taking you to your profile...");
      setTimeout(() => navigate("/profile"), 1200);
    } catch (err) {
      setError(err.message || "Couldn't update your password. The link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  const showSetPasswordForm = isRecovery || !!session;

  return (
    <div className="min-h-[600px] flex items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-sm">
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 w-[70px] h-[22px] bg-white/55 border border-white/70 z-10" />
        <div className="p-8 bg-cream border-2 border-ink shadow-card">
          <Link
            to="/login"
            className="flex items-center gap-1 text-xs font-bold font-body text-inkSoft mb-6 w-fit"
          >
            <ArrowLeft size={14} /> Back to login
          </Link>

          <h1 className="font-display text-ink text-3xl">Set a new password</h1>
          <p className="font-body text-inkSoft text-[13px] font-bold mb-6">
            {showSetPasswordForm
              ? "Choose a new password for your account."
              : "Open the reset link from your email on this device to continue."}
          </p>

          {error && (
            <p className="mb-4 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-4 text-xs font-bold font-body text-ink bg-mint/40 border border-ink px-3 py-2">
              {notice}
            </p>
          )}

          {showSetPasswordForm ? (
            <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">NEW PASSWORD</span>
                <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-ink">
                  <Lock size={15} className="text-inkSoft" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="font-body w-full border-none outline-none text-sm bg-transparent"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">CONFIRM PASSWORD</span>
                <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-ink">
                  <Lock size={15} className="text-inkSoft" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="font-body w-full border-none outline-none text-sm bg-transparent"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 py-2.5 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin disabled:opacity-60"
              >
                {busy ? "Updating..." : "Update password"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3 items-center text-center py-6">
              <KeyRound size={28} className="text-inkSoft" />
              <p className="font-body text-sm text-inkSoft">
                Didn't get a link, or it expired?{" "}
                <Link to="/login" className="text-red font-extrabold">
                  Request a new one
                </Link>{" "}
                from the login page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
