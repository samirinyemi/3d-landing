import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import Lenis from "lenis";
import Can from "./Can";
import BentoSection from "./BentoSection";
import SoundToggle from "./SoundToggle";
import CustomCursor from "./CustomCursor";
import { MaskedWord, Line, useInView } from "./Reveal";
import "./App.css";

export default function App() {
  // scrollProgress: 0–1 within the current "lap" (one full traversal of the page)
  // scrollCycles: integer count of how many times the user has wrapped back
  //   to the top. Combined, they form a continuously-increasing virtual
  //   progress so the 3D can never snaps its rotation when the scroll wraps.
  // lap: React-state mirror of scrollCycles that drives `key` remounts so
  //   every section's entry animation (mask reveals, hero photo cinematic
  //   reveal, flavor card stagger-in, etc.) replays from frame 0 on each
  //   new lap — the user experiences a fresh "first load" every time the
  //   infinite scroll wraps back to the hero.
  const scrollProgress = useRef(0);
  const scrollCycles = useRef(0);
  const [lap, setLap] = useState(0);
  // heroState: 0/1/2 — which text panel is currently shown inside the
  // scroll-pinned hero. Driven by the hero section's localP (the same
  // bounding-rect math the bento section uses internally) so the panels
  // change in lockstep with scroll position.
  const heroSectionRef = useRef(null);
  // Ref to the hero photograph's scroll-zoom wrapper. Updated every
  // frame in the hero tick loop with `transform: scale(...)` so the
  // photo grows subtly as the user scrolls through the 300vh pinned
  // hero, then reverts at lap wrap when localP returns to 0.
  const heroBgRef = useRef(null);
  // The hero and closer both play the SAME background video. They're
  // separate <video> elements in the DOM (one stays put inside the
  // sticky hero-pin, the other lives at the bottom of the page), but a
  // periodic sync below pins their currentTime together so when the
  // infinite scroll wraps from closer → hero the user sees the exact
  // same frame on both sides of the seam.
  const heroVideoRef = useRef(null);
  const closerVideoRef = useRef(null);
  const [heroState, setHeroState] = useState(0);
  const [ctaRef, ctaInView] = useInView(0.25, lap);
  const [flavorsRef, flavorsInView] = useInView(0.15, lap);
  const [closerRef, closerInView] = useInView(0.2, lap);
  // Editorial bridge sections — C1 + C2 between flavors/closer. Each
  // gated on its own useInView so reveals re-fire on every infinite-
  // scroll lap.
  const [c1Ref, c1InView] = useInView(0.22, lap); // Press
  const [c2Ref, c2InView] = useInView(0.22, lap); // Stockists

  useEffect(() => {
    // ----- Force every page load to start at the hero -----
    // By default browsers restore the previous scroll position on
    // refresh (and hard refresh on some browsers), so a user who was
    // mid-bento would re-land mid-bento on reload — the cinematic
    // hero intro never plays. Disabling scrollRestoration tells the
    // browser to stop doing that; the immediate `scrollTo(0, 0)`
    // sweeps any pre-Lenis scroll back to the top before Lenis takes
    // over. Lenis itself initialises from scrollY=0 from that point.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      // lerp-mode for buttery-smooth, continuous easing on every input frame
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: true,        // smooth trackpad/touch as well as mouse wheel
      wheelMultiplier: 1.0,
      touchMultiplier: 1.3,
      // ----- INFINITE SCROLL -----
      // Lenis natively handles the wrap when this is on: the user's scroll
      // input flows continuously through the page boundary, so wheel/touch
      // momentum is preserved as the position loops back to 0. Visually the
      // wrap is invisible because the closer's bottom is already a masked
      // copy of the hero photograph — when scroll wraps, the user sees the
      // exact same image, then keeps scrolling into bento again.
      infinite: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const id = requestAnimationFrame(raf);

    // ----- Wrap detection (both directions) -----
    // When Lenis's infinite mode wraps the scroll position, our normalised
    // `scrollProgress` (0–1) jumps across the page boundary. The can's
    // rotation math is `pCont = p + cycles` and MUST stay continuous across
    // the wrap, otherwise the can snaps by ~1 full lap of rotation.
    //
    // Forward wrap (closer → hero): p jumps 0.99 → 0.02. We:
    //   1. scrollCycles.current++           — keeps pCont monotonically
    //                                          increasing so rotation is
    //                                          continuous across the seam.
    //   2. setLap((l) => l + 1)             — bumps a React `key` so every
    //                                          section's entry animation
    //                                          (mask reveals, photo reveal,
    //                                          card stagger-in) replays
    //                                          fresh on each new lap.
    //
    // Backward wrap (hero → closer, user scrolling UP through the seam):
    // p jumps 0.02 → 0.98. We DECREMENT scrollCycles to keep pCont
    // continuous in the opposite direction. We DO NOT bump `lap` — entry
    // animations are forward-only; replaying them while the user is
    // scrolling backwards would feel weird.
    let lastP = 0;
    const onScroll = ({ scroll, limit }) => {
      const p = limit > 0 ? scroll / limit : 0;
      const dp = p - lastP;
      if (dp < -0.5) {
        // Forward wrap — large negative delta (0.99 → 0.02 etc).
        scrollCycles.current += 1;
        setLap((l) => l + 1);
      } else if (dp > 0.5) {
        // Backward wrap — large positive delta (0.02 → 0.98 etc).
        // Decrement cycles so the can's pCont keeps stepping smoothly
        // instead of leaping forward by a full rotation.
        scrollCycles.current -= 1;
      }
      lastP = p;
      scrollProgress.current = p;
    };
    lenis.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  // ----- Hero scroll-pin state machine -----
  // Reads the hero section's bounding rect each frame, derives a localP
  // (0–1 across the hero's 300vh of scroll), and bumps `heroState` only
  // when it changes — so React doesn't re-render every frame.
  useEffect(() => {
    let raf;
    let lastState = 0;
    let lastZoom = -1;
    const tick = () => {
      const el = heroSectionRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const max = Math.max(1, r.height - vh);
        const localP = Math.max(0, Math.min(1, -r.top / max));
        // Three even-ish thirds. The first state holds slightly longer so
        // the user has time to read the opening cinematic intro.
        let next = 0;
        if (localP > 0.40) next = 1;
        if (localP > 0.72) next = 2;
        if (next !== lastState) {
          lastState = next;
          setHeroState(next);
        }

        // ----- Gradual hero photo zoom -----
        // While the pinned hero holds the viewport, the background photo
        // scales up from 1.0 at the top of the hero to ~1.11 by the time
        // bento takes over — visible enough to add real cinematic motion
        // without becoming a dramatic dolly-in. Composes with the entry
        // reveal animation (which lives on the inner .hero-bg); this
        // wrapper only handles the scroll-driven scale, so the two
        // transforms never fight each other.
        //
        // Performance notes for "smart" zoom:
        //  - `scale3d` (not plain `scale`) keeps the element on the
        //    compositor layer so resize ticks don't trigger paints.
        //  - Threshold lowered so every meaningful Lenis-driven frame
        //    pushes a fresh transform; even a sub-pixel change keeps
        //    the GPU layer flowing instead of stuttering.
        const zoom = 1 + localP * 0.11;
        if (heroBgRef.current && Math.abs(zoom - lastZoom) > 0.00015) {
          heroBgRef.current.style.transform = `scale3d(${zoom}, ${zoom}, 1)`;
          lastZoom = zoom;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ----- Hero + closer video sync -----
  // The hero's background video and the closer's background video are
  // separate <video> elements (they're not the same DOM node, so the
  // browser plays them as two independent media tracks). To make the
  // infinite-scroll wrap visually seamless, the closer's playback head
  // must always match the hero's — otherwise the user crosses the seam
  // and sees the same video jump to a different frame.
  //
  // Strategy: every 400ms, copy `heroVideo.currentTime` onto the
  // closer. We only correct when drift is > 80ms to avoid stuttering
  // the closer playback from a too-aggressive seek. Both videos use
  // autoplay/muted/loop/playsInline so iOS Safari starts them on its
  // own; the sync interval just keeps them locked together over time.
  useEffect(() => {
    const interval = setInterval(() => {
      const hero = heroVideoRef.current;
      const closer = closerVideoRef.current;
      if (!hero || !closer) return;
      if (hero.readyState < 2 || closer.readyState < 2) return;
      const drift = Math.abs(closer.currentTime - hero.currentTime);
      if (drift > 0.08) {
        closer.currentTime = hero.currentTime;
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // ----- Lap-aware delay schedule for the hero text/meta -----
  // On first page load (lap 0) we want the cinematic opening — the photo
  // sits for a beat, then "SPARKLING" masks in, then "BOOST" follows, then
  // the meta rows slide up. Long delays = the page introduces itself.
  //
  // On every subsequent lap, the user just looped back via infinite scroll
  // and is already looking at the hero photograph. The same long delays
  // would leave the bottom of the viewport blank for half a second — that's
  // exactly the "glitch" feel we're trying to eliminate. So on wrap we use
  // a near-instant schedule: the new text masks in fast, the swap happens
  // in <1s, and the user reads it as continuous scrolling with the words
  // simply changing in place.
  const isFirstLap = lap === 0;
  const heroDelays = isFirstLap
    ? { sparkling: 0.45, boost: 1.15, meta1: 1.55, meta2: 1.65, meta3: 1.75 }
    : { sparkling: 0.00, boost: 0.30, meta1: 0.50, meta2: 0.58, meta3: 0.66 };

  return (
    <div className="app">
      {/* Difference-blend follow cursor — one small dot tracking the
          OS pointer, layered above everything via z-index so it stays
          visible across the whole site. */}
      <CustomCursor />

      {/* Fixed 3D stage — stays put as the page scrolls */}
      <div className="canvas-stage">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 28 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 4, 5]} intensity={1.5} />
          <directionalLight position={[-4, -2, -3]} intensity={0.45} color="#fff0c8" />
          <Environment preset="city" />
          {/* introKey is NOT tied to `lap` — the can plays its drop-in spin
              exactly once, on initial page load. On every subsequent
              infinite-scroll wrap, the can just stays where the scroll math
              puts it, so the user reads the wrap as "the page kept scrolling
              and the can is still there." Only the text content changes. */}
          <Can
            scrollProgress={scrollProgress}
            scrollCycles={scrollCycles}
          />
        </Canvas>
      </div>

      {/* ===== Top navigation — sticky across the whole site ===== */}
      <header className="nav top-nav">
        <div className="nav__brand">
          <Line delay={0.1} display="inline-block">VIVID°</Line>
        </div>
        <div className="nav__center nav__center--stacked">
          <Line delay={0.15}>SPARKLING REFRESHMENT</Line>
          <Line delay={0.22}>MADE TO MOVE</Line>
        </div>
        <nav className="nav__links">
          {/* Ambient sound toggle — synthesizes a quiet Web Audio pad
              on first click. No file shipped, no auto-play surprise. */}
          <SoundToggle />
          <a href="#">
            <Line delay={0.3} display="inline-flex">
              Menu <span className="nav__brand-mark" />
            </Line>
          </a>
        </nav>
      </header>

      {/* ===== Section 1 · Hero (scroll-pinned, 3 text states) =====
          Section is 300vh tall. The .hero-pin sticks to the viewport top
          and holds the photo backdrop, the cycling text panel, and the
          meta footer. As the user scrolls through the section, heroState
          advances 0 → 1 → 2 and the text inside the pin swaps in fresh
          (with its own mask reveal). After state 2's scroll runs out,
          the section ends and the page continues into bento. */}
      <section ref={heroSectionRef} className="section section--hero">
        <div className="hero-pin">
          {/* hero-bg-zoom = scroll-driven scale, set inline from the
              hero tick loop. hero-bg = the photograph itself, retaining
              its entry reveal animation. Wrapping isolates the two
              transforms so they compose cleanly. */}
          <div className="hero-bg-zoom" ref={heroBgRef} aria-hidden>
            <div className="hero-bg">
              {/* Background video — autoplay/muted/playsInline required
                  for iOS Safari to start playback without user input.
                  Same src as the closer's video so a periodic sync in
                  App's useEffect keeps both playback heads aligned. */}
              <video
                ref={heroVideoRef}
                className="hero-video"
                src="/hero-bg.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
          </div>

          {/* ---- State 0 — opening "SPARKLING / BOOST" ---- */}
          {heroState === 0 && (
            <div className="hero-stage" key={`hero-stage-0-${lap}`}>
              <span className="display-stack display-stack--top">
                <MaskedWord text="Sparkling" baseDelay={heroDelays.sparkling} stagger={0.045} />
              </span>
              <span className="display-stack display-stack--bottom">
                <MaskedWord text="Boost" baseDelay={heroDelays.boost} stagger={0.055} />
              </span>
            </div>
          )}

          {/* ---- State 2 — "Real focus. / No crash." consolidated on the
                              left, the can floats to the right of the phrase.
                              No accent — red-on-red photo is illegible. ---- */}
          {heroState === 1 && (
            <div className="hero-stage hero-stage--split" key={`hero-stage-1-${lap}`}>
              <div className="hero-side hero-side--left">
                <h2 className="hero-side__big">
                  <Line delay={0.05}>Real focus.</Line>
                  <Line delay={0.20}>No crash.</Line>
                </h2>
              </div>
              {/* Right column intentionally empty — the can owns that space. */}
            </div>
          )}

          {/* ---- State 3 — "Made to move." consolidated on the left,
                              the can floats to the right of the phrase ---- */}
          {heroState === 2 && (
            <div className="hero-stage hero-stage--split" key={`hero-stage-2-${lap}`}>
              <div className="hero-side hero-side--left">
                <div className="hero-side__label">
                  <Line delay={0.05} display="inline-block">
                    <span className="hero-side__num">03</span>
                    <span className="hero-side__rule" />
                    <span>Daily Signal</span>
                  </Line>
                </div>
                <h2 className="hero-side__big">
                  <Line delay={0.18}>Made to</Line>
                  <Line delay={0.32}>move.</Line>
                </h2>
              </div>
              {/* Right column intentionally empty — the can fills the visual
                  space to the right of the text. No accent on the headline —
                  brand red on the red-tinted hero photo is barely visible. */}
            </div>
          )}

          {/* Hero meta footer removed — no bottom-left text, no scroll cue
              on the right. The hero now ends cleanly with just the photo
              and the cycling text panels, nothing pinned at the bottom. */}
        </div>
      </section>

      {/* ===== Section 2 · Bento, scroll-pinned 5 slides + expansion =====
          Keyed with `lap` so the M-cell image stack, slide index, and
          expansion progress all reset to slide 1 on each new lap. */}
      <BentoSection key={`bento-${lap}`} />

      {/* ===== Section 3 · CTA — original centred layout, two buttons ===== */}
      <section ref={ctaRef} className="section section--cta">
        <div className="cta-stage">
          {ctaInView && (
            <>
              <h2 className="display display--cta" key="cta-h">
                <Line delay={0.05}>Drink</Line>
                <Line delay={0.22}>the Signal.</Line>
              </h2>
              <p className="cta-tagline" key="cta-t">
                <Line delay={0.45} display="inline-block">
                  Citrus + Lime · Sparkling Boost · 355ml
                </Line>
              </p>
              <div className="cta-row cta-row--in" key="cta-r">
                <a className="cta" href="#">Find a stockist <span aria-hidden>→</span></a>
                <a className="cta cta--ghost" href="#">Sign up</a>
              </div>
            </>
          )}
        </div>

        <footer className="meta">
          <div className="meta__left">© 2026 VIVID Labs</div>
          <div className="meta__center">Made in South Australia</div>
          <div className="meta__right">hello@vivid.co</div>
        </footer>
      </section>

      {/* ===== Section 4 · Flavor lineup ===== */}
      <section ref={flavorsRef} className={`section section--flavors ${flavorsInView ? "is-in" : ""}`}>
        <header className="flavors-header">
          {flavorsInView && (
            <>
              <div className="flavors-eyebrow" key="fe">
                <Line delay={0.05} display="inline-block">— Pick Your Signal</Line>
              </div>
              <h2 className="flavors-title" key="ft">
                <Line delay={0.15}>Four Flavors.</Line>
                <Line delay={0.32}>One Signal.</Line>
              </h2>
            </>
          )}
        </header>

        {/* Keyed with `lap` so the stagger-in animation on each card runs
            again on every infinite-scroll wrap (CSS animations don't replay
            when their class is toggled — only when the element is remounted). */}
        <div className="flavors-grid" key={`flavors-grid-${lap}`}>
          <article className="flavor flavor--lime" style={{ animationDelay: "0.55s" }}>
            <div className="flavor__num">01</div>
            <div className="flavor__body">
              <h3 className="flavor__name">Citrus<br />+ Lime</h3>
              <p className="flavor__desc">
                Sparkling Tahitian lime over cold-brewed green coffee.
                The original daily signal.
              </p>
            </div>
            <div className="flavor__meta">80mg Caffeine · 0g Sugar</div>
          </article>

          <article className="flavor flavor--grapefruit" style={{ animationDelay: "0.65s" }}>
            <div className="flavor__num">02</div>
            <div className="flavor__body">
              <h3 className="flavor__name">Grapefruit<br />+ Rosemary</h3>
              <p className="flavor__desc">
                Pink grapefruit with a herbal lift.
                Sharp, bright, focused.
              </p>
            </div>
            <div className="flavor__meta">80mg Caffeine · 0g Sugar</div>
          </article>

          <article className="flavor flavor--berry" style={{ animationDelay: "0.75s" }}>
            <div className="flavor__num">03</div>
            <div className="flavor__body">
              <h3 className="flavor__name">Berry<br />+ Basil</h3>
              <p className="flavor__desc">
                Wild berries balanced with fresh basil.
                Bold and aromatic.
              </p>
            </div>
            <div className="flavor__meta">80mg Caffeine · 0g Sugar</div>
          </article>

          <article className="flavor flavor--peach" style={{ animationDelay: "0.85s" }}>
            <div className="flavor__num">04</div>
            <div className="flavor__body">
              <h3 className="flavor__name">Peach<br />+ Ginger</h3>
              <p className="flavor__desc">
                Stone fruit warmth with a gentle ginger kick.
                Smooth, grounded.
              </p>
            </div>
            <div className="flavor__meta">80mg Caffeine · 0g Sugar</div>
          </article>
        </div>
      </section>

      {/* ===== C1 · The Press — red brand background, three pull-quote cards ===== */}
      <section ref={c1Ref} className="section section--c1">
        <header className="c1-header">
          {c1InView && (
            <h2 className="c1-title" key="c1-h">
              <Line delay={0.05}>What people</Line>
              <Line delay={0.20}>are saying.</Line>
            </h2>
          )}
        </header>
        <div className="c1-grid" key={`c1-grid-${lap}`}>
          <article className="c1-quote" style={{ animationDelay: "0.55s" }}>
            <blockquote>"Vivid is the<br />best sparkling<br />boost I've tried."</blockquote>
            <cite>— Broadsheet · 2026</cite>
          </article>
          <article className="c1-quote" style={{ animationDelay: "0.70s" }}>
            <blockquote>"Quietly the<br />most exciting<br />drink in years."</blockquote>
            <cite>— The Design Files</cite>
          </article>
          <article className="c1-quote" style={{ animationDelay: "0.85s" }}>
            <blockquote>"Real lift,<br />no jitters,<br />no crash."</blockquote>
            <cite>— Runner's Tribune</cite>
          </article>
        </div>
      </section>

      {/* ===== C2 · The Stockists — cream, big type left, city list right ===== */}
      <section ref={c2Ref} className="section section--c2">
        <div className="c2-grid">
          <div className="c2-text">
            {c2InView && (
              <h2 className="display display--stockists" key="c2-h">
                <Line delay={0.05}>Near you.</Line>
                <Line delay={0.20} accent>Every day.</Line>
              </h2>
            )}
          </div>
          <div className="c2-cities">
            {c2InView && (
              <ul key="c2-l">
                <li><Line delay={0.55}>Adelaide</Line></li>
                <li><Line delay={0.65}>Melbourne</Line></li>
                <li><Line delay={0.75}>Sydney</Line></li>
                <li><Line delay={0.85}>Brisbane</Line></li>
                <li><Line delay={0.95}>Perth</Line></li>
              </ul>
            )}
          </div>
        </div>
        <footer className="c2-footer">
          {c2InView && (
            <Line delay={1.15} display="inline-block">
              <a className="cta cta--ink" href="#">Find a stockist <span aria-hidden>→</span></a>
            </Line>
          )}
        </footer>
      </section>

      {/* ===== Section 5 · Closer — gradient + film grain + return-to-hero typography ===== */}
      <section ref={closerRef} className="section section--closer">
        {/* Background video — paired with the hero video via a sync
            useEffect in App so both playback heads match. When the
            infinite scroll wraps from the bottom of this section back
            to the top of the hero, the two videos are on the same
            frame, so the seam crossing reads as one continuous shot. */}
        <video
          ref={closerVideoRef}
          className="closer-video"
          src="/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        {/* SVG film grain overlay — feTurbulence noise tinted dark, blended
            on top via mix-blend-mode for an analog, gritty texture without
            shipping a noise image. */}
        <svg className="closer-grain" aria-hidden>
          <filter id="closerNoise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.55 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#closerNoise)" />
        </svg>

        {/* Soft glow that completes the visual loop back to the hero —
            warm red wash bleeding upward from the bottom edge. */}
        <div className="closer-glow" aria-hidden />

        {/* Hero photograph emerging from the bottom of the closer — masked so
            it fades up out of the gradient. This is what makes the bottom of
            this section LOOK like the top of the hero, completing the loop
            visually even though the scroll is one-way. */}
        <div className="closer-heroback" aria-hidden />

        <div className="closer-stage">
          {closerInView && (
            <>
              <span className="display-stack display-stack--top" key="ct-top">
                <MaskedWord text="Drink" baseDelay={0.35} stagger={0.045} />
              </span>
              <span className="display-stack display-stack--bottom" key="ct-bot">
                <MaskedWord text="Signal" baseDelay={0.95} stagger={0.055} />
              </span>
            </>
          )}
        </div>

        <footer className="meta closer-meta">
          {closerInView && (
            <>
              <div className="meta__left">
                <Line delay={1.45}>© 2026 VIVID Labs · Made in South Australia</Line>
                <Line delay={1.55}>hello@vivid.co · @drinkvivid</Line>
              </div>
              <div className="meta__center" aria-hidden />
              <div className="meta__right">
                <Line delay={1.65} display="inline-block">
                  Citrus + Lime · Sparkling Boost
                </Line>
              </div>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
