import React, { useState } from "react";
import { Flag } from "lucide-react";
import BottomSheet from "./BottomSheet";
import { REPORT_REASONS, fileReport } from "../lib/safety";

// target: { listingId?, listingTitle?, reportedUserId?, reportedUserName? }
// At least one of listingId / reportedUserId should be present.
export default function ReportDialog({ open, onClose, reporterId, target }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function handleClose() {
    setReason(null);
    setDetails("");
    setError("");
    setDone(false);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason) {
      setError("Pick a reason first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await fileReport({
        reporterId,
        reportedUserId: target.reportedUserId,
        listingId: target.listingId,
        listingTitle: target.listingTitle,
        reason,
        details: details.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Couldn't submit the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={done ? "Report sent" : "Report"}>
      {done ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <Flag size={28} className="text-red" />
          <p className="font-body text-ink text-sm">
            Thanks — we've logged this and it'll get reviewed. You don't need to do anything else.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-2 w-full py-3 text-sm font-bold font-body bg-ink text-cream rounded-full"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="font-body text-inkSoft text-sm">
            {target.listingTitle
              ? `Reporting "${target.listingTitle}"${target.reportedUserName ? ` from ${target.reportedUserName}` : ""}.`
              : target.reportedUserName
              ? `Reporting ${target.reportedUserName}.`
              : "Reporting this."}
          </p>

          {error && (
            <p className="text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-3 px-4 py-3.5 border-2 rounded-xl cursor-pointer ${
                  reason === r ? "border-ink bg-yellow/30" : "border-ink/20 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="w-4 h-4 shrink-0"
                />
                <span className="font-body text-sm text-ink">{r}</span>
              </label>
            ))}
          </div>

          <textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional: any details that would help us look into it"
            className="font-body px-3 py-2.5 border-2 border-ink bg-white text-sm outline-none rounded-lg"
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full py-3.5 text-sm font-bold font-body bg-red text-cream rounded-full shadow-pin disabled:opacity-60"
          >
            {busy ? "Sending..." : "Submit report"}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
