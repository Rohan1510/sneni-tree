import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play } from "@phosphor-icons/react";
import { eventMeta } from "../lib/eventTypes";

const PLAYBACK_MS_PER_YEAR = 400; // 4 seconds per decade

export default function CinemaOverlay({ active, members, range, onExit, year, setYear }) {
  const [playing, setPlaying] = useState(true);
  const intervalRef = useRef(null);
  const lastYearRef = useRef(year);
  const [recentCaptions, setRecentCaptions] = useState([]); // [{key, year, member, event, ts}]

  // Flatten events with their owner member for caption lookup
  const eventsByYear = useMemo(() => {
    const map = new Map();
    for (const m of members) {
      for (const ev of (m.events || [])) {
        if (!map.has(ev.year)) map.set(ev.year, []);
        map.get(ev.year).push({ member: m, event: ev });
      }
    }
    return map;
  }, [members]);

  // Start playback when activated
  useEffect(() => {
    if (active && range) {
      setYear(range.min);
      lastYearRef.current = range.min;
      setRecentCaptions([]);
      setPlaying(true);
    }
  }, [active, range?.min, range?.max]); // eslint-disable-line

  // Auto-play loop
  useEffect(() => {
    if (!active || !playing || !range) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      setYear(prev => {
        const cur = prev == null ? range.min : prev;
        if (cur >= range.max) {
          setPlaying(false);
          return range.max;
        }
        return cur + 1;
      });
    }, PLAYBACK_MS_PER_YEAR);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, playing, range?.min, range?.max]); // eslint-disable-line

  // When year changes, look up new captions
  useEffect(() => {
    if (!active || year == null) return;
    const hits = eventsByYear.get(year) || [];
    if (hits.length === 0) return;
    const newCaps = hits.map((h, i) => ({
      key: `${year}-${h.event.id || i}-${Date.now()}`,
      year,
      member: h.member,
      event: h.event,
      ts: Date.now(),
    }));
    setRecentCaptions(prev => {
      const fresh = [...newCaps, ...prev].slice(0, 4);
      return fresh;
    });
  }, [year, active, eventsByYear]);

  // Auto-expire captions older than 2.5s
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      const now = Date.now();
      setRecentCaptions(prev => prev.filter(c => now - c.ts < 2500));
    }, 250);
    return () => clearInterval(t);
  }, [active]);

  // ESC to exit
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onExit]);

  if (!active || !range) return null;

  const aliveCount = members.filter(m => {
    const by = m.birth_date ? parseInt(m.birth_date.slice(0, 4), 10) : null;
    const dy = m.death_date ? parseInt(m.death_date.slice(0, 4), 10) : null;
    if (by == null) return false;
    if (year < by) return false;
    if (dy != null && year > dy) return false;
    return true;
  }).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 pointer-events-none"
      data-testid="cinema-overlay"
    >
      {/* Top vignette */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/85 to-transparent pointer-events-none" />
      {/* Bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />

      {/* Big year */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center pointer-events-none select-none">
        <div className="font-manrope text-[10px] tracking-[0.4em] uppercase text-white/50">
          A lineage in time
        </div>
        <div className="font-cormorant text-[120px] sm:text-[160px] leading-none gold-text mt-2 tabular-nums" data-testid="cinema-year">
          {year ?? range.min}
        </div>
        <div className="font-manrope text-[10px] tracking-[0.4em] uppercase text-white/40 mt-1">
          {aliveCount} {aliveCount === 1 ? "soul" : "souls"} present
        </div>
      </div>

      {/* Captions */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[min(720px,86vw)] pointer-events-none">
        <AnimatePresence>
          {recentCaptions.map((c) => {
            const meta = eventMeta(c.event.type);
            const Icon = meta.icon;
            return (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-4 mb-3 glass rounded-xl px-5 py-3 ring-1"
                style={{ borderColor: `${meta.color}55` }}
                data-testid="cinema-caption"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center ring-1 shrink-0"
                  style={{ background: `${meta.color}22`, borderColor: `${meta.color}77` }}
                >
                  <Icon size={18} weight="fill" color={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-manrope text-[10px] tracking-[0.3em] uppercase text-white/40">
                    {c.year} · {c.member.name}
                  </div>
                  <div className="font-cormorant text-2xl tracking-tight text-white truncate">
                    {c.event.title}
                  </div>
                  {c.event.location && (
                    <div className="font-manrope text-[11px] text-white/50 italic mt-0.5">
                      {c.event.location}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Controls (pointer-events-auto only on the bar) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={() => setPlaying(p => !p)}
          data-testid="cinema-play-toggle"
          className="w-12 h-12 rounded-full gold-bg text-black flex items-center justify-center hover:bg-[#E5C07B] transition-all shadow-[0_8px_32px_rgba(212,175,55,0.4)]"
        >
          {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
        </button>
        <button
          type="button"
          onClick={onExit}
          data-testid="cinema-exit-button"
          className="w-12 h-12 rounded-full glass flex items-center justify-center text-white/80 hover:text-[#D4AF37] transition-all"
          title="Exit cinema (Esc)"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 text-[9px] tracking-[0.3em] uppercase font-manrope pointer-events-none">
        Press ESC to exit
      </div>
    </motion.div>
  );
}
