import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  fetchThreads,
  fetchMessages,
  sendMessage,
  markThreadRead,
  subscribeToThreadMessages,
} from "../lib/messages";

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
  const bottomRef = useRef(null);

  useEffect(() => {
    async function loadThreads() {
      const rows = await fetchThreads(user.id);
      setThreads(rows);

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

      if (!activeId && rows.length > 0 && !requestId) {
        setActiveId(rows[0].id);
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

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
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

  const activeThread = threads.find((t) => t.id === activeId);
  const otherName = activeThread
    ? names[activeThread.buyer_id === user.id ? activeThread.seller_id : activeThread.buyer_id] ||
      activeThread.buyer_name ||
      "them"
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
                  <div className="flex-1">
                    <p className="font-display text-ink text-lg leading-tight">{otherName}</p>
                    <Link
                      to={`/listing/${activeThread.listing_id}`}
                      className="font-body text-inkSoft text-xs underline"
                    >
                      {activeThread.listing_title}
                    </Link>
                  </div>
                </div>

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
                    placeholder="Type a message..."
                    className="flex-1 font-body px-3 py-2 border-2 border-ink bg-white text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
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
    </div>
  );
}
