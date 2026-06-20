import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Checkbox } from "../components/ui/checkbox";
import DarkCalendar from "./DarkCalendar";
import { CalendarBlank, UploadSimple, X } from "@phosphor-icons/react";
import { format } from "date-fns";
import { createMember, updateMember, uploadPhoto } from "../lib/api";
import { toast } from "sonner";

const RELATIONS = [
  { value: "none", label: "Standalone" },
  { value: "child", label: "Child of…" },
  { value: "parent", label: "Parent of…" },
  { value: "partner", label: "Partner of…" },
  { value: "sibling", label: "Sibling of…" },
];

const fieldStyle = "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-0 focus-visible:border-[#D4AF37]";

function DateField({ label, value, onChange, testId, fromYear = 1850 }) {
  return (
    <div className="space-y-2">
      <Label className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-testid={testId}
            className={`${fieldStyle} w-full justify-start font-normal hover:bg-white/10 hover:text-white`}
          >
            <CalendarBlank size={14} className="mr-2 text-white/50" />
            <span className={value ? "text-white" : "text-white/30"}>
              {value ? format(value, "MMM d, yyyy") : "Pick a date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-[#0A0B10]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          align="start"
        >
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

export default function AddMemberDialog({ open, onOpenChange, members, preset, onCreated }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("other");
  const [birthDate, setBirthDate] = useState(null);
  const [deathDate, setDeathDate] = useState(null);
  const [marriageDate, setMarriageDate] = useState(null);
  const [relation, setRelation] = useState("none");
  const [targetId, setTargetId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [addAnother, setAddAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef(null);

  const resetForm = (keepRelation = false) => {
    setName("");
    setBirthDate(null);
    setDeathDate(null);
    setMarriageDate(null);
    setPhoto(null);
    if (!keepRelation) {
      setGender("other");
    }
  };

  useEffect(() => {
    if (open) {
      resetForm(false);
      setAddAnother(false);
      if (preset && preset.memberId && preset.relation) {
        setRelation(preset.relation);
        setTargetId(preset.memberId);
      } else {
        setRelation(members.length === 0 ? "none" : "child");
        setTargetId(members.length > 0 ? members[0].id : "");
      }
    }
  }, [open, preset, members]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (relation !== "none" && !targetId) {
      toast.error("Select a related member");
      return;
    }

    const target = members.find(m => m.id === targetId);

    // Sibling = same parents as target
    let parent_ids = [];
    if (relation === "child" && targetId) parent_ids = [targetId];
    if (relation === "sibling" && target) parent_ids = [...(target.parent_ids || [])];

    const partner_ids = (relation === "partner" && targetId) ? [targetId] : [];
    const marriages = {};
    if (relation === "partner" && targetId && marriageDate) {
      marriages[targetId] = format(marriageDate, "yyyy-MM-dd");
    }

    const payload = {
      name: name.trim(),
      gender,
      birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
      death_date: deathDate ? format(deathDate, "yyyy-MM-dd") : null,
      parent_ids,
      partner_ids,
      marriages,
    };

    setSubmitting(true);
    try {
      const created = await createMember(payload);

      if (relation === "parent" && targetId) {
        const existingParents = target?.parent_ids || [];
        if (existingParents.length >= 2) {
          toast.error("Target already has 2 parents");
        } else {
          await updateMember(targetId, { parent_ids: [...existingParents, created.id] });
        }
      }

      if (photo) {
        try {
          await uploadPhoto(created.id, photo);
        } catch (e) {
          toast.error("Photo upload failed, member created without photo");
        }
      }

      toast.success(`${created.name} added to the constellation`);

      if (addAnother) {
        // Keep dialog open, reset form but preserve relation+target for batch adding (e.g. multiple children)
        resetForm(true);
        onCreated?.(true);
      } else {
        onCreated?.(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const isFirst = members.length === 0;
  const targetMember = members.find(m => m.id === targetId);

  const relationVerb = {
    child: "child",
    parent: "parent",
    partner: "partner",
    sibling: "sibling",
  }[relation];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="add-member-dialog"
        className="sm:max-w-md bg-[#0A0B10]/95 backdrop-blur-2xl border border-white/10 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-0 overflow-hidden max-h-[92vh] overflow-y-auto scroll-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-7"
        >
          <DialogHeader>
            <DialogTitle className="font-cormorant text-3xl font-light tracking-tight">
              {isFirst ? "First soul in your tree" : "Add a member"}
            </DialogTitle>
            <DialogDescription className="font-manrope text-xs tracking-wide text-white/50 mt-1">
              {isFirst ? "Every lineage starts with one." : "Connect a new member to your family."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                data-testid="photo-upload-button"
                className="relative w-20 h-20 rounded-full overflow-hidden glass-light ring-1 ring-white/10 hover:ring-[#D4AF37] transition-all"
              >
                {photo ? (
                  <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UploadSimple size={18} weight="light" color="#D4AF37" />
                  </div>
                )}
              </button>
              <div className="flex-1">
                <div className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">Portrait</div>
                <div className="font-cormorant text-base text-white/80 mt-0.5">
                  {photo ? photo.name : "Optional photograph"}
                </div>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="photo-input"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">Full name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor Whitfield"
                data-testid="member-name-input"
                className={fieldStyle}
                autoFocus
              />
            </div>

            {/* Gender + Birth */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger data-testid="gender-select" className={fieldStyle}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0B10] border-white/10 text-white">
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DateField label="Born" value={birthDate} onChange={setBirthDate} testId="birth-date-button" />
            </div>

            {/* Death + Marriage (conditional) */}
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Passed" value={deathDate} onChange={setDeathDate} testId="death-date-button" />
              {relation === "partner" && (
                <DateField label="Married" value={marriageDate} onChange={setMarriageDate} testId="marriage-date-button" fromYear={1900} />
              )}
            </div>

            {/* Relationship */}
            {!isFirst && (
              <div className="space-y-3 pt-3 border-t border-white/5">
                <Label className="font-manrope text-[10px] tracking-[0.2em] uppercase text-white/40">Relation</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={relation} onValueChange={setRelation}>
                    <SelectTrigger data-testid="relation-select" className={fieldStyle}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0B10] border-white/10 text-white">
                      {RELATIONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {relation !== "none" && (
                    <Select value={targetId} onValueChange={setTargetId}>
                      <SelectTrigger data-testid="target-member-select" className={fieldStyle}>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0B10] border-white/10 text-white max-h-60">
                        {members.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {relation !== "none" && targetMember && (
                  <p className="font-manrope text-xs text-white/40 italic">
                    {name || "New member"} will be the {relationVerb} of <span className="text-[#D4AF37]">{targetMember.name}</span>
                    {relation === "sibling" && (targetMember.parent_ids?.length ? " (sharing the same parents)" : " (no shared parents on record yet)")}
                    .
                  </p>
                )}
              </div>
            )}

            {/* Add another toggle */}
            {!isFirst && (relation === "child" || relation === "sibling" || relation === "partner") && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1" data-testid="add-another-toggle">
                <Checkbox
                  checked={addAnother}
                  onCheckedChange={(v) => setAddAnother(!!v)}
                  className="border-white/20 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:border-[#D4AF37] data-[state=checked]:text-black"
                />
                <span className="font-manrope text-xs text-white/60">
                  Keep open to add another {relationVerb}
                </span>
              </label>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                data-testid="cancel-add-button"
                className="flex-1 text-white/60 hover:text-white hover:bg-white/5"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="submit-add-button"
                className="flex-1 gold-bg text-black hover:bg-[#E5C07B] font-manrope font-medium tracking-wide"
              >
                {submitting ? "Adding…" : "Add to tree"}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
