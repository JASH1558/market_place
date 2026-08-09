import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, Pencil, LogOut, Save } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { deleteListingWithPhotos } from "../lib/deleteListing";
import { StickyCard } from "../components/Bits";
import MarkSoldDialog from "../components/MarkSoldDialog";
import { DEGREES, YEARS, BRANCHES } from "../lib/profileOptions";

const EMPTY_PROFILE = {
  full_name: "",
  degree: "",
  year: "",
  branch: "",
  dorm: "",
  bio: "",
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [editing, setEditing] = useState(false);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersTab, setOrdersTab] = useState("sold"); // "sold" | "bought"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soldDialogItem, setSoldDialogItem] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, degree, year, branch, dorm, bio")
        .eq("id", user.id)
        .maybeSingle();

      if (profileRow) {
        setProfile(profileRow);
        setDraft(profileRow);
      }

      const { data: listingRows } = await supabase
        .from("listings")
        .select("id, seller_id, emoji, title, price, seller, loc, images, description, condition, category")
        .eq("seller_id", user.id);
      if (listingRows) setListings(listingRows);

      const { data: orderRows } = await supabase
        .from("orders")
        .select("*")
        .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
        .order("sold_at", { ascending: false });
      if (orderRows) setOrders(orderRows);

      setLoading(false);
    }
    load();
  }, [user.id]);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...draft });
    if (!error) {
      setProfile(draft);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Delete "${item.title}"? This can't be undone.`);
    if (!confirmed) return;
    try {
      await deleteListingWithPhotos(item);
      setListings((prev) => prev.filter((l) => l.id !== item.id));
    } catch (err) {
      alert(err.message || "Couldn't delete that listing.");
    }
  }

  function handleSoldComplete(listingId) {
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  }

  const initials = (profile.full_name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const soldOrders = orders.filter((o) => o.seller_id === user.id);
  const boughtOrders = orders.filter((o) => o.buyer_id === user.id);
  const visibleOrders = ordersTab === "sold" ? soldOrders : boughtOrders;

  if (loading) {
    return <div className="p-10 text-center font-body text-cream">Loading your profile...</div>;
  }

  return (
    <div className="px-6 py-12 sm:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="relative mb-10">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-red" />
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start bg-cream border-2 border-ink shadow-card">
            <div className="shrink-0 flex items-center justify-center w-24 h-24 bg-sky border-2 border-ink rounded-full font-display text-3xl text-ink -rotate-3">
              {initials}
            </div>

            <div className="flex-1 text-center sm:text-left w-full">
              {editing ? (
                <div className="flex flex-col gap-3">
                  <input
                    value={draft.full_name}
                    onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                    placeholder="Full name"
                    className="font-display text-xl px-2 py-1 border-2 border-ink bg-white"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={draft.degree}
                      onChange={(e) => setDraft({ ...draft, degree: e.target.value })}
                      className="font-body text-sm px-2 py-1.5 border-2 border-ink bg-white"
                    >
                      <option value="">Degree</option>
                      {DEGREES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draft.year}
                      onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                      className="font-body text-sm px-2 py-1.5 border-2 border-ink bg-white"
                    >
                      <option value="">Year</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draft.branch}
                      onChange={(e) => setDraft({ ...draft, branch: e.target.value })}
                      className="font-body text-sm px-2 py-1.5 border-2 border-ink bg-white"
                    >
                      <option value="">Branch</option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={draft.dorm}
                    onChange={(e) => setDraft({ ...draft, dorm: e.target.value })}
                    placeholder="Dorm / building"
                    className="font-body text-sm px-2 py-1 border-2 border-ink bg-white"
                  />
                  <textarea
                    value={draft.bio}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    placeholder="Short bio"
                    rows={3}
                    className="font-body text-sm px-2 py-1 border-2 border-ink bg-white max-w-md"
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                    <h1 className="font-display text-ink text-3xl">
                      {profile.full_name || user.email}
                    </h1>
                    <span className="flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 bg-yellow border border-ink self-center">
                      <Star size={12} fill="#2B2440" /> 4.8
                    </span>
                  </div>
                  <p className="font-body text-inkSoft font-bold text-sm">
                    {profile.degree || profile.year || profile.branch
                      ? [
                          profile.degree,
                          profile.year ? `Year ${profile.year}` : null,
                          profile.branch,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Add your degree, year, and branch"}
                  </p>
                  <p className="font-body text-inkSoft text-[13px] flex items-center gap-1 justify-center sm:justify-start mt-1">
                    <MapPin size={13} /> {profile.dorm || "Add where to find you"}
                  </p>
                  <p className="font-body text-ink text-sm mt-3 max-w-md">
                    {profile.bio || "Tell campus a bit about what you're selling and when you're around."}
                  </p>
                </>
              )}
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
              {editing ? (
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold font-body bg-mint border-2 border-ink disabled:opacity-60"
                >
                  <Save size={13} /> {saving ? "Saving..." : "Save"}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setDraft(profile);
                    setEditing(true);
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold font-body bg-mint border-2 border-ink"
                >
                  <Pencil size={13} /> Edit profile
                </button>
              )}
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold font-body bg-cream text-inkSoft border-2 border-ink"
              >
                <LogOut size={13} /> Log out
              </button>
            </div>
          </div>
        </div>

        <h2 className="font-display text-cream drop-shadow-[2px_2px_0_rgba(43,36,64,0.35)] text-xl mb-6">
          My listings
        </h2>
        {listings.length === 0 ? (
          <p className="font-body text-cream/90 mb-14">You haven't posted anything yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-10 mb-14">
            {listings.map((item, i) => (
              <StickyCard
                key={item.id}
                item={item}
                index={i}
                ownerActions={{
                  onEdit: (it) => navigate(`/edit-listing/${it.id}`),
                  onMarkSold: (it) => setSoldDialogItem(it),
                  onDelete: handleDelete,
                }}
              />
            ))}
          </div>
        )}

        {/* Past orders */}
        <h2 className="font-display text-cream drop-shadow-[2px_2px_0_rgba(43,36,64,0.35)] text-xl mb-4">
          Past orders
        </h2>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setOrdersTab("sold")}
            className={`px-4 py-1.5 text-sm font-bold font-body border-2 border-ink rounded-full ${
              ordersTab === "sold" ? "bg-ink text-cream" : "bg-cream text-ink"
            }`}
          >
            Sold ({soldOrders.length})
          </button>
          <button
            onClick={() => setOrdersTab("bought")}
            className={`px-4 py-1.5 text-sm font-bold font-body border-2 border-ink rounded-full ${
              ordersTab === "bought" ? "bg-ink text-cream" : "bg-cream text-ink"
            }`}
          >
            Bought ({boughtOrders.length})
          </button>
        </div>

        {visibleOrders.length === 0 ? (
          <p className="font-body text-cream/90">
            {ordersTab === "sold" ? "Nothing sold yet." : "Nothing bought yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-4 p-3 bg-cream border-2 border-ink"
              >
                <div className="w-14 h-14 shrink-0 border-2 border-ink overflow-hidden bg-yellow flex items-center justify-center text-2xl">
                  {o.images && o.images.length > 0 ? (
                    <img src={o.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    o.emoji || "🏷️"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-ink text-base truncate">{o.title}</p>
                  <p className="font-body text-inkSoft text-xs">
                    ${o.price} · {ordersTab === "sold" ? `to ${o.buyer_email}` : `from ${o.seller}`}
                  </p>
                </div>
                <p className="font-mono text-[10px] text-inkSoft shrink-0">
                  {new Date(o.sold_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {soldDialogItem && (
        <MarkSoldDialog
          listing={soldDialogItem}
          onClose={() => setSoldDialogItem(null)}
          onSold={handleSoldComplete}
        />
      )}
    </div>
  );
}
