// Mapping from life-event type to phosphor icon + accent color.
import { HeartStraight, GraduationCap, Briefcase, Airplane, Star } from "@phosphor-icons/react";

export const EVENT_TYPES = [
  { value: "marriage",  label: "Marriage",  icon: HeartStraight,  color: "#E5C07B" },
  { value: "education", label: "Education", icon: GraduationCap,  color: "#9EE6B4" },
  { value: "career",    label: "Career",    icon: Briefcase,      color: "#7AA2FF" },
  { value: "migration", label: "Migration", icon: Airplane,       color: "#C9A0FF" },
  { value: "other",     label: "Milestone", icon: Star,           color: "#D4AF37" },
];

export function eventMeta(type) {
  return EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
}
