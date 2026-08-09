import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { getTotalUnreadCount, subscribeToInboxMessageChanges } from "../lib/messages";

export default function MessagesLink() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function refresh() {
      setUnread(await getTotalUnreadCount(user.id));
    }
    refresh();
    const unsubscribe = subscribeToInboxMessageChanges(user.id, refresh);
    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  return (
    <button
      onClick={() => navigate("/messages")}
      className="relative w-9 h-9 flex items-center justify-center rounded-full border-2 border-ink bg-cream text-ink"
    >
      <MessageCircle size={16} />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red text-cream text-[10px] font-bold font-mono flex items-center justify-center border border-ink">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
