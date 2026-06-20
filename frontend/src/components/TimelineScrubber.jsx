import React from "react";
import { motion } from "framer-motion";
import { Slider } from "../components/ui/slider";
import { Play, Pause, Rewind, FastForward } from "@phosphor-icons/react";

export default function TimelineScrubber({ year, setYear, range, playing, onTogglePlay }) {
  if (!range) return null;
  const span = Math.max(1, range.max - range.min);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-[min(640px,86vw)] glass rounded-2xl px-6 py-5"
      data-testid="timeline-scrubber"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-manrope text-[9px] tracking-[0.3em] uppercase text-white/40">Year</div>
          <div className="font-cormorant text-3xl tracking-tight gold-text leading-none mt-0.5" data-testid="timeline-year-label">
            {year}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear(range.min)}
            data-testid="timeline-rewind"
            className="w-8 h-8 rounded-full glass-light text-white/60 hover:text-[#D4AF37] flex items-center justify-center transition-colors"
            title="Jump to earliest year"
          >
            <Rewind size={12} weight="fill" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            data-testid="timeline-play-toggle"
            className="w-9 h-9 rounded-full gold-bg text-black flex items-center justify-center hover:bg-[#E5C07B] transition-colors"
            title={playing ? "Pause" : "Play through time"}
          >
            {playing ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
          </button>
          <button
            type="button"
            onClick={() => setYear(range.max)}
            data-testid="timeline-forward"
            className="w-8 h-8 rounded-full glass-light text-white/60 hover:text-[#D4AF37] flex items-center justify-center transition-colors"
            title="Jump to latest year"
          >
            <FastForward size={12} weight="fill" />
          </button>
        </div>
      </div>

      <Slider
        min={range.min}
        max={range.max}
        step={1}
        value={[year]}
        onValueChange={(v) => setYear(v[0])}
        data-testid="timeline-slider"
        className="[&_[role=slider]]:!bg-[#D4AF37] [&_[role=slider]]:!border-[#D4AF37] [&>span:first-child]:!bg-white/10 [&>span:first-child>span]:!bg-[#D4AF37]"
      />

      <div className="flex justify-between mt-2 font-manrope text-[10px] tracking-[0.2em] uppercase text-white/30">
        <span>{range.min}</span>
        <span>{Math.round(range.min + span / 2)}</span>
        <span>{range.max}</span>
      </div>
    </motion.div>
  );
}
