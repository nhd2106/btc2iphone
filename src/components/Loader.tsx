"use client";

import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useEffect, useRef, useState } from "react";
import BtcLogo from "./BtcLogo";

gsap.registerPlugin(ScrambleTextPlugin);

const KEY = "btc2iphone:mined";

/**
 * "Mining" intro: a hash scrambles, a progress bar fills with sats, then the
 * screen splits like a curtain. Once per session; skipped for reduced motion.
 * Calls `onDone` as the curtain opens so the hero intro can start.
 */
export default function Loader({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(false);
      done.current();
      return;
    }
    const q = gsap.utils.selector(root);
    const pct = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => setShow(false),
    });
    tl.from(q(".loader__coin"), { scale: 0, rotate: -180, duration: 0.5, ease: "back.out(2)" })
      .to(
        q(".loader__hash"),
        { duration: 1.1, scrambleText: { text: "0000000000000000000a4f…c0ffee", chars: "0123456789abcdef", speed: 0.6 } },
        0.1
      )
      .to(
        pct,
        {
          v: 100,
          duration: 1.1,
          ease: "power2.inOut",
          onUpdate: () => {
            const el = q(".loader__pct")[0];
            if (el) el.textContent = Math.round(pct.v) + "%";
          },
        },
        0.1
      )
      .to(q(".loader__bar i"), { scaleX: 1, duration: 1.1, ease: "power2.inOut" }, 0.1)
      .to(q(".loader__coin"), { rotateY: 720, duration: 1.1, ease: "power2.inOut" }, 0.1)
      .add(() => done.current(), "+=0.05")
      .to(q(".loader__top"), { yPercent: -100, duration: 0.7, ease: "power4.inOut" }, "<")
      .to(q(".loader__bottom"), { yPercent: 100, duration: 0.7, ease: "power4.inOut" }, "<")
      .to(q(".loader__center"), { scale: 0.6, opacity: 0, duration: 0.35, ease: "power2.in" }, "<");
    const skip = () => tl.progress(1);
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      tl.kill();
      window.removeEventListener("keydown", skip);
    };
  }, []);

  if (!show) return null;
  return (
    <div ref={root} className="loader" aria-hidden="true">
      <div className="loader__top" />
      <div className="loader__bottom" />
      <div className="loader__center">
        <div className="loader__coin">
          <BtcLogo size={96} />
        </div>
        <p className="loader__title">Mining your page…</p>
        <p className="mono loader__hash">________________</p>
        <div className="loader__bar">
          <i />
        </div>
        <p className="mono loader__pct">0%</p>
      </div>
    </div>
  );
}
