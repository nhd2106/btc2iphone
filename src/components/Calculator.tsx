"use client";

import { animate, stagger, utils } from "animejs";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { fmtCount } from "@/lib/format";
import { sfx } from "@/lib/sound";

const MAX_ICONS = 48;

const PRESETS = [
  { label: "0.01 · lunch money", value: 0.01, sound: sfx.pop },
  { label: "1 · a whole coin", value: 1, sound: sfx.coin },
  { label: "Satoshi mode (~1.1M)", value: 1_100_000, sound: sfx.jackpot, hot: true },
];

function verdict(n: number) {
  if (n === 0) return "Zero iPhones. Try a flip phone and optimism.";
  if (n < 1) return "You can afford the box. Maybe the sticker inside it.";
  if (n < 5) return "One for you, one for your mom. Wholesome.";
  if (n < 50) return "Enough for the whole family group chat.";
  if (n < 1000) return "You are the Apple Store now.";
  return "Tim Cook is calling. He wants a loan.";
}

function spill(box: HTMLElement | null, layer: HTMLElement | null, delta: number) {
  if (!box || !layer || delta <= 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const small = window.innerWidth < 700;
  const n = Math.min(small ? 28 : 64, Math.max(2, Math.round(Math.log2(delta + 1) * (small ? 3 : 4.5))));
  const r = box.getBoundingClientRect();

  // The box rattles...
  animate(box, {
    translateX: [{ to: -10 }, { to: 9 }, { to: -6 }, { to: 4 }, { to: 0 }],
    rotate: [{ to: -1.2 }, { to: 1 }, { to: -0.5 }, { to: 0 }],
    duration: 380,
    ease: "inOutSine",
  });
  // ...then they pop out and rain off the screen
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    el.className = "fly-phone";
    const size = utils.random(0.8, 1.5, 2);
    el.style.left = r.left + utils.random(0.05, 0.95, 3) * r.width + "px";
    el.style.top = r.top + utils.random(0.1, 0.6, 3) * r.height + "px";
    el.style.width = 34 * size + "px";
    el.style.height = 60 * size + "px";
    layer.appendChild(el);
    const d = utils.random(1100, 1900);
    const top = parseFloat(el.style.top);
    animate(el, {
      translateX: { to: utils.random(-1, 1, 3) * (small ? 220 : 620), duration: d, ease: "linear" },
      translateY: [
        { to: -utils.random(small ? 120 : 180, small ? 300 : 460), duration: d * 0.38, ease: "outQuad" },
        { to: window.innerHeight - top + 140, duration: d * 0.62, ease: "inQuad" },
      ],
      rotate: { to: utils.random(-900, 900), duration: d, ease: "linear" },
      scale: [
        { from: 0, to: 1.3, duration: 180, ease: "outBack(3)" },
        { to: 1, duration: 220 },
      ],
      delay: i * utils.random(8, 28),
      onComplete: () => el.remove(),
    });
  }
  sfx.popcorn(Math.min(n, 16), Math.min(1.2, 0.3 + n * 0.02));
  if (delta > 50) sfx.boing();
}

export default function Calculator({ price, iphonePrice }: { price: number; iphonePrice: number }) {
  const [stack, setStack] = useState(0.25);
  const count = (stack * price) / iphonePrice;
  const shown = count >= 1 ? Math.min(MAX_ICONS, Math.floor(count)) : 0;

  const countEl = useRef<HTMLSpanElement>(null);
  const tweened = useRef({ v: count });
  const grid = useRef<HTMLDivElement>(null);
  const prevShown = useRef(0);
  const layer = useRef<HTMLDivElement>(null);
  const escapedEl = useRef<HTMLSpanElement>(null);
  const escaped = useRef({ v: 0 });
  const prevOverflow = useRef(0);
  const pending = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overflow = Math.max(0, Math.floor(count - MAX_ICONS));

  // Roll the big number (GSAP)
  useEffect(() => {
    const t = gsap.to(tweened.current, {
      v: count,
      duration: 0.6,
      ease: "power3.out",
      onUpdate: () => {
        if (countEl.current) countEl.current.textContent = fmtCount(tweened.current.v);
      },
    });
    return () => {
      t.kill();
    };
  }, [count]);

  // Pop in only the newly added phones (anime.js)
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    if (shown > prevShown.current) {
      const fresh = Array.from(el.querySelectorAll<HTMLElement>(".phone-icon")).slice(prevShown.current);
      animate(fresh, {
        scale: { from: 0, to: 1 },
        rotate: { from: -25, to: 0 },
        opacity: { from: 0, to: 1 },
        duration: 450,
        delay: stagger(20),
        ease: "outBack(2)",
      });
    }
    prevShown.current = shown;
  }, [shown]);

  // Once the box is full, extra phones pop out like popcorn and rain off
  // the screen (anime.js). Slider drags are batched so it stays smooth.
  useEffect(() => {
    gsap.to(escaped.current, {
      v: overflow,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        if (escapedEl.current) escapedEl.current.textContent = Math.floor(escaped.current.v).toLocaleString("en-US");
      },
    });
    const prev = prevOverflow.current;
    prevOverflow.current = overflow;
    if (overflow <= prev) return;
    pending.current += overflow - prev;
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      const delta = pending.current;
      pending.current = 0;
      spill(grid.current, layer.current, delta);
    }, 120);
  }, [overflow]);

  useEffect(
    () => () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    },
    []
  );

  const sliderVal = Math.min(stack, 5);
  const pct = Math.round(count * 100);

  return (
    <section id="calc" className="calc">
      <div className="calc__controls" data-reveal>
        <h2 className="h2">How many iPhones is your stack?</h2>
        <p className="calc__lede">Drag the coin. We&rsquo;ll do the math. You do the crying.</p>
        <div className="calc__card">
          <label htmlFor="stack" className="calc__label">
            <span>My stack</span>
            <span className="mono calc__stack">
              {stack >= 1000 ? stack.toLocaleString("en-US") : stack.toFixed(3)} BTC
            </span>
          </label>
          <input
            id="stack"
            type="range"
            min={0}
            max={5}
            step={0.001}
            value={sliderVal}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0;
              setStack(v);
              sfx.tick(v / 5);
            }}
          />
          <div className="calc__presets">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={"chip" + (p.hot ? " chip--hot" : "")}
                onClick={() => {
                  setStack(p.value);
                  p.sound();
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="calc__result" data-reveal>
        <div className="calc__count" aria-live="polite">
          <span ref={countEl} className="mono calc__num">
            {fmtCount(count)}
          </span>
          <span className="calc__unit">iPhones</span>
        </div>
        <p className="calc__verdict">{verdict(count)}</p>
        <div ref={grid} className={"calc__grid" + (overflow > 0 ? " is-full" : "")}>
          {overflow > 0 && (
            <div className="box-full">
              <span className="box-full__title">BOX FULL</span>
              <span>
                <span ref={escapedEl} className="mono">
                  0
                </span>{" "}
                escaped
              </span>
            </div>
          )}
          {count < 1 && (
            <div className="calc__partial">
              <div className="calc__partial-phone">
                <div className="calc__partial-fill" style={{ height: pct + "%" }} />
              </div>
              <span>
                <span className="mono">{pct}%</span> of one phone. Pick a corner.
              </span>
            </div>
          )}
          {Array.from({ length: shown }, (_, i) => (
            <div key={i} className="phone-icon" />
          ))}
        </div>
      </div>
      <div ref={layer} className="spill-layer" aria-hidden="true" />
    </section>
  );
}
