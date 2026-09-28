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

/** Viewports big enough to pin the section and scrub through the years. */
const PIN_QUERY = "(min-width: 1000px) and (min-height: 780px) and (prefers-reduced-motion: no-preference)";
/** Scroll distance per year while the section is pinned. */
const PX_PER_YEAR = 120;

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
  const n = points.length;
  const [sel, setSel] = useState(0);
  const [pinned, setPinned] = useState(false);
  const selRef = useRef(0);
  selRef.current = sel;
  const section = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);

  const xy = points.map((p, i) => ({ x: X0 + (i * (X1 - X0)) / (n - 1), y: yOf(p.btc) }));
  const d = xy.map((p, i) => `${i ? "L" : "M"}${p.x * 10} ${p.y * 4}`).join(" ");
  const area = `${d} L${xy[n - 1].x * 10} 400 L${xy[0].x * 10} 400 Z`;

  // Cumulative line length, so scroll position maps to "drawn up to year f"
  const cum = useMemo(() => {
    const c = [0];
    for (let i = 1; i < xy.length; i++) {
      c.push(c[i - 1] + Math.hypot((xy[i].x - xy[i - 1].x) * 10, (xy[i].y - xy[i - 1].y) * 4));
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);
  const cumRef = useRef(cum);
  cumRef.current = cum;

  useEffect(() => {
    const mm = gsap.matchMedia();
    // Desktop: pin the section and let scrolling walk through the years
    mm.add(PIN_QUERY, () => {
      // Apply the compact pinned layout before the pin measures the section
      section.current?.classList.add("is-pinned");
      setPinned(true);
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top 96px",
        end: () => "+=" + (n - 1) * PX_PER_YEAR,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const c = cumRef.current;
          const f = self.progress * (n - 1);
          const i = Math.min(n - 2, Math.floor(f));
          const len = c[i] + (f - i) * (c[i + 1] - c[i]);
          if (path.current) path.current.style.strokeDashoffset = String(1 - len / c[n - 1]);
          if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
          const idx = Math.round(f);
          if (idx !== selRef.current) {
            selRef.current = idx;
            setSel(idx);
            sfx.softTick(idx);
          }
        },
      });
      trigger.current = st;
      if (path.current) path.current.style.strokeDashoffset = "1";
      return () => {
        trigger.current = null;
        section.current?.classList.remove("is-pinned");
        setPinned(false);
        if (path.current) path.current.style.strokeDashoffset = "";
      };
    });
    // Everywhere else: draw the line and drop the dots when it scrolls into view
    mm.add("not all and " + PIN_QUERY, () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: box.current, start: "top 75%" } });
      tl.fromTo(path.current, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut" });
      tl.fromTo(
        ".pt",
        { scale: 0 },
        { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.1, clearProps: "transform,scale,translate,rotate" },
        0.3
      );
    });
    return () => mm.revert();
  }, [n]);

  // Bounce the cards in on every selection
  useEffect(() => {
    if (!cards.current) return;
    gsap.fromTo(
      cards.current.children,
      { y: 18, rotate: () => gsap.utils.random(-2, 2), opacity: 0.2 },
      { y: 0, rotate: 0, opacity: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.05, overwrite: true }
    );
  }, [sel]);

  const pick = (i: number, loud: boolean) => {
    const st = trigger.current;
    if (st && loud) {
      // In pinned mode, clicking a year scrolls the time machine there
      window.scrollTo({ top: st.start + (i / (n - 1)) * (st.end - st.start) + 1, behavior: "smooth" });
    }
    if (i === sel) return;
    setSel(i);
    if (loud && (points[i].btc * price) / iphonePrice > 100) sfx.wahwah();
    else sfx.blip(i);
  };

  const s = points[Math.min(sel, n - 1)];
  const nowIphones = (s.btc * price) / iphonePrice;

  return (
    <section ref={section} id="regret" className={"regret" + (pinned ? " is-pinned" : "")}>
      <div className="regret__year mono" aria-hidden="true">
        {s.year}
      </div>
      <div className="regret__head" data-reveal>
        <div>
          <h2 className="h2 h2--xl">The Hall of Regret</h2>
          <p className="regret__lede">
            Every iPhone, priced in the bitcoin it cost at launch.{" "}
            {pinned ? "Scroll to time-travel. Feel things." : "Tap a year. Feel things."}
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
            <path ref={path} d={d} className="chart__line" pathLength={1} strokeDasharray="1" />
          </svg>
          {points.map((p, i) => (
            <button
              key={`${p.year}-${p.model}`}
              type="button"
              className={"pt" + (i === sel ? " pt--on" : "") + (pinned && i > sel ? " pt--future" : "")}
              style={{ left: xy[i].x + "%", top: xy[i].y + "%" }}
              aria-pressed={i === sel}
              aria-label={`${p.year}, ${p.model}: ${fmtBtc(p.btc)} BTC`}
              data-cursor={String(p.year)}
              onClick={() => pick(i, true)}
              onMouseEnter={() => !pinned && pick(i, false)}
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

      {pinned && (
        <div className="regret__progress" aria-hidden="true">
          <div ref={bar} className="regret__progress-bar" />
        </div>
      )}

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
