import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Tag,
  Sparkles,
  Trash2,
  Pencil,
  CheckCircle2,
  Heart,
  Star,
  MessageCircle,
  MoreVertical,
  Flag,
  ShieldOff,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { deleteListingWithPhotos } from "../lib/deleteListing";
import { getAverageRating } from "../lib/ratings";
import { getMyRequestForListing } from "../lib/interestRequests";
import { isBlockedEitherWay } from "../lib/safety";
import MarkSoldDialog from "../components/MarkSoldDialog";
import InterestDialog from "../components/InterestDialog";
import BottomSheet from "../components/BottomSheet";
import ReportDialog from "../components/ReportDialog";
import BlockUserDialog from "../components/BlockUserDialog";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSoldDialog, setShowSoldDialog] = useState(false);
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [sellerRating, setSellerRating] = useState({ average: null, count: 0 });
  const [myName, setMyName] = useState("");
  const [myRequestId, setMyRequestId] = useState(null);

  // Trust & safety
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReportListing, setShowReportListing] = useState(false);
  const [showReportSeller, setShowReportSeller] = useState(false);
  const [showBlockSeller, setShowBlockSeller] = useState(false);
  const [blockedWithSeller, setBlockedWithSeller] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNotFound(false);

      const { data: listingRow, error } = await supabase
        .from("listings")
        .select("id, seller_id, emoji, title, price, seller, loc, images, description, condition, category, notes, created_at")
        .eq("id", id)
        .maybeSingle();

      if (error || !listingRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setListing(listingRow);

      if (listingRow.seller_id) {
        const { data: profileRow } = await supabase
          .from("public_profiles")
          .select("full_name, degree, year, branch, dorm, bio")
          .eq("id", listingRow.seller_id)
          .maybeSingle();
        setSeller(profileRow);

        const rating = await getAverageRating(listingRow.seller_id);
        setSellerRating(rating);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    async function loadMyName() {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      setMyName(data?.full_name || user.email);
    }
    loadMyName();
  }, [user]);

  useEffect(() => {
    async function loadMyRequest() {
      if (!user || !listing || listing.seller_id === user.id) return;
      const existing = await getMyRequestForListing(listing.id, user.id);
      if (existing) {
        setMyRequestId(existing.id);
        if (existing.status !== "declined") setRequestSent(true);
      }
    }
    loadMyRequest();
  }, [user, listing]);

  useEffect(() => {
    async function checkBlock() {
      if (!user || !listing?.seller_id || listing.seller_id === user.id) return;
      setBlockedWithSeller(await isBlockedEitherWay(user.id, listing.seller_id));
    }
    checkBlock();
  }, [user, listing]);

  if (loading) {
    return <div className="p-10 text-center font-body text-cream">Loading listing...</div>;
  }

  if (notFound) {
    return (
      <div className="p-10 text-center">
        <p className="font-display text-cream text-2xl mb-4">Couldn't find that listing.</p>
        <p className="font-body text-cream/90 text-sm mb-6">
          It may have sold, been taken down, or it's one of the sample cards that isn't real data yet.
        </p>
        <Link to="/" className="font-body font-bold text-ink bg-cream px-4 py-2 border-2 border-ink inline-block">
          Back to the board
        </Link>
      </div>
    );
  }

  const photos = listing.images && listing.images.length > 0 ? listing.images : null;
  const isOwner = user && listing.seller_id === user.id;
  const canReportOrBlock = user && !isOwner && listing.seller_id;

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${listing.title}"? This can't be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteListingWithPhotos(listing);
      navigate("/profile");
    } catch (err) {
      alert(err.message || "Couldn't delete that listing.");
      setDeleting(false);
    }
  }

  return (
    <div className="px-6 py-12 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-bold font-body text-cream"
          >
            <ArrowLeft size={14} /> Back
          </button>

          {canReportOrBlock && (
            <button
              onClick={() => setShowActionsSheet(true)}
              aria-label="More options"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-cream/95 border-2 border-ink text-ink"
            >
              <MoreVertical size={18} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Photos */}
          <div className="relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-red" />
            <div className="border-2 border-ink shadow-card bg-cream p-3">
              {photos ? (
                <>
                  <div className="aspect-square w-full overflow-hidden border-2 border-ink">
                    <img
                      src={photos[activePhoto]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {photos.length > 1 && (
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {photos.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setActivePhoto(i)}
                          className={`aspect-square overflow-hidden border-2 ${
                            i === activePhoto ? "border-red" : "border-ink"
                          }`}
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square w-full flex items-center justify-center text-8xl bg-yellow border-2 border-ink">
                  {listing.emoji}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="relative">
            <div className="p-6 bg-cream border-2 border-ink shadow-card h-full flex flex-col">
              <span className="inline-block w-fit px-2 py-0.5 mb-3 text-xs font-bold font-mono bg-ink text-cream">
                ${listing.price}
              </span>
              <h1 className="font-display text-ink text-3xl leading-tight mb-2">{listing.title}</h1>

              <div className="flex flex-wrap gap-2 mb-4">
                {listing.category && (
                  <span className="flex items-center gap-1 text-xs font-bold font-body px-2 py-1 bg-sky border border-ink">
                    <Tag size={12} /> {listing.category}
                  </span>
                )}
                {listing.condition && (
                  <span className="flex items-center gap-1 text-xs font-bold font-body px-2 py-1 bg-mint border border-ink">
                    <Sparkles size={12} /> {listing.condition}
                  </span>
                )}
                {listing.loc && (
                  <span className="flex items-center gap-1 text-xs font-bold font-body px-2 py-1 bg-lilac border border-ink">
                    <MapPin size={12} /> {listing.loc}
                  </span>
                )}
              </div>

              <p className="font-body text-ink text-sm leading-relaxed whitespace-pre-wrap mb-4">
                {listing.description}
              </p>

              {listing.notes && (
                <div className="mb-4 p-3 bg-yellow/40 border border-ink">
                  <p className="font-mono text-[10px] text-inkSoft mb-1">GOOD TO KNOW</p>
                  <p className="font-body text-ink text-sm">{listing.notes}</p>
                </div>
              )}

              <div className="mt-auto pt-4 border-t-2 border-dashed border-corkDark">
                <p className="font-mono text-[10px] text-inkSoft mb-2">SELLER</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink border-2 border-ink flex items-center justify-center font-display text-ink">
                    {(seller?.full_name || listing.seller || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-body font-bold text-ink text-sm">
                        {seller?.full_name || listing.seller}
                      </p>
                      {sellerRating.average !== null && (
                        <span className="flex items-center gap-1 text-[10px] font-bold font-mono px-1.5 py-0.5 bg-yellow border border-ink">
                          <Star size={10} fill="#2B2440" /> {sellerRating.average.toFixed(1)} (
                          {sellerRating.count})
                        </span>
                      )}
                    </div>
                    {seller?.dorm && (
                      <p className="font-body text-inkSoft text-xs">{seller.dorm}</p>
                    )}
                  </div>
                </div>

                {!isOwner && (
                  <>
                    {!user ? (
                      <Link
                        to="/login"
                        className="mt-4 block text-center w-full py-2.5 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin"
                      >
                        Log in to express interest
                      </Link>
                    ) : blockedWithSeller ? (
                      <p className="mt-4 w-full text-center py-2.5 text-sm font-bold font-body bg-ink/10 text-inkSoft border-2 border-ink/20">
                        You can't contact this seller.
                      </p>
                    ) : requestSent ? (
                      <div className="mt-4 flex flex-col gap-2">
                        <p className="w-full text-center py-2.5 text-sm font-bold font-body bg-mint/40 text-ink border-2 border-ink">
                          Request sent — you'll be notified if they accept.
                        </p>
                        {myRequestId && (
                          <Link
                            to={`/messages/${myRequestId}`}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold font-body bg-sky text-ink border-2 border-ink shadow-pin"
                          >
                            <MessageCircle size={14} /> Message seller
                          </Link>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowInterestDialog(true)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin"
                      >
                        <Heart size={14} /> I'm interested
                      </button>
                    )}
                  </>
                )}

                {isOwner && (
                  <>
                    <Link
                      to="/messages"
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold font-body bg-lilac text-ink border-2 border-ink shadow-pin"
                    >
                      <MessageCircle size={14} /> Messages
                    </Link>
                    <button
                      type="button"
                      onClick={() => navigate(`/edit-listing/${listing.id}`)}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold font-body bg-sky text-ink border-2 border-ink shadow-pin"
                    >
                      <Pencil size={14} /> Edit listing
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSoldDialog(true)}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold font-body bg-mint text-ink border-2 border-ink shadow-pin"
                    >
                      <CheckCircle2 size={14} /> Mark as sold
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold font-body bg-cream text-red border-2 border-red disabled:opacity-60"
                    >
                      <Trash2 size={14} /> {deleting ? "Deleting..." : "Delete this listing"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSoldDialog && (
        <MarkSoldDialog
          listing={listing}
          onClose={() => setShowSoldDialog(false)}
          onSold={() => navigate("/profile")}
        />
      )}

      {showInterestDialog && user && (
        <InterestDialog
          listing={listing}
          buyerId={user.id}
          buyerName={myName || user.email}
          onClose={() => setShowInterestDialog(false)}
          onSent={(req) => {
            setRequestSent(true);
            if (req) setMyRequestId(req.id);
          }}
        />
      )}

      {/* Mobile-first overflow action sheet: report / block */}
      <BottomSheet
        open={showActionsSheet}
        onClose={() => setShowActionsSheet(false)}
        title="Options"
      >
        <div className="flex flex-col gap-2 -mt-1">
          <button
            type="button"
            onClick={() => {
              setShowActionsSheet(false);
              setShowReportListing(true);
            }}
            className="flex items-center gap-3 px-3 py-3.5 text-left font-body text-sm text-ink"
          >
            <Flag size={18} className="text-inkSoft" /> Report this listing
          </button>
          <button
            type="button"
            onClick={() => {
              setShowActionsSheet(false);
              setShowReportSeller(true);
            }}
            className="flex items-center gap-3 px-3 py-3.5 text-left font-body text-sm text-ink border-t border-ink/10"
          >
            <Flag size={18} className="text-inkSoft" /> Report the seller
          </button>
          {!blockedWithSeller && (
            <button
              type="button"
              onClick={() => {
                setShowActionsSheet(false);
                setShowBlockSeller(true);
              }}
              className="flex items-center gap-3 px-3 py-3.5 text-left font-body text-sm text-red border-t border-ink/10"
            >
              <ShieldOff size={18} /> Block this seller
            </button>
          )}
        </div>
      </BottomSheet>

      {user && canReportOrBlock && (
        <>
          <ReportDialog
            open={showReportListing}
            onClose={() => setShowReportListing(false)}
            reporterId={user.id}
            target={{
              listingId: listing.id,
              listingTitle: listing.title,
              reportedUserId: listing.seller_id,
              reportedUserName: seller?.full_name || listing.seller,
            }}
          />
          <ReportDialog
            open={showReportSeller}
            onClose={() => setShowReportSeller(false)}
            reporterId={user.id}
            target={{
              reportedUserId: listing.seller_id,
              reportedUserName: seller?.full_name || listing.seller,
            }}
          />
          <BlockUserDialog
            open={showBlockSeller}
            onClose={() => setShowBlockSeller(false)}
            blockerId={user.id}
            blockedId={listing.seller_id}
            blockedName={seller?.full_name || listing.seller}
            onBlocked={() => setBlockedWithSeller(true)}
          />
        </>
      )}
    </div>
  );
}
