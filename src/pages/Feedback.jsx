import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { submitFeedback, FEEDBACK_CATEGORIES } from "../lib/feedback";

export default function Feedback() {
  const { user } = useAuth();

  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await submitFeedback({
        userId: user?.id,
        name: user ? undefined : name,
        email: user ? undefined : email,
        category,
        message,
      });
      setDone(true);
      setMessage("");
    } catch (err) {
      setError(err.message || "Couldn't send that — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[600px] flex items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 w-[70px] h-[22px] bg-white/55 border border-white/70 z-10" />
        <div className="p-8 bg-cream border-2 border-ink shadow-card">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs font-bold font-body text-inkSoft mb-6 w-fit"
          >
            <ArrowLeft size={14} /> Back to the board
          </Link>

          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <MessageSquare size={28} className="text-red" />
              <h1 className="font-display text-ink text-2xl">Thanks!</h1>
              <p className="font-body text-inkSoft text-sm">
                We've got your feedback — it genuinely helps shape what gets built next.
              </p>
              <button
                type="button"
                onClick={() => setDone(false)}
                className="mt-2 text-xs font-bold font-body text-red underline"
              >
                Send more feedback
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={20} className="text-red" />
                <h1 className="font-display text-ink text-3xl">Send feedback</h1>
              </div>
              <p className="font-body text-inkSoft text-[13px] font-bold mb-6">
                Bug, idea, complaint, compliment — whatever it is, it goes straight to whoever
                runs the Quad.
              </p>

              {error && (
                <p className="mb-4 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] text-inkSoft">TYPE</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                  >
                    {FEEDBACK_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                {!user && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[11px] text-inkSoft">
                        NAME (optional)
                      </span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="So we know who to thank"
                        className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[11px] text-inkSoft">
                        EMAIL (optional — only if you want a reply)
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@college.edu"
                        className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                      />
                    </label>
                  </>
                )}

                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] text-inkSoft">YOUR FEEDBACK</span>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 flex items-center justify-center gap-2 py-2.5 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin disabled:opacity-60"
                >
                  <Send size={14} /> {busy ? "Sending..." : "Send feedback"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
