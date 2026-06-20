import React from "react";
import { motion } from "framer-motion";
import { Plus, TreeStructure } from "@phosphor-icons/react";

export default function EmptyState({ onAdd }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
    >
      <div className="glass rounded-2xl p-12 max-w-md pointer-events-auto flex flex-col items-center text-center" data-testid="empty-state">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/5 flex items-center justify-center mb-6 ring-1 ring-[#D4AF37]/30">
          <TreeStructure size={28} weight="duotone" color="#D4AF37" />
        </div>
        <h1 className="font-cormorant text-4xl sm:text-5xl font-light tracking-tight leading-tight">
          Begin your lineage
        </h1>
        <p className="font-manrope text-sm text-white/60 mt-4 leading-relaxed">
          Every constellation starts with a single star.
          Add the first soul to your family tree.
        </p>
        <button
          onClick={onAdd}
          data-testid="empty-add-button"
          className="mt-8 flex items-center gap-2 gold-bg text-black px-6 py-3 rounded-full font-manrope text-sm font-medium tracking-wide hover:bg-[#E5C07B] hover:-translate-y-0.5 transition-all duration-300 shadow-[0_8px_32px_rgba(212,175,55,0.4)]"
        >
          <Plus size={16} weight="bold" />
          Add first member
        </button>
      </div>
    </motion.div>
  );
}
