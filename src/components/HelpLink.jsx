import React from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle } from "lucide-react";

export default function HelpLink() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/help")}
      aria-label="Help"
      className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-ink bg-cream text-ink"
    >
      <HelpCircle size={16} />
    </button>
  );
}
