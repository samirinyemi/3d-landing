# VIVID° — Brand & Design Guidelines

> This document is the source of truth for designing any new section of the
> VIVID landing site. Read it before you build. Reference the tokens, copy the
> layout patterns, reuse the motion vocabulary. Every new section should feel
> like a continuation of the rest of the site, not a one-off.

---

## 1. Brand essence

VIVID° is **sparkling refreshment, made to move.** Citrus + lime. Real energy.
No noise.

The site reads as an **editorial sports/lifestyle magazine** — think ZYN,
Airborne, *Furious Collection*, *Ssense* product stories. Generous black-and-
cream typography, saturated brand red, oversized photography, mask reveals,
buttery smooth scroll. Loud where it matters; quiet everywhere else.

Three rules govern every decision:

1. **Photography does the talking.** Type frames it.
2. **Motion is fluid, never bouncy.** Mask reveals + lerp scroll + slow rotations.
3. **The red is sacred.** Use it on hero, accents, and the brand can — nowhere
   else as a base background unless intentional.

---

## 2. Color tokens

Defined in `src/index.css` as CSS variables. **Always reference the variables,
never hardcode the hex values in new components.**

| Token | Value | Usage |
|---|---|---|
| `--red` | `#E5331F` | Hero background, brand accent, CTA highlight, can label fills, flavor accent. The brand pulse. |
| `--ink` | `#0a0a0a` | Primary text on light surfaces, dark section backgrounds (bento pin, flavor grid), button fills, all-caps display type on cream. |
| `--paper` | `#f4ede0` | Primary text on dark/red surfaces, cream section backgrounds (CTA), can label base. Warm off-white — **never use pure white.** |
| `--muted-ink` | `rgba(10,10,10,0.62)` | Subdued copy on cream (taglines, captions). |
| `--muted-paper` | `rgba(244,237,224,0.6)` | Subdued copy on dark/red (footer meta, eyebrows). |

### Supporting flavor palette
Only used on the **flavor cards** (Section 4). Do not introduce these
elsewhere.

| Flavor | Color |
|---|---|
| Lime | `#c4ff3d` (acid green) |
| Grapefruit | `#ff7aa3` (rose) |
| Berry | `var(--red)` |
| Peach | `#ffc83d` (warm amber) |

### Gradients

- **Closer/footer wash** — dark ink at top, lands on `--red` at bottom. Used
  exactly once, in the closer section, to loop back visually to the hero.
- **Hero photo overlay** — `rgba(10,10,10, 0.08 → 0 → 0.45)` vertical, sat
  over `/hero-bg.png` to keep type legible.

---

## 3. Typography

Four families, each with one job. Defined in `src/index.css`.

| Variable | Family | Role |
|---|---|---|
| `--display` | **Anton** | All giant headlines (hero, bento titles, CTA, closer, flavors title, post-expansion tagline). Condensed, tall, 400 weight only. |
| `--sans` | **Hanken Grotesk** | All body copy, eyebrows, nav, meta, captions. Weights 300–700, default 500. |
| — | **Bowlby One** | Used **only on the 3D can label** (drawn in canvas). Never in HTML. |
| — | **Caveat** | Used **only on the 3D can label** (cursive "citrus + lime"). Never in HTML. |

### Type scale (fluid)

All giant type uses `clamp()` so it scales from mobile to wide desktop without
breakpoints. Always set `text-transform: uppercase` on display type.

| Style | Size (clamp) | Line-height | Letter-spacing | Tracking notes |
|---|---|---|---|---|
| **Hero display-stack** (`SPARKLING / BOOST`, `DRINK / SIGNAL`) | `clamp(110px, 22vw, 440px)` | `0.95` | `-0.018em` | Two stacked words, anchored to bottom of viewport, `margin-bottom: -0.15em` on the lower word so it kisses the foot. |
| **Bento title** (left-top cell, per slide) | `clamp(48px, 6.5vw, 124px)` | `0.88` | `-0.018em` | Multi-line, `pre-line` whitespace, accent line in `--red`. |
| **Post-expansion tagline** (`Drink the Signal. / Made to Move.`) | `clamp(56px, 9vw, 180px)` | `0.92` | `-0.02em` | White over photograph, soft drop-shadow. |
| **CTA display** (`DRINK / THE SIGNAL.`) | `clamp(72px, 11vw, 220px)` | `1.1` | `-0.018em` | Cream section, ink type. Note the **larger** line-height here vs hero — gives the words air on a single-color background. |
| **Flavors title** (`FOUR FLAVORS. / ONE SIGNAL.`) | `clamp(48px, 7vw, 140px)` | `0.88` | `-0.015em` | Right-aligned on desktop, left on mobile. |
| **Flavor card name** (per card) | `clamp(36px, 3.6vw, 68px)` | `0.9` | `-0.012em` | Two-line via `<br/>`. |
| **About display** (`display--about`) | `clamp(80px, 13vw, 220px)` | `0.82` | `-0.01em` | Used in dark bento intro panel. |

### Body & UI type

| Style | Size | Weight | Letter-spacing | Casing |
|---|---|---|---|---|
| Bento body (right-top per slide) | `clamp(13px, 1vw, 16px)` | 500 | normal | Sentence |
| Eyebrow (small label above headline) | `11px` | 600 | `0.18em` | UPPERCASE |
| Nav text | `12px` | 500 | `0.08em` | UPPERCASE |
| Nav brand | `13px` | 700 | `0.14em` | UPPERCASE |
| Stacked center nav | `12px` | 500 | `0.14em` | UPPERCASE |
| Meta row | `12px` | 500 | `0.06em` | UPPERCASE |
| Scroll cue label | `11px` | 600 | `0.14em` | UPPERCASE |
| Mini-spec `dt` (caffeine/sugar/volume) | `10px` | 600 | `0.14em` | UPPERCASE |
| Mini-spec `dd` value | `clamp(20px, 2.2vw, 32px)` | 400 (Anton) | `0` | UPPERCASE |
| Flavor card description | `13px` | 500 | normal | Sentence |
| Flavor card meta (footer) | `11px` | 600 | `0.12em` | UPPERCASE |
| Flavor card number (`01`–`04`) | `12px` | 700 | `0.12em` | Monospace UPPERCASE |
| CTA pill | `12px` | 700 | `0.12em` | UPPERCASE |

### Tracking rules

- Display Anton type: **negative** letter-spacing, between `-0.005em` and
  `-0.020em`. Bigger type, tighter tracking.
- Small uppercase Hanken type: **positive** letter-spacing, between `0.06em`
  and `0.18em`. The smaller, the more.
- Sentence-case body: leave tracking at `0`.

---

## 4. Spacing system

There is **no fixed 8pt grid**. Spacing is contextual but consistent:

| Token | Value | Where |
|---|---|---|
| Section padding (desktop) | `28px 40px 36px` | All full-bleed sections |
| Section padding (mobile) | `24px 20px 28px` | Mobile equivalent |
| Section vertical gap | `24px` | Default flex `gap` between nav / stage / meta |
| Internal text cell padding (bento) | `clamp(20px, 2.4vw, 40px)` | LT and RT bento cells |
| Bento grid gutter | `4px` | The thin black stripes between cells — never wider |
| Flavor grid gutter | `4px` | Same as bento |
| Card internal padding (flavor) | `24px 22px 28px` | Top-heavy, slightly more bottom |
| Stack body gap (rt-content) | `16px` | Vertical gap inside RT cell |
| Mini-spec gap | `clamp(20px, 2.4vw, 40px)` | Between dt/dd groups |

Rule of thumb: when in doubt, **use 24px** for section-level rhythm and
**16px** for component-internal rhythm.

---

## 5. Section heights & layout

The page is composed of full-viewport editorial sections stacked vertically.
Total page height ≈ 1375vh because both the hero and the bento are
scroll-pinned. Two editorial bridge sections (C1, C2) sit between Flavors
and Closer.

| Section | `min-height` / behaviour | Role |
|---|---|---|
| **Hero (pinned)** | `300vh` total, visually `100vh` sticky | Background photograph pins to viewport top. Three text panels cycle through it as the user scrolls: state 0 SPARKLING/BOOST (stacked bottom-anchored), state 1 "Real focus. Real lift. No crash." (centred lines), state 2 "Made to move." (centred lines). After state 2's scroll runs out, the page continues into bento. |
| Bento (pinned) | `600vh` total, visually `100vh` sticky | 5 slides + final expansion |
| CTA | `100vh` | Red brand bg, centred "DRINK THE SIGNAL." + tagline + two CTA buttons |
| Flavors | `75vh` min | Compact 4-card strip (lime/grapefruit/berry/peach) |
| **C1 — Press** | `100vh` | Red brand bg + 4px ink border-top, 3 pull-quote cards in a row. |
| **C2 — Stockists** | `100vh` | Cream split: headline left, city list right, CTA pill in footer. |
| Closer | `100vh` | Hero photo background, "DRINK / SIGNAL", loops back to hero |

The two scroll-pinned sections (Hero + Bento) are the only places the site
uses sticky pinning — both are story devices where content cycles through
a fixed visual frame. Don't add a third without a strong narrative reason
(too many pinned sections make the page feel "stuck" to scroll input).

Palette rhythm — backgrounds alternate punchy / quiet across the page so no
two adjacent sections share the same base colour:

```
HERO(red) → BENTO(ink) → CTA(red) → FLAVORS(ink+colors) →
C1(red) → C2(cream) → CLOSER(photo)
```

### Section anatomy (the default skeleton)

Every "normal" section uses this 3-row vertical layout:

```
┌─ nav (top-nav is global + fixed, not part of section) ─┐
│                                                         │
│                  STAGE (flex: 1, centered)              │
│                                                         │
├─ meta row (3-column grid: left | center | right) ──────┤
```

`display: flex; flex-direction: column; justify-content: space-between;
padding: 28px 40px 36px; gap: 24px;`

Sections with photography (hero, closer) layer a `position: absolute;
inset: 0; z-index: 0` background div underneath, and lift their content with
`position: relative; z-index: 1+`.

---

## 6. Grid systems

### 3-column bento (Section 2)
```
grid-template-columns: 1fr 1.45fr 1fr   ← center is wider
grid-template-rows:    1fr 1fr
gap:                   4px
```
- LT (title) and LB (static image) in column 1
- M cell spans both rows in column 2 (the image stack + expansion)
- RT (body copy) and RB (static image) in column 3
- Mobile collapses to a single column, 5 rows

### 4-column flavor strip (Section 4)
```
grid-template-columns: repeat(4, 1fr)
gap:                   4px
```
- One card per flavor
- Each card is `min-height: 42vh`
- Mobile collapses to single column

### 3-column nav & meta
```
grid-template-columns: 1fr auto 1fr   ← nav
grid-template-columns: 1fr 1fr 1fr    ← meta
```

---

## 7. Components

### Top nav (global, sticky)
- `position: fixed; top: 0; z-index: 100;`
- `mix-blend-mode: difference; color: #ffffff;`
- Auto-inverts over any background — never style its color per section
- `pointer-events: none` on container, `pointer-events: auto` on links
- Padding `22px 40px` desktop, `14px 18px` mobile

### Meta row (footer of each section)
- 3-column grid: `meta__left | meta__center | meta__right`
- Tiny uppercase Hanken type
- Use `meta__divider` (a `::before/::after` pseudo with 24px rule) for inline em-dashes when needed

### CTA pill
```
.cta { padding: 13px 22px; border-radius: 999px;
       background: var(--ink); color: var(--paper);
       font: 700 12px/1 var(--sans); letter-spacing: 0.12em; }
.cta:hover { transform: translateY(-1px); }
```
- `.cta--ghost` variant: transparent background, 1px solid ink border, ink text
- On dark sections, invert: paper bg, ink text

### Scroll cue (hero bottom-right)
- 32px SVG icon (custom)
- 1px vertical rule, 28px tall, `opacity: 0.6`
- Tiny uppercase label below
- Stacked vertically with 10px gap

### Eyebrow (small label above headline)
- `font-size: 11px; letter-spacing: 0.18em; font-weight: 600; text-transform: uppercase;`
- Usually prefixed with an em-dash: `— Pick Your Signal`

### Mini-spec strip (Caffeine / Sugar / Volume)
- 3 `dt/dd` groups in a row, gap `clamp(20px, 2.4vw, 40px)`
- 1px ink top border
- Numbers in Anton, labels in Hanken uppercase

---

## 8. Motion language

### Scroll
- **Always Lenis** with `lerp: 0.08`, `smoothWheel: true`, `syncTouch: true`.
- Never use native scroll-snap. Never use scroll-jank libraries that fight
  Lenis.
- Page-wide `scrollProgress` (0 → 1) is stored in a `useRef` and shared via a
  Lenis `'scroll'` event listener. Consumers (the 3D can, bento) read
  `scrollProgress.current` inside their own RAF loops — they do NOT subscribe
  to React state for scroll.

### Reveal animations (the house style)

**Line mask reveal** (`<Line>` in `src/Reveal.jsx`):
- Wraps a single line in `overflow: hidden`
- Inner element starts at `translateY(110%)`, animates to `translateY(0%)`
- Duration: `0.85s`
- Easing: `cubic-bezier(0.62, 0, 0.18, 1)` — slow-out, hard-in
- Accept a `delay` prop in seconds; stagger lines 0.08–0.15s apart

**Per-letter mask reveal** (`<MaskedWord>`):
- Same mask trick but per character
- `baseDelay` + `stagger` props; stagger 0.045–0.055s
- Used for the giant hero/closer single words

**Mandatory clip-expansion padding**
The mask containers (`.reveal`, `.letter-reveal`) must have:
```
padding-top: 0.16em; padding-bottom: 0.18em;
margin-top: -0.16em; margin-bottom: -0.18em;
```
This prevents the tops of capital letters and descenders from being clipped by
the overflow mask. If you write a new reveal component, copy this trick.

### Image reveals
- Hero background — `heroBgReveal 1.5s cubic-bezier(0.22, 1, 0.36, 1) both`
  — single continuous interpolation of opacity + filter + transform. No
  intermediate keyframe (causes visible pause).
- M-cell image stack — incoming image slides up `translateY(100% → 0)` over
  `0.5s` with `cubic-bezier(0.22, 1, 0.36, 1)`. Outgoing image stays planted
  at `translateY(0)` underneath (z-index: 1 vs 2) so the cell can never flash
  empty.

### Card stagger-in (IntersectionObserver-driven)
- Cards start at `opacity: 0; transform: translateY(60px)`
- Add `.is-in` class via `useInView` hook when the section enters viewport
- Animate `flavorCardIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards`
- Stagger via inline `animation-delay: 0.55s + i*0.10s`

### CTA button entry
- Opacity 0 → 1, `translateY(20px → 0)`, `0.7s`,
  `cubic-bezier(0.22, 1, 0.36, 1)`
- Buttons in a row stagger 0.13s apart (0.65s, 0.78s)

### 3D can motion
- Lerped rotation toward scroll-driven targets: `1 - Math.pow(0.001, delta)`
  (frame-rate-independent)
- Intro: drops from y=-3.4 with 2 spin turns over `1.8s`, ease-out cubic
- Scroll-driven y rotation: `progress * Math.PI * 2.5`
- Wobble: sin/cos of progress on x and z axes
- Flip: `smoothstep(0.42, 0.66, p) * 2π` on the x axis during the bento slide
  cycle
- Hide windows (smoothstep ramps in-and-out) during bento expansion + flavors
  strip, with the can returning for CTA and closer

### Easing cheat sheet

| Where | Curve |
|---|---|
| Mask reveals (text) | `cubic-bezier(0.62, 0, 0.18, 1)` |
| Image / card / hero / CTA reveals | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Hover micro-interactions | `ease` |
| 3D can lerp | exponential decay, **never** a cubic-bezier |

---

## 9. Imagery treatment

### Hero photo
- Full-bleed background, `center / cover`
- Subtle vertical gradient overlay for type legibility:
  `rgba(10,10,10, 0.08) → 0 (22% → 70%) → 0.45 (100%)`
- Cinematic reveal on load (blur + scale + brightness + saturate, all in one
  curve)

### Bento M-cell images
- Slide-up cross-fade between images on slide change
- During expansion, the cell breaks out of the grid and interpolates
  `top/left/width/height` from grid rect → viewport (FLIP-style)
- Internal `scale(1 + expand * 0.1)` dolly-in on the image stack

### Section-bridging photo (closer-heroback)
- The hero image returns in the closer, masked with a vertical gradient so it
  fades from transparent at top to fully opaque at the bottom
- A warm crimson wash (`rgba(229,51,31, 0.45 → 0.05)`) sits over it to keep
  the tone consistent with the gradient backdrop
- This is how the page **visually loops back to the hero** — the bottom of the
  closer IS the top of the hero

### Film grain
- SVG `<filter><feTurbulence baseFrequency="0.9" numOctaves="2"
  stitchTiles="stitch"/></filter>` followed by a `feColorMatrix` to tint dark
- Apply via `<rect width="100%" height="100%" filter="url(#noise)"/>`
- `mix-blend-mode: overlay; opacity: 0.42;`
- Use ONLY on the closer section currently; can extend to future hero or
  cinematic sections if it serves the same warm/grainy mood

---

## 10. The 3D Can

Built in `src/Can.jsx` with React Three Fiber. Specs:

| Property | Value |
|---|---|
| Body | `cylinderGeometry(0.55, 0.55, 2.2, 96)` |
| Top cap | Custom LatheGeometry — shoulder, neck, rolled rim, recessed lid |
| Bottom cap | Custom LatheGeometry — concave dome with foot ring |
| Pull tab | ExtrudeGeometry with a ring hole |
| Rivet | Tiny cylinder + half-sphere |
| Label texture | `/can-label.png`, `colorSpace: SRGB`, `anisotropy: 16`, `wrapS: RepeatWrapping`, `offset.x: 0.5` (so label centre faces +Z at scroll 0) |
| Body material | `metalness: 0.05, roughness: 0.72` |
| Aluminum (cap/tab) | `metalness: 0.92, roughness: 0.28` |
| Camera | `position: [0, 0, 8]; fov: 28` |
| Lighting | Ambient `0.55` + warm key + cool fill + `<Environment preset="city" />` |
| Base scale | `0.7` |

**Do not change the geometry or material values without updating this doc.**
The can is the brand mascot — visual consistency matters.

---

## 11. Z-index layering

Stable across the whole site. Numbers exist for a reason — don't invent new
ones.

| Layer | z-index |
|---|---|
| Section background images, gradients | `0` |
| Section content (nav, stage, meta) | `1` |
| Bento M-cell during expansion | `50` |
| Sticky 3D canvas | `80` |
| Global top nav | `100` |
| Bento M-cell `m-text` overlay | `30` |
| Bento M-cell normal | `5` |

---

## 12. Cheat-sheet — building a new section

When the user asks for "another section" or "a new screen," default to this
recipe:

```jsx
<section ref={mySectionRef} className="section section--mine">
  {/* Optional background layer (gradient, photo, or solid) */}
  <div className="mine-bg" aria-hidden />

  {/* Optional accent layers: grain overlay, glow, etc. (z-index 0–1) */}

  <div className="mine-stage">
    {inView && (
      <h2 className="display display--mine">
        <Line delay={0.05}>First line</Line>
        <Line delay={0.22}>Second line</Line>
      </h2>
    )}
  </div>

  <footer className="meta">
    <div className="meta__left">© 2026 VIVID Labs</div>
    <div className="meta__center">Made in South Australia</div>
    <div className="meta__right">hello@vivid.co</div>
  </footer>
</section>
```

Decisions checklist:

- [ ] Background colour from the token palette (`--red`, `--ink`, `--paper`)?
- [ ] Uses Anton for any display type, Hanken for body/UI?
- [ ] Reveals wrapped in `<Line>` / `<MaskedWord>` with stagger?
- [ ] Conditional rendering gated on `useInView` for re-trigger?
- [ ] Section padding `28px 40px 36px` (or mobile `24px 20px 28px`)?
- [ ] If section is `100vh`, content uses `flex-direction: column;
      justify-content: space-between`?
- [ ] No bouncy easings, no opacity-only fades, no native scroll-snap?
- [ ] If photography is involved: vertical gradient overlay for legibility?
- [ ] If the 3D can should be visible in this section, update the `hide`
      smoothstep ramps in `Can.jsx`?

If the answer to any of the above is "no" without a written reason in the JSX
comments, the section is off-brand. Fix it before shipping.

---

## 13. What VIVID is NOT

- **No purple/neon gradients.** No synthwave.
- **No glassmorphism, no heavy blur backdrops on UI.** mix-blend-mode is the
  only "tricky" UI effect we use, and only on the top nav.
- **No drop shadows on cards.** Sharp edges, hard color blocks.
- **No rounded card corners** (except the CTA pill — that's the only radius
  on the site).
- **No emojis, no system icons.** All icons are custom SVG.
- **No light grey neutrals.** Cool greys do not exist in this palette — only
  warm cream (`--paper`) and warm dark (`--ink`).
- **No animation libraries (GSAP, framer-motion).** Everything is CSS keyframes
  + Lenis + raw R3F `useFrame`.

---

*Last updated: 2026-05-27. When you change a token, animation duration, or add
a new pattern, update this file in the same commit.*
