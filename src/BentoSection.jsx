import { useEffect, useRef, useState } from "react";

/* ===================================================================
   Scroll-pinned bento with five slides + final centre expansion.

   ARCHITECTURE (post-rewrite):
   - The M-cell's grid position is COMPUTED from the bento layout
     (1fr 1.45fr 1fr · 4px gap · 100vw container), not measured via
     getBoundingClientRect. The previous measurement-at-mount approach
     captured stale coordinates while the user was at scroll 0 (M-cell
     far below the viewport, sticky bento-pin not yet active), so the
     expansion math was based on wrong numbers and the cell ended up
     in the wrong place during expansion.
   - Image transitions use a simple PREVIOUS / CURRENT pair, not a
     dynamic stack array. The current <img> is keyed by a counter so
     it remounts (and its CSS fade-in restarts) on every slide change.
   - LB + RB images stay constant across all slides.
   - The LT title + RT body re-animate on every slide change with a
     line-by-line mask reveal (GSAP-style).
   =================================================================== */

const STATIC = {
  lb: "/bento-row.webp",
  rb: "/bento-portrait.webp",
};

/* Per-slide color theme for the top-left and top-right cells. Peripheral
   colour change cues the user's eye that the text panels are updating —
   the centre M image is what most people focus on, so without this the
   slide cycling can go unnoticed. Each pair is drawn from the brand
   palette (paper, red, ink, yellow, green, pink) and tuned so the ink
   text and red accent both stay legible against the new background. */
const SLIDES = [
  {
    title: "Quiet\nStimulant.",
    accent: "Loud Results.",
    m: "/bento-slide-1.webp",
    eyebrow: "— The Formula",
    body: [
      "L-theanine, organic green coffee,",
      "80 mg of natural caffeine.",
      "Lifts cognition without the crash.",
    ],
    ltBg: "#f4ede0", ltFg: "#0a0a0a", ltAccent: "#E5331F",  // paper / ink / red
    rtBg: "#E5331F", rtFg: "#0a0a0a",
  },
  {
    title: "Real\nEnergy.",
    accent: "No Crash.",
    m: "/slide-energy.webp",
    eyebrow: "— Sustained focus",
    body: [
      "80 mg of natural caffeine",
      "paired with 200 mg of L-theanine.",
      "Energy that lasts; clarity that follows.",
    ],
    ltBg: "#FFC83D", ltFg: "#0a0a0a", ltAccent: "#E5331F",  // yellow / ink / red
    rtBg: "#0a0a0a", rtFg: "#f4ede0",
  },
  {
    title: "Sharpen.",
    accent: "The Mind.",
    m: "/slide-clarity.webp",
    eyebrow: "— Nootropic infused",
    body: [
      "L-theanine smooths the edge.",
      "Stay alert without the jitter.",
      "Focus without the fog.",
    ],
    ltBg: "#65C73B", ltFg: "#0a0a0a", ltAccent: "#E5331F",  // green / ink / red
    rtBg: "#f4ede0", rtFg: "#0a0a0a",
  },
  {
    title: "Find.",
    accent: "Your Flow.",
    m: "/slide-flow.webp",
    eyebrow: "— Plant powered",
    body: [
      "Sparkling Tahitian lime",
      "over cold-brewed green coffee.",
      "Nothing synthetic carries the message.",
    ],
    ltBg: "#FF6B9D", ltFg: "#0a0a0a", ltAccent: "#0a0a0a",  // pink / ink / ink (red would clash on pink)
    rtBg: "#FFC83D", rtFg: "#0a0a0a",
  },
  {
    title: "The Daily.",
    accent: "Signal.",
    m: "/slide-signal.webp",
    eyebrow: "— Find yours",
    body: [
      "Independent grocers in South Australia",
      "and online — everywhere worth a sip.",
      "Drink the signal.",
    ],
    ltBg: "#0a0a0a", ltFg: "#f4ede0", ltAccent: "#E5331F",  // ink / paper / red
    rtBg: "#E5331F", rtFg: "#0a0a0a",                       // red / ink — match slide 1's RT pairing
  },
];

const lerp = (a, b, t) => a + (b - a) * t;

/* Compute the M-cell's natural grid position from the bento layout.

   Two layouts are handled:

   - DESKTOP (vw > 768): three columns 1fr 1.45fr 1fr with the M-cell
     in the middle column spanning both rows. The expansion
     interpolates HORIZONTALLY — M grows left + right until it fills
     the viewport, with LT/LB sliding off the left and RT/RB sliding
     off the right.

   - MOBILE (vw <= 768): single column with three rows — LT (25vh),
     M (50vh), RT (25vh). LB/RB are hidden by CSS. The expansion
     interpolates VERTICALLY — M grows up + down until it fills the
     viewport, with LT sliding off the top and RT sliding off the
     bottom.

   Returns viewport-relative coordinates (which equal bento-pin-
   relative coordinates when the bento-pin is in its sticky state —
   and that's the ONLY time we use these values, during the expansion
   phase). */
function getMGridPos() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gapPx = 4;
  if (vw <= 768) {
    // 25vh title / 50vh image / 25vh body. M starts at top=25vh,
    // height=50vh, full width.
    return {
      top: vh * 0.25,
      left: 0,
      width: vw,
      height: vh * 0.5,
    };
  }
  const totalFr = 1 + 1.45 + 1; // 3.45
  const availableWidth = vw - 2 * gapPx;
  const col1Width = availableWidth * (1 / totalFr);
  const col2Width = availableWidth * (1.45 / totalFr);
  return {
    top: 0,
    left: col1Width + gapPx,
    width: col2Width,
    height: vh,
  };
}

/* ===================================================================
   Line — wraps a single line of text in an overflow-hidden mask so its
   inner span can slide up from below. Animation re-runs on remount via
   a changing key on the parent, giving a fluid line-by-line reveal.
   =================================================================== */
function Line({ children, delay = 0, accent = false }) {
  return (
    <span className="reveal" style={{ display: "block", overflow: "hidden" }}>
      <span
        className={"reveal__inner" + (accent ? " reveal__inner--accent" : "")}
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </span>
    </span>
  );
}

export default function BentoSection() {
  const sectionRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [expand, setExpand] = useState(0);

  // ----- Image reel state -----
  // PREVIOUS gets pushed out of the cell, CURRENT slides in. The slide
  // direction depends on whether the user is scrolling DOWN through
  // bento (new slide enters from below, old slide exits the top) or UP
  // (new slide enters from above, old slide exits the bottom). The
  // direction is recomputed on each index change by comparing to the
  // previous index, stored in a ref so it doesn't trigger an extra
  // re-render.
  // transitionKey is incremented on every slide change so both image
  // wrappers remount and their CSS animations run again from frame 0.
  const [previousSrc, setPreviousSrc] = useState(null);
  const [currentSrc, setCurrentSrc] = useState(SLIDES[0].m);
  const [transitionKey, setTransitionKey] = useState(0);
  const prevIndexRef = useRef(0);
  const directionRef = useRef("forward"); // 'forward' = down, 'backward' = up

  // Post-expansion tagline appears mid-expansion (before fullscreen)
  // so the lines feel like they accompany the opening rather than
  // arriving after it.
  const [textShown, setTextShown] = useState(false);
  useEffect(() => {
    if (expand >= 0.7 && !textShown) setTextShown(true);
    if (expand < 0.4 && textShown) setTextShown(false);
  }, [expand, textShown]);

  // Preload + fully decode all M-cell images at mount. Plain
  // `new Image(); img.src = m` only fetches the bytes; the JPG/WebP
  // decode still happens at the moment the <img> first renders,
  // which can stall the compositor on a slide swap. `img.decode()`
  // performs the decode up front so the swap is paint-ready.
  useEffect(() => {
    const sources = [...SLIDES.map((s) => s.m), STATIC.lb, STATIC.rb];
    sources.forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      // .decode() returns a promise — fire-and-forget; if the browser
      // doesn't support it, the fallback is still the byte-cached path
      // we had before.
      if (img.decode) img.decode().catch(() => {});
    });
  }, []);

  // Scroll-driven slide cycling + expansion progress
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const max = Math.max(1, r.height - vh);
        const localP = Math.max(0, Math.min(1, -r.top / max));

        if (localP < 0.65) {
          const slideP = localP / 0.65;
          const next = Math.min(
            SLIDES.length - 1,
            Math.floor(slideP * SLIDES.length)
          );
          setIndex(next);
          setExpand(0);
        } else if (localP < 0.8) {
          setIndex(SLIDES.length - 1);
          setExpand(0);
        } else {
          setIndex(SLIDES.length - 1);
          setExpand((localP - 0.8) / 0.2);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // When the slide image changes, snapshot the outgoing one into
  // PREVIOUS, update CURRENT, and pick a slide direction by comparing
  // the new index against the previous one. The direction picks which
  // pair of keyframes the wrappers run — up-reel for forward scrolling,
  // down-reel for backward scrolling.
  const slide = SLIDES[index];
  useEffect(() => {
    if (slide.m === currentSrc) return;
    directionRef.current =
      index < prevIndexRef.current ? "backward" : "forward";
    prevIndexRef.current = index;
    setPreviousSrc(currentSrc);
    setCurrentSrc(slide.m);
    setTransitionKey((k) => k + 1);
  }, [slide.m, currentSrc, index]);

  // M-cell positioning during expansion. expand=0 → leave in grid.
  // expand>0 → break out as position:absolute (relative to the sticky
  // bento-pin), interpolating from the computed grid position up to
  // fullscreen. Top stays 0 (bento-pin is sticky at viewport top,
  // M-cell is at top of grid), height stays 100vh — only left and
  // width interpolate, which is a purely horizontal expansion.
  const mStyle = (() => {
    if (expand === 0) return { zIndex: 5 };
    const grid = getMGridPos();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      position: "absolute",
      top: `${lerp(grid.top, 0, expand)}px`,
      left: `${lerp(grid.left, 0, expand)}px`,
      width: `${lerp(grid.width, vw, expand)}px`,
      height: `${lerp(grid.height, vh, expand)}px`,
      zIndex: 50,
      transition: "none",
    };
  })();

  // Subtle dolly-in on the image inside the M-cell during expansion.
  // The cell itself is growing from grid-size to fullscreen via mStyle;
  // adding a small scale-up on top of that (1.0 → 1.12 across the
  // expansion) sells the "opening up" feel — the image pushes toward
  // the camera rather than just being revealed in a larger frame.
  const imgScaleStyle =
    expand > 0
      ? {
          transform: `scale(${1 + expand * 0.12})`,
          transformOrigin: "center center",
          transition: "none",
        }
      : null;

  // The corner cells slide outward as the M-cell expands so the
  // gap between them and the growing M never widens — they stay
  // glued to the M-cell's edges.
  //
  // - On desktop they translate horizontally (left or right) since
  //   the M expansion is horizontal.
  // - On mobile they translate vertically (up or down) since the M
  //   expansion is vertical. LT (passed dx=-1) slides UP off the top,
  //   RT (passed dx=+1) slides DOWN off the bottom. LB/RB are hidden
  //   by CSS on mobile so they never appear in the layout.
  const corner = (dx) => {
    if (expand === 0) return { transition: "transform 0.55s" };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const grid = getMGridPos();
    if (vw <= 768) {
      const ty =
        dx === -1
          ? -grid.top * expand
          : (vh - (grid.top + grid.height)) * expand;
      return {
        transform: `translate3d(0, ${ty}px, 0)`,
        transition: "none",
      };
    }
    const tx =
      dx === -1
        ? -grid.left * expand
        : (vw - (grid.left + grid.width)) * expand;
    return {
      transform: `translate3d(${tx}px, 0, 0)`,
      transition: "none",
    };
  };

  const titleLines = slide.title.split("\n");

  return (
    <section className="section section--about section--pinned" ref={sectionRef}>
      <div className="bento-pin">
        <div className="bento">
          {/* LT — big typography, line-by-line reveal on each slide.
              Background + ink colour swap per slide via inline style so the
              CSS transition on .bento__cell--text animates the colour shift
              in lockstep with the text reveal. Peripheral cue for users
              whose attention is on the centre M image. */}
          <div
            className="bento__cell bento__cell--text bento__cell--text-paper bento__cell--lt"
            style={{ ...corner(-1), background: slide.ltBg, color: slide.ltFg }}
          >
            <h2
              className="bento__title"
              key={`title-${index}`}
              style={{ "--accent-color": slide.ltAccent }}
            >
              {titleLines.map((line, i) => (
                <Line key={`l-${i}`} delay={i * 0.08}>{line}</Line>
              ))}
              <Line key="accent" delay={titleLines.length * 0.08} accent>
                {slide.accent}
              </Line>
            </h2>
          </div>

          {/* LB — STATIC image */}
          <div className="bento__cell bento__cell--lb" style={corner(-1)}>
            <img src={STATIC.lb} alt="" />
          </div>

          {/* M — image reel: each new slide enters from the bottom of
              the cell and slides upward, the previous slide is pushed up
              and off the top edge in lockstep. The cell stays fully
              covered at every intermediate frame because both images
              move at the same speed (one entering from below as the
              other exits the top), so no empty gap is ever exposed.

              The slide-translate lives on a WRAPPER div (.m-img-slide),
              and the dolly-in scale during M-cell expansion lives on the
              INNER <img> via inline style. Two separate transforms in
              two separate elements means they don't fight each other. */}
          <div className="bento__cell bento__cell--m" style={mStyle}>
            {/* OUT — previous slide. Pushed up and off the top when the
                user is scrolling DOWN (forward); pushed down and off the
                bottom when scrolling UP (backward). Keyed by previousSrc
                so its animation runs from frame 0 whenever a new slide
                takes its place. */}
            {previousSrc && (
              <div
                key={`m-out-${previousSrc}`}
                className={`m-img-slide m-img-slide--out-${
                  directionRef.current === "backward" ? "down" : "up"
                }`}
              >
                <img
                  src={previousSrc}
                  alt=""
                  className="m-img"
                  style={imgScaleStyle}
                  /* Off-main-thread decode so swapping slides while the
                     user is mid-scroll doesn't block the compositor. */
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            )}
            {/* IN — current slide. Enters from BELOW the cell when the
                user is scrolling forward, from ABOVE the cell when
                scrolling backward — so the reel direction always
                matches scroll direction. Keyed by transitionKey so the
                slide animation replays cleanly on every slide change. */}
            <div
              key={`m-in-${transitionKey}`}
              className={`m-img-slide m-img-slide--in-${
                directionRef.current === "backward" ? "down" : "up"
              }`}
            >
              <img
                src={currentSrc}
                alt=""
                className="m-img"
                style={imgScaleStyle}
                decoding="async"
                fetchPriority="high"
              />
            </div>

            {/* Post-expansion tagline — slides up line-by-line once the
                M cell fills the viewport. */}
            {textShown && (
              <div className="m-text" key="m-text">
                <p className="m-text__body">
                  <Line delay={0.05}>L-Theanine + Organic Green Coffee.</Line>
                  <Line delay={0.13}>80&nbsp;mg of Natural Caffeine.</Line>
                  <Line delay={0.21}>Made to Lift, Never to Crash.</Line>
                </p>
                <h2 className="m-text__line">
                  <Line delay={0.42}>Drink the Signal.</Line>
                </h2>
                <h2 className="m-text__line">
                  <Line delay={0.62}>Made to Move.</Line>
                </h2>
              </div>
            )}
          </div>

          {/* RT — warm panel, line-by-line reveal of eyebrow + body.
              Same per-slide background/colour swap as LT (see comment above). */}
          <div
            className="bento__cell bento__cell--text bento__cell--text-warm bento__cell--rt"
            style={{ ...corner(1), background: slide.rtBg, color: slide.rtFg }}
          >
            <div key={`rt-${index}`} className="rt-content">
              <div className="bento__eyebrow">
                <Line delay={0}>{slide.eyebrow}</Line>
              </div>
              <p className="bento__body">
                {slide.body.map((line, i) => (
                  <Line key={i} delay={0.12 + i * 0.07}>{line}</Line>
                ))}
              </p>
              <dl className="bento__mini-spec">
                <div><dt>Caffeine</dt><dd>80mg</dd></div>
                <div><dt>Sugar</dt><dd>0g</dd></div>
                <div><dt>Volume</dt><dd>355ml</dd></div>
              </dl>
            </div>
          </div>

          {/* RB — STATIC image */}
          <div className="bento__cell bento__cell--rb" style={corner(1)}>
            <img src={STATIC.rb} alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}
