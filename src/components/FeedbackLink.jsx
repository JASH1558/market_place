import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";

export default function FeedbackLink() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/feedback")}
      aria-label="Send feedback"
      className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-ink bg-cream text-ink"
    >
      <MessageSquare size={16} />
    </button>
  );
}
