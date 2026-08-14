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

// The buyer's most recent request for a given listing, regardless of status.
// ListingDetail uses this to decide what to show in the CTA slot: "I'm
// interested" if there's no request (or the last one was declined), or the
// "request sent" / "share your number" state if one is pending/accepted.
export async function getMyRequestForListing(listingId, buyerId) {
  const { data } = await supabase
    .from("interest_requests")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
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

// Buyers a seller has already accepted for a given listing — used so
// "mark as sold" can offer a pick-list instead of asking the seller to
// type the buyer's email from memory.
export async function fetchAcceptedRequestsForListing(listingId, sellerId) {
  const { data } = await supabase
    .from("interest_requests")
    .select("*")
    .eq("listing_id", listingId)
    .eq("seller_id", sellerId)
    .eq("status", "accepted")
    .order("responded_at", { ascending: false });
  return data || [];
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
