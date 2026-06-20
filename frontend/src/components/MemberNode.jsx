import React from "react";
import { Html } from "@react-three/drei";
import { Cross } from "@phosphor-icons/react";
import { photoUrl } from "../lib/api";

function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

export default function MemberNode({ member, position, selected, onSelect }) {
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

  return (
    <group position={position}>
      <Html center distanceFactor={10} zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          data-testid={`member-node-${member.id}`}
          className="group flex flex-col items-center select-none cursor-pointer"
          style={{ transform: "translate(-50%, -50%)", position: "absolute" }}
        >
          <div className={`relative w-[88px] h-[88px] rounded-full overflow-hidden ${ring} transition-all duration-300 group-hover:ring-[#E5C07B] group-hover:scale-105 backdrop-blur-xl bg-gradient-to-br ${genderTint}`}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={member.name}
                draggable={false}
                className={`w-full h-full object-cover ${deceased ? "grayscale opacity-85" : ""}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-cormorant text-3xl font-light text-white/90">
                {initialsOf(member.name)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{
              boxShadow: "inset 0 0 20px rgba(255,255,255,0.08)"
            }} />
            {deceased && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center" title="In memoriam">
                <Cross size={9} weight="light" className="text-white/70" />
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
