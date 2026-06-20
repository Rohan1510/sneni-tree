import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sparkles, QuadraticBezierLine } from "@react-three/drei";
import * as THREE from "three";
import MemberNode from "./MemberNode";

function Connections({ layout, selectedId }) {
  const { nodes, edges } = layout;
  return (
    <>
      {edges.map((e, i) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        if (!a || !b) return null;
        const start = [a.x, a.y, a.z];
        const end = [b.x, b.y, b.z];
        const isPartner = e.type === "partner";
        const isSibling = e.type === "sibling";
        const isParent = e.type === "parent";
        const isHalfSibling = isSibling && e.kind === "half";

        const mid = [
          (a.x + b.x) / 2,
          (a.y + b.y) / 2 + (isParent ? -0.6 : isSibling ? (isHalfSibling ? -0.55 : -0.25) : 0),
          (a.z + b.z) / 2,
        ];
        const highlighted = selectedId && (e.from === selectedId || e.to === selectedId);

        let color = "#FFFFFF";
        let opacity = 0.18;
        let lineWidth = 1;
        let dashed = false;
        let dashSize = 0;
        let gapSize = 0;

        if (isPartner) {
          color = "#E5C07B"; opacity = 0.45; dashed = true; dashSize = 0.25; gapSize = 0.18;
        }
        if (isSibling && !isHalfSibling) {
          // Full sibling: cool blue, denser dashes
          color = "#7AA2FF"; opacity = 0.22; dashed = true; dashSize = 0.14; gapSize = 0.18; lineWidth = 0.9;
        }
        if (isHalfSibling) {
          // Half sibling: muted lavender, sparser dashes + lighter weight
          color = "#9B82C9"; opacity = 0.16; dashed = true; dashSize = 0.06; gapSize = 0.34; lineWidth = 0.7;
        }
        if (highlighted) { color = "#D4AF37"; opacity = 0.95; lineWidth = 2; }

        return (
          <QuadraticBezierLine
            key={`${e.type}-${i}`}
            start={start}
            end={end}
            mid={mid}
            color={color}
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
            dashed={dashed}
            dashSize={dashSize}
            gapSize={gapSize}
          />
        );
      })}
    </>
  );
}

function CameraController({ intent }) {
  const { camera, controls } = useThree();
  const targetRef = useRef(new THREE.Vector3());
  const desiredRef = useRef(new THREE.Vector3());
  const activeRef = useRef(false);
  const startedRef = useRef(0);

  useEffect(() => {
    if (!intent || !controls) return;

    if (intent.type === "focus") {
      const targetVec = new THREE.Vector3(intent.position.x, intent.position.y, intent.position.z);
      const currentDir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      if (currentDir.lengthSq() < 0.001) currentDir.set(0, 0, 1);
      const distance = 9;
      const newCamPos = targetVec.clone().add(currentDir.multiplyScalar(distance));
      targetRef.current.copy(targetVec);
      desiredRef.current.copy(newCamPos);
    } else if (intent.type === "fit") {
      // Fit-to-screen: position camera diagonally so x/y/z spreads are visible (matters in timeline mode)
      const c = intent.center;
      const size = Math.max(intent.size, 8);
      const fov = camera.fov * (Math.PI / 180);
      const distance = (size / 2) / Math.tan(fov / 2) * 0.85 + 2;
      const dz = distance * 0.7;
      const dx = distance * 0.25;
      const dy = distance * 0.15;
      targetRef.current.set(c.x, c.y, c.z);
      desiredRef.current.set(c.x + dx, c.y + dy, c.z + dz);
    } else {
      return;
    }

    activeRef.current = true;
    startedRef.current = performance.now();
  }, [intent, camera, controls]);

  useFrame(() => {
    if (!activeRef.current || !controls) return;
    camera.position.lerp(desiredRef.current, 0.08);
    controls.target.lerp(targetRef.current, 0.08);
    controls.update();
    if (camera.position.distanceTo(desiredRef.current) < 0.05 || performance.now() - startedRef.current > 2000) {
      activeRef.current = false;
    }
  });

  return null;
}

export default function Scene3D({ members, layout, selectedId, onSelect, focusIntent, timelineYear }) {
  return (
    <Canvas
      camera={{ position: [0, 2, 18], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#0A0B10", touchAction: "none" }}
      data-testid="three-canvas"
    >
      <color attach="background" args={["#0A0B10"]} />
      <fog attach="fog" args={["#0A0B10", 25, 90]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 8]} intensity={0.8} color="#FFE7B5" />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="#7AA2FF" />

      <Suspense fallback={null}>
        <Sparkles count={180} scale={[40, 30, 40]} size={2} speed={0.2} opacity={0.4} color="#D4AF37" />
        <Sparkles count={120} scale={[60, 40, 60]} size={1} speed={0.1} opacity={0.3} color="#FFFFFF" />

        <Connections layout={layout} selectedId={selectedId} />

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
              timelineYear={timelineYear}
            />
          );
        })}
      </Suspense>

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.7}
        minDistance={5}
        maxDistance={120}
        enablePan
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        makeDefault
      />
      <CameraController intent={focusIntent} />
    </Canvas>
  );
}
