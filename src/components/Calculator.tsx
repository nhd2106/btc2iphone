"use client";

import { animate, stagger } from "animejs";
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

export default function Calculator({ price, iphonePrice }: { price: number; iphonePrice: number }) {
  const [stack, setStack] = useState(0.25);
  const count = (stack * price) / iphonePrice;
  const shown = count >= 1 ? Math.min(MAX_ICONS, Math.floor(count)) : 0;

  const countEl = useRef<HTMLSpanElement>(null);
  const tweened = useRef({ v: count });
  const grid = useRef<HTMLDivElement>(null);
  const prevShown = useRef(0);

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
        <div ref={grid} className="calc__grid">
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
          {count > MAX_ICONS && (
            <div className="calc__more">
              <span className="mono">+{Math.floor(count - MAX_ICONS).toLocaleString("en-US")}</span>&nbsp;more
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
