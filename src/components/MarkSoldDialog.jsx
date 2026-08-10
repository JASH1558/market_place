import React, { useEffect, useState } from "react";
import { CheckCircle2, User } from "lucide-react";
import { fetchAcceptedRequestsForListing } from "../lib/interestRequests";
import { findProfileByEmail, findProfileById, markListingSold } from "../lib/markSold";
import { useAuth } from "../lib/AuthContext";

export default function MarkSoldDialog({ listing, onClose, onSold }) {
  const { user } = useAuth();
  const [acceptedBuyers, setAcceptedBuyers] = useState([]);
  const [loadingBuyers, setLoadingBuyers] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchAcceptedRequestsForListing(listing.id, user.id);
      setAcceptedBuyers(data);
      // If there's exactly one accepted buyer, preselect them — the common case.
      if (data.length === 1) setSelectedRequestId(data[0].id);
      if (data.length === 0) setManualMode(true);
      setLoadingBuyers(false);
    }
    load();
  }, [listing.id, user.id]);

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (manualMode) {
        const buyer = await findProfileByEmail(email);
        await markListingSold(listing, email, buyer?.id);
      } else {
        const request = acceptedBuyers.find((r) => r.id === selectedRequestId);
        if (!request) throw new Error("Pick who you sold it to first.");
        const buyerProfile = await findProfileById(request.buyer_id);
        if (!buyerProfile?.email) {
          throw new Error(
            `Couldn't find a saved email for ${request.buyer_name}. Try "Sold to someone else" below instead.`
          );
        }
        await markListingSold(listing, buyerProfile.email, request.buyer_id);
      }
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
      <div className="relative w-full max-w-sm p-6 bg-cream border-2 border-ink shadow-card max-h-[85vh] overflow-y-auto">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-mint" />
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={18} className="text-mint" />
          <h2 className="font-display text-ink text-xl">Mark as sold</h2>
        </div>
        <p className="font-body text-inkSoft text-sm mb-4">
          "{listing.title}" will come off the board and move into past orders for you
          and the buyer.
        </p>

        {error && (
          <p className="mb-3 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          {loadingBuyers ? (
            <p className="font-body text-inkSoft text-sm">Checking who's interested…</p>
          ) : !manualMode ? (
            <>
              <span className="font-mono text-[11px] text-inkSoft">WHO DID YOU SELL IT TO?</span>
              <div className="flex flex-col gap-2">
                {acceptedBuyers.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2 px-3 py-2 border-2 cursor-pointer ${
                      selectedRequestId === r.id ? "border-ink bg-mint/30" : "border-ink/30 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="buyer"
                      checked={selectedRequestId === r.id}
                      onChange={() => setSelectedRequestId(r.id)}
                    />
                    <User size={14} className="text-inkSoft" />
                    <span className="font-body text-sm text-ink font-bold">{r.buyer_name}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-xs font-bold font-body text-inkSoft underline self-start"
              >
                Sold to someone else (not through an interest request)
              </button>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">BUYER'S CAMPUS EMAIL</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="buyer@college.edu"
                  className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                />
              </label>
              {acceptedBuyers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="text-xs font-bold font-body text-inkSoft underline self-start"
                >
                  ← Back to the list of interested buyers
                </button>
              )}
            </>
          )}

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
              disabled={busy || loadingBuyers || (!manualMode && !selectedRequestId)}
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
