import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sparkles, Html, QuadraticBezierLine } from "@react-three/drei";
import MemberNode from "./MemberNode";

function Connections({ members, layout, selectedId }) {
  const { nodes, edges } = layout;
  return (
    <>
      {edges.map((e, i) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        if (!a || !b) return null;
        const start = [a.x, a.y, a.z];
        const end = [b.x, b.y, b.z];
        const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2 + (e.type === "parent" ? -0.6 : 0), (a.z + b.z) / 2];
        const isPartner = e.type === "partner";
        const highlighted = selectedId && (e.from === selectedId || e.to === selectedId);
        const color = highlighted ? "#D4AF37" : (isPartner ? "#E5C07B" : "#FFFFFF");
        const opacity = highlighted ? 0.9 : (isPartner ? 0.4 : 0.18);
        return (
          <QuadraticBezierLine
            key={i}
            start={start}
            end={end}
            mid={mid}
            color={color}
            lineWidth={highlighted ? 2 : 1}
            transparent
            opacity={opacity}
            dashed={isPartner}
            dashSize={isPartner ? 0.25 : 0}
            gapSize={isPartner ? 0.18 : 0}
          />
        );
      })}
    </>
  );
}

export default function Scene3D({ members, layout, selectedId, onSelect }) {
  return (
    <Canvas
      camera={{ position: [0, 2, 18], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#0A0B10" }}
      data-testid="three-canvas"
    >
      <color attach="background" args={["#0A0B10"]} />
      <fog attach="fog" args={["#0A0B10", 18, 50]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 8]} intensity={0.8} color="#FFE7B5" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#7AA2FF" />

      <Suspense fallback={null}>
        <Sparkles count={180} scale={[40, 30, 40]} size={2} speed={0.2} opacity={0.4} color="#D4AF37" />
        <Sparkles count={120} scale={[60, 40, 60]} size={1} speed={0.1} opacity={0.3} color="#FFFFFF" />

        <Connections members={members} layout={layout} selectedId={selectedId} />

        {members.map(m => {
          const p = layout.nodes[m.id];
          if (!p) return null;
          return (
            <MemberNode
              key={m.id}
              member={m}
              position={[p.x, p.y, p.z]}
              selected={selectedId === m.id}
              onSelect={() => onSelect(m.id)}
            />
          );
        })}
      </Suspense>

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.5}
        zoomSpeed={0.7}
        panSpeed={0.6}
        minDistance={6}
        maxDistance={45}
        makeDefault
      />
    </Canvas>
  );
}
