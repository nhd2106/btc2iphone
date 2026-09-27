"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoryPoint } from "@/data/iphone";
import { fmtBigUsd, fmtBtc, fmtCount } from "@/lib/format";
import { sfx } from "@/lib/sound";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  history: HistoryPoint[];
  model: string;
  price: number;
  iphonePrice: number;
};

// Log-scale plot area, in percent of the chart box.
const X0 = 10,
  X1 = 96,
  Y_TOP = 8,
  Y_BOT = 90;
const LMIN = Math.log10(0.004),
  LMAX = Math.log10(300);
const yOf = (btc: number) =>
  Y_BOT - ((Math.log10(Math.max(btc, 0.004)) - LMIN) / (LMAX - LMIN)) * (Y_BOT - Y_TOP);

export default function RegretChart({ history, model, price, iphonePrice }: Props) {
  const points = useMemo(
    () => [
      ...history,
      {
        year: "Today" as const,
        model,
        btc: iphonePrice / price,
        joke: "Today’s price. Tomorrow’s regret. Probably.",
      },
    ],
    [history, model, price, iphonePrice]
  );
  const [sel, setSel] = useState(0);
  const path = useRef<SVGPathElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLDivElement>(null);

  const xy = points.map((p, i) => ({
    x: X0 + (i * (X1 - X0)) / (points.length - 1),
    y: yOf(p.btc),
  }));
  const d = xy.map((p, i) => `${i ? "L" : "M"}${p.x * 10} ${p.y * 4}`).join(" ");
  const area = `${d} L${xy[xy.length - 1].x * 10} 400 L${xy[0].x * 10} 400 Z`;

  // Draw the line + drop the dots when the chart scrolls into view (GSAP)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: box.current, start: "top 75%" } });
      tl.fromTo(path.current, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut" });
      tl.fromTo(
        ".pt",
        { scale: 0 },
        { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.1, clearProps: "transform,scale,translate,rotate" },
        0.3
      );
    }, box);
    return () => ctx.revert();
  }, []);

  // Bounce the cards in on every selection
  useEffect(() => {
    if (!cards.current) return;
    gsap.fromTo(
      cards.current.children,
      { y: 24, rotate: () => gsap.utils.random(-2, 2), opacity: 0 },
      { y: 0, rotate: 0, opacity: 1, duration: 0.5, ease: "back.out(2)", stagger: 0.06 }
    );
  }, [sel]);

  const pick = (i: number, loud: boolean) => {
    if (i === sel) return;
    setSel(i);
    if (loud && (points[i].btc * price) / iphonePrice > 100) sfx.wahwah();
    else sfx.blip(i);
  };

  const s = points[Math.min(sel, points.length - 1)];
  const nowIphones = (s.btc * price) / iphonePrice;

  return (
    <section id="regret" className="regret">
      <div className="regret__head" data-reveal>
        <div>
          <h2 className="h2 h2--xl">The Hall of Regret</h2>
          <p className="regret__lede">
            Every iPhone, priced in the bitcoin it cost at launch. Tap a year. Feel things.
          </p>
        </div>
        <p className="mono regret__axis">
          BTC per iPhone
          <br />
          log scale · lower = cheaper
        </p>
      </div>

      <div className="regret__scroll">
        <div ref={box} className="chart">
          {[100, 10, 1, 0.1, 0.01].map((v) => (
            <div key={v} className="chart__grid" style={{ top: yOf(v) + "%" }}>
              <span className="mono">{v} BTC</span>
            </div>
          ))}
          <svg className="chart__svg" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
            <path d={area} className="chart__area" />
            <path
              ref={path}
              d={d}
              className="chart__line"
              pathLength={1}
              strokeDasharray="1"
            />
          </svg>
          {points.map((p, i) => (
            <button
              key={`${p.year}-${p.model}`}
              type="button"
              className={"pt" + (i === sel ? " pt--on" : "")}
              style={{ left: xy[i].x + "%", top: xy[i].y + "%" }}
              aria-pressed={i === sel}
              aria-label={`${p.year}, ${p.model}: ${fmtBtc(p.btc)} BTC`}
              onClick={() => pick(i, true)}
              onMouseEnter={() => pick(i, false)}
            />
          ))}
          {points.map((p, i) => (
            <div
              key={`l-${p.year}-${p.model}`}
              className={"chart__label" + (i === sel ? " chart__label--on" : "")}
              style={{ left: xy[i].x + "%" }}
            >
              <span className="mono">{p.year}</span>
              <span>{p.model.replace(/^iPhone\s*/, "")}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={cards} className="regret__cards" aria-live="polite">
        <div className="rcard">
          <span className="rcard__kicker">{s.year} · you spent</span>
          <span className="mono rcard__big">{fmtBtc(s.btc)} BTC</span>
          <span className="rcard__sub">on one {s.model}</span>
        </div>
        <div className="rcard rcard--orange">
          <span className="rcard__kicker">Those coins today</span>
          <span className="mono rcard__big">{fmtCount(nowIphones)}</span>
          <span className="rcard__sub">
            {model}s · worth {fmtBigUsd(s.btc * price)}
          </span>
        </div>
        <div className="rcard rcard--blue">
          <span className="rcard__kicker">Historians note</span>
          <span className="rcard__joke">{s.joke}</span>
        </div>
      </div>
    </section>
  );
}
