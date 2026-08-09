import { supabase } from "./supabaseClient";

export async function getAverageRating(userId) {
  const { data } = await supabase.from("ratings").select("stars").eq("ratee_id", userId);
  if (!data || data.length === 0) return { average: null, count: 0 };
  const total = data.reduce((sum, r) => sum + r.stars, 0);
  return { average: total / data.length, count: data.length };
}

export async function getMyRatedOrderIds(userId) {
  const { data } = await supabase.from("ratings").select("order_id").eq("rater_id", userId);
  return new Set((data || []).map((r) => r.order_id));
}

export async function submitRating({ orderId, raterId, rateeId, stars, comment }) {
  const { error } = await supabase.from("ratings").insert({
    order_id: orderId,
    rater_id: raterId,
    ratee_id: rateeId,
    stars,
    comment: comment || null,
  });
  if (error) throw error;
}
