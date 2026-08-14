import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, MoreVertical, Flag, ShieldOff } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  fetchThreads,
  fetchMessages,
  sendMessage,
  markThreadRead,
  subscribeToThreadMessages,
} from "../lib/messages";
import { fetchBlockedIdSet, isBlockedEitherWay } from "../lib/safety";
import BottomSheet from "../components/BottomSheet";
import ReportDialog from "../components/ReportDialog";
import BlockUserDialog from "../components/BlockUserDialog";

export default function Messages() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [threads, setThreads] = useState([]);
  const [names, setNames] = useState({}); // userId -> full_name
  const [activeId, setActiveId] = useState(requestId ? Number(requestId) : null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [activeIsBlocked, setActiveIsBlocked] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    async function loadThreads() {
      const rows = await fetchThreads(user.id);
      const blocked = await fetchBlockedIdSet(user.id);
      setBlockedIds(blocked);

      // Hide threads with anyone in a block relationship from the list —
      // if you opened a direct link to one (requestId in the URL) it's
      // still handled separately below via activeIsBlocked, which disables
      // the composer instead of yanking the page out from under you.
      const visible = rows.filter((r) => {
        const otherId = r.buyer_id === user.id ? r.seller_id : r.buyer_id;
        return !blocked.has(otherId);
      });
      setThreads(visible);

      const otherIds = new Set();
      rows.forEach((r) => {
        otherIds.add(r.buyer_id === user.id ? r.seller_id : r.buyer_id);
      });
      if (otherIds.size > 0) {
        const { data: profiles } = await supabase
          .from("public_profiles")
          .select("id, full_name")
          .in("id", Array.from(otherIds));
        const map = {};
        (profiles || []).forEach((p) => (map[p.id] = p.full_name));
        setNames(map);
      }

      if (!activeId && visible.length > 0 && !requestId) {
        setActiveId(visible[0].id);
      }
      setLoading(false);
    }
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    async function load() {
      const rows = await fetchMessages(activeId);
      if (!cancelled) setMessages(rows);
      await markThreadRead(activeId, user.id);
    }
    load();

    const unsubscribe = subscribeToThreadMessages(activeId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_id !== user.id) markThreadRead(activeId, user.id);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeId, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeThread = threads.find((t) => t.id === activeId);
  // activeThread comes from the (already-filtered) visible list, so if it's
  // present here it's not blocked — but a direct-link open (requestId in the
  // URL) may reference a thread that isn't in `threads` at all, so re-check
  // block status independently whenever the active thread's other party changes.
  useEffect(() => {
    async function checkBlock() {
      if (!activeThread) {
        setActiveIsBlocked(false);
        return;
      }
      const otherId = activeThread.buyer_id === user.id ? activeThread.seller_id : activeThread.buyer_id;
      setActiveIsBlocked(blockedIds.has(otherId) || (await isBlockedEitherWay(user.id, otherId)));
    }
    checkBlock();
  }, [activeThread, blockedIds, user.id]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !activeId || activeIsBlocked) return;
    setSending(true);
    try {
      const msg = await sendMessage({ requestId: activeId, senderId: user.id, body: draft });
      if (msg) setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch (err) {
      alert(err.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  const otherPartyId = activeThread
    ? activeThread.buyer_id === user.id
      ? activeThread.seller_id
      : activeThread.buyer_id
    : null;
  const otherName = activeThread
    ? names[otherPartyId] || activeThread.buyer_name || "them"
    : "";

  if (loading) {
    return <div className="p-10 text-center font-body text-cream">Loading messages...</div>;
  }

  return (
    <div className="px-6 py-10 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-bold font-body text-cream mb-6"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] border-2 border-ink shadow-card bg-cream min-h-[500px]">
          {/* Thread list */}
          <div
            className={`border-b-2 sm:border-b-0 sm:border-r-2 border-ink overflow-y-auto ${
              activeId ? "hidden sm:block" : ""
            }`}
          >
            <p className="font-mono text-[10px] text-inkSoft p-3 pb-1">CONVERSATIONS</p>
            {threads.length === 0 ? (
              <p className="font-body text-inkSoft text-sm p-3">
                No conversations yet — a thread opens once you or a buyer expresses interest in a
                listing.
              </p>
            ) : (
              threads.map((t) => {
                const other =
                  names[t.buyer_id === user.id ? t.seller_id : t.buyer_id] || t.buyer_name || "them";
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-dashed border-corkDark font-body text-sm ${
                      activeId === t.id ? "bg-yellow/40" : ""
                    }`}
                  >
                    <p className="font-bold text-ink truncate">{other}</p>
                    <p className="text-inkSoft text-xs truncate">{t.listing_title}</p>
                  </button>
                );
              })
            )}
          </div>

          {/* Active thread */}
          <div className={`flex flex-col ${activeId ? "" : "hidden sm:flex"}`}>
            {!activeThread ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="font-body text-inkSoft text-sm flex items-center gap-2">
                  <MessageCircle size={16} /> Pick a conversation to see messages.
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b-2 border-dashed border-corkDark flex items-center gap-3">
                  <button
                    onClick={() => setActiveId(null)}
                    className="sm:hidden text-xs font-bold font-body text-inkSoft flex items-center gap-1"
                  >
                    <ArrowLeft size={12} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-ink text-lg leading-tight truncate">{otherName}</p>
                    <Link
                      to={`/listing/${activeThread.listing_id}`}
                      className="font-body text-inkSoft text-xs underline"
                    >
                      {activeThread.listing_title}
                    </Link>
                  </div>
                  <button
                    onClick={() => setShowActionsSheet(true)}
                    aria-label="More options"
                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-inkSoft active:bg-ink/10"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                {activeIsBlocked && (
                  <div className="px-4 py-2.5 bg-ink/5 border-b border-ink/10">
                    <p className="font-body text-xs text-inkSoft">
                      You can't send new messages in this conversation.
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {messages.length === 0 ? (
                    <p className="font-body text-inkSoft text-sm m-auto">No messages yet — say hi.</p>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === user.id;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[75%] px-3 py-2 text-sm font-body border-2 border-ink ${
                            mine ? "self-end bg-mint/50" : "self-start bg-white"
                          }`}
                        >
                          {m.body}
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 border-t-2 border-dashed border-corkDark flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={activeIsBlocked ? "You can't message here anymore" : "Type a message..."}
                    disabled={activeIsBlocked}
                    className="flex-1 font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim() || activeIsBlocked}
                    className="px-3 py-2 bg-red text-cream border-2 border-ink shadow-pin disabled:opacity-60"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

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
              setShowReport(true);
            }}
            className="flex items-center gap-3 px-3 py-3.5 text-left font-body text-sm text-ink"
          >
            <Flag size={18} className="text-inkSoft" /> Report {otherName}
          </button>
          {!activeIsBlocked && (
            <button
              type="button"
              onClick={() => {
                setShowActionsSheet(false);
                setShowBlock(true);
              }}
              className="flex items-center gap-3 px-3 py-3.5 text-left font-body text-sm text-red border-t border-ink/10"
            >
              <ShieldOff size={18} /> Block {otherName}
            </button>
          )}
        </div>
      </BottomSheet>

      {activeThread && otherPartyId && (
        <>
          <ReportDialog
            open={showReport}
            onClose={() => setShowReport(false)}
            reporterId={user.id}
            target={{
              reportedUserId: otherPartyId,
              reportedUserName: otherName,
              listingTitle: activeThread.listing_title,
            }}
          />
          <BlockUserDialog
            open={showBlock}
            onClose={() => setShowBlock(false)}
            blockerId={user.id}
            blockedId={otherPartyId}
            blockedName={otherName}
            onBlocked={() => {
              setActiveIsBlocked(true);
              setBlockedIds((prev) => new Set(prev).add(otherPartyId));
              setThreads((prev) => prev.filter((t) => t.id !== activeThread.id));
            }}
          />
        </>
      )}
    </div>
  );
}
