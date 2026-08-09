import React, { useState } from "react";
import { Heart } from "lucide-react";
import { sendInterestRequest } from "../lib/interestRequests";

export default function InterestDialog({ listing, buyerId, buyerName, onClose, onSent }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await sendInterestRequest({ listing, buyerId, buyerName, message: message.trim() });
      onSent(created);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't send your request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
      <div className="relative w-full max-w-sm p-6 bg-cream border-2 border-ink shadow-card">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-pink" />
        <div className="flex items-center gap-2 mb-2">
          <Heart size={18} className="text-red" />
          <h2 className="font-display text-ink text-xl">I'm interested</h2>
        </div>
        <p className="font-body text-inkSoft text-sm mb-4">
          This sends a request to the seller for "{listing.title}". If they accept, you'll be
          asked to share your number so they can reach you.
        </p>

        {error && (
          <p className="mb-3 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional: still available? can you hold it till Friday?..."
            className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-2 text-sm font-bold font-body bg-cream text-inkSoft border-2 border-ink disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
