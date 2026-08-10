import React, { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, X, Phone, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  fetchNotifications,
  markNotificationsRead,
  fetchStaleListingReminders,
} from "../lib/notifications";
import { fetchActionableRequests, respondToRequest } from "../lib/interestRequests";
import PhoneShareDialog from "./PhoneShareDialog";

// Stale-listing reminders are time-based (not driven by a DB write), so
// there's nothing for Realtime to push when a listing crosses 14 days old.
// We recheck those on this slower interval instead of the old 30s poll.
const STALE_RECHECK_MS = 5 * 60 * 1000;

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pendingForMe, setPendingForMe] = useState([]);
  const [awaitingMyPhone, setAwaitingMyPhone] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [phoneDialogRequest, setPhoneDialogRequest] = useState(null);
  const [live, setLive] = useState(false);
  const panelRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [notifs, stale, actionable] = await Promise.all([
      fetchNotifications(user.id),
      fetchStaleListingReminders(user.id),
      fetchActionableRequests(user.id),
    ]);
    setNotifications([...stale, ...notifs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setPendingForMe(actionable.pendingForMe);
    setAwaitingMyPhone(actionable.awaitingMyPhone);

    const unread = notifs.filter((n) => !n.read).length;
    setUnreadCount(unread + actionable.pendingForMe.length + actionable.awaitingMyPhone.length);
  }, [user]);

  // Initial load + slow recheck for time-based staleness, no DB event for that
  useEffect(() => {
    if (!user) return;
    loadAll();
    const interval = setInterval(loadAll, STALE_RECHECK_MS);
    return () => clearInterval(interval);
  }, [user, loadAll]);

  // Live updates: subscribe to Postgres changes on the two tables that drive
  // the bell, instead of polling. RLS on both tables already scopes each
  // client to only the rows they're allowed to see, so these filters are
  // belt-and-suspenders on top of that.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-bell-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interest_requests", filter: `seller_id=eq.${user.id}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interest_requests", filter: `buyer_id=eq.${user.id}` },
        () => loadAll()
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    // Catch up on anything missed while the tab was backgrounded / the
    // socket was reconnecting.
    function onVisible() {
      if (document.visibilityState === "visible") loadAll();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [user, loadAll]);

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
                <div key={n.id} className="mb-3 last:mb-0">
                  <p className="font-body text-ink text-sm font-bold">{n.title}</p>
                  <p className="font-body text-inkSoft text-xs mt-0.5">{n.body}</p>
                  <p className="font-mono text-[9px] text-inkSoft mt-1">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
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
