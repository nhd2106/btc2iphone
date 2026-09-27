"use client";

import type Matter from "matter-js";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { sfx } from "@/lib/sound";
import { setCursorLabel } from "./Cursor";

export type PhonePitHandle = {
  /** Launch `n` phones out of `from` (a DOM rect in viewport coords). */
  launch: (n: number, from: DOMRect) => void;
  shake: () => void;
  clear: () => void;
  count: () => number;
};

const INK = "#17140F";
const ORANGE = "#F7931A";
const W = 30,
  H = 54;

type PhoneBody = Matter.Body & { tint: number; s: number };
/** Height of the hazard-tape strip the pile rests on. */
const FLOOR = 56;

/**
 * Matter.js pit covering its parent section. Escaped phones fly out, bounce,
 * clack into each other and pile up on the floor, where you can grab and
 * fling them. The canvas never blocks clicks: presses only get captured when
 * they land on a phone.
 */
const PhonePit = forwardRef<PhonePitHandle, { onCount?: (n: number) => void }>(function PhonePit({ onCount }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<PhonePitHandle | null>(null);
  const countCb = useRef(onCount);
  countCb.current = onCount;

  useImperativeHandle(ref, () => ({
    launch: (n, from) => api.current?.launch(n, from),
    shake: () => api.current?.shake(),
    clear: () => api.current?.clear(),
    count: () => api.current?.count() ?? 0,
  }));

  useEffect(() => {
    // Matter.js loads on demand so it stays out of the first page load
    let dead = false;
    let cleanup: (() => void) | undefined;
    import("matter-js").then((mod) => {
      if (!dead) cleanup = setup(mod.default);
    });
    return () => {
      dead = true;
      cleanup?.();
    };

    function setup(M: typeof Matter): (() => void) | undefined {
      const cv = canvas.current;
      const host = cv?.parentElement;
      if (!cv || !host) return;
      const ctx = cv.getContext("2d")!;
      const { Engine, Bodies, Body, Composite, Query, Constraint, Events, Sleeping } = M;
      const engine = Engine.create({ enableSleeping: true });
      engine.gravity.y = 1.15;
      const world = engine.world;
      const small = () => window.innerWidth < 700;
      const MAX = () => (small() ? 60 : 150);

      let width = 0,
        height = 0,
        dpr = 1;
      let walls: Matter.Body[] = [];
      const phones: PhoneBody[] = [];

      const layout = () => {
        width = host.clientWidth;
        height = host.clientHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = width * dpr;
        cv.height = height * dpr;
        cv.style.width = width + "px";
        cv.style.height = height + "px";
        Composite.remove(world, walls);
        const t = 200;
        walls = [
          Bodies.rectangle(width / 2, height - FLOOR + t / 2, width + 2 * t, t, { isStatic: true, friction: 0.8 }),
          Bodies.rectangle(-t / 2, height / 2 - 400, t, height * 2 + 800, { isStatic: true }),
          Bodies.rectangle(width + t / 2, height / 2 - 400, t, height * 2 + 800, { isStatic: true }),
        ];
        Composite.add(world, walls);
        phones.forEach((b) => Sleeping.set(b, false));
      };
      const ro = new ResizeObserver(layout);
      ro.observe(host);
      layout();

      const report = () => countCb.current?.(phones.length);

      const add = (x: number, y: number, vx: number, vy: number) => {
        const s = small() ? 0.8 : 0.85 + Math.random() * 0.45;
        const b = Bodies.rectangle(x, y, W * s, H * s, {
          chamfer: { radius: 7 * s },
          restitution: 0.35,
          friction: 0.35,
          frictionAir: 0.008,
          density: 0.002,
        }) as PhoneBody;
        Body.setVelocity(b, { x: vx, y: vy });
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.5);
        b.tint = Math.random();
        b.s = s;
        phones.push(b);
        Composite.add(world, b);
        while (phones.length > MAX()) Composite.remove(world, phones.shift()!);
      };

      // Clacks when phones hit something hard
      Events.on(engine, "collisionStart", (e) => {
        for (const p of e.pairs) {
          const v = Math.abs(p.bodyA.velocity.y - p.bodyB.velocity.y) + Math.abs(p.bodyA.velocity.x - p.bodyB.velocity.x);
          if (v > 5) sfx.clack(Math.min(1, v / 25));
        }
      });

      // Drag & fling
      let grab: Matter.Constraint | null = null;
      const local = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const onDown = (e: PointerEvent) => {
        const pt = local(e);
        const hit = Query.point(phones, pt)[0];
        if (!hit) return;
        e.preventDefault();
        e.stopPropagation();
        Sleeping.set(hit, false);
        grab = Constraint.create({
          pointA: pt,
          bodyB: hit,
          pointB: { x: pt.x - hit.position.x, y: pt.y - hit.position.y },
          stiffness: 0.15,
          damping: 0.1,
          length: 0,
        });
        Composite.add(world, grab);
        host.setPointerCapture?.(e.pointerId);
        setCursorLabel("Fling!");
        sfx.pop();
        wake();
      };
      let hovering = false;
      const onMove = (e: PointerEvent) => {
        const pt = local(e);
        if (grab) {
          grab.pointA = pt;
          return;
        }
        const over = Query.point(phones, pt).length > 0;
        if (over !== hovering) {
          hovering = over;
          setCursorLabel(over ? "Grab" : null);
          host.style.cursor = over ? "grab" : "";
        }
      };
      const onUp = () => {
        if (!grab) return;
        Composite.remove(world, grab);
        grab = null;
        setCursorLabel(hovering ? "Grab" : null);
      };
      host.addEventListener("pointerdown", onDown, { capture: true });
      host.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      // Render: sticker-style phones on a 2D canvas
      const draw = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        for (const b of phones) {
          const s = b.s,
            bw = W * s,
            bh = H * s,
            r = 7 * s;
          ctx.save();
          ctx.translate(b.position.x, b.position.y);
          ctx.rotate(b.angle);
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.roundRect(-bw / 2 + 3, -bh / 2 + 3, bw, bh, r);
          ctx.fill();
          const tint = b.tint;
          ctx.fillStyle = tint > 0.85 ? "#2D3BFF" : tint > 0.72 ? "#F3EEE3" : ORANGE;
          ctx.beginPath();
          ctx.roundRect(-bw / 2, -bh / 2, bw, bh, r);
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = INK;
          ctx.stroke();
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.roundRect(-bw * 0.18, -bh / 2 + bh * 0.1, bw * 0.36, bh * 0.07, 3);
          ctx.fill();
          ctx.restore();
        }
      };

      let raf = 0;
      let running = false;
      let visible = true;
      const tick = () => {
        Engine.update(engine, 1000 / 60);
        draw();
        const allAsleep = phones.every((b) => b.isSleeping) && !grab;
        if (!visible || allAsleep) {
          running = false;
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (running) return;
        running = true;
        raf = requestAnimationFrame(tick);
      };
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && phones.length) wake();
      });
      io.observe(host);

      api.current = {
        launch: (n, from) => {
          const r = host.getBoundingClientRect();
          for (let i = 0; i < n; i++) {
            const x = from.left - r.left + (0.1 + Math.random() * 0.8) * from.width;
            const y = from.top - r.top + Math.random() * from.height * 0.3;
            const vx = (Math.random() - 0.5) * (small() ? 12 : 22);
            const vy = -(10 + Math.random() * (small() ? 9 : 14));
            setTimeout(() => {
              add(x, y, vx, vy);
              wake();
              report();
            }, i * 14);
          }
        },
        shake: () => {
          for (const b of phones) {
            Sleeping.set(b, false);
            Body.setVelocity(b, { x: (Math.random() - 0.5) * 14, y: -(8 + Math.random() * 14) });
            Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.6);
          }
          wake();
        },
        clear: () => {
          for (const b of phones) Composite.remove(world, b);
          phones.length = 0;
          draw();
          report();
        },
        count: () => phones.length,
      };

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        host.removeEventListener("pointerdown", onDown, { capture: true });
        host.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        Events.off(engine, "collisionStart");
        Engine.clear(engine);
        api.current = null;
      };
    }
  }, []);

  return <canvas ref={canvas} className="pit" aria-hidden="true" />;
});

export default PhonePit;
