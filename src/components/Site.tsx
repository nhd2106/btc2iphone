"use client";

import { animate, utils } from "animejs";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CurrentIphone, HistoryPoint } from "@/data/iphone";
import { fmtSats, fmtUsd } from "@/lib/format";
import { loadSoundPreference, setSoundEnabled, sfx } from "@/lib/sound";
import { useBtcPrice } from "@/lib/useBtcPrice";
import BtcLogo from "./BtcLogo";
import Calculator from "./Calculator";
import CoinRain, { type CoinRainHandle } from "./CoinRain";
import Cursor from "./Cursor";
import Loader from "./Loader";
import Odometer from "./Odometer";
import RegretChart from "./RegretChart";
import Torn from "./Torn";

gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin, DrawSVGPlugin, ScrambleTextPlugin);

const PhoneScene = dynamic(() => import("./PhoneScene"), {
  ssr: false,
  loading: () => <div className="phone-scene" />,
});

type Props = {
  initialPrice: number | null;
  iphones: CurrentIphone[];
  history: HistoryPoint[];
  checkedAt: string;
};

// Used only until the first real quote arrives, so the page never shows NaN.
const FALLBACK_BTC = 100_000;

const STICKERS = [
  { text: "NOT FINANCIAL ADVICE", cls: "sticker--blue", anim: "wobble" },
  { text: "WEN iPHONE?", cls: "sticker--orange", anim: "wobble2" },
  { text: "HODL", cls: "sticker--cream", anim: "wobble" },
  { text: "1 SAT = 1 SAT", cls: "sticker--ink", anim: "wobble2" },
];

/** Splits text into per-letter spans (kept whole per word) for the drop-in animation. */
function Chars({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((word, w) =>
        /^\s+$/.test(word) ? (
          " "
        ) : word ? (
          <span key={w} className="word" aria-hidden="true">
            {word.split("").map((c, i) => (
              <span key={i} className="ch">
                {c}
              </span>
            ))}
          </span>
        ) : null
      )}
    </>
  );
}

export default function Site({ initialPrice, iphones, history, checkedAt }: Props) {
  const feed = useBtcPrice(initialPrice);
  const [pick, setPick] = useState(0);
  const iphone = iphones[pick];
  const price = feed.price ?? FALLBACK_BTC;
  const btcPer = iphone.priceUsd / price;

  const [introDone, setIntroDone] = useState(false);
  const [sound, setSound] = useState(true);
  const [laser, setLaser] = useState(false);
  const taps = useRef(0);
  const rain = useRef<CoinRainHandle>(null);
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const ticker = useRef<HTMLDivElement>(null);
  const onIntroDone = useCallback(() => setIntroDone(true), []);

  useEffect(() => setSound(loadSoundPreference()), []);

  // Hero entrance once the loader curtain opens
  useEffect(() => {
    if (!introDone) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline();
        tl.from(".pill, .picker", { y: -30, opacity: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.08 })
          .from(
            ".hero__h1 .ch",
            {
              yPercent: 120,
              rotate: () => gsap.utils.random(-40, 40),
              opacity: 0,
              duration: 0.7,
              ease: "back.out(2.2)",
              stagger: 0.025,
            },
            0.1
          )
          .fromTo(".scribble path", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.7, ease: "power2.inOut" }, 0.6)
          .from(".hero__price", { scale: 0.6, opacity: 0, duration: 0.9, ease: "elastic.out(1, 0.5)" }, 0.3)
          .from(".hero__lede", { y: 20, opacity: 0, duration: 0.5 }, 0.6)
          .from(".hero__cta > *", { y: 30, opacity: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.1 }, 0.7)
          .from(
            ".sticker",
            { scale: 0, rotate: () => gsap.utils.random(-90, 90), duration: 0.6, ease: "back.out(3)", stagger: 0.1 },
            0.9
          );
      });
    }, root);
    return () => ctx.revert();
  }, [introDone]);

  // Scroll reveals, speed-reactive marquee, throwable stickers
  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            y: 60,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });

        const loop = gsap.to(".marquee__track", { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
        loop.totalTime(26 * 50); // room to run backwards
        const skew = gsap.quickTo(".marquee__track", "skewX", { duration: 0.4, ease: "power3" });
        ScrollTrigger.create({
          onUpdate: (self) => {
            const v = self.getVelocity();
            gsap.to(loop, {
              timeScale: self.direction * (1 + Math.min(Math.abs(v) / 250, 8)),
              duration: 0.15,
              overwrite: true,
              onComplete: () => void gsap.to(loop, { timeScale: self.direction, duration: 1.2, ease: "power2.out" }),
            });
            skew(gsap.utils.clamp(-14, 14, -v / 180));
            gsap.delayedCall(0.15, () => skew(0));
          },
        });
      });

      Draggable.create(".sticker", {
        type: "x,y",
        inertia: true,
        bounds: hero.current,
        edgeResistance: 0.6,
        onPress(this: Draggable) {
          sfx.pop();
          gsap.to(this.target, { scale: 1.12, duration: 0.2, ease: "back.out(3)" });
        },
        onRelease(this: Draggable) {
          gsap.to(this.target, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
        },
        onThrowComplete() {
          sfx.clack(0.8);
        },
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

  // Model switch: letters re-drop, scribble redraws, price bounces
  const firstPick = useRef(true);
  useEffect(() => {
    if (firstPick.current) {
      firstPick.current = false;
      return;
    }
    const ctx = gsap.context(() => {
      gsap.from(".hero__h1 .hl .ch", {
        yPercent: -140,
        rotate: () => gsap.utils.random(-60, 60),
        opacity: 0,
        duration: 0.6,
        ease: "bounce.out",
        stagger: 0.03,
      });
      gsap.fromTo(".scribble path", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6, delay: 0.3, ease: "power2.inOut" });
      gsap.fromTo(".hero__price", { scale: 0.7, rotate: -4 }, { scale: 1, rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
    }, root);
    return () => ctx.revert();
  }, [pick]);

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

  const scramble = (e: React.MouseEvent<HTMLAnchorElement>, text: string) => {
    gsap.to(e.currentTarget.querySelector("span"), {
      duration: 0.5,
      scrambleText: { text, chars: "₿$01", speed: 0.8 },
      overwrite: true,
    });
  };

  const xylo = (e: React.PointerEvent<HTMLSpanElement>, i: number) => {
    animate(e.currentTarget, {
      translateY: [
        { to: -48, duration: 160, ease: "outQuad" },
        { to: 0, duration: 700, ease: "outBounce" },
      ],
      rotate: [
        { to: utils.random(-18, 18), duration: 160 },
        { to: 0, duration: 700 },
      ],
      scale: [
        { to: 1.15, duration: 160 },
        { to: 1, duration: 500 },
      ],
    });
    sfx.note(i);
  };

  const change = feed.change24h;
  const statusLabel = feed.status === "live" ? "LIVE" : feed.status === "polling" ? "SYNC" : "…";
  const marquee = [
    `1 ${iphone.model.toUpperCase()} = ${btcPer.toFixed(5)} BTC`,
    `1 BTC = ${(price / iphone.priceUsd).toFixed(1)} iPHONES`,
    "STAY HUMBLE, STACK SATS",
    "HODL YOUR PHONE, TOO",
  ];
  const btcPerStr = btcPer.toFixed(5);

  return (
    <div ref={root}>
      <Loader onDone={onIntroDone} />
      <Cursor />
      <CoinRain ref={rain} />
      <div className="grain" aria-hidden="true" />

      <header className="nav">
        <button type="button" className="logo" onClick={tapLogo} aria-label="btc2iphone. Psst: tap five times." data-cursor="Tap ×5">
          <BtcLogo size={44} />
          <span>btc2iphone</span>
        </button>
        <nav aria-label="Main" className="nav__links">
          {[
            ["#calc", "Stack calculator"],
            ["#regret", "Hall of Regret"],
          ].map(([href, label]) => (
            <a key={href} href={href} onClick={sfx.pop} onMouseEnter={(e) => scramble(e, label)} aria-label={label}>
              <span aria-hidden="true">{label}</span>
            </a>
          ))}
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
            data-magnetic
            data-cursor={sound ? "Mute" : "Sound"}
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
        <section ref={hero} className="hero">
          <div className="hero__copy">
            <div className="pill">The only exchange rate that matters</div>
            <div className="picker" role="radiogroup" aria-label="Price it as">
              {iphones.map((p, i) => (
                <button
                  key={p.model}
                  type="button"
                  role="radio"
                  aria-checked={i === pick}
                  className={"picker__opt" + (i === pick ? " is-on" : "")}
                  data-cursor="Switch"
                  onClick={() => {
                    if (i === pick) return;
                    setPick(i);
                    sfx.whoosh();
                  }}
                >
                  <span>{p.model}</span>
                  <span className="mono picker__price">${p.priceUsd.toLocaleString("en-US")}</span>
                </button>
              ))}
            </div>
            <h1 className="hero__h1" aria-label={`One ${iphone.model} costs`}>
              <Chars text="One " />
              <span className="hl" key={iphone.model}>
                <Chars text={iphone.model} />
                <svg className="scribble" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 16 C 40 6, 80 22, 120 12 S 200 4, 240 14 S 290 10, 296 8" />
                </svg>
              </span>
              <Chars text=" costs" />
            </h1>
            <div className="hero__price">
              <Odometer className="mono hero__num" value={introDone ? btcPerStr : btcPerStr.replace(/\d/g, "0")} />
              <span className="hero__btc">BTC</span>
            </div>
            <p className="hero__lede">
              That&rsquo;s <strong className="mono">{fmtSats(btcPer)} sats</strong>. Or, as your future self will call
              it, <em>&ldquo;the phone I bought instead of retiring.&rdquo;</em>
            </p>
            <div className="hero__cta">
              <button type="button" className="btn btn--orange chunky" onClick={makeItRain} data-magnetic data-cursor="Rain!">
                Make it rain sats
              </button>
              <a href="#regret" className="btn chunky" onClick={sfx.pop} data-magnetic data-cursor="Cry">
                Show me the regret
              </a>
            </div>
          </div>

          <div className="hero__stage" data-cursor={iphone.form === "foldable" ? "Fold" : "Spin"}>
            <PhoneScene
              form={iphone.form}
              model={iphone.model}
              sats={fmtSats(btcPer)}
              btcPer={btcPerStr}
              btcPrice={feed.price ? fmtUsd(feed.price) : null}
              laser={laser}
              onTap={makeItRain}
            />
            <div className="stage-floor" aria-hidden="true" />
          </div>

          {STICKERS.map((s, i) => (
            <div key={s.text} className={`sticker sticker--${i} ${s.cls}`} data-cursor="Throw">
              <span className={s.anim}>{s.text}</span>
            </div>
          ))}
          {laser && (
            <div className="sticker sticker--red">
              <span>LASER EYES ACTIVATED</span>
            </div>
          )}
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

        <Calculator price={price} iphonePrice={iphone.priceUsd} model={iphone.model} />

        <RegretChart history={history} model={iphone.model} price={price} iphonePrice={iphone.priceUsd} />
      </main>

      <footer className="footer">
        <Torn />
        <div>
          <p className="footer__mark" aria-label="btc2iphone" data-cursor="Play me">
            {"btc2iphone".split("").map((c, i) => (
              <span key={i} className="xylo" aria-hidden="true" onPointerEnter={(e) => xylo(e, i)}>
                {c}
              </span>
            ))}
          </p>
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
          <span>{iphones.map((p) => `${p.model} $${p.priceUsd.toLocaleString("en-US")}`).join(" · ")}</span>
          <span>iPhone prices checked weekly · last check {checkedAt}</span>
          <span>Sound {sound ? "on" : "off"} · tap the logo 5×</span>
        </div>
      </footer>
    </div>
  );
}
