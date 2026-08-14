import React, { useState } from "react";
import { ShieldOff } from "lucide-react";
import BottomSheet from "./BottomSheet";
import { blockUser } from "../lib/safety";

export default function BlockUserDialog({ open, onClose, blockerId, blockedId, blockedName, onBlocked }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setError("");
    setBusy(true);
    try {
      await blockUser(blockerId, blockedId);
      onBlocked?.(blockedId);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't block this user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Block this person?">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 bg-white border-2 border-ink/20 rounded-xl">
          <ShieldOff size={20} className="text-red shrink-0 mt-0.5" />
          <p className="font-body text-inkSoft text-sm">
            {blockedName || "This user"} won't be able to message you or send new interest
            requests, and you won't see their listings on the board anymore. You can unblock
            them any time from your profile.
          </p>
        </div>

        {error && (
          <p className="text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="w-full py-3.5 text-sm font-bold font-body bg-red text-cream rounded-full shadow-pin disabled:opacity-60"
          >
            {busy ? "Blocking..." : "Yes, block them"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full py-3.5 text-sm font-bold font-body bg-white text-inkSoft border-2 border-ink/20 rounded-full disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
