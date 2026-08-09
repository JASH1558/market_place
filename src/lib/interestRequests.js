import { supabase } from "./supabaseClient";
import { notifyUser } from "./notifications";

export async function hasPendingRequest(listingId, buyerId) {
  const { data } = await supabase
    .from("interest_requests")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .eq("status", "pending")
    .maybeSingle();
  return !!data;
}

export async function sendInterestRequest({ listing, buyerId, buyerName, message }) {
  const already = await hasPendingRequest(listing.id, buyerId);
  if (already) throw new Error("You've already sent a request for this listing.");

  const { data, error } = await supabase
    .from("interest_requests")
    .insert({
      listing_id: listing.id,
      listing_title: listing.title,
      listing_image: listing.images?.[0] || null,
      buyer_id: buyerId,
      buyer_name: buyerName,
      seller_id: listing.seller_id,
      message: message || null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;

  await notifyUser({
    userId: listing.seller_id,
    type: "interest_request",
    title: "Someone's interested in your listing",
    body: `${buyerName} is interested in "${listing.title}"${message ? `: "${message}"` : ""}`,
    listingId: listing.id,
    requestId: data.id,
  });

  return data;
}

// Used by ListingDetail to find "my" thread for this listing (as buyer or
// seller) so it can link straight into the right chat.
export async function getMyRequestForListing(listingId, userId) {
  const { data } = await supabase
    .from("interest_requests")
    .select("*")
    .eq("listing_id", listingId)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function fetchActionableRequests(userId) {
  const { data: pendingForMe } = await supabase
    .from("interest_requests")
    .select("*")
    .eq("seller_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: awaitingMyPhone } = await supabase
    .from("interest_requests")
    .select("*")
    .eq("buyer_id", userId)
    .eq("status", "accepted")
    .is("buyer_phone", null)
    .order("responded_at", { ascending: false });

  return {
    pendingForMe: pendingForMe || [],
    awaitingMyPhone: awaitingMyPhone || [],
  };
}

export async function respondToRequest(request, accept) {
  const status = accept ? "accepted" : "declined";
  const { error } = await supabase
    .from("interest_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", request.id);
  if (error) throw error;

  await notifyUser({
    userId: request.buyer_id,
    type: accept ? "request_accepted" : "request_declined",
    title: accept ? "Your request was accepted!" : "Request declined",
    body: accept
      ? `Good news — your interest in "${request.listing_title}" was accepted. Share your number so they can reach you.`
      : `Your interest in "${request.listing_title}" was declined.`,
    listingId: request.listing_id,
    requestId: request.id,
  });
}

export async function sharePhone(request, phone) {
  const { error } = await supabase
    .from("interest_requests")
    .update({ buyer_phone: phone, phone_shared_at: new Date().toISOString() })
    .eq("id", request.id);
  if (error) throw error;

  await notifyUser({
    userId: request.seller_id,
    type: "phone_shared",
    title: "Buyer shared their number",
    body: `${request.buyer_name} shared their number for "${request.listing_title}": ${phone}`,
    listingId: request.listing_id,
    requestId: request.id,
  });
}

// Live-streams inserts/updates on interest_requests that involve this user
// (as either buyer or seller) so the notification bell's "actionable" lists
// (new requests / accepted requests awaiting phone share) update instantly
// instead of on a poll interval. RLS already limits what a client can see,
// so no extra server-side filtering is needed here — this just tells the
// caller "something changed, go refetch". Returns an unsubscribe function.
export function subscribeToRequestChanges(userId, onChange) {
  const channel = supabase
    .channel(`interest_requests:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "interest_requests", filter: `seller_id=eq.${userId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "interest_requests", filter: `buyer_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
