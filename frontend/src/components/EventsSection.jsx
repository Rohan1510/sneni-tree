import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, X, MapPin, Sparkle, Baby, HeartStraight, Briefcase, Cross } from "@phosphor-icons/react";
import { EVENT_TYPES, eventMeta } from "../lib/eventTypes";

const fieldStyle = "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37]";

function yearOf(s) {
  if (!s) return null;
  const y = parseInt(String(s).slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

export default function EventsSection({ member, onSave, members }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("other");
  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");

  const events = (member.events || []).slice().sort((a, b) => a.year - b.year);

  const reset = () => { setType("other"); setYear(""); setTitle(""); setLocation(""); setAdding(false); };

  const pushEvents = (newEvent) => {
    onSave({ events: [...(member.events || []), newEvent] });
  };

  const handleAdd = () => {
    const yearInt = parseInt(year, 10);
    if (!title.trim() || isNaN(yearInt)) return;
    pushEvents({
      id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      type,
      year: yearInt,
      title: title.trim(),
      location: location.trim() || null,
    });
    reset();
  };

  const handleDelete = (eventId) => {
    onSave({ events: (member.events || []).filter(e => e.id !== eventId) });
  };

  // Existing milestone titles already recorded so we don't double-add
  const hasMilestoneTitle = (titleStr) =>
    (member.events || []).some(e => (e.title || "").toLowerCase() === titleStr.toLowerCase());
  const birthY = yearOf(member.birth_date);
  const deathY = yearOf(member.death_date);
  const partnerObjects = (member.partner_ids || [])
    .map(id => (members || []).find(m => m.id === id))
    .filter(Boolean);
  const firstPartner = partnerObjects[0] || null;
  const marriageY = firstPartner ? yearOf((member.marriages || {})[firstPartner.id]) : null;

  const milestones = [
    {
      key: "born",
      label: "Born",
      icon: Baby,
      color: "#D4AF37",
      ready: birthY != null && !hasMilestoneTitle("Born"),
      disabledReason: birthY == null ? "Set a birth date first" : "Already added",
      onTap: () => {
        if (birthY == null) return;
        pushEvents({
          id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}b`,
          type: "other",
          year: birthY,
          title: "Born",
          location: null,
        });
      },
    },
    {
      key: "married",
      label: "Married",
      icon: HeartStraight,
      color: "#E5C07B",
      ready: firstPartner != null,
      disabledReason: !firstPartner ? "Add a partner first" : null,
      onTap: () => {
        const y = marriageY || (birthY != null ? birthY + 25 : new Date().getFullYear());
        pushEvents({
          id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}m`,
          type: "marriage",
          year: y,
          title: `Married ${firstPartner.name}`,
          location: null,
        });
      },
    },
    {
      key: "career",
      label: "Career",
      icon: Briefcase,
      color: "#7AA2FF",
      ready: birthY != null,
      disabledReason: birthY == null ? "Set a birth date first" : null,
      onTap: () => {
        pushEvents({
          id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}c`,
          type: "career",
          year: birthY + 22,
          title: "Career milestone",
          location: null,
        });
      },
    },
    {
      key: "passed",
      label: "Passed",
      icon: Cross,
      color: "#9B82C9",
      ready: deathY != null && !hasMilestoneTitle("Passed away"),
      disabledReason: deathY == null ? "Set a passing date first" : "Already added",
      onTap: () => {
        if (deathY == null) return;
        pushEvents({
          id: (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}p`,
          type: "other",
          year: deathY,
          title: "Passed away",
          location: null,
        });
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Sparkle size={12} weight="light" color="#D4AF37" />
        <span className="font-manrope text-[10px] tracking-[0.25em] uppercase text-white/40">Life events</span>
        <span className="text-white/30 text-[10px]">·</span>
        <span className="text-white/30 text-[10px] font-manrope">{events.length}</span>
      </div>

      <div className="space-y-1.5">
        {events.map(e => {
          const meta = eventMeta(e.type);
          const Icon = meta.icon;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="group flex items-center gap-3 px-3 py-2 rounded-lg glass-light"
              data-testid={`event-row-${e.id}`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-1"
                style={{ background: `${meta.color}22`, borderColor: `${meta.color}55` }}
              >
                <Icon size={13} weight="light" color={meta.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-cormorant text-base text-white truncate">{e.title}</span>
                  <span className="font-manrope text-[10px] tracking-wider text-[#D4AF37]">{e.year}</span>
                </div>
                {e.location && (
                  <div className="flex items-center gap-1 mt-0.5 text-white/50 font-manrope text-[10px]">
                    <MapPin size={9} weight="light" />
                    {e.location}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(e.id)}
                data-testid={`delete-event-${e.id}`}
                className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-opacity p-1"
                title="Remove event"
              >
                <X size={11} weight="bold" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Milestone quick-add chips */}
      {!adding && (
        <div className="mt-3 flex flex-wrap gap-1.5" data-testid="milestone-chips">
          {milestones.map(ms => {
            const Icon = ms.icon;
            return (
              <button
                key={ms.key}
                type="button"
                onClick={ms.ready ? ms.onTap : undefined}
                disabled={!ms.ready}
                title={ms.ready ? `1-tap add: ${ms.label}` : (ms.disabledReason || ms.label)}
                data-testid={`milestone-${ms.key}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-manrope text-[11px] tracking-wide transition-all ring-1 ${
                  ms.ready
                    ? "text-white/85 hover:text-black hover:bg-[#D4AF37] cursor-pointer"
                    : "text-white/25 cursor-not-allowed"
                }`}
                style={{
                  background: ms.ready ? `${ms.color}14` : "rgba(255,255,255,0.02)",
                  borderColor: ms.ready ? `${ms.color}55` : "rgba(255,255,255,0.06)",
                }}
              >
                <Icon size={11} weight="light" color={ms.ready ? ms.color : "rgba(255,255,255,0.3)"} />
                {ms.label}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence initial={false}>
        {adding ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >            <div className="p-3 rounded-lg border border-dashed border-white/15 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-manrope text-[9px] tracking-[0.2em] uppercase text-white/40">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger data-testid="event-type-select" className={`${fieldStyle} h-9 text-sm mt-1`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0B10] border-white/10 text-white">
                      {EVENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-manrope text-[9px] tracking-[0.2em] uppercase text-white/40">Year</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 1958"
                    data-testid="event-year-input"
                    className={`${fieldStyle} h-9 text-sm mt-1`}
                  />
                </div>
              </div>
              <div>
                <Label className="font-manrope text-[9px] tracking-[0.2em] uppercase text-white/40">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Married Eleanor"
                  data-testid="event-title-input"
                  className={`${fieldStyle} h-9 text-sm mt-1`}
                />
              </div>
              <div>
                <Label className="font-manrope text-[9px] tracking-[0.2em] uppercase text-white/40">Location <span className="text-white/30 normal-case tracking-normal">(optional)</span></Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Paris, France"
                  data-testid="event-location-input"
                  className={`${fieldStyle} h-9 text-sm mt-1`}
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  data-testid="cancel-event-button"
                  className="text-white/60 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAdd}
                  disabled={!title.trim() || !year}
                  data-testid="save-event-button"
                  className="gold-bg text-black hover:bg-[#E5C07B]"
                >
                  Add event
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            data-testid="add-event-button"
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-white/15 text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 font-manrope text-xs transition-all"
          >
            <Plus size={11} weight="bold" />
            Add life event
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
