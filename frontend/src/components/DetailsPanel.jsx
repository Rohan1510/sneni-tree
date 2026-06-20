import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import DarkCalendar from "./DarkCalendar";
import { UserPlus, Trash, UploadSimple, PencilSimple, Heart, GitFork, ArrowDown, UsersThree, CalendarBlank, HeartStraight, Cross } from "@phosphor-icons/react";
import { photoUrl } from "../lib/api";
import { format, parseISO } from "date-fns";

const fieldStyle = "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37]";

function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

function parseDate(s) {
  if (!s) return null;
  try { return parseISO(s); } catch { return null; }
}

function DateEdit({ label, value, onChange, fromYear = 1850, testId }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-manrope text-[9px] tracking-[0.2em] uppercase text-white/40">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-testid={testId}
            className={`${fieldStyle} w-full justify-start font-normal h-9 hover:bg-white/10 hover:text-white`}
          >
            <CalendarBlank size={12} className="mr-2 text-white/50" />
            <span className={value ? "text-white text-sm" : "text-white/30 text-sm"}>
              {value ? format(value, "MMM d, yyyy") : "—"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#0A0B10]/95 backdrop-blur-2xl border border-white/10" align="start">
          <DarkCalendar
            mode="single"
            selected={value}
            onSelect={onChange}
            captionLayout="dropdown-buttons"
            fromYear={fromYear}
            toYear={new Date().getFullYear()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function DetailsPanel({ open, member, members, onClose, onDelete, onUploadPhoto, onSave, onAddRelated, onPickMember }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState(null);
  const [deathDate, setDeathDate] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (member) {
      setName(member.name || "");
      setBio(member.bio || "");
      setBirthDate(parseDate(member.birth_date));
      setDeathDate(parseDate(member.death_date));
      setEditing(false);
      setConfirmDel(false);
    }
  }, [member?.id]);

  if (!member) return null;

  const parents = (member.parent_ids || []).map(id => members.find(m => m.id === id)).filter(Boolean);
  const partners = (member.partner_ids || []).map(id => members.find(m => m.id === id)).filter(Boolean);
  const children = members.filter(m => (m.parent_ids || []).includes(member.id));
  const siblings = members.filter(m =>
    m.id !== member.id &&
    (m.parent_ids || []).some(p => (member.parent_ids || []).includes(p))
  );

  const avatarUrl = photoUrl(member.photo_path);
  const deceased = !!member.death_date;
  const marriages = member.marriages || {};

  const handleSaveClick = () => {
    onSave(member.id, {
      name,
      bio,
      birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
      death_date: deathDate ? format(deathDate, "yyyy-MM-dd") : null,
    });
    setEditing(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        data-testid="details-panel"
        className="w-full sm:max-w-md bg-[#0A0B10]/95 backdrop-blur-2xl border-l border-white/10 text-white p-0 overflow-y-auto scroll-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{member.name}</SheetTitle>
          <SheetDescription>Details for {member.name}</SheetDescription>
        </SheetHeader>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="p-7"
        >
          {/* Portrait */}
          <div className="flex flex-col items-center text-center pt-2">
            <button
              onClick={() => fileInput.current?.click()}
              data-testid="change-photo-button"
              className="relative w-32 h-32 rounded-full overflow-hidden ring-1 ring-white/15 hover:ring-[#D4AF37] transition-all group"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={member.name} className={`w-full h-full object-cover ${deceased ? "grayscale opacity-80" : ""}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-cormorant text-5xl text-white/80 bg-gradient-to-br from-white/10 to-white/5">
                  {initialsOf(member.name)}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all">
                <UploadSimple size={20} weight="light" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {deceased && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center" title="In memoriam">
                  <Cross size={11} weight="light" className="text-white/70" />
                </div>
              )}
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
              {member.death_date && (<><span>·</span><span>d. {member.death_date}</span></>)}
            </div>
          </div>

          {/* Editable dates */}
          {editing && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <DateEdit label="Born" value={birthDate} onChange={setBirthDate} testId="edit-birth-date" />
              <DateEdit label="Passed" value={deathDate} onChange={setDeathDate} testId="edit-death-date" />
            </div>
          )}

          {/* Bio */}
          {editing && (
            <div className="mt-4 space-y-2">
              <Label className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="A few cherished words…"
                data-testid="edit-bio-input"
                className={`${fieldStyle} w-full rounded-md p-2 text-sm`}
              />
            </div>
          )}
          {!editing && member.bio && (
            <p className="mt-6 font-manrope text-sm text-white/60 italic leading-relaxed text-center px-2">
              &ldquo;{member.bio}&rdquo;
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2 justify-center">
            {editing ? (
              <>
                <Button onClick={handleSaveClick} data-testid="save-edit-button" size="sm" className="gold-bg text-black hover:bg-[#E5C07B]">
                  Save changes
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false);
                    setName(member.name);
                    setBio(member.bio || "");
                    setBirthDate(parseDate(member.birth_date));
                    setDeathDate(parseDate(member.death_date));
                  }}
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
                <>
                  {parents.map(p => <Chip key={p.id} member={p} onClick={() => onPickMember?.(p.id)} />)}
                  {parents.length < 2 && (
                    <EmptyChip onClick={() => onAddRelated({ memberId: member.id, relation: "parent" })} text="Add parent" testId="add-parent-button" />
                  )}
                </>
              )}
            </Section>

            <Section label="Partners" icon={Heart} count={partners.length}>
              {partners.length === 0 ? (
                <EmptyChip onClick={() => onAddRelated({ memberId: member.id, relation: "partner" })} text="Add partner" testId="add-partner-button" />
              ) : (
                <>
                  {partners.map(p => (
                    <Chip
                      key={p.id}
                      member={p}
                      onClick={() => onPickMember?.(p.id)}
                      meta={marriages[p.id] ? (
                        <span className="flex items-center gap-1 text-[#D4AF37]/80">
                          <HeartStraight size={10} weight="fill" />
                          {marriages[p.id].slice(0, 4)}
                        </span>
                      ) : null}
                    />
                  ))}
                  <EmptyChip onClick={() => onAddRelated({ memberId: member.id, relation: "partner" })} text="Add partner" testId="add-partner-button" />
                </>
              )}
            </Section>

            <Section label="Siblings" icon={UsersThree} count={siblings.length}>
              {siblings.map(s => <Chip key={s.id} member={s} onClick={() => onPickMember?.(s.id)} />)}
              {parents.length > 0 ? (
                <EmptyChip onClick={() => onAddRelated({ memberId: member.id, relation: "sibling" })} text="Add sibling" testId="add-sibling-button" />
              ) : siblings.length === 0 ? (
                <span className="font-manrope text-[11px] text-white/30 italic px-1">Add a parent first to record siblings.</span>
              ) : null}
            </Section>

            <Section label="Children" icon={GitFork} count={children.length}>
              {children.map(c => <Chip key={c.id} member={c} onClick={() => onPickMember?.(c.id)} />)}
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
                  <Button onClick={() => onDelete(member.id)} variant="destructive" size="sm" data-testid="confirm-delete-button" className="flex-1">
                    Confirm removal
                  </Button>
                  <Button onClick={() => setConfirmDel(false)} variant="ghost" size="sm" data-testid="cancel-delete-button" className="text-white/60 hover:text-white">
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

function Chip({ member, meta, onClick }) {
  const avatar = photoUrl(member.photo_path);
  const deceased = !!member.death_date;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`chip-${member.id}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light hover:ring-1 hover:ring-[#D4AF37]/40 transition-all cursor-pointer"
    >
      <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/10 flex items-center justify-center bg-white/5">
        {avatar ? (
          <img src={avatar} className={`w-full h-full object-cover ${deceased ? "grayscale" : ""}`} alt="" />
        ) : (
          <span className="font-cormorant text-[10px] text-white/70">{initialsOf(member.name)}</span>
        )}
      </div>
      <span className="font-manrope text-xs text-white/80 whitespace-nowrap">{member.name}</span>
      {meta && <span className="font-manrope text-[10px] tracking-wider">{meta}</span>}
    </button>
  );
}

function EmptyChip({ onClick, text, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-white/15 text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 font-manrope text-xs transition-all"
    >
      <UserPlus size={12} weight="light" />
      {text}
    </button>
  );
}
