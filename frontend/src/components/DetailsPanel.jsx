import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { UserPlus, Trash, UploadSimple, PencilSimple, Heart, GitFork, ArrowDown } from "@phosphor-icons/react";
import { photoUrl } from "../lib/api";

const fieldStyle = "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37]";

function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

export default function DetailsPanel({ open, member, members, onClose, onDelete, onUploadPhoto, onSave, onAddRelated }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (member) {
      setName(member.name || "");
      setBio(member.bio || "");
      setEditing(false);
      setConfirmDel(false);
    }
  }, [member?.id]);

  if (!member) return null;

  const parents = (member.parent_ids || []).map(id => members.find(m => m.id === id)).filter(Boolean);
  const partners = (member.partner_ids || []).map(id => members.find(m => m.id === id)).filter(Boolean);
  const children = members.filter(m => (m.parent_ids || []).includes(member.id));

  const avatarUrl = photoUrl(member.photo_path);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        data-testid="details-panel"
        className="w-full sm:max-w-md bg-[#0A0B10]/95 backdrop-blur-2xl border-l border-white/10 text-white p-0 overflow-y-auto scroll-hidden"
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="p-7"
        >
          {/* Hero portrait */}
          <div className="flex flex-col items-center text-center pt-2">
            <button
              onClick={() => fileInput.current?.click()}
              data-testid="change-photo-button"
              className="relative w-32 h-32 rounded-full overflow-hidden ring-1 ring-white/15 hover:ring-[#D4AF37] transition-all group"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-cormorant text-5xl text-white/80 bg-gradient-to-br from-white/10 to-white/5">
                  {initialsOf(member.name)}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all">
                <UploadSimple size={20} weight="light" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="photo-replace-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadPhoto(member.id, f);
              }}
            />

            {/* Name */}
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="edit-name-input"
                className={`${fieldStyle} mt-5 text-center font-cormorant text-2xl`}
              />
            ) : (
              <h2 className="mt-5 font-cormorant text-4xl font-light tracking-tight leading-none" data-testid="member-name">
                {member.name}
              </h2>
            )}

            <div className="mt-2 flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-white/40 font-manrope">
              <span>{member.gender}</span>
              {member.birth_date && (<><span>·</span><span>b. {member.birth_date}</span></>)}
            </div>
          </div>

          {/* Bio */}
          {editing && (
            <div className="mt-5 space-y-2">
              <Label className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                data-testid="edit-bio-input"
                className={`${fieldStyle} w-full rounded-md p-2 text-sm`}
              />
            </div>
          )}
          {!editing && member.bio && (
            <p className="mt-6 font-manrope text-sm text-white/60 italic leading-relaxed text-center">
              "{member.bio}"
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2 justify-center">
            {editing ? (
              <>
                <Button
                  onClick={() => { onSave(member.id, { name, bio }); setEditing(false); }}
                  data-testid="save-edit-button"
                  size="sm"
                  className="gold-bg text-black hover:bg-[#E5C07B]"
                >
                  Save changes
                </Button>
                <Button
                  onClick={() => { setEditing(false); setName(member.name); setBio(member.bio || ""); }}
                  variant="ghost"
                  size="sm"
                  data-testid="cancel-edit-button"
                  className="text-white/60 hover:text-white"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditing(true)}
                size="sm"
                variant="outline"
                data-testid="edit-member-button"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white"
              >
                <PencilSimple size={14} className="mr-1.5" />
                Edit
              </Button>
            )}
          </div>

          {/* Connections */}
          <div className="mt-8 space-y-5">
            <Section label="Parents" icon={ArrowDown} count={parents.length}>
              {parents.length === 0 ? (
                <EmptyChip onClick={() => onAddRelated({ memberId: member.id, relation: "parent" })} text="Add parent" testId="add-parent-button" />
              ) : (
                parents.map(p => <Chip key={p.id} member={p} />)
              )}
            </Section>

            <Section label="Partners" icon={Heart} count={partners.length}>
              {partners.length === 0 ? (
                <EmptyChip onClick={() => onAddRelated({ memberId: member.id, relation: "partner" })} text="Add partner" testId="add-partner-button" />
              ) : (
                partners.map(p => <Chip key={p.id} member={p} />)
              )}
            </Section>

            <Section label="Children" icon={GitFork} count={children.length}>
              {children.map(c => <Chip key={c.id} member={c} />)}
              <EmptyChip onClick={() => onAddRelated({ memberId: member.id, relation: "child" })} text="Add child" testId="add-child-button" />
            </Section>
          </div>

          {/* Delete */}
          <div className="mt-10 pt-6 border-t border-white/5">
            <AnimatePresence mode="wait">
              {!confirmDel ? (
                <motion.button
                  key="del"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setConfirmDel(true)}
                  data-testid="delete-member-button"
                  className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-red-400 font-manrope text-xs tracking-wider uppercase py-2 transition-colors"
                >
                  <Trash size={12} weight="light" />
                  Remove from tree
                </motion.button>
              ) : (
                <motion.div
                  key="conf"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex gap-2"
                >
                  <Button
                    onClick={() => onDelete(member.id)}
                    variant="destructive"
                    size="sm"
                    data-testid="confirm-delete-button"
                    className="flex-1"
                  >
                    Confirm removal
                  </Button>
                  <Button
                    onClick={() => setConfirmDel(false)}
                    variant="ghost"
                    size="sm"
                    data-testid="cancel-delete-button"
                    className="text-white/60 hover:text-white"
                  >
                    Cancel
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, icon: Icon, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} weight="light" color="#D4AF37" />
        <span className="font-manrope text-[10px] tracking-[0.25em] uppercase text-white/40">{label}</span>
        <span className="text-white/30 text-[10px]">·</span>
        <span className="text-white/30 text-[10px] font-manrope">{count}</span>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ member }) {
  const avatar = photoUrl(member.photo_path);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light" data-testid={`chip-${member.id}`}>
      <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/10 flex items-center justify-center bg-white/5">
        {avatar ? (
          <img src={avatar} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="font-cormorant text-[10px] text-white/70">{initialsOf(member.name)}</span>
        )}
      </div>
      <span className="font-manrope text-xs text-white/80 whitespace-nowrap">{member.name}</span>
    </div>
  );
}

function EmptyChip({ onClick, text, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-white/15 text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 font-manrope text-xs transition-all"
    >
      <UserPlus size={12} weight="light" />
      {text}
    </button>
  );
}
