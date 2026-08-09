import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Star } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { CATEGORIES } from "../lib/sampleData";
import { MIN_PHOTOS, MAX_PHOTOS, CONDITIONS } from "../lib/listingConstants";
import { compressImage } from "../lib/compressImage";
import ConfirmDialog from "../components/ConfirmDialog";

export default function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [loc, setLoc] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]); // { file, previewUrl }
  const [coverIndex, setCoverIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [compressing, setCompressing] = useState(false);

  async function handleFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const room = MAX_PHOTOS - photos.length;
    const toProcess = incoming.slice(0, room);
    if (toProcess.length === 0) return;

    setCompressing(true);
    try {
      const accepted = await Promise.all(
        toProcess.map(async (file) => {
          const compressed = await compressImage(file);
          return { file: compressed, previewUrl: URL.createObjectURL(compressed) };
        })
      );
      setPhotos((prev) => [...prev, ...accepted]);
    } finally {
      setCompressing(false);
    }
  }

  function removePhoto(index) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    setCoverIndex((prev) => {
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  }

  function validate() {
    if (photos.length < MIN_PHOTOS) {
      setError(`Add at least ${MIN_PHOTOS} photos (you have ${photos.length}).`);
      return false;
    }
    if (!price || Number(price) < 0) {
      setError("Enter a valid price (use 0 for free stuff).");
      return false;
    }
    return true;
  }

  function handleReviewClick(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setShowConfirm(true);
  }

  async function handleConfirmPost() {
    setBusy(true);
    setError("");
    try {
      // 1. Upload each photo to Storage under the user's own folder
      const uploadedUrls = [];
      for (let i = 0; i < photos.length; i++) {
        const { file } = photos[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(path);
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // Put the chosen cover photo first
      const orderedUrls = [
        uploadedUrls[coverIndex],
        ...uploadedUrls.filter((_, i) => i !== coverIndex),
      ];

      // 2. Look up a display name for "seller"
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const emoji = CATEGORIES.find((c) => c.label === category)?.emoji || "🏷️";

      // 3. Insert the listing row
      const { error: insertError } = await supabase.from("listings").insert({
        seller_id: user.id,
        seller: profileRow?.full_name || user.email,
        title,
        description,
        price: Number(price),
        category,
        condition,
        loc,
        notes,
        emoji,
        images: orderedUrls,
      });
      if (insertError) throw insertError;

      navigate("/profile");
    } catch (err) {
      setError(err.message || "Something went wrong posting your listing.");
      setShowConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-12 sm:px-10">
      <div className="max-w-2xl mx-auto relative">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-ink" />
        <div className="p-6 sm:p-8 bg-cream border-2 border-ink shadow-card">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-bold font-body text-inkSoft mb-6"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <h1 className="font-display text-ink text-3xl mb-1">Pin something up</h1>
          <p className="font-body text-inkSoft text-[13px] font-bold mb-6">
            At least {MIN_PHOTOS} photos, a price, and a description — that's it.
          </p>

          {error && (
            <p className="mb-4 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleReviewClick} className="flex flex-col gap-5">
            {/* Photos */}
            <div>
              <span className="font-mono text-[11px] text-inkSoft">
                PHOTOS ({photos.length}/{MAX_PHOTOS}, minimum {MIN_PHOTOS}) — tap the star to set
                the cover photo
              </span>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className={`relative aspect-square border-2 overflow-hidden ${
                      i === coverIndex ? "border-red" : "border-ink"
                    }`}
                  >
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverIndex(i)}
                      title="Set as cover photo"
                      className={`absolute bottom-1 left-1 rounded-full w-6 h-6 flex items-center justify-center border ${
                        i === coverIndex ? "bg-red text-cream border-ink" : "bg-cream text-ink border-ink"
                      }`}
                    >
                      <Star size={13} fill={i === coverIndex ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-ink text-cream rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                    {i === coverIndex && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold font-mono bg-red text-cream">
                        COVER
                      </span>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label
                    className={`aspect-square border-2 border-dashed border-ink flex flex-col items-center justify-center gap-1 text-inkSoft ${
                      compressing ? "opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <Upload size={20} />
                    <span className="text-[11px] font-body font-bold">
                      {compressing ? "Compressing..." : "Add photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={compressing}
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-inkSoft">TITLE</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mini fridge, works great"
                className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-inkSoft">DESCRIPTION</span>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is it, why you're selling it, any flaws to know about..."
                className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">PRICE ($)</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0 for free"
                  className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">CONDITION</span>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">CATEGORY</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[11px] text-inkSoft">MEET-UP LOCATION</span>
                <input
                  required
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder="North Quad, Wells Hall..."
                  className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-inkSoft">
                ANYTHING ELSE BUYERS SHOULD KNOW? (optional)
              </span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cash only, prefer venmo, must pick up by Friday, comes with charger..."
                className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 py-2.5 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin"
            >
              Review and pin it to the board
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Post this listing?"
        message={`"${title}" for $${price || 0} will go live on the board right away, visible to the whole campus. Double check your photos and price before confirming.`}
        confirmLabel="Yes, post it"
        busy={busy}
        onConfirm={handleConfirmPost}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
