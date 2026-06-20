import React from "react";
import { Html } from "@react-three/drei";
import { photoUrl } from "../lib/api";
import { UserCircle } from "@phosphor-icons/react";

function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

export default function MemberNode({ member, position, selected, onSelect }) {
  const avatarUrl = photoUrl(member.photo_path);
  const ring = selected ? "ring-2 ring-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.6)]" : "ring-1 ring-white/15";
  const genderTint = member.gender === "female"
    ? "from-rose-200/10 to-rose-400/5"
    : member.gender === "male"
    ? "from-sky-200/10 to-indigo-400/5"
    : "from-white/10 to-white/5";

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={10}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "auto" }}
      >
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
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-cormorant text-3xl font-light text-white/90">
                {initialsOf(member.name)}
              </div>
            )}
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{
              boxShadow: "inset 0 0 20px rgba(255,255,255,0.08)"
            }} />
          </div>
          <div className="mt-3 text-center px-2 py-1 rounded-md glass max-w-[140px]">
            <div className="font-cormorant text-base leading-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {member.name}
            </div>
            {member.birth_date && (
              <div className="font-manrope text-[9px] tracking-[0.2em] text-white/50 uppercase mt-0.5">
                b. {member.birth_date.slice(0, 4)}
              </div>
            )}
          </div>
        </button>
      </Html>
    </group>
  );
}
