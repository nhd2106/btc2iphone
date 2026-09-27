"use client";

import { animate, stagger } from "animejs";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { fmtCount } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { shareBrag } from "@/lib/brag";
import PhonePit, { type PhonePitHandle } from "./PhonePit";
import Torn from "./Torn";

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

type Props = { price: number; iphonePrice: number; model: string };

export default function Calculator({ price, iphonePrice, model }: Props) {
  const [stack, setStack] = useState(0.25);
  const [pile, setPile] = useState(0);
  const count = (stack * price) / iphonePrice;
  const shown = count >= 1 ? Math.min(MAX_ICONS, Math.floor(count)) : 0;
  const overflow = Math.max(0, Math.floor(count - MAX_ICONS));

  const countEl = useRef<HTMLSpanElement>(null);
  const tweened = useRef({ v: count });
  const grid = useRef<HTMLDivElement>(null);
  const prevShown = useRef(0);
  const pit = useRef<PhonePitHandle>(null);
  const escapedEl = useRef<HTMLSpanElement>(null);
  const escaped = useRef({ v: 0 });
  const prevOverflow = useRef(0);
  const pending = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Box full: every increase shoots phones out into the physics pit
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
      const box = grid.current;
      if (!box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const n = Math.min(40, Math.max(2, Math.round(Math.log2(delta + 1) * 3.5)));
      animate(box, {
        translateX: [{ to: -10 }, { to: 9 }, { to: -6 }, { to: 4 }, { to: 0 }],
        rotate: [{ to: -1.2 }, { to: 1 }, { to: -0.5 }, { to: 0 }],
        duration: 380,
        ease: "inOutSine",
      });
      pit.current?.launch(n, box.getBoundingClientRect());
      sfx.popcorn(Math.min(n, 16), Math.min(1.2, 0.3 + n * 0.02));
      if (delta > 50) sfx.boing();
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
  const stackStr = stack >= 1000 ? stack.toLocaleString("en-US") : stack.toFixed(3);

  return (
    <section id="calc" className="calc">
      <Torn flip />
      <PhonePit ref={pit} onCount={setPile} />
      <div className="calc__controls" data-reveal>
        <h2 className="h2">How many iPhones is your stack?</h2>
        <p className="calc__lede">Drag the coin. We&rsquo;ll do the math. You do the crying.</p>
        <div className="calc__card">
          <label htmlFor="stack" className="calc__label">
            <span>My stack</span>
            <span className="mono calc__stack">{stackStr} BTC</span>
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
        <button
          type="button"
          className="btn btn--blue chunky brag"
          data-magnetic
          data-cursor="Flex"
          onClick={() => {
            sfx.camera();
            void shareBrag({ stack: stackStr, count: fmtCount(count), verdict: verdict(count), model });
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <path d="m16 6-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
          Brag about it
        </button>
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

      <div className={"pit-floor" + (pile ? " has-pile" : "")}>
        <span className="pit-floor__label mono">
          The pit of excess iPhones
          <span className="pit-floor__count"> · {pile ? `${pile} and counting` : "empty"}</span>
        </span>
        {pile > 0 && (
          <span className="pit-floor__actions">
            <button
              type="button"
              className="chip"
              data-cursor="Shake"
              onClick={() => {
                pit.current?.shake();
                sfx.boing();
              }}
            >
              Shake
            </button>
            <button
              type="button"
              className="chip"
              data-cursor="Sweep"
              onClick={() => {
                pit.current?.clear();
                sfx.popcorn(10, 0.4);
              }}
            >
              Sweep
            </button>
          </span>
        )}
      </div>
    </section>
  );
}
