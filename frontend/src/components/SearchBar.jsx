import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { photoUrl } from "../lib/api";

function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

export default function SearchBar({ members, onPick }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return members
      .filter(m => m.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [q, members]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (members.length < 2) return null;

  return (
    <div
      ref={wrapRef}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-40 w-[min(360px,72vw)]"
      data-testid="search-bar"
    >
      <div className="relative">
        <div className="flex items-center glass rounded-full pl-4 pr-2 py-2 ring-1 ring-white/5 focus-within:ring-[#D4AF37]/40 transition-all">
          <MagnifyingGlass size={14} weight="light" color="#D4AF37" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search the constellation…"
            data-testid="search-input"
            className="flex-1 bg-transparent outline-none px-3 text-sm font-manrope text-white placeholder:text-white/30"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setOpen(false); }}
              data-testid="search-clear"
              className="text-white/40 hover:text-white p-1 rounded-full"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden border border-white/10"
              data-testid="search-results"
            >
              {results.map(m => {
                const url = photoUrl(m.photo_path);
                return (
                  <button
                    key={m.id}
                    onClick={() => { onPick(m.id); setQ(""); setOpen(false); }}
                    data-testid={`search-result-${m.id}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 bg-white/5 flex items-center justify-center shrink-0">
                      {url ? (
                        <img src={url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="font-cormorant text-xs text-white/80">{initialsOf(m.name)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-cormorant text-base text-white truncate">{m.name}</div>
                      <div className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">
                        {m.gender}{m.birth_date ? ` · b. ${m.birth_date.slice(0,4)}` : ""}{m.death_date ? ` · d. ${m.death_date.slice(0,4)}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
