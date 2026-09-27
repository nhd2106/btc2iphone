"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  /** Big number drawn on the phone screen. */
  sats: string;
  model: string;
  laser: boolean;
  onTap?: () => void;
};

const INK = "#17140F";
const ORANGE = "#F7931A";
const BLUE = "#2D3BFF";

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function drawScreen(canvas: HTMLCanvasElement, sats: string, model: string, laser: boolean) {
  const c = canvas.getContext("2d")!;
  const { width: W, height: H } = canvas;
  c.fillStyle = BLUE;
  c.fillRect(0, 0, W, H);
  // Dynamic island
  c.fillStyle = INK;
  c.beginPath();
  c.roundRect(W / 2 - 110, 40, 220, 60, 30);
  c.fill();
  c.fillStyle = "#FFFFFF";
  c.textAlign = "center";
  c.font = "800 92px 'JetBrains Mono', ui-monospace, monospace";
  c.fillText(sats, W / 2, H * 0.78, W - 60);
  c.font = "600 44px 'Bricolage Grotesque', system-ui, sans-serif";
  c.fillText(`sats per ${model}`, W / 2, H * 0.78 + 70, W - 60);
  if (laser) {
    c.save();
    c.strokeStyle = "#FF2A1F";
    c.shadowColor = "#FF2A1F";
    c.shadowBlur = 30;
    c.lineWidth = 18;
    c.beginPath();
    c.moveTo(-20, H * 0.24);
    c.lineTo(W + 20, H * 0.5);
    c.moveTo(-20, H * 0.5);
    c.lineTo(W + 20, H * 0.24);
    c.stroke();
    c.restore();
  }
}

function coinFace() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const c = cv.getContext("2d")!;
  c.fillStyle = ORANGE;
  c.fillRect(0, 0, 512, 512);
  c.strokeStyle = INK;
  c.lineWidth = 26;
  c.beginPath();
  c.arc(256, 256, 226, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = INK;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = "800 300px 'JetBrains Mono', ui-monospace, monospace";
  c.fillText("₿", 256, 270);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A chunky 3D phone with a spinning bitcoin in front of it. Tilts toward
 * the pointer, bobs while idle, and does a flip when tapped.
 */
export default function PhoneScene({ sats, model, laser, onTap }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const screenRef = useRef<{ canvas: HTMLCanvasElement; tex: THREE.CanvasTexture } | null>(null);
  const flipRef = useRef(0);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 8);
    scene.add(key);

    const rig = new THREE.Group();
    scene.add(rig);

    // Body
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRect(3, 6.1, 0.55), {
        depth: 0.34,
        bevelEnabled: true,
        bevelSize: 0.08,
        bevelThickness: 0.08,
        bevelSegments: 4,
        curveSegments: 16,
      }),
      new THREE.MeshStandardMaterial({ color: INK, roughness: 0.45, metalness: 0.2 })
    );
    body.position.z = -0.17;
    rig.add(body);

    // Hard offset "sticker shadow" plate behind the phone
    const shadow = new THREE.Mesh(
      new THREE.ShapeGeometry(roundedRect(3.1, 6.2, 0.6), 16),
      new THREE.MeshBasicMaterial({ color: 0xd9cfbc })
    );
    shadow.position.set(0.45, -0.5, -0.4);
    rig.add(shadow);

    // Screen
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 1240;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    screenRef.current = { canvas, tex };
    const screenGeo = new THREE.ShapeGeometry(roundedRect(2.7, 5.8, 0.42), 16);
    // Map UVs from shape coords to 0..1
    const pos = screenGeo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / 2.7 + 0.5;
      uv[i * 2 + 1] = pos.getY(i) / 5.8 + 0.5;
    }
    screenGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.z = 0.27;
    rig.add(screen);

    // Coin
    const face = coinFace();
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.2, 64), [
      new THREE.MeshStandardMaterial({ color: 0xc46f00, roughness: 0.35, metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: face, roughness: 0.4, metalness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: face, roughness: 0.4, metalness: 0.25 }),
    ]);
    coin.rotation.x = Math.PI / 2;
    const coinPivot = new THREE.Group();
    coinPivot.position.set(0, 0.75, 0.9);
    coinPivot.add(coin);
    rig.add(coinPivot);

    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px";
      renderer.domElement.style.height = h + "px";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.y = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
      target.x = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    };
    const onLeave = () => {
      target.x = target.y = 0;
    };
    const onClick = () => {
      flipRef.current = 1;
      tapRef.current?.();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const clock = new THREE.Clock();
    let flip = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (flipRef.current) {
        flip = 1;
        flipRef.current = 0;
      }
      flip = Math.max(0, flip - dt * 1.4);
      const flipAngle = (1 - easeOut(1 - flip)) * Math.PI * 2;
      rig.rotation.x += (target.x - rig.rotation.x) * 0.08;
      rig.rotation.y += (target.y + flipAngle - rig.rotation.y) * (flip > 0 ? 1 : 0.08);
      rig.position.y = reduced ? 0 : Math.sin(t * 1.4) * 0.18;
      coin.rotation.z += dt * (reduced ? 0.4 : 2.4 + flip * 14);
      renderer.render(scene, camera);
    };
    loop();

    document.fonts?.ready.then(() => {
      face.needsUpdate = true;
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      screenRef.current = null;
    };
  }, []);

  // Redraw the screen when the price (or laser mode) changes.
  useEffect(() => {
    const s = screenRef.current;
    if (!s) return;
    const draw = () => {
      drawScreen(s.canvas, sats, model, laser);
      s.tex.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [sats, model, laser]);

  return (
    <div
      ref={mount}
      className="phone-scene"
      role="img"
      aria-label={`A 3D phone showing ${sats} sats per ${model}. Click it to flip.`}
    />
  );
}

function easeOut(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
