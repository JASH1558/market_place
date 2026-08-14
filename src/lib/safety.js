import { supabase } from "./supabaseClient";

export const REPORT_REASONS = [
  "Scam or fraud",
  "Prohibited item",
  "Harassment or abuse",
  "Fake or misleading listing",
  "Spam",
  "Something else",
];

export async function fileReport({ reporterId, reportedUserId, listingId, listingTitle, reason, details }) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId || null,
    listing_id: listingId || null,
    listing_title: listingTitle || null,
    reason,
    details: details || null,
  });
  if (error) throw error;
}

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

// Blocks *I* placed — used to render the "Blocked users" list on Profile,
// where full_name comes from public_profiles since blocked_users only
// stores ids.
export async function fetchMyBlocks(userId) {
  const { data: blocks } = await supabase
    .from("blocked_users")
    .select("blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (!blocks || blocks.length === 0) return [];

  const ids = blocks.map((b) => b.blocked_id);
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, full_name")
    .in("id", ids);

  const nameById = {};
  (profiles || []).forEach((p) => (nameById[p.id] = p.full_name));

  return blocks.map((b) => ({
    id: b.blocked_id,
    full_name: nameById[b.blocked_id] || "Unknown user",
    blocked_at: b.created_at,
  }));
}

// Set of user ids blocked in EITHER direction relative to me — used to
// filter listings/threads out of what I see. Small table, small result set,
// safe to pull in full and filter client-side rather than trying to encode
// an OR-across-two-columns filter into every downstream query.
export async function fetchBlockedIdSet(userId) {
  const { data } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  const ids = new Set();
  (data || []).forEach((row) => {
    if (row.blocker_id === userId) ids.add(row.blocked_id);
    else ids.add(row.blocker_id);
  });
  return ids;
}

export async function isBlockedEitherWay(userA, userB) {
  const { data } = await supabase.rpc("is_blocked", { user_a: userA, user_b: userB });
  return !!data;
}
