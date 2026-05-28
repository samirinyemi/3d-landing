import { useEffect, useMemo, useRef, useState } from "react";

/* ===================================================================
   useInView — IntersectionObserver hook that flips `inView` to true
   the first time the target element crosses the threshold.
   - Stays true once tripped (we don't undo a reveal mid-scroll).
   - `resetKey` (e.g. the current lap number for infinite scroll) forces
     the hook to start over from `false` whenever it changes, so reveal
     animations re-fire on every new lap as if the page just loaded.
   =================================================================== */

export function useInView(threshold = 0.2, resetKey = 0) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  // Reset whenever the resetKey changes (typically: scroll wrap / new lap).
  // The observer effect below will re-run because resetKey is in its deps,
  // re-attach a fresh observer, and re-fire `setInView(true)` once the
  // element is actually intersecting again.
  useEffect(() => {
    setInView(false);
  }, [resetKey]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, resetKey]);

  return [ref, inView];
}

/* ===================================================================
   Reveal primitives
   ===================================================================
   <Line>       — single-line mask reveal (slides up from below)
   <MaskedWord> — per-letter mask reveal with randomised order so the
                  letters appear in a non-sequential pattern, while still
                  finishing within a tight overall window.
   =================================================================== */

export function Line({
  children,
  delay = 0,
  accent = false,
  display = "block",
}) {
  return (
    <span className="reveal" style={{ display, overflow: "hidden" }}>
      <span
        className={"reveal__inner" + (accent ? " reveal__inner--accent" : "")}
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </span>
    </span>
  );
}

export function MaskedWord({ text, baseDelay = 0, stagger = 0.045 }) {
  // Build delays = [0, stagger, 2*stagger, ...] then shuffle so the letters
  // don't appear left-to-right. Memoised on text/stagger so order is stable
  // for the life of this word.
  const delays = useMemo(() => {
    const arr = Array.from({ length: text.length }, (_, i) => i * stagger);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [text, stagger]);

  return (
    <span className="masked-word" aria-label={text}>
      {text.split("").map((char, i) => (
        <span className="letter-reveal" key={i} aria-hidden="true">
          <span
            className="letter-reveal__inner"
            style={{ animationDelay: `${baseDelay + delays[i]}s` }}
          >
            {char === " " ? " " : char}
          </span>
        </span>
      ))}
    </span>
  );
}
