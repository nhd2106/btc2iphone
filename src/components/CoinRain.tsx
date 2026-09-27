"use client";

import { animate, stagger, utils } from "animejs";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { BTC_LOGO_SVG } from "./BtcLogo";

export type CoinRainHandle = { rain: (count?: number) => void };

/** Full-viewport overlay that showers bitcoins (anime.js). */
const CoinRain = forwardRef<CoinRainHandle>(function CoinRain(_, ref) {
  const layer = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    rain(count = 36) {
      const el = layer.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) count = 8;
      const coins: HTMLElement[] = [];
      for (let i = 0; i < count; i++) {
        const c = document.createElement("div");
        const size = utils.random(24, 56);
        c.className = "rain-coin";
        c.style.width = c.style.height = size + "px";
        c.style.left = utils.random(0, 100) + "vw";
        c.innerHTML = BTC_LOGO_SVG;
        el.appendChild(c);
        coins.push(c);
      }
      animate(coins, {
        translateY: () => window.innerHeight + 160,
        translateX: () => utils.random(-120, 120),
        rotate: () => utils.random(-720, 720),
        scale: { from: 0.4, to: 1 },
        duration: () => utils.random(1300, 2400),
        delay: stagger(18, { from: "center" }),
        ease: "inQuad",
        onComplete: () => coins.forEach((c) => c.remove()),
      });
    },
  }));

  return <div ref={layer} className="rain-layer" aria-hidden="true" />;
});

export default CoinRain;
