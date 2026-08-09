import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, X, Phone, MessageCircle } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import {
  fetchNotifications,
  markNotificationsRead,
  fetchStaleListingReminders,
  dismissStaleReminder,
  subscribeToNotifications,
} from "../lib/notifications";
import {
  fetchActionableRequests,
  respondToRequest,
  subscribeToRequestChanges,
} from "../lib/interestRequests";
import PhoneShareDialog from "./PhoneShareDialog";

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pendingForMe, setPendingForMe] = useState([]);
  const [awaitingMyPhone, setAwaitingMyPhone] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [phoneDialogRequest, setPhoneDialogRequest] = useState(null);
  const panelRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  async function loadAll() {
    if (!user) return;
    const [notifs, stale, actionable] = await Promise.all([
      fetchNotifications(user.id),
      fetchStaleListingReminders(user.id),
      fetchActionableRequests(user.id),
    ]);
    setNotifications([...stale, ...notifs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setPendingForMe(actionable.pendingForMe);
    setAwaitingMyPhone(actionable.awaitingMyPhone);
  }

  async function refreshBadge() {
    if (!user) return;
    const [notifs, actionable] = await Promise.all([
      fetchNotifications(user.id, 50),
      fetchActionableRequests(user.id),
    ]);
    const unread = notifs.filter((n) => !n.read).length;
    setUnreadCount(unread + actionable.pendingForMe.length + actionable.awaitingMyPhone.length);
  }

  // Stream new notifications and interest-request changes in real time
  // instead of polling on an interval. Any change also refreshes the open
  // panel's contents so accept/decline state, new requests, etc. show up
  // immediately for whoever's on the other end.
  useEffect(() => {
    if (!user) return;

    refreshBadge();

    const handleChange = () => {
      refreshBadge();
      if (openRef.current) loadAll();
    };

    const unsubNotifications = subscribeToNotifications(user.id, handleChange);
    const unsubRequests = subscribeToRequestChanges(user.id, handleChange);

    return () => {
      unsubNotifications();
      unsubRequests();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadAll();
      const unreadIds = (await fetchNotifications(user.id)).filter((n) => !n.read).map((n) => n.id);
      await markNotificationsRead(unreadIds);
      setUnreadCount(0);
    }
  }

  async function handleRespond(request, accept) {
    try {
      await respondToRequest(request, accept);
      setPendingForMe((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      alert(err.message || "Couldn't respond to that request.");
    }
  }

  async function handleDismissReminder(notification) {
    // Optimistic: drop it immediately, roll back if the write fails.
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    try {
      await dismissStaleReminder(user.id, notification.listing_id);
    } catch (err) {
      setNotifications((prev) =>
        [...prev, notification].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      );
      alert(err.message || "Couldn't dismiss that reminder.");
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full border-2 border-ink bg-cream text-ink"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red text-cream text-[10px] font-bold font-mono flex items-center justify-center border border-ink">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-cream border-2 border-ink shadow-card z-50">
          {/* Actionable: pending requests I received as seller */}
          {pendingForMe.length > 0 && (
            <div className="p-3 border-b-2 border-dashed border-corkDark">
              <p className="font-mono text-[10px] text-inkSoft mb-2">NEW INTEREST REQUESTS</p>
              {pendingForMe.map((r) => (
                <div key={r.id} className="mb-3 last:mb-0 p-2 bg-pink/30 border border-ink">
                  <p className="font-body text-ink text-sm">
                    <span className="font-bold">{r.buyer_name}</span> is interested in "
                    {r.listing_title}"
                  </p>
                  {r.message && (
                    <p className="font-body text-inkSoft text-xs italic mt-1">"{r.message}"</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleRespond(r, true)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold font-body bg-mint border border-ink"
                    >
                      <Check size={12} /> Accept
                    </button>
                    <button
                      onClick={() => handleRespond(r, false)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold font-body bg-cream border border-ink"
                    >
                      <X size={12} /> Decline
                    </button>
                  </div>
                  <Link
                    to={`/messages/${r.id}`}
                    onClick={() => setOpen(false)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs font-bold font-body bg-lilac border border-ink"
                  >
                    <MessageCircle size={12} /> Message
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Actionable: my accepted requests awaiting phone share */}
          {awaitingMyPhone.length > 0 && (
            <div className="p-3 border-b-2 border-dashed border-corkDark">
              <p className="font-mono text-[10px] text-inkSoft mb-2">READY TO SHARE YOUR NUMBER</p>
              {awaitingMyPhone.map((r) => (
                <div key={r.id} className="mb-3 last:mb-0 p-2 bg-sky/30 border border-ink">
                  <p className="font-body text-ink text-sm">
                    Your request for "{r.listing_title}" was accepted!
                  </p>
                  <button
                    onClick={() => setPhoneDialogRequest(r)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs font-bold font-body bg-sky border border-ink"
                  >
                    <Phone size={12} /> Share my number
                  </button>
                  <Link
                    to={`/messages/${r.id}`}
                    onClick={() => setOpen(false)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs font-bold font-body bg-lilac border border-ink"
                  >
                    <MessageCircle size={12} /> Message
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* General notifications + stale listing reminders */}
          <div className="p-3">
            <p className="font-mono text-[10px] text-inkSoft mb-2">NOTIFICATIONS</p>
            {notifications.length === 0 ? (
              <p className="font-body text-inkSoft text-sm">Nothing here yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="mb-3 last:mb-0 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-ink text-sm font-bold">{n.title}</p>
                    <p className="font-body text-inkSoft text-xs mt-0.5">{n.body}</p>
                    <p className="font-mono text-[9px] text-inkSoft mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {n.dismissible && (
                    <button
                      onClick={() => handleDismissReminder(n)}
                      title="Dismiss"
                      aria-label="Dismiss reminder"
                      className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full border border-ink text-inkSoft hover:bg-red/20 hover:text-red"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
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
