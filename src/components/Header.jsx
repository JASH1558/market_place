import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, User, LogIn } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import NotificationBell from "./NotificationBell";
import MessagesLink from "./MessagesLink";
import HelpLink from "./HelpLink";
import FeedbackLink from "./FeedbackLink";

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-full flex items-center justify-between px-6 py-4 sm:px-10 bg-cream border-b-[3px] border-dashed border-corkDark">
      <Link to="/" className="flex items-center gap-2 font-display text-ink">
        <span className="bg-red text-cream w-[34px] h-[34px] rounded-full inline-flex items-center justify-center -rotate-6 text-lg shadow-pin">
          Q
        </span>
        <span className="text-2xl">the Quad</span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-5">
        <Link to="/" className="hidden sm:inline text-sm font-bold font-body text-inkSoft">
          Browse
        </Link>
        {user && (
          <button
            onClick={() => navigate("/new-listing")}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold font-body px-3 py-1.5 rounded-full bg-yellow text-ink border-2 border-ink"
          >
            <Plus size={15} /> Post something
          </button>
        )}

        <HelpLink />
        <FeedbackLink />

        {user && <MessagesLink />}
        {user && <NotificationBell />}

        {user ? (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-body font-bold text-ink border-2 border-ink"
          >
            <User size={16} /> Profile
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-body font-bold text-cream bg-ink"
          >
            <LogIn size={16} /> Log in
          </button>
        )}
      </div>
    </div>
  );
}
