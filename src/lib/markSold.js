import { supabase } from "./supabaseClient";

export async function findProfileByEmail(email) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data || null;
}

export async function markListingSold(listing, buyerEmail, buyerId) {
  const { error: insertError } = await supabase.from("orders").insert({
    listing_id: listing.id,
    seller_id: listing.seller_id,
    buyer_id: buyerId || null,
    buyer_email: buyerEmail.trim().toLowerCase(),
    title: listing.title,
    description: listing.description,
    price: listing.price,
    category: listing.category,
    condition: listing.condition,
    loc: listing.loc,
    images: listing.images,
    seller: listing.seller,
  });
  if (insertError) throw insertError;

  // We intentionally keep the photos in storage (the order history still
  // references them) and only remove the listing row from the board.
  const { error: deleteError } = await supabase.from("listings").delete().eq("id", listing.id);
  if (deleteError) throw deleteError;
}
