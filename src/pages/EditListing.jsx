import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Star, Clock } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { CATEGORIES } from "../lib/sampleData";
import { MIN_PHOTOS, MAX_PHOTOS, CONDITIONS, EDIT_COOLDOWN_MS } from "../lib/listingConstants";
import ConfirmDialog from "../components/ConfirmDialog";

export default function EditListing() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [loc, setLoc] = useState("");
  const [notes, setNotes] = useState("");

  // existingPhotos: URLs already uploaded. newPhotos: { file, previewUrl } not yet uploaded.
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [coverUrl, setCoverUrl] = useState(null); // tracks cover among existingPhotos only, for simplicity
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (fetchError || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTitle(data.title || "");
      setDescription(data.description || "");
      setPrice(String(data.price ?? ""));
      setCategory(data.category || CATEGORIES[0].label);
      setCondition(data.condition || CONDITIONS[0]);
      setLoc(data.loc || "");
      setNotes(data.notes || "");
      setExistingPhotos(data.images || []);
      setCoverUrl(data.images?.[0] || null);

      if (data.last_edited_at) {
        const unlockAt = new Date(data.last_edited_at).getTime() + EDIT_COOLDOWN_MS;
        if (Date.now() < unlockAt) setLockedUntil(new Date(unlockAt));
      }

      setLoading(false);
    }
    load();
  }, [id, user.id]);

  const totalPhotoCount = existingPhotos.length + newPhotos.length;

  function handleFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const room = MAX_PHOTOS - totalPhotoCount;
    const accepted = incoming.slice(0, room).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewPhotos((prev) => [...prev, ...accepted]);
  }

  function removeExisting(url) {
    setExistingPhotos((prev) => prev.filter((u) => u !== url));
    if (coverUrl === url) setCoverUrl(null);
  }

  function removeNew(index) {
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function validate() {
    if (totalPhotoCount < MIN_PHOTOS) {
      setError(`Keep at least ${MIN_PHOTOS} photos (you have ${totalPhotoCount}).`);
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

  async function handleConfirmSave() {
    setBusy(true);
    setError("");
    try {
      // Upload any newly added photos
      const uploadedNewUrls = [];
      for (let i = 0; i < newPhotos.length; i++) {
        const { file } = newPhotos[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(path);
        uploadedNewUrls.push(publicUrlData.publicUrl);
      }

      const allUrls = [...existingPhotos, ...uploadedNewUrls];
      // Cover photo: whichever existing URL was chosen, otherwise just keep upload order
      const finalUrls = coverUrl
        ? [coverUrl, ...allUrls.filter((u) => u !== coverUrl)]
        : allUrls;

      const emoji = CATEGORIES.find((c) => c.label === category)?.emoji || "🏷️";

      const { error: updateError } = await supabase
        .from("listings")
        .update({
          title,
          description,
          price: Number(price),
          category,
          condition,
          loc,
          notes,
          emoji,
          images: finalUrls,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      navigate(`/listing/${id}`);
    } catch (err) {
      setError(err.message || "Couldn't save your changes.");
      setShowConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-center font-body text-cream">Loading listing...</div>;
  }

  if (notFound) {
    return (
      <div className="p-10 text-center">
        <p className="font-display text-cream text-2xl mb-4">Can't edit that listing.</p>
        <p className="font-body text-cream/90 text-sm">
          Either it doesn't exist anymore, or it isn't yours to edit.
        </p>
      </div>
    );
  }

  if (lockedUntil) {
    return (
      <div className="px-6 py-16 text-center max-w-md mx-auto">
        <div className="p-8 bg-cream border-2 border-ink shadow-card">
          <Clock size={28} className="mx-auto text-inkSoft mb-3" />
          <h1 className="font-display text-ink text-2xl mb-2">Not yet</h1>
          <p className="font-body text-inkSoft text-sm">
            You can only edit a listing once every 2 hours. You can edit "{title}" again at{" "}
            <span className="font-bold text-ink">
              {lockedUntil.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            .
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 px-4 py-2 text-sm font-bold font-body bg-ink text-cream border-2 border-ink"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 sm:px-10">
      <div className="max-w-2xl mx-auto relative">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-sky" />
        <div className="p-6 sm:p-8 bg-cream border-2 border-ink shadow-card">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-bold font-body text-inkSoft mb-6"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <h1 className="font-display text-ink text-3xl mb-1">Edit listing</h1>
          <p className="font-body text-inkSoft text-[13px] font-bold mb-6">
            You can only make one round of edits every 2 hours, so make them count.
          </p>

          {error && (
            <p className="mb-4 text-xs font-bold font-body text-red bg-red/10 border border-red px-3 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleReviewClick} className="flex flex-col gap-5">
            <div>
              <span className="font-mono text-[11px] text-inkSoft">
                PHOTOS ({totalPhotoCount}/{MAX_PHOTOS}, minimum {MIN_PHOTOS}) — tap the star to
                set the cover photo
              </span>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {existingPhotos.map((url) => (
                  <div
                    key={url}
                    className={`relative aspect-square border-2 overflow-hidden ${
                      url === coverUrl ? "border-red" : "border-ink"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverUrl(url)}
                      title="Set as cover photo"
                      className={`absolute bottom-1 left-1 rounded-full w-6 h-6 flex items-center justify-center border ${
                        url === coverUrl ? "bg-red text-cream border-ink" : "bg-cream text-ink border-ink"
                      }`}
                    >
                      <Star size={13} fill={url === coverUrl ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExisting(url)}
                      className="absolute top-1 right-1 bg-ink text-cream rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                    {url === coverUrl && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold font-mono bg-red text-cream">
                        COVER
                      </span>
                    )}
                  </div>
                ))}
                {newPhotos.map((p, i) => (
                  <div key={i} className="relative aspect-square border-2 border-mint overflow-hidden">
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNew(i)}
                      className="absolute top-1 right-1 bg-ink text-cream rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[9px] font-bold font-mono bg-mint text-ink">
                      NEW
                    </span>
                  </div>
                ))}
                {totalPhotoCount < MAX_PHOTOS && (
                  <label className="aspect-square border-2 border-dashed border-ink flex flex-col items-center justify-center gap-1 cursor-pointer text-inkSoft">
                    <Upload size={20} />
                    <span className="text-[11px] font-body font-bold">Add photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
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
                className="font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 py-2.5 text-sm font-bold font-body bg-sky text-ink border-2 border-ink shadow-pin"
            >
              Review changes
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Save these changes?"
        message="This uses up your edit for the next 2 hours, so make sure everything's right before confirming."
        confirmLabel="Yes, save changes"
        busy={busy}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
