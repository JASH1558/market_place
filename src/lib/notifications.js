import { supabase } from "./supabaseClient";

export async function notifyUser({ userId, type, title, body, listingId, requestId }) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    listing_id: listingId || null,
    request_id: requestId || null,
  });
}

export async function fetchNotifications(userId, limit = 25) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function markNotificationsRead(ids) {
  if (!ids || ids.length === 0) return;
  await supabase.from("notifications").update({ read: true }).in("id", ids);
}

// Live-streams new notification rows for this user instead of polling.
// Returns an unsubscribe function.
export function subscribeToNotifications(userId, onInsert) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Reminders for a seller's own listings that have been up for a while.
// Not stored in the DB — computed fresh each time the bell opens — except for
// which ones the user has dismissed, which IS stored (dismissed_reminders).
const STALE_AFTER_DAYS = 14;

export async function fetchStaleListingReminders(userId) {
  const [{ data: listings }, { data: dismissed }] = await Promise.all([
    supabase.from("listings").select("id, title, created_at").eq("seller_id", userId),
    supabase.from("dismissed_reminders").select("listing_id").eq("user_id", userId),
  ]);

  if (!listings) return [];

  const dismissedIds = new Set((dismissed || []).map((d) => d.listing_id));
  const now = Date.now();

  return listings
    .filter((l) => !dismissedIds.has(l.id))
    .map((l) => {
      const days = Math.floor((now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return { ...l, days };
    })
    .filter((l) => l.days >= STALE_AFTER_DAYS)
    .map((l) => ({
      id: `stale-${l.id}`,
      type: "stale_listing",
      title: "Still sitting on the board",
      body: `It's been ${l.days} days since you posted "${l.title}" — maybe bump the price or check if it's still around.`,
      listing_id: l.id,
      created_at: l.created_at,
      read: true, // informational only, not counted as unread
      dismissible: true,
    }));
}

export async function dismissStaleReminder(userId, listingId) {
  const { error } = await supabase
    .from("dismissed_reminders")
    .upsert({ user_id: userId, listing_id: listingId });
  if (error) throw error;
}
