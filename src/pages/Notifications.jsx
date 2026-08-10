import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, X, Phone, Copy, CheckCheck, ChevronDown } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import {
  fetchNotifications,
  markNotificationsRead,
  fetchStaleListingReminders,
  dismissStaleListingReminder,
  extractPhoneFromBody,
} from "../lib/notifications";
import { fetchActionableRequests, respondToRequest } from "../lib/interestRequests";
import PhoneShareDialog from "../components/PhoneShareDialog";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can fail on non-secure contexts / older browsers —
      // fall back to a manual select so the user can still copy it.
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold font-body bg-cream border border-ink shrink-0"
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [pendingForMe, setPendingForMe] = useState([]);
  const [awaitingMyPhone, setAwaitingMyPhone] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [phoneDialogRequest, setPhoneDialogRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [notifs, stale, actionable] = await Promise.all([
      fetchNotifications(user.id, 100),
      fetchStaleListingReminders(user.id),
      fetchActionableRequests(user.id),
    ]);
    setNotifications([...stale, ...notifs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setPendingForMe(actionable.pendingForMe);
    setAwaitingMyPhone(actionable.awaitingMyPhone);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Mark everything read on arrival, same as opening the old dropdown did.
  useEffect(() => {
    if (!user) return;
    async function markRead() {
      const unreadIds = (await fetchNotifications(user.id, 100)).filter((n) => !n.read).map((n) => n.id);
      await markNotificationsRead(unreadIds);
    }
    markRead();
  }, [user]);

  async function handleRespond(request, accept) {
    try {
      await respondToRequest(request, accept);
      setPendingForMe((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      alert(err.message || "Couldn't respond to that request.");
    }
  }

  async function handleDismissStale(n) {
    setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    try {
      await dismissStaleListingReminder(n.listingId);
    } catch {
      setNotifications((prev) => [...prev, n].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }
  }

  const hasAnything = pendingForMe.length > 0 || awaitingMyPhone.length > 0 || notifications.length > 0;

  return (
    <div className="px-4 py-8 sm:px-10 max-w-2xl mx-auto">
      <Link to="/" className="flex items-center gap-1 text-xs font-bold font-body text-inkSoft mb-4 w-fit">
        <ArrowLeft size={14} /> Back to the board
      </Link>

      <h1 className="font-display text-cream drop-shadow-[2px_2px_0_rgba(43,36,64,0.35)] text-3xl mb-6">
        Notifications
      </h1>

      {loading ? (
        <p className="font-body text-cream/90">Loading…</p>
      ) : !hasAnything ? (
        <div className="p-6 bg-cream border-2 border-ink shadow-card text-center">
          <p className="font-body text-inkSoft text-sm">Nothing here yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {pendingForMe.length > 0 && (
            <section>
              <p className="font-mono text-[11px] text-cream/80 mb-2">NEW INTEREST REQUESTS</p>
              <div className="flex flex-col gap-3">
                {pendingForMe.map((r) => (
                  <div key={r.id} className="p-4 bg-pink/30 border-2 border-ink shadow-card">
                    <p className="font-body text-ink text-sm">
                      <span className="font-bold">{r.buyer_name}</span> is interested in "
                      {r.listing_title}"
                    </p>
                    {r.message && (
                      <p className="font-body text-inkSoft text-sm italic mt-2 break-words">"{r.message}"</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleRespond(r, true)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-bold font-body bg-mint border-2 border-ink"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleRespond(r, false)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-bold font-body bg-cream border-2 border-ink"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {awaitingMyPhone.length > 0 && (
            <section>
              <p className="font-mono text-[11px] text-cream/80 mb-2">READY TO SHARE YOUR NUMBER</p>
              <div className="flex flex-col gap-3">
                {awaitingMyPhone.map((r) => (
                  <div key={r.id} className="p-4 bg-sky/30 border-2 border-ink shadow-card">
                    <p className="font-body text-ink text-sm">
                      Your request for "{r.listing_title}" was accepted!
                    </p>
                    <button
                      onClick={() => setPhoneDialogRequest(r)}
                      className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-sm font-bold font-body bg-sky border-2 border-ink"
                    >
                      <Phone size={14} /> Share my number
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {notifications.length > 0 && (
            <section>
              <p className="font-mono text-[11px] text-cream/80 mb-2">ALL NOTIFICATIONS</p>
              <div className="flex flex-col gap-2">
                {notifications.map((n) => {
                  const isExpanded = expandedId === n.id;
                  const phone = n.type === "phone_shared" ? extractPhoneFromBody(n.body) : null;
                  return (
                    <div key={n.id} className="bg-cream border-2 border-ink shadow-card overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : n.id)}
                        className="w-full flex items-start justify-between gap-3 p-4 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-ink text-sm font-bold">{n.title}</p>
                          <p
                            className={`font-body text-inkSoft text-xs mt-1 ${
                              isExpanded ? "" : "line-clamp-1"
                            } break-words`}
                          >
                            {n.body}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-inkSoft transition-transform mt-0.5 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-ink/10 pt-3">
                          <p className="font-mono text-[10px] text-inkSoft">
                            {new Date(n.created_at).toLocaleString()}
                          </p>

                          {phone && (
                            <div className="flex items-center justify-between gap-2 p-2 bg-white border border-ink">
                              <span className="font-mono text-sm text-ink break-all">{phone}</span>
                              <CopyButton text={phone} />
                            </div>
                          )}

                          <div className="flex gap-3">
                            {n.listing_id && (
                              <Link
                                to={`/listing/${n.listing_id}`}
                                className="text-xs font-bold font-body text-ink underline"
                              >
                                View listing
                              </Link>
                            )}
                            {n.dismissible && (
                              <button
                                onClick={() => handleDismissStale(n)}
                                className="text-xs font-bold font-body text-red underline ml-auto"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {phoneDialogRequest && (
        <PhoneShareDialog
          request={phoneDialogRequest}
          onClose={() => setPhoneDialogRequest(null)}
          onShared={(id) => setAwaitingMyPhone((prev) => prev.filter((r) => r.id !== id))}
        />
      )}
    </div>
  );
}
