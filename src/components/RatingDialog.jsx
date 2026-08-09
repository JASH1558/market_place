import React, { useState } from "react";
import { Star } from "lucide-react";
import { submitRating } from "../lib/ratings";

export default function RatingDialog({ order, raterId, rateeId, rateeName, onClose, onRated }) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (stars === 0) {
      setError("Pick a star rating first.");
      return;
    }
    setBusy(true);
    try {
      await submitRating({ orderId: order.id, raterId, rateeId, stars, comment: comment.trim() });
      onRated(order.id);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't submit your rating.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
      <div className="relative w-full max-w-sm p-6 bg-cream border-2 border-ink shadow-card">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-yellow" />
        <h2 className="font-display text-ink text-xl mb-1">Rate {rateeName}</h2>
        <p className="font-body text-inkSoft text-sm mb-4">
          For "{order.title}". This helps the rest of campus know who's good to deal with.
        </p>

        {error && (
          <p className="mb-3 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                onMouseEnter={() => setHoverStars(n)}
                onMouseLeave={() => setHoverStars(0)}
                className="p-1"
              >
                <Star
                  size={28}
                  fill={(hoverStars || stars) >= n ? "#2B2440" : "none"}
                  className="text-ink"
                />
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: how'd it go?"
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
              className="flex-1 py-2 text-sm font-bold font-body bg-yellow text-ink border-2 border-ink shadow-pin disabled:opacity-60"
            >
              {busy ? "Submitting..." : "Submit rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
