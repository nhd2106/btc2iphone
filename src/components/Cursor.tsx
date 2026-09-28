"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import BtcLogo from "./BtcLogo";

/** Label shown in the cursor ring; any element can set `data-cursor="Label"`. */
export function setCursorLabel(label: string | null) {
  window.dispatchEvent(new CustomEvent("cursor:label", { detail: label }));
}

/**
 * A coin cursor with a lagging ring that grows and shows a label over
 * interactive things, plus magnetic pull on `[data-magnetic]` elements.
 * Only for fine pointers with motion allowed; touch devices keep the default.
 */
export default function Cursor() {
  const [on, setOn] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ok = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const sync = () => setOn(ok.matches);
    sync();
    ok.addEventListener("change", sync);
    return () => ok.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!on || !dot.current || !ring.current) return;
    document.documentElement.classList.add("has-cursor");
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });
    const spin = gsap.quickTo(dot.current, "rotation", { duration: 0.4, ease: "power2" });
    let lastX = 0;
    let dynamicLabel: string | null = null;
    let hoverLabel: string | null = null;

    const show = () => {
      const label = dynamicLabel ?? hoverLabel;
      gsap.to(ring.current, {
        scale: label ? 2.6 : 1,
        backgroundColor: label ? "rgba(247,147,26,0.95)" : "rgba(247,147,26,0)",
        duration: 0.35,
        ease: "back.out(2)",
      });
      if (text.current) {
        text.current.textContent = label ?? "";
        gsap.to(text.current, { opacity: label ? 1 : 0, duration: 0.2 });
      }
    };

    const move = (e: PointerEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      spin((e.clientX - lastX) * 4);
      lastX = e.clientX;
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor], a, button, input, label");
      const next = t ? t.dataset.cursor ?? (t.matches("input[type=range]") ? "Drag" : t.matches("a, button") ? "Tap" : null) : null;
      if (next !== hoverLabel) {
        hoverLabel = next;
        show();
      }
    };
    const onLabel = (e: Event) => {
      dynamicLabel = (e as CustomEvent<string | null>).detail;
      show();
    };
    const down = () => gsap.to([dot.current, ring.current], { scale: "*=0.8", duration: 0.1, yoyo: true, repeat: 1 });
    const leave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.2 });
    const enter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.2 });

    // Magnetic elements lean toward the pointer
    const magnets = new Map<HTMLElement, { x: gsap.QuickToFunc; y: gsap.QuickToFunc }>();
    const magMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-magnetic]");
      magnets.forEach((q, m) => {
        if (m !== el) {
          q.x(0);
          q.y(0);
        }
      });
      if (!el) return;
      let q = magnets.get(el);
      if (!q) {
        q = {
          x: gsap.quickTo(el, "x", { duration: 0.5, ease: "elastic.out(1, 0.4)" }),
          y: gsap.quickTo(el, "y", { duration: 0.5, ease: "elastic.out(1, 0.4)" }),
        };
        magnets.set(el, q);
      }
      const r = el.getBoundingClientRect();
      q.x((e.clientX - (r.left + r.width / 2)) * 0.3);
      q.y((e.clientY - (r.top + r.height / 2)) * 0.35);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointermove", magMove);
    window.addEventListener("pointerover", over);
    window.addEventListener("pointerdown", down);
    window.addEventListener("cursor:label", onLabel);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("pointerenter", enter);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointermove", magMove);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("cursor:label", onLabel);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerenter", enter);
      magnets.forEach((_, m) => gsap.set(m, { x: 0, y: 0 }));
    };
  }, [on]);

  if (!on) return null;
  return (
    <div aria-hidden="true">
      <div ref={ring} className="cursor-ring">
        <span ref={text} className="cursor-ring__label" />
      </div>
      <div ref={dot} className="cursor-dot">
        <BtcLogo size={26} />
      </div>
    </div>
  );
}
