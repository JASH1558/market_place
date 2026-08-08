import { supabase } from "./supabaseClient";

// Public Supabase storage URLs look like:
// https://<project>.supabase.co/storage/v1/object/public/listing-photos/<path>
// We only need the <path> part to remove the file from the bucket.
function extractStoragePath(publicUrl) {
  const marker = "/listing-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export async function deleteListingWithPhotos(listing) {
  // Best-effort photo cleanup — if this fails we still remove the listing row.
  if (listing.images && listing.images.length > 0) {
    const paths = listing.images.map(extractStoragePath).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from("listing-photos").remove(paths);
    }
  }

  const { error } = await supabase.from("listings").delete().eq("id", listing.id);
  if (error) throw error;
}
