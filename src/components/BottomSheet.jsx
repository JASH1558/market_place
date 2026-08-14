import React, { useEffect } from "react";

// A mobile-first alternative to the centered modal pattern used elsewhere
// (ConfirmDialog, InterestDialog, etc). Slides up from the bottom, sits flush
// with the screen edges on small screens, and respects safe-area insets so
// it doesn't sit under the home-indicator on iOS. On wider screens it caps
// its width and centers itself so it still looks intentional on desktop.
//
// Usage:
//   <BottomSheet open={open} onClose={() => setOpen(false)} title="Report listing">
//     ...content...
//   </BottomSheet>
export default function BottomSheet({ open, onClose, title, children }) {
  // Lock background scroll while the sheet is open — standard mobile sheet
  // behavior, otherwise the page behind scrolls along with a drag gesture.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-sm bg-cream border-2 border-ink shadow-card
                   rounded-t-2xl sm:rounded-none
                   max-h-[88vh] overflow-y-auto
                   pb-[max(1.25rem,env(safe-area-inset-bottom))]
                   animate-[sheet-up_0.2s_ease-out]"
      >
        {/* Drag handle — visual affordance only, sheet closes via the X or backdrop tap */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-ink/20" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 sm:pt-5 pb-1">
          <h2 className="font-display text-ink text-xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-inkSoft active:bg-ink/10"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-3 pb-2">{children}</div>
      </div>

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(24px); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
