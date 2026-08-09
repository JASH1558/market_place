import { supabase } from "./supabaseClient";

// A "thread" is just an interest_requests row — chat opens as soon as a
// request exists between a buyer and seller, no separate conversation
// concept needed.
export async function fetchThreads(userId) {
  const { data } = await supabase
    .from("interest_requests")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchMessages(requestId) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function sendMessage({ requestId, senderId, body }) {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("messages")
    .insert({ request_id: requestId, sender_id: senderId, body: trimmed })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markThreadRead(requestId, userId) {
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("request_id", requestId)
    .neq("sender_id", userId)
    .eq("read", false);
}

// RLS already scopes this to threads the user belongs to, so no request_id
// list needs to be passed in — we just ask for "my" unread messages.
export async function getUnreadCountsByThread(userId) {
  const { data } = await supabase
    .from("messages")
    .select("request_id")
    .eq("read", false)
    .neq("sender_id", userId);
  const counts = {};
  (data || []).forEach((m) => {
    counts[m.request_id] = (counts[m.request_id] || 0) + 1;
  });
  return counts;
}

export async function getTotalUnreadCount(userId) {
  const counts = await getUnreadCountsByThread(userId);
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

// Live-streams new messages in one thread. Used by the open Messages view
// instead of polling every few seconds. Returns an unsubscribe function.
export function subscribeToThreadMessages(requestId, onInsert) {
  const channel = supabase
    .channel(`messages:thread:${requestId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Live-streams any message insert/update visible to this user (RLS narrows
// it to threads they belong to) so the header's unread badge stays current
// without a poll interval. Returns an unsubscribe function.
export function subscribeToInboxMessageChanges(userId, onChange) {
  const channel = supabase
    .channel(`messages:inbox:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}
