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

// Reminders for a seller's own listings that have been up for a while.
// Not stored in the DB — computed fresh each time the bell opens — but a
// dismissal IS persisted via listings.stale_dismissed_at so a reminder the
// seller has already seen and dismissed doesn't keep coming back.
const STALE_AFTER_DAYS = 14;

export async function fetchStaleListingReminders(userId) {
  const { data } = await supabase
    .from("listings")
    .select("id, title, created_at")
    .eq("seller_id", userId)
    .is("stale_dismissed_at", null);

  if (!data) return [];

  const now = Date.now();
  return data
    .map((l) => {
      const days = Math.floor((now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return { ...l, days };
    })
    .filter((l) => l.days >= STALE_AFTER_DAYS)
    .map((l) => ({
      id: `stale-${l.id}`,
      listingId: l.id,
      type: "stale_listing",
      title: "Still sitting on the board",
      body: `It's been ${l.days} days since you posted "${l.title}" — maybe bump the price or check if it's still around.`,
      listing_id: l.id,
      created_at: l.created_at,
      read: true, // informational only, not counted as unread
      dismissible: true,
    }));
}

export async function dismissStaleListingReminder(listingId) {
  await supabase
    .from("listings")
    .update({ stale_dismissed_at: new Date().toISOString() })
    .eq("id", listingId);
}

// The "phone_shared" notification body is written by us in a fixed format
// ("...shared their number for "X": <phone>"), so we can pull the number
// back out to put a Copy button next to it instead of making people
// select the text by hand.
export function extractPhoneFromBody(body) {
  if (!body) return null;
  const match = body.match(/:\s*([+\d][\d\s\-().]{5,})$/);
  return match ? match[1].trim() : null;
}
