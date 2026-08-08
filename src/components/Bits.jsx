import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Trash2 } from "lucide-react";

export function PushPin({ color = "#E4572E", className = "" }) {
  return (
    <div
      className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 ${className}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, #fff8 0%, ${color} 45%, ${color} 100%)`,
      }}
    />
  );
}

export function TapeStrip() {
  return (
    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-2 w-[70px] h-[22px] bg-white/55 border border-white/70 shadow-sm z-10" />
  );
}

const STICKY_BG_CLASSES = ["bg-yellow", "bg-pink", "bg-mint", "bg-sky", "bg-lilac"];
const ROTATIONS = [-4, 3, -2, 5, -5, 2, -3, 4];

export function StickyCard({ item, index = 0, onDelete }) {
  const bgClass = STICKY_BG_CLASSES[index % STICKY_BG_CLASSES.length];
  const rotation = ROTATIONS[index % ROTATIONS.length];

  return (
    <div
      className="relative transition-transform duration-200 hover:!rotate-0 hover:scale-[1.04]"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <PushPin color={index % 2 === 0 ? "#E4572E" : "#2B2440"} />
      {onDelete && (
        <button
          type="button"
          title="Delete listing"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(item);
          }}
          className="absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full bg-red text-cream border-2 border-ink flex items-center justify-center shadow-pin"
        >
          <Trash2 size={13} />
        </button>
      )}
      <Link
        to={`/listing/${item.id}`}
        className={`${bgClass} border-2 border-ink shadow-pin p-4 flex flex-col gap-2 min-h-[190px]`}
      >
        {item.images && item.images.length > 0 ? (
          <div className="relative">
            <img
              src={item.images[0]}
              alt={item.title}
              className="w-full h-28 object-cover border-2 border-ink"
            />
            <span className="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold font-mono bg-ink text-cream rotate-3">
              ${item.price}
            </span>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <span className="text-3xl">{item.emoji}</span>
            <span className="px-2 py-0.5 text-xs font-bold font-mono bg-ink text-cream rotate-3">
              ${item.price}
            </span>
          </div>
        )}
        <p className="font-display text-ink text-lg leading-tight">{item.title}</p>
        <div className="mt-auto flex items-center justify-between text-xs font-body font-bold text-inkSoft">
          <span>{item.seller}</span>
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {item.loc}
          </span>
        </div>
      </Link>
    </div>
  );
}
