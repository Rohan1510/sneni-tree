import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, TreeStructure, Sparkle, ArrowsOutSimple } from "@phosphor-icons/react";
import Scene3D from "./Scene3D";
import AddMemberDialog from "./AddMemberDialog";
import DetailsPanel from "./DetailsPanel";
import EmptyState from "./EmptyState";
import SearchBar from "./SearchBar";
import { listMembers, deleteMember, uploadPhoto, updateMember } from "../lib/api";
import { computeLayout, boundingBox } from "../lib/layout";

export default function FamilyTreeApp() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [relateTo, setRelateTo] = useState(null);
  const [focusIntent, setFocusIntent] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listMembers();
      setMembers(data);
    } catch (e) {
      toast.error("Could not load family tree");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const layout = useMemo(() => computeLayout(members), [members]);
  const selected = members.find(m => m.id === selectedId) || null;

  const handleAdd = useCallback((preset = null) => {
    setRelateTo(preset);
    setAddOpen(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteMember(id);
      toast.success("Removed from the constellation");
      setSelectedId(null);
      refresh();
    } catch (e) {
      toast.error("Failed to remove");
    }
  }, [refresh]);

  const handlePhotoUpload = useCallback(async (id, file) => {
    try {
      await uploadPhoto(id, file);
      toast.success("Portrait updated");
      refresh();
    } catch (e) {
      toast.error("Upload failed");
    }
  }, [refresh]);

  const handleSave = useCallback(async (id, data) => {
    try {
      await updateMember(id, data);
      toast.success("Details saved");
      refresh();
    } catch (e) {
      toast.error("Could not save");
    }
  }, [refresh]);

  const focusOnMember = useCallback((id) => {
    const pos = layout.nodes[id];
    if (!pos) return;
    setSelectedId(id);
    setFocusIntent({ type: "focus", position: pos, ts: Date.now() });
  }, [layout.nodes]);

  const fitAll = useCallback(() => {
    if (!layout || Object.keys(layout.nodes).length === 0) return;
    const bbox = boundingBox(layout.nodes);
    setFocusIntent({ type: "fit", center: bbox.center, size: bbox.size, ts: Date.now() });
  }, [layout]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0A0B10]" data-testid="family-tree-app">
      <div className="absolute inset-0 z-0">
        {members.length > 0 && (
          <Scene3D
            members={members}
            layout={layout}
            selectedId={selectedId}
            onSelect={setSelectedId}
            focusIntent={focusIntent}
          />
        )}
      </div>

      <div className="vignette" />
      <div className="grain-overlay" />

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-6 left-6 z-40 flex items-center gap-3"
        data-testid="brand-logo"
      >
        <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <TreeStructure size={20} weight="duotone" color="#D4AF37" />
        </div>
        <div>
          <div className="font-cormorant text-2xl font-light tracking-tight leading-none">Lineage</div>
          <div className="font-manrope text-[10px] tracking-[0.25em] uppercase text-white/40 mt-1">Constellation of memories</div>
        </div>
      </motion.div>

      {/* Search */}
      {members.length > 0 && (
        <SearchBar members={members} onPick={focusOnMember} />
      )}

      {/* Counter */}
      {members.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="absolute top-6 right-6 z-40 glass rounded-full px-4 py-2 flex items-center gap-2"
          data-testid="member-counter"
        >
          <Sparkle size={14} weight="fill" color="#D4AF37" />
          <span className="font-manrope text-xs tracking-wider text-white/80">
            {members.length} {members.length === 1 ? "soul" : "souls"}
          </span>
        </motion.div>
      )}

      <AnimatePresence>
        {!loading && members.length === 0 && (
          <EmptyState onAdd={() => handleAdd(null)} />
        )}
      </AnimatePresence>

      {members.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2"
        >
          <button
            onClick={() => handleAdd(null)}
            data-testid="add-member-button"
            className="group flex items-center gap-3 gold-bg text-black px-6 py-3 rounded-full font-manrope text-sm font-medium tracking-wide hover:bg-[#E5C07B] hover:-translate-y-0.5 transition-all duration-300 shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
          >
            <Plus size={18} weight="bold" />
            <span>Add Member</span>
          </button>
          <button
            onClick={fitAll}
            data-testid="fit-to-screen-button"
            title="Fit to screen"
            className="w-11 h-11 rounded-full glass flex items-center justify-center text-white/70 hover:text-[#D4AF37] hover:-translate-y-0.5 transition-all duration-300"
          >
            <ArrowsOutSimple size={18} weight="light" />
          </button>
        </motion.div>
      )}

      {members.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 text-white/30 text-[10px] tracking-[0.3em] uppercase font-manrope pointer-events-none">
          drag · pinch · two-finger pan
        </div>
      )}

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        members={members}
        preset={relateTo}
        onCreated={(keepOpen) => {
          refresh();
          if (!keepOpen) {
            setAddOpen(false);
            setRelateTo(null);
          }
        }}
      />

      <DetailsPanel
        open={!!selectedId}
        member={selected}
        members={members}
        onClose={() => setSelectedId(null)}
        onDelete={handleDelete}
        onUploadPhoto={handlePhotoUpload}
        onSave={handleSave}
        onAddRelated={(preset) => { setSelectedId(null); handleAdd(preset); }}
        onPickMember={(id) => focusOnMember(id)}
      />

      <Toaster position="top-center" theme="dark" toastOptions={{
        style: {
          background: "rgba(10,11,16,0.9)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          color: "#fff",
          fontFamily: "Manrope, sans-serif",
        }
      }} />
    </div>
  );
}

