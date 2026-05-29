import { useEffect, useRef } from "react";

/* ===================================================================
   CustomCursor — small black dot that follows the OS pointer with a
   `mix-blend-mode: difference` blend, so on a dark surface it reads
   white and on a light surface it reads black. The result is one
   element that's always visible regardless of background.

   The native pointer is left alone (no `cursor: none` anywhere) so
   clicks, text selection, and accessibility cues still work normally.

   A tiny lerp (~0.28 per frame) gives the dot a slight trailing feel
   without making it feel sluggish. On touch / coarse-pointer devices
   the dot is hidden via CSS — there's no precise pointer to follow.
   =================================================================== */

const SIZE = 14;         // px diameter
const HALF = SIZE / 2;
const LERP = 0.28;       // 0 = instant, 1 = frozen — keep low for snappy follow

export default function CustomCursor() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let targetX = -100;
    let targetY = -100;
    let currX = -100;
    let currY = -100;
    let raf;

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    // First seed the position to wherever the OS pointer currently is
    // (Pointer Events spec doesn't expose a getter, so the dot stays
    // off-screen until the user moves the mouse — which is fine.)
    const tick = () => {
      currX += (targetX - currX) * LERP;
      currY += (targetY - currY) * LERP;
      el.style.transform =
        `translate3d(${currX - HALF}px, ${currY - HALF}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="custom-cursor" aria-hidden="true" />;
}
