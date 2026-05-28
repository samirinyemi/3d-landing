import { useEffect, useRef, useState } from "react";

/* ===================================================================
   Section 2 — illustrated scroll/auto-animated background.
   Each motif is an inline SVG positioned absolutely; CSS keyframes drive
   the constant ambient motion, and a scroll-derived progress value
   layers parallax + rotation on top.
   =================================================================== */

const RED = "#E5331F";
const PINK = "#FF6B9D";
const YELLOW = "#FFC83D";
const GREEN = "#65C73B";
const INK = "#0a0a0a";

/* ---------- SVG motifs ---------- */

const Sun = ({ color = YELLOW, size = 110 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <circle cx="50" cy="50" r="20" fill={color} stroke={INK} strokeWidth="2" />
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const x1 = 50 + Math.cos(a) * 28;
      const y1 = 50 + Math.sin(a) * 28;
      const x2 = 50 + Math.cos(a) * 42;
      const y2 = 50 + Math.sin(a) * 42;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="4" strokeLinecap="round" />;
    })}
  </svg>
);

const Eye = ({ size = 120 }) => (
  <svg viewBox="0 0 120 70" width={size} height={size * 0.58}>
    <path d="M5 35 Q60 -5 115 35 Q60 75 5 35 Z" fill={PINK} stroke={INK} strokeWidth="3" />
    <circle cx="60" cy="35" r="18" fill={INK} />
    <circle cx="60" cy="35" r="10" fill={GREEN} />
    <circle cx="63" cy="31" r="3" fill="#fff" />
  </svg>
);

const CitrusSlice = ({ size = 110 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <circle cx="50" cy="50" r="45" fill={RED} stroke={INK} strokeWidth="3" />
    <circle cx="50" cy="50" r="36" fill="#f4ede0" />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <line key={i} x1="50" y1="50" x2={50 + Math.cos(a) * 34} y2={50 + Math.sin(a) * 34} stroke={INK} strokeWidth="2.5" />
      );
    })}
    {Array.from({ length: 8 }).map((_, i) => {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      return <circle key={i} cx={50 + Math.cos(a) * 19} cy={50 + Math.sin(a) * 19} r="3" fill={RED} />;
    })}
    <circle cx="50" cy="50" r="4" fill={INK} />
  </svg>
);

const Leaf = ({ color = GREEN, size = 100 }) => (
  <svg viewBox="0 0 100 60" width={size} height={size * 0.6}>
    <path d="M5 30 Q30 0 70 8 Q95 18 95 30 Q70 52 30 50 Q10 45 5 30 Z" fill={color} stroke={INK} strokeWidth="3" />
    <path d="M15 30 Q50 22 90 26" stroke={INK} strokeWidth="2" fill="none" />
  </svg>
);

const Sparkle = ({ color = INK, size = 60 }) => (
  <svg viewBox="0 0 60 60" width={size} height={size}>
    <path d={`M30 4 L34 26 L56 30 L34 34 L30 56 L26 34 L4 30 L26 26 Z`} fill={color} />
  </svg>
);

const XStar = ({ color = INK, size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size}>
    <line x1="6" y1="6" x2="34" y2="34" stroke={color} strokeWidth="5" strokeLinecap="round" />
    <line x1="34" y1="6" x2="6" y2="34" stroke={color} strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const PottedPlant = ({ size = 130 }) => (
  <svg viewBox="0 0 100 130" width={size * 0.7} height={size}>
    {/* leaves */}
    <path d="M50 70 Q20 50 18 18 Q35 35 50 65" fill={GREEN} stroke={INK} strokeWidth="2.5" />
    <path d="M50 70 Q80 50 82 18 Q65 35 50 65" fill={GREEN} stroke={INK} strokeWidth="2.5" />
    <path d="M50 78 Q35 60 30 35 Q45 50 50 72" fill={GREEN} stroke={INK} strokeWidth="2.5" opacity="0.85" />
    {/* pot */}
    <path d="M28 85 L72 85 L66 125 L34 125 Z" fill={PINK} stroke={INK} strokeWidth="3" />
    <rect x="26" y="82" width="48" height="8" fill={PINK} stroke={INK} strokeWidth="3" />
  </svg>
);

const Bolt = ({ color = YELLOW, size = 70 }) => (
  <svg viewBox="0 0 40 70" width={size * 0.6} height={size}>
    <path d="M22 4 L8 38 L18 38 L14 66 L32 28 L22 28 L26 4 Z" fill={color} stroke={INK} strokeWidth="2.5" />
  </svg>
);

const WaveLine = ({ color = INK, size = 120 }) => (
  <svg viewBox="0 0 120 20" width={size} height={size * 0.17}>
    <path d="M5 10 Q20 -2 35 10 T65 10 T95 10 T115 10" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const Person = ({ size = 150 }) => (
  // Stylized yoga pose figure — head + body + leg
  <svg viewBox="0 0 100 140" width={size * 0.7} height={size}>
    {/* body */}
    <rect x="40" y="50" width="20" height="55" fill={YELLOW} stroke={INK} strokeWidth="2.5" rx="4" />
    {/* head */}
    <circle cx="50" cy="35" r="14" fill="#f4ede0" stroke={INK} strokeWidth="2.5" />
    {/* hair bun */}
    <circle cx="50" cy="22" r="6" fill={INK} />
    {/* arm raised */}
    <path d="M58 60 Q80 50 82 30" stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />
    {/* leg in yoga pose */}
    <path d="M48 105 Q40 125 35 132" stroke={GREEN} strokeWidth="10" fill="none" strokeLinecap="round" />
    <path d="M52 105 Q70 110 68 95 Q60 85 52 95" fill={GREEN} stroke={INK} strokeWidth="2.5" />
  </svg>
);

/* ---------- Motif placement — avoids the central can column and the spec table ---------- */
const motifs = [
  { Comp: Sun,         left: "3%",  top: "8%",   parallax: -60, rotate: 90,  anim: "float-a" },
  { Comp: Eye,         left: "82%", top: "6%",   parallax: 80,  rotate: -25, anim: "float-b" },
  { Comp: CitrusSlice, left: "70%", top: "78%",  parallax: -120,rotate: 180, anim: "spin-slow" },
  { Comp: PottedPlant, left: "4%",  top: "70%",  parallax: 40,  rotate: 0,   anim: "sway" },
  { Comp: Person,      left: "92%", top: "82%",  parallax: -90, rotate: 0,   anim: "float-c" },
  { Comp: Leaf,        left: "16%", top: "42%",  parallax: 70,  rotate: -45, anim: "sway" },
  { Comp: Sparkle,     left: "30%", top: "16%",  parallax: 30,  rotate: 360, anim: "pulse" },
  { Comp: Sparkle,     left: "92%", top: "44%",  parallax: -50, rotate: -360,anim: "pulse-2" },
  { Comp: XStar,       left: "20%", top: "82%",  parallax: 90,  rotate: 180, anim: "pulse" },
  { Comp: XStar,       left: "55%", top: "10%",  parallax: -40, rotate: -180,anim: "pulse-2" },
  { Comp: Bolt,        left: "0%",  top: "44%",  parallax: 110, rotate: -20, anim: "float-b" },
  { Comp: WaveLine,    left: "22%", top: "24%",  parallax: -30, rotate: 6,   anim: "drift" },
  { Comp: WaveLine,    left: "66%", top: "26%",  parallax: 50,  rotate: -10, anim: "drift" },
  { Comp: Leaf,        left: "48%", top: "88%",  parallax: -70, rotate: 35,  anim: "sway",
    props: { color: PINK } },
];

export default function IllustratedBg() {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const p = 1 - (rect.top + rect.height) / (rect.height + vh);
        setProgress(Math.max(0, Math.min(1, p)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="illust-bg" ref={ref} aria-hidden>
      {motifs.map((m, i) => {
        const { Comp, left, top, parallax, rotate, anim, props } = m;
        const ty = parallax * progress;
        const rz = rotate * progress;
        return (
          <span
            key={i}
            className={`illust-bg__item illust-bg__anim-${anim}`}
            style={{
              left,
              top,
              transform: `translate3d(0, ${ty}px, 0) rotate(${rz}deg)`,
            }}
          >
            <Comp {...(props || {})} />
          </span>
        );
      })}
    </div>
  );
}
