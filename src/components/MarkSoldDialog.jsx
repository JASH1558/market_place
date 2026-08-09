import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { findProfileByEmail, markListingSold } from "../lib/markSold";

export default function MarkSoldDialog({ listing, onClose, onSold }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const buyer = await findProfileByEmail(email);
      await markListingSold(listing, email, buyer?.id);
      onSold(listing.id);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't mark this as sold.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
      <div className="relative w-full max-w-sm p-6 bg-cream border-2 border-ink shadow-card">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-mint" />
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={18} className="text-mint" />
          <h2 className="font-display text-ink text-xl">Mark as sold</h2>
        </div>
        <p className="font-body text-inkSoft text-sm mb-4">
          "{listing.title}" will come off the board and move into past orders for you
          and the buyer. Enter the buyer's campus email so it shows up in their history
          too.
        </p>

        {error && (
          <p className="mb-3 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="buyer@college.edu"
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
              className="flex-1 py-2 text-sm font-bold font-body bg-mint text-ink border-2 border-ink shadow-pin disabled:opacity-60"
            >
              {busy ? "Saving..." : "Confirm sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
