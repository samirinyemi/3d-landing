import { useEffect, useRef, useState } from "react";

/* ===================================================================
   SoundToggle — v4 (restored): real audio file + synth click.

   The ambient bed is an MP3 (public/ambient.mp3) — "ES 253965 Random
   Lands" — loaded into an AudioBuffer at component mount, played
   through a looping AudioBufferSourceNode on first click.

   Click blips stay synthesized — a Web Audio triangle pluck — so they
   fire without a per-click roundtrip.

   Volume policy: subtle. Master 0.32 × ambient bus 0.20 = ~0.064
   nominal — quiet enough to sit under everything visual.

   Mute behaviour: master gain fades to 0 over 0.5s, then the
   AudioContext is `suspend()`-ed. Suspending halts all DSP, so no
   buffer source or filter tail can leak through after fade-out.
   =================================================================== */

const AMBIENT_URL = "/ambient.mp3";

const MASTER_GAIN = 0.32;
const AMBIENT_GAIN = 0.20;
const FADE_IN_S = 1.8;
const FADE_OUT_S = 0.5;

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const ambientBusRef = useRef(null);
  const ambientSourceRef = useRef(null);
  const ambientBufferRef = useRef(null);
  const playClickRef = useRef(null);
  const suspendTimerRef = useRef(null);
  const decodedRef = useRef(null);

  // Prefetch the MP3 bytes so the first toggle click decodes without
  // paying a network roundtrip.
  useEffect(() => {
    let cancelled = false;
    fetch(AMBIENT_URL)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (!cancelled) decodedRef.current = buf;
      })
      .catch(() => {
        /* network or 404 — toggle still works, just no ambient bed */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildGraph = (ctx) => {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const ambientBus = ctx.createGain();
    ambientBus.gain.value = AMBIENT_GAIN;
    ambientBus.connect(master);

    const clickBus = ctx.createGain();
    clickBus.gain.value = 1.0;
    clickBus.connect(master);

    const playClick = () => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(500, t);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.1);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2200;

      o.connect(lp);
      lp.connect(g);
      g.connect(clickBus);
      o.start(t);
      o.stop(t + 0.2);
    };

    return { master, ambientBus, playClick };
  };

  const startAmbient = async (ctx, ambientBus) => {
    if (!decodedRef.current && !ambientBufferRef.current) return;
    if (!ambientBufferRef.current) {
      const arr = decodedRef.current;
      ambientBufferRef.current = await ctx.decodeAudioData(arr.slice(0));
      decodedRef.current = null;
    }
    if (ambientSourceRef.current) {
      try {
        ambientSourceRef.current.stop();
      } catch {
        /* already stopped */
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = ambientBufferRef.current;
    src.loop = true;
    src.connect(ambientBus);
    src.start();
    ambientSourceRef.current = src;
  };

  const handleToggle = async () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ctxRef.current = new Ctx();
      const { master, ambientBus, playClick } = buildGraph(ctxRef.current);
      masterRef.current = master;
      ambientBusRef.current = ambientBus;
      playClickRef.current = playClick;
    }
    const ctx = ctxRef.current;
    const master = masterRef.current;

    if (suspendTimerRef.current) {
      clearTimeout(suspendTimerRef.current);
      suspendTimerRef.current = null;
    }

    if (!enabled) {
      if (ctx.state === "suspended") await ctx.resume();
      await startAmbient(ctx, ambientBusRef.current);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(MASTER_GAIN, now + FADE_IN_S);
      setEnabled(true);
    } else {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + FADE_OUT_S);
      suspendTimerRef.current = setTimeout(() => {
        master.gain.setValueAtTime(0, ctx.currentTime);
        ctx.suspend();
        suspendTimerRef.current = null;
      }, FADE_OUT_S * 1000 + 50);
      setEnabled(false);
    }
  };

  // Click blip on any page click — only fires when enabled.
  useEffect(() => {
    if (!enabled) return;
    const onDocClick = (e) => {
      if (e.target && e.target.closest && e.target.closest(".sound-toggle")) {
        return;
      }
      if (playClickRef.current) playClickRef.current();
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [enabled]);

  // Close the context on unmount (catches React StrictMode + HMR).
  useEffect(() => {
    return () => {
      if (suspendTimerRef.current) clearTimeout(suspendTimerRef.current);
      if (ctxRef.current) {
        try {
          ctxRef.current.close();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return (
    <button
      type="button"
      className={`sound-toggle ${enabled ? "is-on" : ""}`}
      onClick={handleToggle}
      aria-label={enabled ? "Mute ambient sound" : "Play ambient sound"}
      aria-pressed={enabled}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M3 9.5v5h3.6L11 19V5L6.6 9.5H3z"
          fill="currentColor"
        />
        {enabled ? (
          <>
            <path
              d="M14.5 8.5c1.4 1 2.2 2.2 2.2 3.5s-.8 2.5-2.2 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M17 6c2.3 1.6 3.7 3.6 3.7 6s-1.4 4.4-3.7 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.6"
            />
          </>
        ) : (
          <path
            d="M15 9l5 6m0-6l-5 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
