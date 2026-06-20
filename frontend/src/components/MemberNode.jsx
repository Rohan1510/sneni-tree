import React from "react";
import { Html } from "@react-three/drei";
import { Cross } from "@phosphor-icons/react";
import { photoUrl } from "../lib/api";
import { eventMeta } from "../lib/eventTypes";

function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

function yearOf(s) {
  if (!s) return null;
  const y = parseInt(s.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

export default function MemberNode({ member, position, selected, onSelect, timelineYear }) {
  const avatarUrl = photoUrl(member.photo_path);
  const ring = selected
    ? "ring-2 ring-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.6)]"
    : "ring-1 ring-white/15";
  const genderTint = member.gender === "female"
    ? "from-rose-200/10 to-rose-400/5"
    : member.gender === "male"
    ? "from-sky-200/10 to-indigo-400/5"
    : "from-white/10 to-white/5";

  const deceased = !!member.death_date;
  const yearLine = [
    member.birth_date ? `b. ${member.birth_date.slice(0, 4)}` : null,
    member.death_date ? `d. ${member.death_date.slice(0, 4)}` : null,
  ].filter(Boolean).join(" — ");

  // Timeline state: dim members not yet born or deceased before current year
  let timelineState = "none";
  if (timelineYear != null) {
    const by = yearOf(member.birth_date);
    const dy = yearOf(member.death_date);
    if (by == null) {
      timelineState = "unknown";
    } else if (timelineYear < by) {
      timelineState = "not-born";
    } else if (dy != null && timelineYear > dy) {
      timelineState = "past";
    } else {
      timelineState = "alive";
    }
  }

  const wrapperOpacity =
    timelineState === "not-born" ? 0.08 :
    timelineState === "past" ? 0.45 :
    timelineState === "unknown" ? 0.3 :
    1;
  const by = yearOf(member.birth_date);
  const isJustBorn = timelineState === "alive" && by != null && Math.abs(timelineYear - by) <= 1;

  // Life events that have occurred by the current timeline year
  const visibleEvents = (member.events || [])
    .filter(e => timelineYear == null ? false : e.year <= timelineYear)
    .sort((a, b) => a.year - b.year);

  return (
    <group position={position}>
      <Html center distanceFactor={10} zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          data-testid={`member-node-${member.id}`}
          className="group flex flex-col items-center select-none cursor-pointer transition-opacity duration-500"
          style={{ transform: "translate(-50%, -50%)", position: "absolute", opacity: wrapperOpacity }}
        >
          <div className="relative">
            <div className={`relative w-[88px] h-[88px] rounded-full overflow-hidden ${isJustBorn ? "ring-2 ring-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.5)]" : ring} transition-all duration-300 group-hover:ring-[#E5C07B] group-hover:scale-105 backdrop-blur-xl bg-gradient-to-br ${genderTint}`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={member.name}
                  draggable={false}
                  className={`w-full h-full object-cover ${(deceased || timelineState === "past") ? "grayscale opacity-85" : ""}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-cormorant text-3xl font-light text-white/90">
                  {initialsOf(member.name)}
                </div>
              )}
              <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                boxShadow: "inset 0 0 20px rgba(255,255,255,0.08)"
              }} />
              {(deceased || timelineState === "past") && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center" title="In memoriam">
                  <Cross size={9} weight="light" className="text-white/70" />
                </div>
              )}
            </div>

            {/* Life event badges (only in timeline mode, only events that have happened by current year) */}
            {visibleEvents.length > 0 && (
              <div
                data-testid={`member-events-${member.id}`}
                className="absolute -right-2 top-0 flex flex-col gap-1"
                style={{ transform: "translateX(100%)" }}
              >
                {visibleEvents.map((ev, idx) => {
                  const meta = eventMeta(ev.type);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={ev.id}
                      title={`${ev.title} (${ev.year})${ev.location ? " — " + ev.location : ""}`}
                      data-testid={`event-badge-${ev.id}`}
                      className="event-badge-pop w-6 h-6 rounded-full flex items-center justify-center ring-1 backdrop-blur-md"
                      style={{
                        background: `${meta.color}26`,
                        borderColor: `${meta.color}77`,
                        boxShadow: `0 0 12px ${meta.color}55`,
                        animationDelay: `${idx * 60}ms`,
                      }}
                    >
                      <Icon size={11} weight="fill" color={meta.color} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-3 text-center px-2 py-1 rounded-md glass max-w-[150px]">
            <div className="font-cormorant text-base leading-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {member.name}
            </div>
            {yearLine && (
              <div className="font-manrope text-[9px] tracking-[0.2em] text-white/50 uppercase mt-0.5">
                {yearLine}
              </div>
            )}
          </div>
        </button>
      </Html>
    </group>
  );
}
