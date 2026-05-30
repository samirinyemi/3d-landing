import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/* ===================================================================
   Flavor lineup — the main can "splits" into 4 small cans, one per
   flavor card, when the user scrolls into the flavors section.
   - Cans start at world centre (overlapping the main can position)
   - As scrollProgress crosses the flavors threshold, each can spreads
     out horizontally to land in front of its corresponding card,
     and fades in via material opacity
   - Each can rotates slowly for life
   =================================================================== */

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

function FlavorCan({ target, scrollProgress }) {
  const groupRef = useRef();
  const matRefs = useRef([]);
  const label = useTexture("/can-label.webp", (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 8;
  });

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const p = scrollProgress.current;

    // Appear AFTER the original can has finished shrinking (0.89), then
    // spread to card positions in unison with the original (0.89 → 0.94).
    const splitP   = smoothstep(0.89, 0.94, p);
    const fadeIn   = smoothstep(0.89, 0.91, p);

    // Position spreads from centre to target X — together with the original
    groupRef.current.position.x = target.x * splitP;
    groupRef.current.position.y = target.y;

    // Constant scale at FLAVOR_SCALE so all four cans match
    groupRef.current.scale.setScalar(target.scale);

    // Gentle continuous rotation — same speed as the original during flavors
    groupRef.current.rotation.y += delta * 0.35;

    // Visibility / opacity fades in quickly at the start of the split phase
    groupRef.current.visible = fadeIn > 0.005;
    for (let i = 0; i < matRefs.current.length; i++) {
      const m = matRefs.current[i];
      if (m) m.opacity = fadeIn;
    }
  });

  const pushMat = (i) => (r) => {
    if (r) matRefs.current[i] = r;
  };

  return (
    <group ref={groupRef}>
      {/* Body — wears the printed label */}
      <mesh>
        <cylinderGeometry args={[0.55, 0.55, 2.2, 64]} />
        <meshStandardMaterial
          ref={pushMat(0)}
          map={label}
          metalness={0.05}
          roughness={0.7}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Simplified aluminum top + bottom caps */}
      <mesh position={[0, 1.13, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.04, 32]} />
        <meshStandardMaterial
          ref={pushMat(1)}
          color="#c8c5bd"
          metalness={0.92}
          roughness={0.28}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.16, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.025, 32]} />
        <meshStandardMaterial
          ref={pushMat(2)}
          color="#8e8b83"
          metalness={0.78}
          roughness={0.5}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -1.13, 0]}>
        <cylinderGeometry args={[0.55, 0.5, 0.04, 32]} />
        <meshStandardMaterial
          ref={pushMat(3)}
          color="#c8c5bd"
          metalness={0.92}
          roughness={0.28}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function FlavorCans({ scrollProgress }) {
  const { viewport } = useThree();
  const w = viewport.width || 6;
  const h = viewport.height || 4;

  // Three targets only — positions 2, 3, 4 in the 4-column grid.
  // Position 1 (leftmost card) is filled by the ORIGINAL can sliding in
  // from centre, so we add three additional cans here. Y is pushed below
  // centre so the cans sit in the lower half of each card, beneath the
  // text instead of covering it.
  const FLAVOR_Y = -h * 0.26;
  const FLAVOR_SCALE = 0.5;
  const targets = [
    { x: (-1 * w) / 8, y: FLAVOR_Y, scale: FLAVOR_SCALE },
    { x: (+1 * w) / 8, y: FLAVOR_Y, scale: FLAVOR_SCALE },
    { x: (+3 * w) / 8, y: FLAVOR_Y, scale: FLAVOR_SCALE },
  ];

  return (
    <>
      {targets.map((t, i) => (
        <FlavorCan key={i} target={t} scrollProgress={scrollProgress} />
      ))}
    </>
  );
}
