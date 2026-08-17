import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate("/profile");
      } else if (mode === "signup") {
        await signUp(email, password);
        setNotice("Check your campus email to confirm your account, then log in. If not found please check in the spam section with header QUAD. ");
        setMode("login");
      } else if (mode === "forgot") {
        await resetPasswordForEmail(email);
        setNotice("If that email has an account, a reset link is on its way — check your inbox.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[600px] flex items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-sm">
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 w-[70px] h-[22px] bg-white/55 border border-white/70 z-10" />
        <div className="p-8 bg-cream border-2 border-ink shadow-card">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs font-bold font-body text-inkSoft mb-6 w-fit"
          >
            <ArrowLeft size={14} /> Back to the board
          </Link>

          <h1 className="font-display text-ink text-3xl">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Join the Quad" : "Reset your password"}
          </h1>
          <p className="font-body text-inkSoft text-[13px] font-bold mb-6">
            {mode === "login"
              ? "Log in with your campus email."
              : mode === "signup"
              ? "Sign up with your campus email."
              : "We'll email you a link to set a new password."}
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-inkSoft">CAMPUS EMAIL</span>
              <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-ink">
                <Mail size={15} className="text-inkSoft" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="font-body w-full border-none outline-none text-sm bg-transparent"
                />
              </div>
            </label>
            {mode !== "forgot" && (
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">PASSWORD</span>
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
            )}

            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setNotice("");
                }}
                className="self-end text-xs font-bold font-body text-inkSoft hover:text-red -mt-2"
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 py-2.5 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin disabled:opacity-60"
            >
              {busy
                ? "Please wait..."
                : mode === "login"
                ? "Log in"
                : mode === "signup"
                ? "Create account"
                : "Send reset link"}
            </button>
          </form>

          <p className="font-body text-[13px] text-inkSoft font-bold mt-5 text-center">
            {mode === "forgot" ? (
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setNotice("");
                }}
                className="text-red font-extrabold bg-transparent border-none cursor-pointer"
              >
                Back to log in
              </button>
            ) : (
              <>
                {mode === "login" ? "New to campus? " : "Already have an account? "}
                <button
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError("");
                    setNotice("");
                  }}
                  className="text-red font-extrabold bg-transparent border-none cursor-pointer"
                >
                  {mode === "login" ? "Sign up" : "Log in"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
