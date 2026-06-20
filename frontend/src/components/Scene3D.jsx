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

        const mid = [
          (a.x + b.x) / 2,
          (a.y + b.y) / 2 + (isParent ? -0.6 : isSibling ? -0.25 : 0),
          (a.z + b.z) / 2,
        ];
        const highlighted = selectedId && (e.from === selectedId || e.to === selectedId);

        let color = "#FFFFFF";
        let opacity = 0.18;
        let lineWidth = 1;
        let dashed = false;
        let dashSize = 0;
        let gapSize = 0;

        if (isPartner) { color = "#E5C07B"; opacity = 0.45; dashed = true; dashSize = 0.25; gapSize = 0.18; }
        if (isSibling) { color = "#7AA2FF"; opacity = 0.18; dashed = true; dashSize = 0.12; gapSize = 0.22; lineWidth = 0.8; }
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

function CameraController({ focusTarget }) {
  const { camera, controls } = useThree();
  const targetRef = useRef(new THREE.Vector3());
  const desiredRef = useRef(new THREE.Vector3());
  const activeRef = useRef(false);
  const startedRef = useRef(0);

  useEffect(() => {
    if (!focusTarget || !controls) return;
    // Compute desired camera position: offset from target along current view direction
    const targetVec = new THREE.Vector3(focusTarget.x, focusTarget.y, focusTarget.z);
    const currentDir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    if (currentDir.lengthSq() < 0.001) currentDir.set(0, 0, 1);
    const distance = 9;
    const newCamPos = targetVec.clone().add(currentDir.multiplyScalar(distance));
    targetRef.current.copy(targetVec);
    desiredRef.current.copy(newCamPos);
    activeRef.current = true;
    startedRef.current = performance.now();
  }, [focusTarget, camera, controls]);

  useFrame(() => {
    if (!activeRef.current || !controls) return;
    camera.position.lerp(desiredRef.current, 0.08);
    controls.target.lerp(targetRef.current, 0.08);
    controls.update();
    if (camera.position.distanceTo(desiredRef.current) < 0.05 || performance.now() - startedRef.current > 1800) {
      activeRef.current = false;
    }
  });

  return null;
}

export default function Scene3D({ members, layout, selectedId, onSelect, focusTarget }) {
  return (
    <Canvas
      camera={{ position: [0, 2, 18], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#0A0B10" }}
      data-testid="three-canvas"
    >
      <color attach="background" args={["#0A0B10"]} />
      <fog attach="fog" args={["#0A0B10", 18, 60]} />

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
        maxDistance={50}
        makeDefault
      />
      <CameraController focusTarget={focusTarget} />
    </Canvas>
  );
}
