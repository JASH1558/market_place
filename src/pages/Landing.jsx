import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { StickyCard } from "../components/Bits";
import { supabase } from "../lib/supabaseClient";
import { SAMPLE_LISTINGS, CATEGORIES } from "../lib/sampleData";

export default function Landing() {
  const [listings, setListings] = useState(SAMPLE_LISTINGS);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    async function loadListings() {
      const { data, error } = await supabase
        .from("listings")
        .select("id, emoji, title, price, seller, loc, images, description, condition, category")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        setListings(data);
      }
      // On error or empty table, we silently keep the sample listings
      // so the page still looks alive before you've added real data.
    }
    loadListings();
  }, []);

  const filtered = listings.filter((item) => {
    const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !activeCategory || item.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div>
      <div className="px-6 pt-14 pb-10 sm:px-10 text-center">
        <span className="inline-block px-3 py-1 mb-5 text-xs font-bold font-mono rounded-full bg-cream text-ink border-2 border-ink -rotate-2">
          BY STUDENTS · FOR STUDENTS
        </span>
        <h1 className="font-display text-cream drop-shadow-[3px_3px_0_rgba(43,36,64,0.35)] text-[clamp(2.4rem,6vw,4.2rem)]">
          The corkboard, online.
        </h1>
        <p className="max-w-xl mx-auto mt-3 mb-8 font-body font-bold text-cream/95 text-lg">
          Buy it, sell it, don't schlep it across campus. Everything your classmates
          are giving away, trading, or trying to unload before finals.
        </p>

        <div className="max-w-lg mx-auto flex items-center gap-2 p-2 bg-cream border-2 border-ink shadow-card">
          <Search size={18} className="text-inkSoft ml-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a mini fridge, a bike, calc notes..."
            className="font-body text-ink w-full bg-transparent border-none outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 px-6 pb-10 sm:px-10">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold font-body border-2 border-ink rounded-full ${
            !activeCategory ? "bg-ink text-cream" : "bg-cream text-ink"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.label}
            onClick={() => setActiveCategory(activeCategory === c.label ? null : c.label)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold font-body border-2 border-ink rounded-full ${
              activeCategory === c.label ? "bg-ink text-cream" : "bg-cream text-ink"
            }`}
          >
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="px-6 pb-6 sm:px-10">
        <h2 className="font-display text-cream drop-shadow-[2px_2px_0_rgba(43,36,64,0.35)] text-2xl mb-6">
          {activeCategory ? `${activeCategory} on the board` : "Fresh on the board"}
        </h2>
        {filtered.length === 0 ? (
          <p className="font-body text-cream/90">Nothing matches that search yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filtered.map((item, i) => (
              <StickyCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-14 px-6 py-8 sm:px-10 text-center bg-ink">
        <p className="font-display text-cream text-xl">the Quad</p>
        <p className="font-body text-[13px] text-[#C9C3DA] mt-1">
          A marketplace for one campus. No shipping, no strangers from three states away — just people down the hall.
        </p>
      </div>
    </div>
  );
}
