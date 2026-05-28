import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/* ===== Palette ===== */
const PAPER = "#f4ede0";
const INK = "#0a0a0a";
const RED = "#E5331F";
const YELLOW = "#FFC83D";
const GREEN = "#65C73B";
const PINK = "#FF6B9D";

const FONTS = {
  sans: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, Menlo, monospace",
  chunky: "'Bowlby One', 'Arial Black', sans-serif",
  script: "'Caveat', 'Brush Script MT', cursive",
};

function setFont(ctx, size, weight = 400, family = "sans") {
  ctx.font = `${weight} ${size}px ${FONTS[family]}`;
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/* ===================================================================
   Decorative primitives
   =================================================================== */

function drawSplash(ctx, cx, cy, radius, color, seed = 1) {
  // Organic blob — sample radii around a circle using a seeded PRNG so the
  // shape is the same every render but feels hand-drawn.
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const steps = 14;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius * (0.82 + rand() * 0.32);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const n = pts[(i + 1) % pts.length];
    const mid = [(p[0] + n[0]) / 2, (p[1] + n[1]) / 2];
    ctx.quadraticCurveTo(p[0], p[1], mid[0], mid[1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSun(ctx, cx, cy, radius, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // Disc
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Rays
  ctx.lineWidth = Math.max(4, radius * 0.08);
  ctx.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r1 = radius * 0.78;
    const r2 = radius * 1.15;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLeaves(ctx, cx, cy, scale, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  // Left leaf
  ctx.beginPath();
  ctx.ellipse(cx - 38 * scale, cy, 42 * scale, 14 * scale, Math.PI * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Right leaf
  ctx.beginPath();
  ctx.ellipse(cx + 38 * scale, cy, 42 * scale, 14 * scale, -Math.PI * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Center vein
  ctx.strokeStyle = "rgba(10,10,10,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 70 * scale, cy);
  ctx.lineTo(cx - 10 * scale, cy);
  ctx.moveTo(cx + 10 * scale, cy);
  ctx.lineTo(cx + 70 * scale, cy);
  ctx.stroke();
  ctx.restore();
}

function drawXStar(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.22);
  ctx.lineCap = "round";
  // The two diagonals of an ×
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size);
  ctx.lineTo(cx + size, cy + size);
  ctx.moveTo(cx + size, cy - size);
  ctx.lineTo(cx - size, cy + size);
  ctx.stroke();
  ctx.restore();
}

function drawSparkle(ctx, cx, cy, size, color) {
  // Four-point star — long diamond on each axis
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.28, cy - size * 0.28);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx + size * 0.28, cy + size * 0.28);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.28, cy + size * 0.28);
  ctx.lineTo(cx - size, cy);
  ctx.lineTo(cx - size * 0.28, cy - size * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, dotR, spacing, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let dx = 0; dx <= w; dx += spacing) {
    for (let dy = 0; dy <= h; dy += spacing) {
      // Stagger every other row
      const offset = Math.floor(dy / spacing) % 2 === 0 ? 0 : spacing / 2;
      ctx.beginPath();
      ctx.arc(x + dx + offset, y + dy, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ===================================================================
   Custom VIVID wordmark — chunky multi-layer treatment
   =================================================================== */
function drawWordmark(ctx, text, cx, cy, size) {
  ctx.save();
  setFont(ctx, size, 400, "chunky");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Drop shadow layer (yellow, offset down-right)
  ctx.fillStyle = YELLOW;
  ctx.fillText(text, cx + size * 0.06, cy + size * 0.06);

  // Outline layer (black, slightly larger via stroke)
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.08;
  ctx.lineJoin = "round";
  ctx.strokeText(text, cx, cy);

  // Fill layer (red on top)
  ctx.fillStyle = RED;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/* ===================================================================
   Citrus character — stylized smiling lime cross-section
   =================================================================== */
function drawCitrusCharacter(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);

  // Sunburst halo behind the lime (yellow)
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r1 = radius * 1.18;
    const r2 = radius * (i % 2 === 0 ? 1.45 : 1.32);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }

  // Outer rind — green ring
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner flesh — cream
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.84, 0, Math.PI * 2);
  ctx.fill();

  // 8 wedge dividers (black)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * radius * 0.82, Math.sin(a) * radius * 0.82);
    ctx.stroke();
  }

  // Pulp dots in each wedge (red)
  ctx.fillStyle = RED;
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const r = radius * 0.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Face: two eyes + smile, slightly above center for personality
  ctx.fillStyle = INK;
  const eyeY = -radius * 0.05;
  ctx.beginPath();
  ctx.arc(-radius * 0.22, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.22, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();
  // Tiny eye highlights
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(-radius * 0.20, eyeY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.24, eyeY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks (pink)
  ctx.fillStyle = "rgba(255, 107, 157, 0.55)";
  ctx.beginPath();
  ctx.arc(-radius * 0.32, radius * 0.12, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(radius * 0.32, radius * 0.12, 9, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, radius * 0.05, radius * 0.27, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();

  ctx.restore();
}

/* ===================================================================
   FRONT panel — main artwork with the brand
   =================================================================== */
function drawFrontPanel(ctx, xCenter, panelW, h) {
  ctx.save();
  ctx.translate(xCenter, 0);

  const halfW = panelW / 2;
  const edge = halfW - 50;

  /* ---- Background decoration ---- */
  // Large soft red splash behind the central artwork
  drawSplash(ctx, 0, h * 0.50, 360, "rgba(229, 51, 31, 0.18)", 17);

  // Yellow sun in upper-left
  drawSun(ctx, -halfW * 0.32, 150, 50, YELLOW);

  // Pink blob, lower-right
  drawSplash(ctx, halfW * 0.34, h * 0.78, 70, "rgba(255, 107, 157, 0.55)", 91);

  // Halftone dots in upper-right corner
  drawHalftone(ctx, halfW * 0.18, 70, 160, 110, 3, 14, "rgba(10,10,10,0.35)");

  // Decorative × stars scattered
  drawXStar(ctx, -halfW * 0.36, h * 0.32, 14, INK);
  drawXStar(ctx, halfW * 0.33, h * 0.30, 12, INK);
  drawXStar(ctx, -halfW * 0.30, h * 0.62, 10, INK);
  drawXStar(ctx, halfW * 0.36, h * 0.65, 14, INK);

  // Sparkle diamonds for extra polish
  drawSparkle(ctx, -halfW * 0.20, h * 0.42, 12, RED);
  drawSparkle(ctx, halfW * 0.22, h * 0.48, 10, RED);

  /* ---- Top eyebrow band ---- */
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setFont(ctx, 22, 700, "mono");
  ctx.fillText("·  REAL · BOOST · ENERGY  ·", 0, 80);
  // hairline rules around it
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-edge, 110); ctx.lineTo(edge, 110);
  ctx.stroke();

  /* ---- Custom VIVID wordmark — the centerpiece ---- */
  drawWordmark(ctx, "VIVID", 0, 250, 230);

  /* ---- Sub-tagline ---- */
  ctx.fillStyle = INK;
  setFont(ctx, 30, 400, "chunky");
  ctx.fillText("SPARKLING BOOST", 0, 365);

  /* ---- Central illustration ---- */
  drawCitrusCharacter(ctx, 0, h * 0.62, 130);
  // Leaves underneath the lime
  drawLeaves(ctx, 0, h * 0.62 + 145, 1, GREEN);

  /* ---- Cursive flavor name ---- */
  ctx.fillStyle = RED;
  setFont(ctx, 64, 700, "script");
  ctx.fillText("citrus + lime", 0, h * 0.84);

  /* ---- Bottom claims band ---- */
  ctx.fillStyle = INK;
  setFont(ctx, 24, 700, "chunky");
  ctx.fillText("FUNCTIONAL DRINK", 0, h - 95);

  setFont(ctx, 16, 600, "mono");
  ctx.fillStyle = "rgba(10,10,10,0.72)";
  ctx.fillText("0 SUGAR  ·  0 CALORIES  ·  80 MG CAFFEINE", 0, h - 65);

  ctx.restore();
}

/* ===================================================================
   BACK panel — ingredients + info
   =================================================================== */
function drawBackPanel(ctx, xCenter, panelW, h) {
  ctx.save();
  ctx.translate(xCenter, 0);

  const halfW = panelW / 2;
  const edge = halfW - 50;

  /* ---- Background hint ---- */
  drawSplash(ctx, halfW * 0.32, 180, 90, "rgba(255, 200, 61, 0.55)", 53);
  drawSplash(ctx, -halfW * 0.30, h - 200, 110, "rgba(101, 199, 59, 0.5)", 71);
  drawHalftone(ctx, -halfW * 0.45, h * 0.42, 80, 130, 3, 12, "rgba(10,10,10,0.3)");

  /* ---- Top brand ---- */
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setFont(ctx, 28, 700, "sans");
  ctx.fillText("VIVID°", 0, 70);

  setFont(ctx, 18, 600, "mono");
  ctx.fillStyle = "rgba(10,10,10,0.65)";
  ctx.fillText("SPARKLING BOOST · 355 ML", 0, 105);

  /* ---- Ingredients card ---- */
  const cardW = panelW * 0.66;
  const cardH = 460;
  const cardX = -cardW / 2;
  const cardY = 160;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.stroke();

  // Card header bar
  ctx.fillStyle = RED;
  roundRect(ctx, cardX, cardY, cardW, 58, 18);
  ctx.fill();
  // Re-fill below the rounded corners to flatten the lower edge of the header
  ctx.fillRect(cardX, cardY + 18, cardW, 40);

  ctx.fillStyle = PAPER;
  setFont(ctx, 22, 700, "chunky");
  ctx.textAlign = "left";
  ctx.fillText("INGREDIENTS", cardX + 24, cardY + 30);

  // Items
  ctx.fillStyle = INK;
  setFont(ctx, 17, 500, "sans");
  const items = [
    "Sparkling water",
    "Tahitian lime juice",
    "Organic green coffee extract",
    "L-theanine (200 mg)",
    "Natural caffeine (80 mg)",
    "Cane-sugar-free sweetener",
    "Citric acid, natural flavors",
  ];
  let y0 = cardY + 90;
  items.forEach((item) => {
    // bullet square
    ctx.fillStyle = RED;
    ctx.fillRect(cardX + 28, y0 - 6, 10, 10);
    ctx.fillStyle = INK;
    ctx.fillText(item, cardX + 50, y0);
    y0 += 38;
  });

  /* ---- Nutrition strip ---- */
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  setFont(ctx, 24, 700, "chunky");
  ctx.fillText("REAL ENERGY · NO NOISE", 0, cardY + cardH + 60);

  /* ---- Bottom info bar ---- */
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-edge, h - 130);
  ctx.lineTo(edge, h - 130);
  ctx.stroke();

  setFont(ctx, 16, 600, "mono");
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.fillText("BATCH 0042", -edge, h - 100);
  ctx.textAlign = "right";
  ctx.fillText("MADE IN AUSTRALIA", edge, h - 100);

  ctx.textAlign = "center";
  setFont(ctx, 14, 500, "mono");
  ctx.fillStyle = "rgba(10,10,10,0.65)";
  ctx.fillText("BEST BEFORE — SEE BASE  ·  EST. 2026", 0, h - 70);

  ctx.restore();
}

/* ===================================================================
   Label texture — paints front + back, repaints once fonts load
   =================================================================== */
function useLabelTexture() {
  const { texture, canvas } = useMemo(() => {
    const w = 2048;
    const h = 1024;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    return { texture: tex, canvas: cv };
  }, []);

  useEffect(() => {
    const w = canvas.width;
    const h = canvas.height;

    const paint = () => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);

      // Base
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w, h);

      // Vertical shading
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(229, 51, 31, 0.09)");
      grad.addColorStop(0.5, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(10, 10, 10, 0.10)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Two panels — front + back, 180° apart on the cylinder.
      // u=0.75 maps to +Z (front-facing the camera at scroll 0).
      drawFrontPanel(ctx, w * 0.75, w / 2, h);
      drawBackPanel(ctx, w * 0.25, w / 2, h);

      texture.needsUpdate = true;
    };

    // Paint immediately with whatever fonts are available
    paint();

    // Repaint once the chunky display + script fonts have loaded
    if (document.fonts) {
      Promise.all([
        document.fonts.load("400 100px 'Bowlby One'"),
        document.fonts.load("700 60px 'Caveat'"),
      ])
        .then(paint)
        .catch(() => {});
    }
  }, [canvas, texture]);

  return texture;
}

/* ===================================================================
   Can geometry caps — top + bottom revolved profiles
   =================================================================== */
/* ===================================================================
   Real can-lid details: flat pull tab with a finger-ring hole, a centre
   rivet, and an engraved score line where the metal tears.
   =================================================================== */
function useLidParts() {
  return useMemo(() => {
    /* ----- Pull tab — flat, lying on the lid ----- */
    // Designed in the XY plane (long axis along Y), then extruded along +Z
    // for thickness and rotated -π/2 around X so it lies flat on the lid.
    const tabShape = new THREE.Shape();
    const tabW = 0.078;
    const tabL = 0.30;
    const wEnd = tabW / 2;
    const lEnd = tabL / 2 - wEnd;

    // Outline: top rounded end → bottom rounded end (counter-clockwise)
    tabShape.absarc(0,  lEnd, wEnd, 0, Math.PI, false);
    tabShape.absarc(0, -lEnd, wEnd, Math.PI, 2 * Math.PI, false);

    // Lift-ring hole — in the upper portion of the tab
    const ringHole = new THREE.Path();
    const ringR = wEnd * 0.60;
    const ringY = lEnd * 0.45;
    ringHole.absarc(0, ringY, ringR, 0, Math.PI * 2, false);
    tabShape.holes.push(ringHole);

    const tabGeo = new THREE.ExtrudeGeometry(tabShape, {
      depth: 0.005,
      bevelEnabled: true,
      bevelThickness: 0.0015,
      bevelSize: 0.0012,
      bevelSegments: 2,
      curveSegments: 24,
    });
    tabGeo.translate(0, 0, -0.0025); // centre vertically before rotation

    /* ----- Score line — engraved oval on the lid surface ----- */
    // Same approach: shape with a hole to make a thin ring outline
    const scoreOuter = new THREE.Shape();
    const sR = 0.108;
    const sL = 0.135;
    const sLend = sL - sR;
    scoreOuter.absarc(0,  sLend, sR, 0, Math.PI, false);
    scoreOuter.absarc(0, -sLend, sR, Math.PI, 2 * Math.PI, false);

    const scoreInner = new THREE.Path();
    const isR = sR - 0.003;
    const isL = sL - 0.003;
    const isLend = isL - isR;
    scoreInner.absarc(0,  isLend, isR, 0, Math.PI, false);
    scoreInner.absarc(0, -isLend, isR, Math.PI, 2 * Math.PI, false);
    scoreOuter.holes.push(scoreInner);

    const scoreGeo = new THREE.ExtrudeGeometry(scoreOuter, {
      depth: 0.0008,
      bevelEnabled: false,
      curveSegments: 24,
    });

    return { tabGeo, scoreGeo };
  }, []);
}

function useCanCaps() {
  return useMemo(() => {
    // TOP profile — pronounced shoulder, narrow neck, rolled rim, recessed lid.
    // Real beverage cans neck in from ~66mm to ~53mm; mirroring that ratio here.
    const topPts = [
      new THREE.Vector2(0.550, 1.100),  // body top outer edge
      new THREE.Vector2(0.548, 1.108),  // small inset before shoulder
      new THREE.Vector2(0.532, 1.120),  // shoulder curve starts
      new THREE.Vector2(0.508, 1.140),  // shoulder mid curve
      new THREE.Vector2(0.478, 1.158),  // shoulder finishing
      new THREE.Vector2(0.458, 1.172),  // narrow neck top
      new THREE.Vector2(0.455, 1.182),  // straight neck (very short)
      new THREE.Vector2(0.465, 1.190),  // rolled rim begins flaring
      new THREE.Vector2(0.474, 1.198),  // rim outer apex
      new THREE.Vector2(0.470, 1.205),  // rim crown — highest point
      new THREE.Vector2(0.458, 1.203),  // rim wraps over
      new THREE.Vector2(0.448, 1.198),  // drops into recessed lid
      new THREE.Vector2(0.440, 1.193),  // lid edge
      new THREE.Vector2(0.435, 1.190),  // lid surface starts
      new THREE.Vector2(0.001, 1.190),  // centre of recessed lid
    ];

    // BOTTOM profile — deeper concave dome with a real foot ring.
    const bottomPts = [
      new THREE.Vector2(0.001, -1.052),  // raised centre (deep concave dome)
      new THREE.Vector2(0.260, -1.054),  // concave plateau
      new THREE.Vector2(0.360, -1.066),  // begins curving down
      new THREE.Vector2(0.430, -1.090),  // continuing toward foot
      new THREE.Vector2(0.480, -1.115),  // approaching foot inner wall
      new THREE.Vector2(0.515, -1.138),  // foot inner edge
      new THREE.Vector2(0.535, -1.150),  // foot inner bottom
      new THREE.Vector2(0.555, -1.150),  // foot outer bottom
      new THREE.Vector2(0.562, -1.142),  // foot outer flare
      new THREE.Vector2(0.560, -1.128),  // wraps back upward
      new THREE.Vector2(0.555, -1.112),  // returns toward body
      new THREE.Vector2(0.550, -1.100),  // joins body
    ];

    const topGeo = new THREE.LatheGeometry(topPts, 96);
    topGeo.computeVertexNormals();
    const bottomGeo = new THREE.LatheGeometry(bottomPts, 96);
    bottomGeo.computeVertexNormals();
    return { topGeo, bottomGeo };
  }, []);
}

/* ===================================================================
   Can component
   =================================================================== */
export default function Can({ scrollProgress, scrollCycles, introKey = 0 }) {
  const group = useRef();
  const labelMap = useTexture("/can-label.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    // Flip so the image's horizontal centre lands on +Z (facing camera at scroll 0)
    tex.offset.x = 0.5;
    tex.needsUpdate = true;
  });
  const { topGeo, bottomGeo } = useCanCaps();
  const { tabGeo, scoreGeo } = useLidParts();

  const introStartRef = useRef(null);
  const INTRO_DURATION = 1.8;       // seconds
  const INTRO_DROP_FROM = -3.4;      // y position below viewport
  const INTRO_SPIN_TURNS = 2;        // full Y spins during the drop-in
  // BASE_SCALE is responsive: the can sits roughly 50% smaller on
  // mobile so it doesn't dominate or collide with text in a narrow
  // viewport. Recomputed each frame so a screen rotation/resize is
  // picked up live.
  const BASE_SCALE_DESKTOP = 0.7;
  const BASE_SCALE_MOBILE = 0.45;

  // Reset the intro on every new lap of the infinite scroll — the can drops
  // and spins in again, matching the fresh hero animations that replay above.
  // Avoids a full WebGL teardown (which keying the <Can> would cause).
  useEffect(() => {
    introStartRef.current = null;
  }, [introKey]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (introStartRef.current === null) introStartRef.current = state.clock.elapsedTime;

    const elapsed = state.clock.elapsedTime - introStartRef.current;
    const introP = Math.min(1, elapsed / INTRO_DURATION);
    // ease-out cubic — fast then settling
    const introEase = 1 - Math.pow(1 - introP, 3);

    // Scroll-driven target rotations
    // p     — within-lap progress 0–1 (drives hide windows + flip, which are
    //          tied to specific sections of the page)
    // pCont — continuous progress that increases monotonically across infinite
    //          scroll laps (drives rotation + wobble so the can doesn't snap
    //          when scroll teleports from the closer back to the hero)
    const p = scrollProgress.current;
    const cycles = scrollCycles?.current ?? 0;
    const pCont = p + cycles;

    // ----- HERO SPIN BOOST -----
    // The hero is scroll-pinned: the page doesn't move, only the text
    // panels swap. Without help the can would barely rotate (~0.6 of a
    // turn) across the entire 300vh hero, and the scroll input would feel
    // dead. So we accumulate extra Y-axis turns across the hero window
    // (plus a punchy tilt that peaks mid-hero then settles) to make the
    // scroll register as physical motion on the can. Same cumulative
    // pattern as the bento boost below — cycles-offset so the rotation is
    // continuous across the infinite-scroll wrap.
    //
    // Hero progress range: 0 → 0.235 (hero is 300vh of ~1275vh total).
    const HERO_P_END = 0.235;
    const HERO_EXTRA_TURNS = 2.25;
    const heroLocal = Math.min(1, Math.max(0, p / HERO_P_END));
    const heroExtraSpin =
      cycles * HERO_EXTRA_TURNS * Math.PI * 2 +
      heroLocal * HERO_EXTRA_TURNS * Math.PI * 2;
    // Hero tilt: forward lean that peaks ~mid-hero then eases back to 0
    // by the time the user enters bento. sin(πx) gives a 0→1→0 curve.
    const heroTilt = Math.sin(heroLocal * Math.PI) * 0.32;
    // Wobble amplification during hero — punches the side-to-side motion
    // up to ~2.2× baseline at peak hero, then relaxes back.
    const heroWobbleBoost = 1 + Math.sin(heroLocal * Math.PI) * 1.2;

    // ----- BENTO SPIN BOOST -----
    // Inside the bento scroll window the page itself isn't doing much
    // visually (the user is scrolling through a pinned slide cycle) so the
    // can has to carry the energy. We accumulate ~2 extra Y-axis turns
    // across the bento window — combined with the baseline 2.5 turns/page,
    // that works out to roughly 3× the normal spin rate while the user is
    // inside bento. The extra is cumulative (stays after bento ends rather
    // than un-spinning), and offset by `cycles * BENTO_EXTRA_TURNS * 2π`
    // for infinite-scroll continuity — same trick the flip uses below.
    //
    // Bento progress range on the current page composition:
    //   hero 300vh (scroll-pinned with 3 text states) before bento top
    //   bento 600vh, so bento ends at page 900vh
    //   max scroll ≈ 1275vh → progress 300/1275 = 0.235 to 900/1275 = 0.706
    const BENTO_P_START = 0.235;
    const BENTO_P_END = 0.706;
    const BENTO_EXTRA_TURNS = 2;
    const bentoLocal = Math.min(
      1,
      Math.max(0, (p - BENTO_P_START) / (BENTO_P_END - BENTO_P_START))
    );
    const bentoExtraSpin =
      cycles * BENTO_EXTRA_TURNS * Math.PI * 2 +
      bentoLocal * BENTO_EXTRA_TURNS * Math.PI * 2;
    // Amplify wobble amplitude while inside bento for extra visible "life"
    // (up to 2.5× the baseline amplitude at peak bento).
    const wobbleAmpBoost = (1 + bentoLocal * 1.5) * heroWobbleBoost;

    const targetY = pCont * Math.PI * 2.5 + heroExtraSpin + bentoExtraSpin;
    const wobbleX = Math.sin(pCont * Math.PI * 2) * 0.18 * wobbleAmpBoost + heroTilt;
    const wobbleZ = Math.cos(pCont * Math.PI * 2.5) * 0.14 * wobbleAmpBoost;
    // Flip is tied to the per-lap progress so it re-plays during the same
    // bento window each lap. CRITICAL: we add `cycles * 2π` so the flip
    // target is continuous across the infinite-scroll wrap. (Same logic as
    // bentoExtraSpin above — full-rotation accumulator per lap.)
    // Window 0.30-0.50 is roughly the centre half of the new bento range.
    const flipX = cycles * Math.PI * 2 + smoothstep(0.30, 0.50, p) * Math.PI * 2;

    // ----- Hide during bento expansion AND flavors section -----
    // Can spins out during the bento expansion, returns for the CTA, hides
    // again as the flavors strip takes over, then RETURNS once more for the
    // closer section so the page visually loops back to the hero.
    // Thresholds are tuned for the current page composition:
    //   hero 100vh + bento 600vh + cta 100vh + flavors ~75vh + closer 100vh
    // Bento expansion fires at internal 0.80–1.0, which is page progress
    // ~0.66–0.80. Flavors dominates ~0.88–0.94. Closer dominant ~0.94–0.97.
    // ----- ONE CONTINUOUS HIDE WINDOW -----
    // Per user spec: the moment the bento M-cell expansion fires, the can
    // drops out — and STAYS out, through:
    //   bento expansion → CTA → top of Flavors
    // The can only returns when the bottom of the flavors section reaches
    // roughly 100px above the bottom of the viewport. From that point on
    // it's visible through C1, C2, closer, and across the infinite-scroll
    // wrap back to the hero.
    //
    // Page composition (current):
    //   bento expansion starts at progress 0.612 (page 780vh of 1275vh max)
    //   flavors bottom trigger lands at progress ~0.774 (page 987vh)
    //
    // Exit window is tight (0.61→0.65) — bento expansion is a fast moment
    // and we want the can out of the way quickly. Re-entry window is
    // intentionally MUCH wider (0.73→0.88) so the can settles back into
    // place gradually as the user scrolls through C1/C2 rather than
    // snapping in at the top of flavors. The drop position and recovery
    // spin both ease back over that wider range, which reads as natural
    // physical motion instead of a pop.
    //
    // MOBILE: the bento is laid out as three stacked cells (title /
    // image / body) inside a 100vh sticky pin, and the 3D can hovering
    // over those cells crowds the read. So on mobile the can hides for
    // the WHOLE bento — from the moment the section reaches the top of
    // the viewport (p ≈ 0.235) through the expansion and the gap before
    // C1. Same wider re-entry window so it settles back in naturally.
    const isMobile =
      typeof window !== "undefined" && window.innerWidth <= 768;
    const exitStart = isMobile ? 0.22 : 0.61;
    const exitEnd   = isMobile ? 0.27 : 0.65;
    const hideMid =
      smoothstep(exitStart, exitEnd, p) - smoothstep(0.73, 0.88, p);
    const hide = Math.min(1, hideMid);
    const hideDrop = -hide * 6;
    const hideSpin = hide * Math.PI * 3;
    // NOTE: no closer-exit drop. The can stays at its scroll-driven position
    // through the very end of the closer, so when the infinite-scroll wrap
    // fires and the scroll resets to ~0, the can is at the same y/rotation
    // as it would be at the top of the hero. Visually it doesn't move at all
    // across the boundary — only the text content swaps out.

    const targetX = wobbleX + flipX;
    const targetZ = wobbleZ;

    // Extra spin layered on top during the intro, growing from 0 → 2 turns
    // and then staying constant so we don't unwind backwards afterwards.
    const introSpinY = introEase * Math.PI * 2 * INTRO_SPIN_TURNS;
    const finalTargetY = targetY + introSpinY + hideSpin;

    // Position: intro drop-in (first load only) + hide-during-expansion drop-out
    group.current.position.x = 0;
    group.current.position.y =
      INTRO_DROP_FROM * (1 - introEase) + hideDrop;
    // Mobile gets a smaller can so it doesn't crowd the narrow viewport.
    const baseScale = isMobile ? BASE_SCALE_MOBILE : BASE_SCALE_DESKTOP;
    group.current.scale.setScalar(baseScale);

    if (introP < 1) {
      // Crisp deterministic motion during the intro — no lerp lag
      group.current.rotation.y = finalTargetY;
      group.current.rotation.x = targetX;
      group.current.rotation.z = targetZ;
    } else {
      // Hand off to the regular scroll-driven lerp
      const lerp = 1 - Math.pow(0.001, delta);
      group.current.rotation.y += (finalTargetY - group.current.rotation.y) * lerp;
      group.current.rotation.x += (targetX - group.current.rotation.x) * lerp;
      group.current.rotation.z += (targetZ - group.current.rotation.z) * lerp;
    }
  });

  const aluminumMat = (
    <meshStandardMaterial
      color="#c8c5bd"
      metalness={0.92}
      roughness={0.28}
      envMapIntensity={1.1}
    />
  );

  const recessMat = (
    <meshStandardMaterial
      color="#8e8b83"
      metalness={0.78}
      roughness={0.5}
      envMapIntensity={0.9}
    />
  );

  return (
    <group ref={group}>
      {/* Body — wears the printed PNG label. Texture offset.x = 0.5 lines up
          the image centre with the camera-facing +Z direction. */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 2.2, 96, 1, false]} />
        <meshStandardMaterial
          map={labelMap}
          metalness={0.05}
          roughness={0.72}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Top cap — shoulder, neck, rolled rim, recessed lid */}
      <mesh geometry={topGeo} castShadow receiveShadow>
        {aluminumMat}
      </mesh>
      {/* Inset lid disc — slightly darker for visual depth */}
      <mesh position={[0, 1.189, 0]}>
        <cylinderGeometry args={[0.432, 0.432, 0.003, 96]} />
        {recessMat}
      </mesh>

      {/* Engraved score line (the oval cut path that tears open) */}
      <mesh
        geometry={scoreGeo}
        position={[0, 1.190, -0.04]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial color="#6f6c64" metalness={0.85} roughness={0.55} />
      </mesh>

      {/* Pull tab — flat, lying on the lid, offset so its pressing end
          sits over the score line and its lift ring is the other side. */}
      <mesh
        geometry={tabGeo}
        position={[0, 1.194, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
      >
        {aluminumMat}
      </mesh>

      {/* Centre rivet — the small dome that pins the tab to the lid */}
      <mesh position={[0, 1.196, 0.02]}>
        <cylinderGeometry args={[0.0095, 0.012, 0.006, 16]} />
        {aluminumMat}
      </mesh>
      <mesh position={[0, 1.199, 0.02]}>
        <sphereGeometry args={[0.0085, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {aluminumMat}
      </mesh>

      {/* Bottom cap — foot ring + concave dome */}
      <mesh geometry={bottomGeo} castShadow receiveShadow>
        {aluminumMat}
      </mesh>
      {/* Concave dome disc — darker recess */}
      <mesh position={[0, -1.055, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.002, 96]} />
        {recessMat}
      </mesh>
    </group>
  );
}
