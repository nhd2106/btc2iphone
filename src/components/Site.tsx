"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CurrentIphone, HistoryPoint } from "@/data/iphone";
import { fmtSats, fmtUsd } from "@/lib/format";
import { loadSoundPreference, setSoundEnabled, sfx } from "@/lib/sound";
import { useBtcPrice } from "@/lib/useBtcPrice";
import Calculator from "./Calculator";
import CoinRain, { type CoinRainHandle } from "./CoinRain";
import RegretChart from "./RegretChart";

gsap.registerPlugin(ScrollTrigger);

const PhoneScene = dynamic(() => import("./PhoneScene"), {
  ssr: false,
  loading: () => <div className="phone-scene" />,
});

type Props = {
  initialPrice: number | null;
  iphone: CurrentIphone;
  history: HistoryPoint[];
};

// Used only until the first real quote arrives, so the page never shows NaN.
const FALLBACK_BTC = 100_000;

export default function Site({ initialPrice, iphone, history }: Props) {
  const feed = useBtcPrice(initialPrice);
  const price = feed.price ?? FALLBACK_BTC;
  const btcPer = iphone.priceUsd / price;

  const [sound, setSound] = useState(true);
  const [laser, setLaser] = useState(false);
  const taps = useRef(0);
  const rain = useRef<CoinRainHandle>(null);
  const root = useRef<HTMLDivElement>(null);
  const ticker = useRef<HTMLDivElement>(null);

  useEffect(() => setSound(loadSoundPreference()), []);

  // Intro + scroll reveals (GSAP)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero__word", {
          yPercent: 110,
          rotate: 6,
          opacity: 0,
          duration: 0.8,
          ease: "back.out(1.6)",
          stagger: 0.07,
        });
        gsap.from(".hero__price", { scale: 0.6, opacity: 0, duration: 0.9, ease: "elastic.out(1, 0.5)", delay: 0.35 });
        gsap.from(".hero__cta > *", { y: 30, opacity: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.1, delay: 0.6 });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });
        gsap.to(".marquee__track", {
          xPercent: -50,
          duration: 26,
          ease: "none",
          repeat: -1,
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // Flash + chirp the ticker on every live move
  useEffect(() => {
    if (!feed.lastMove || !ticker.current) return;
    const up = feed.lastMove === "up";
    gsap.fromTo(
      ticker.current,
      { backgroundColor: up ? "#0F7A3D" : "#C2261C", color: "#FFFFFF" },
      { backgroundColor: "#FFFFFF", color: "#17140F", duration: 0.9, ease: "power2.out" }
    );
    (up ? sfx.priceUp : sfx.priceDown)();
  }, [feed.tick, feed.lastMove]);

  const toggleSound = () => {
    const on = !sound;
    setSound(on);
    setSoundEnabled(on);
    if (on) sfx.pop();
  };

  const makeItRain = () => {
    rain.current?.rain();
    sfx.jackpot();
  };

  const tapLogo = () => {
    taps.current += 1;
    if (taps.current >= 5) {
      taps.current = 0;
      setLaser((l) => !l);
      sfx.zap();
    } else {
      sfx.blip(taps.current * 2);
    }
  };

  const change = feed.change24h;
  const statusLabel = feed.status === "live" ? "LIVE" : feed.status === "polling" ? "SYNC" : "…";
  const headline = `One ${iphone.model} costs`.split(" ");
  const marquee = [
    `1 ${iphone.model.toUpperCase()} = ${btcPer.toFixed(5)} BTC`,
    `1 BTC = ${(price / iphone.priceUsd).toFixed(1)} iPHONES`,
    "STAY HUMBLE, STACK SATS",
    "HODL YOUR PHONE, TOO",
  ];

  return (
    <div ref={root}>
      <CoinRain ref={rain} />

      <header className="nav">
        <button type="button" className="logo" onClick={tapLogo} aria-label="btc2iphone. Psst: tap five times.">
          <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="19" fill="#F7931A" stroke="#17140F" strokeWidth="3" />
            <text x="22" y="30" textAnchor="middle" fontSize="22" fontWeight="800" fill="#17140F" fontFamily="var(--font-mono), monospace">
              ₿
            </text>
          </svg>
          <span>btc2iphone</span>
        </button>
        <nav aria-label="Main" className="nav__links">
          <a href="#calc" onClick={sfx.pop}>
            Stack calculator
          </a>
          <a href="#regret" onClick={sfx.pop}>
            Hall of Regret
          </a>
        </nav>
        <div className="nav__right">
          <div ref={ticker} className="ticker mono" aria-live="polite">
            <span className={"ticker__dot" + (feed.status === "live" ? " is-live" : "")} />
            <span className="ticker__status">{statusLabel}</span>
            <span>BTC {feed.price ? fmtUsd(feed.price) : "—"}</span>
            {change != null && (
              <span className={change >= 0 ? "up" : "down"}>
                {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-icon chunky"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? "Mute sound effects" : "Turn on sound effects"}
          >
            {sound ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M19 5a10 10 0 0 1 0 14" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="m23 9-6 6" />
                <path d="m17 9 6 6" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <div className="pill">The only exchange rate that matters</div>
            <h1 className="hero__h1">
              {headline.map((w, i) => (
                <span key={i} className="hero__mask">
                  <span className="hero__word">{w}</span>
                </span>
              ))}
            </h1>
            <div className="hero__price">
              <span className="mono hero__num">{btcPer.toFixed(5)}</span>
              <span className="hero__btc">BTC</span>
            </div>
            <p className="hero__lede">
              That&rsquo;s <strong className="mono">{fmtSats(btcPer)} sats</strong>. Or, as your future self will call
              it, <em>&ldquo;the phone I bought instead of retiring.&rdquo;</em>
            </p>
            <div className="hero__cta">
              <button type="button" className="btn btn--orange chunky" onClick={makeItRain}>
                Make it rain sats
              </button>
              <a href="#regret" className="btn chunky" onClick={sfx.pop}>
                Show me the regret
              </a>
            </div>
          </div>

          <div className="hero__stage">
            <PhoneScene sats={fmtSats(btcPer)} model={iphone.model} laser={laser} onTap={makeItRain} />
            <div className="sticker sticker--blue wobble">NOT FINANCIAL ADVICE</div>
            <div className="sticker sticker--orange wobble2">WEN iPHONE?</div>
            {laser && <div className="sticker sticker--red">LASER EYES ACTIVATED</div>}
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee__track mono">
            {[0, 1].map((k) =>
              marquee.map((m) => (
                <span key={k + m}>
                  {m}
                  <span className="marquee__star">★</span>
                </span>
              ))
            )}
          </div>
        </div>

        <Calculator price={price} iphonePrice={iphone.priceUsd} />

        <RegretChart history={history} model={iphone.model} price={price} iphonePrice={iphone.priceUsd} />
      </main>

      <footer className="footer">
        <div>
          <p className="footer__mark">btc2iphone</p>
          <p className="footer__small">Not financial advice. Definitely not phone advice.</p>
        </div>
        <div className="mono footer__meta">
          <span>
            <span className={"ticker__dot" + (feed.status === "live" ? " is-live" : "")} />
            {feed.status === "live"
              ? "BTC price streaming live"
              : feed.status === "polling"
              ? "BTC price refreshes every 30s"
              : "Connecting to the price feed…"}
          </span>
          <span>
            {iphone.model} at ${iphone.priceUsd} · checked weekly · last check {iphone.checkedAt}
          </span>
          <span>Sound {sound ? "on" : "off"} · tap the logo 5×</span>
        </div>
      </footer>
    </div>
  );
}
