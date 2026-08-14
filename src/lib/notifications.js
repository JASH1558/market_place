import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Email notifications — currently a no-op stub.
//
// Every in-app notification created via notifyUser() below also calls this,
// so wiring up a real provider here makes ALL existing notification types
// (interest_request, request_accepted, request_declined, phone_shared) send
// email at once — no other file needs to change.
//
// To go live:
//   1. Add an account with Resend (https://resend.com) or Postmark, and put
//      the API key in a server-side env var — NOT a VITE_ prefixed one, since
//      that would ship the key to the browser. This means the actual send
//      needs to happen from a Supabase Edge Function or other backend, not
//      directly from this client file.
//   2. Simplest path: create a Supabase Edge Function (e.g. `send-email`)
//      that takes { to, subject, body } and calls Resend/Postmark from the
//      server side, then replace the TODO below with:
//        await supabase.functions.invoke('send-email', { body: { to, subject, body } });
//   3. `to` needs to be an email address, not a user id — look it up via
//      profiles.email (see markSold.js findProfileById for the pattern),
//      or better, have the Edge Function resolve it server-side so the
//      client never needs read access to other users' emails.
// ---------------------------------------------------------------------------
async function notifyEmail({ userId, title, body }) {
  // TODO: replace with a real send once an email provider is connected.
  // eslint-disable-next-line no-console
  console.info(`[email stub] would email user ${userId}: "${title}" — ${body}`);
}

export async function notifyUser({ userId, type, title, body, listingId, requestId }) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    listing_id: listingId || null,
    request_id: requestId || null,
  });

  // Best-effort — an email failure shouldn't block the in-app notification
  // that already succeeded above.
  try {
    await notifyEmail({ userId, title, body });
  } catch {
    // swallow; in-app notification is the source of truth either way
  }
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
