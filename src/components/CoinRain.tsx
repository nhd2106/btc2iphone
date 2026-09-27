"use client";

import { animate, stagger, utils } from "animejs";
import { forwardRef, useImperativeHandle, useRef } from "react";

export type CoinRainHandle = { rain: (count?: number) => void };

const COIN_SVG =
  '<svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="#F7931A" stroke="#17140F" stroke-width="3"/><text x="22" y="30" text-anchor="middle" font-size="22" font-weight="800" fill="#17140F" font-family="JetBrains Mono, monospace">₿</text></svg>';

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
        c.innerHTML = COIN_SVG;
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
