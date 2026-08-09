import React, { useState } from "react";
import { Phone } from "lucide-react";
import { sharePhone } from "../lib/interestRequests";

export default function PhoneShareDialog({ request, onClose, onShared }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await sharePhone(request, phone.trim());
      onShared(request.id);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't share your number.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
      <div className="relative w-full max-w-sm p-6 bg-cream border-2 border-ink shadow-card">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-sky" />
        <div className="flex items-center gap-2 mb-2">
          <Phone size={18} className="text-sky" />
          <h2 className="font-display text-ink text-xl">Share your number</h2>
        </div>
        <p className="font-body text-inkSoft text-sm mb-4">
          Your request for "{request.listing_title}" was accepted. Send your number so the
          seller can reach you to work out the details.
        </p>

        {error && (
          <p className="mb-3 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-2 text-sm font-bold font-body bg-cream text-inkSoft border-2 border-ink disabled:opacity-60"
            >
              Not now
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2 text-sm font-bold font-body bg-sky text-ink border-2 border-ink shadow-pin disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send number"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
