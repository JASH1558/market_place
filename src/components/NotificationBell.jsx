import React, { useCallback, useEffect } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { fetchNotifications, fetchStaleListingReminders } from "../lib/notifications";
import { fetchActionableRequests } from "../lib/interestRequests";

// Stale-listing reminders are time-based, not driven by a DB write, so
// there's nothing for Realtime to push when a listing crosses 14 days old.
// We recheck those on this slower interval instead of polling everything.
const STALE_RECHECK_MS = 5 * 60 * 1000;

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshBadge = useCallback(async () => {
    if (!user) return;
    const [notifs, stale, actionable] = await Promise.all([
      fetchNotifications(user.id, 100),
      fetchStaleListingReminders(user.id),
      fetchActionableRequests(user.id),
    ]);
    const unread = notifs.filter((n) => !n.read).length;
    setUnreadCount(unread + stale.length + actionable.pendingForMe.length + actionable.awaitingMyPhone.length);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshBadge();
    const interval = setInterval(refreshBadge, STALE_RECHECK_MS);
    return () => clearInterval(interval);
  }, [user, refreshBadge]);

  // Live updates instead of polling for the two event-driven tables.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-bell-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshBadge()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interest_requests", filter: `seller_id=eq.${user.id}` },
        () => refreshBadge()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interest_requests", filter: `buyer_id=eq.${user.id}` },
        () => refreshBadge()
      )
      .subscribe();

    function onVisible() {
      if (document.visibilityState === "visible") refreshBadge();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [user, refreshBadge]);

  if (!user) return null;

  return (
    <Link
      to="/notifications"
      onClick={() => setUnreadCount(0)}
      className="relative w-9 h-9 flex items-center justify-center rounded-full border-2 border-ink bg-cream text-ink"
    >
      <Bell size={16} />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red text-cream text-[10px] font-bold font-mono flex items-center justify-center border border-ink">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
