"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { PhoneForm } from "@/data/iphone";
import { BTC_B, BTC_DISC } from "./BtcLogo";

type Props = {
  form: PhoneForm;
  model: string;
  /** e.g. "943,588" */
  sats: string;
  /** e.g. "0.00944" */
  btcPer: string;
  /** e.g. "$127,012.44", or null while connecting */
  btcPrice: string | null;
  laser: boolean;
  onTap?: () => void;
};

// Theme
const INK = "#17140F";
const ORANGE = "#F7931A";
const BLUE = "#2D3BFF";
const CREAM = "#F3EEE3";
// Hardware finish: a burnt-orange titanium that sits inside the site palette
const FRAME = 0xd0671a;
const BACK = 0xe98a3a;

// Bar phone (≈ 71.9 × 150 × 8.7 mm) and one half of the book-style foldable
const BAR = { w: 3, h: 6.26, d: 0.22, r: 0.5, bezel: 0.07 };
const HALF = { w: 2.9, h: 4.5, d: 0.1, r: 0.36, bezel: 0.06 };
const BEVEL = 0.07;

/* ---------------------------------------------------------------- helpers */

/** Rounded rectangle; `r` may be one radius or [tl, tr, br, bl]. */
function roundedShape(w: number, h: number, r: number | [number, number, number, number]) {
  const [tl, tr, br, bl] = typeof r === "number" ? [r, r, r, r] : r;
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + bl, y);
  s.lineTo(x + w - br, y);
  if (br) s.quadraticCurveTo(x + w, y, x + w, y + br);
  s.lineTo(x + w, y + h - tr);
  if (tr) s.quadraticCurveTo(x + w, y + h, x + w - tr, y + h);
  s.lineTo(x + tl, y + h);
  if (tl) s.quadraticCurveTo(x, y + h, x, y + h - tl);
  s.lineTo(x, y + bl);
  if (bl) s.quadraticCurveTo(x, y, x + bl, y);
  return s;
}

type Radii = number | [number, number, number, number];
const shrink = (r: Radii, by: number): Radii =>
  typeof r === "number" ? Math.max(0, r - by) : (r.map((v) => (v ? Math.max(0, v - by) : 0)) as Radii);

/** Rounded rectangle plane with 0..1 UVs (optionally a sub-range of u). */
function roundedPlane(w: number, h: number, r: Radii, u0 = 0, u1 = 1) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 20);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = u0 + (pos.getX(i) / w + 0.5) * (u1 - u0);
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function bodyGeometry(w: number, h: number, d: number, r: Radii) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w - BEVEL * 2, h - BEVEL * 2, shrink(r, BEVEL)), {
    depth: d,
    bevelEnabled: true,
    bevelSize: BEVEL,
    bevelThickness: BEVEL,
    bevelSegments: 6,
    curveSegments: 24,
  });
  g.translate(0, 0, -d / 2);
  return g;
}

const disc = new Path2D(BTC_DISC);
const bee = new Path2D(BTC_B);

function drawBtcLogo(c: CanvasRenderingContext2D, cx: number, cy: number, size: number, outline = 0) {
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 64, size / 64);
  c.fillStyle = ORANGE;
  c.fill(disc);
  if (outline) {
    c.lineWidth = outline;
    c.strokeStyle = INK;
    c.stroke(disc);
  }
  c.fillStyle = "#FFFFFF";
  c.fill(bee);
  c.restore();
}

function canvasTexture(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { canvas, tex };
}

function wrap(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? line + " " + word : word;
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y);
      line = word;
      y += lh;
    } else line = test;
  }
  c.fillText(line, x, y);
  return y + lh;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

/* ------------------------------------------------------------ lock screen */

type ScreenInfo = Omit<Props, "form" | "onTap">;
type Fonts = { display: string; mono: string };

function readFonts(): Fonts {
  const root = getComputedStyle(document.documentElement);
  return {
    display: getComputedStyle(document.body).fontFamily || "system-ui, sans-serif",
    mono: root.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace",
  };
}

function wallpaper(c: CanvasRenderingContext2D, W: number, H: number) {
  c.fillStyle = BLUE;
  c.fillRect(0, 0, W, H);
  // A giant coin peeking in from the corner, sticker-style
  c.save();
  c.translate(W * 0.86, H * 0.9);
  c.rotate(-0.35);
  drawBtcLogo(c, 0, 0, Math.max(W, H) * 0.72, 2);
  c.restore();
  // Cream confetti dots
  c.fillStyle = CREAM;
  for (const [x, y, r] of [
    [0.12, 0.62, 0.012],
    [0.3, 0.7, 0.008],
    [0.78, 0.36, 0.01],
    [0.9, 0.12, 0.007],
    [0.08, 0.2, 0.006],
  ]) {
    c.beginPath();
    c.arc(W * x, H * y, Math.min(W, H) * r * 2, 0, Math.PI * 2);
    c.fill();
  }
}

function clock() {
  const d = new Date();
  return {
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }),
    date: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  };
}

function notification(c: CanvasRenderingContext2D, f: Fonts, info: ScreenInfo, x: number, y: number, w: number, u: number) {
  const pad = 22 * u;
  c.fillStyle = "rgba(243,238,227,0.94)";
  roundRect(c, x, y, w, 196 * u, 34 * u);
  c.fill();
  c.lineWidth = 4 * u;
  c.strokeStyle = INK;
  c.stroke();
  // app icon
  c.fillStyle = INK;
  roundRect(c, x + pad, y + pad, 64 * u, 64 * u, 16 * u);
  c.fill();
  drawBtcLogo(c, x + pad + 32 * u, y + pad + 32 * u, 46 * u);
  c.fillStyle = INK;
  c.textAlign = "left";
  c.font = `800 ${28 * u}px ${f.display}`;
  c.fillText("btc2iphone", x + pad + 82 * u, y + pad + 26 * u);
  c.font = `600 ${22 * u}px ${f.display}`;
  c.fillStyle = "#4E4839";
  c.fillText("now", x + pad + 82 * u, y + pad + 56 * u);
  c.fillStyle = INK;
  c.font = `600 ${27 * u}px ${f.display}`;
  wrap(
    c,
    `1 ${info.model} = ${info.btcPer} BTC. That's ${info.sats} sats. Stack accordingly.`,
    x + pad,
    y + pad + 110 * u,
    w - pad * 2,
    34 * u
  );
}

function priceChip(c: CanvasRenderingContext2D, f: Fonts, info: ScreenInfo, cx: number, y: number, u: number) {
  const label = `BTC ${info.btcPrice ?? "…"}`;
  c.font = `800 ${26 * u}px ${f.mono}`;
  const w = c.measureText(label).width + 44 * u;
  c.fillStyle = ORANGE;
  roundRect(c, cx - w / 2, y, w, 52 * u, 26 * u);
  c.fill();
  c.lineWidth = 4 * u;
  c.strokeStyle = INK;
  c.stroke();
  c.fillStyle = INK;
  c.textAlign = "center";
  c.fillText(label, cx, y + 36 * u);
}

function lasers(c: CanvasRenderingContext2D, W: number, H: number, y0: number, y1: number) {
  c.save();
  c.strokeStyle = "#FF2A1F";
  c.shadowColor = "#FF2A1F";
  c.shadowBlur = 30;
  c.lineWidth = Math.min(W, H) * 0.03;
  c.beginPath();
  c.moveTo(-20, y0);
  c.lineTo(W + 20, y1);
  c.moveTo(-20, y1);
  c.lineTo(W + 20, y0);
  c.stroke();
  c.restore();
}

/** Portrait lock screen for the bar phone, or the foldable's cover screen. */
function drawPortrait(canvas: HTMLCanvasElement, info: ScreenInfo, f: Fonts, island: boolean) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height,
    u = W / 600;
  const { time, date } = clock();
  wallpaper(c, W, H);
  c.fillStyle = "#FFFFFF";
  c.textAlign = "center";
  // status bar
  c.font = `700 ${24 * u}px ${f.display}`;
  c.textAlign = "left";
  c.fillText("SATS", 48 * u, 62 * u);
  c.fillStyle = "#FFFFFF";
  roundRect(c, W - 100 * u, 42 * u, 50 * u, 24 * u, 7 * u);
  c.fill();
  if (island) {
    c.fillStyle = "#000";
    roundRect(c, W / 2 - 100 * u, 26 * u, 200 * u, 58 * u, 29 * u);
    c.fill();
  } else {
    c.fillStyle = "#000";
    c.beginPath();
    c.arc(W / 2, 52 * u, 16 * u, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#FFFFFF";
  c.textAlign = "center";
  c.font = `600 ${30 * u}px ${f.display}`;
  c.fillText(date, W / 2, 170 * u);
  c.font = `800 ${200 * u}px ${f.display}`;
  c.fillText(time, W / 2, 360 * u);
  priceChip(c, f, info, W / 2, 400 * u, u);
  if (H / W > 1.8) notification(c, f, info, 36 * u, H - 470 * u, W - 72 * u, u);
  else {
    c.fillStyle = INK;
    roundRect(c, 40 * u, H - 330 * u, W - 80 * u, 150 * u, 30 * u);
    c.fill();
    c.fillStyle = "#FFFFFF";
    c.font = `800 ${58 * u}px ${f.mono}`;
    c.fillText(info.sats, W / 2, H - 258 * u);
    c.fillStyle = ORANGE;
    c.font = `700 ${26 * u}px ${f.display}`;
    c.fillText(`sats per ${info.model}`, W / 2, H - 214 * u);
  }
  // bottom controls
  c.fillStyle = "rgba(23,20,15,0.45)";
  for (const x of [90 * u, W - 90 * u]) {
    c.beginPath();
    c.arc(x, H - 110 * u, 44 * u, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#FFFFFF";
  roundRect(c, W / 2 - 90 * u, H - 34 * u, 180 * u, 10 * u, 5 * u);
  c.fill();
  if (info.laser) lasers(c, W, H, H * 0.12, H * 0.32);
}

/** Landscape inner display of the unfolded foldable. */
function drawInner(canvas: HTMLCanvasElement, info: ScreenInfo, f: Fonts) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width,
    H = canvas.height,
    u = H / 900;
  const { time, date } = clock();
  wallpaper(c, W, H);
  // crease hint
  c.fillStyle = "rgba(0,0,0,0.12)";
  c.fillRect(W / 2 - 2 * u, 0, 4 * u, H);
  c.fillStyle = "#000";
  c.beginPath();
  c.arc(W * 0.75, 44 * u, 15 * u, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#FFFFFF";
  c.textAlign = "left";
  c.font = `600 ${34 * u}px ${f.display}`;
  c.fillText(date, 70 * u, 150 * u);
  c.font = `800 ${220 * u}px ${f.display}`;
  c.fillText(time, 60 * u, 360 * u);
  c.font = `800 ${72 * u}px ${f.mono}`;
  c.fillText(info.sats, 70 * u, 560 * u);
  c.font = `600 ${30 * u}px ${f.display}`;
  c.fillText(`sats per ${info.model}`, 74 * u, 606 * u);
  priceChip(c, f, info, 70 * u + 170 * u, 660 * u, u);
  notification(c, f, info, W / 2 + 60 * u, 110 * u, W / 2 - 120 * u, u * 1.05);
  c.fillStyle = "#FFFFFF";
  roundRect(c, W / 2 - 110 * u, H - 30 * u, 220 * u, 10 * u, 5 * u);
  c.fill();
  if (info.laser) lasers(c, W, H, H * 0.18, H * 0.48);
}

/* --------------------------------------------------------------- hardware */

type Mats = ReturnType<typeof materials>;

function materials(env: THREE.Texture) {
  return {
    frame: new THREE.MeshPhysicalMaterial({ color: FRAME, metalness: 1, roughness: 0.28, envMap: env, envMapIntensity: 1.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0, roughness: 0.05, clearcoat: 1, envMap: env }),
    back: new THREE.MeshPhysicalMaterial({ color: BACK, metalness: 0.15, roughness: 0.55, clearcoat: 0.3, envMap: env }),
    plateau: new THREE.MeshPhysicalMaterial({ color: FRAME, metalness: 0.6, roughness: 0.35, envMap: env }),
    lensRing: new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, metalness: 1, roughness: 0.2, envMap: env }),
    lensGlass: new THREE.MeshPhysicalMaterial({ color: 0x07080f, metalness: 0.2, roughness: 0, clearcoat: 1, envMap: env }),
    flash: new THREE.MeshStandardMaterial({ color: 0xf6e7c8, roughness: 0.4 }),
  };
}

function lens(m: Mats, r: number) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, 48), m.lensRing);
  ring.rotation.x = Math.PI / 2;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.78, 48), m.lensGlass);
  glass.position.z = 0.036;
  const shine = new THREE.Mesh(
    new THREE.CircleGeometry(r * 0.2, 24),
    new THREE.MeshBasicMaterial({ color: 0x3b4bff, transparent: true, opacity: 0.55 })
  );
  shine.position.set(-r * 0.25, r * 0.25, 0.037);
  g.add(ring, glass, shine);
  return g;
}

function logoDecal(size: number) {
  const { canvas, tex } = canvasTexture(256, 256);
  drawBtcLogo(canvas.getContext("2d")!, 128, 128, 236, 5);
  tex.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

function sideButtons(m: Mats, w: number, specs: [side: -1 | 1, y: number, len: number][]) {
  const g = new THREE.Group();
  for (const [side, y, len] of specs) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, len, 4, 12), m.frame);
    b.position.set(side * (w / 2 + 0.01), y, 0);
    g.add(b);
  }
  return g;
}

function buildBar(m: Mats, screenTex: THREE.Texture) {
  const { w, h, d, r, bezel } = BAR;
  const g = new THREE.Group();
  const zf = d / 2 + BEVEL;

  g.add(new THREE.Mesh(bodyGeometry(w, h, d, r), m.frame));

  const front = new THREE.Mesh(roundedPlane(w - 0.12, h - 0.12, r - 0.06), m.glass);
  front.position.z = zf + 0.001;
  const screen = new THREE.Mesh(
    roundedPlane(w - 0.12 - bezel * 2, h - 0.12 - bezel * 2, r - 0.1),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screen.position.z = zf + 0.002;
  g.add(front, screen);

  // Back: matte glass, full-width camera plateau, Bitcoin logo
  const back = new THREE.Mesh(roundedPlane(w - 0.12, h - 0.12, r - 0.06), m.back);
  back.rotation.y = Math.PI;
  back.position.z = -zf - 0.001;
  const plateau = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(w - 0.3, 1.55, 0.36), {
      depth: 0.05,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 3,
    }),
    m.plateau
  );
  plateau.rotation.y = Math.PI;
  plateau.position.set(0, h / 2 - 1.0, -zf);
  const cams = new THREE.Group();
  for (const [x, y] of [
    [-0.78, 0.36],
    [-0.78, -0.36],
    [-0.18, 0],
  ]) {
    const l = lens(m, 0.29);
    l.position.set(x, y, 0);
    cams.add(l);
  }
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), m.flash);
  flash.position.set(0.8, 0.34, 0.001);
  const lidar = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), m.lensGlass);
  lidar.position.set(0.8, -0.34, 0.001);
  cams.add(flash, lidar);
  cams.rotation.y = Math.PI;
  cams.position.set(0, h / 2 - 1.0, -zf - 0.12);
  const logo = logoDecal(0.9);
  logo.rotation.y = Math.PI;
  logo.position.set(0, -0.3, -zf - 0.003);
  g.add(back, plateau, cams, logo);

  g.add(
    sideButtons(m, w, [
      [-1, 1.75, 0.2],
      [-1, 1.2, 0.4],
      [-1, 0.6, 0.4],
      [1, 1.3, 0.62],
      [1, -0.5, 0.3],
    ])
  );
  return g;
}

/** Book-style foldable. Returns the group and a setter for the fold (0 = open, 1 = shut). */
function buildFoldable(m: Mats, innerTex: THREE.Texture, coverTex: THREE.Texture) {
  const { w, h, d, r, bezel } = HALF;
  const zf = d / 2 + BEVEL;
  const root = new THREE.Group();

  // Each half is square at the spine so the open phone reads as one slab
  // with one continuous inner display.
  const half = (u0: number, u1: number) => {
    const spineRight = u0 === 0; // left half: spine on its right edge
    const radii: Radii = spineRight ? [r, 0, 0, r] : [0, r, r, 0];
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bodyGeometry(w, h, d, radii), m.frame));
    const front = new THREE.Mesh(roundedPlane(w - 0.06, h - 0.1, shrink(radii, 0.05)), m.glass);
    front.position.set((spineRight ? 1 : -1) * 0.03, 0, zf + 0.001);
    const sw = w - bezel - 0.05;
    const screen = new THREE.Mesh(
      roundedPlane(sw, h - 0.1 - bezel * 2, shrink(radii, 0.08), u0, u1),
      new THREE.MeshBasicMaterial({ map: innerTex, toneMapped: false })
    );
    screen.position.set(((spineRight ? 1 : -1) * (w - sw)) / 2, 0, zf + 0.002);
    g.add(front, screen);
    return g;
  };

  // Right half: fixed. Its back carries the cameras and logo.
  const right = half(0.5, 1);
  right.position.x = w / 2;
  const back = new THREE.Mesh(roundedPlane(w - 0.06, h - 0.1, [r - 0.05, 0, 0, r - 0.05]), m.back);
  back.rotation.y = Math.PI;
  back.position.set(-0.03, 0, -zf - 0.001);
  const pill = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(0.62, 1.3, 0.3), { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }),
    m.plateau
  );
  pill.rotation.y = Math.PI;
  pill.position.set(w / 2 - 0.55, h / 2 - 0.9, -zf);
  const cams = new THREE.Group();
  for (const y of [0.3, -0.3]) {
    const l = lens(m, 0.22);
    l.position.set(0, y, 0);
    cams.add(l);
  }
  cams.rotation.y = Math.PI;
  cams.position.set(w / 2 - 0.55, h / 2 - 0.9, -zf - 0.09);
  const logo = logoDecal(0.8);
  logo.rotation.y = Math.PI;
  logo.position.set(0, -0.2, -zf - 0.003);
  right.add(back, pill, cams, logo, sideButtons(m, w, [[1, 1.2, 0.5]]));

  // Left half hinges on the spine; its back is the cover screen.
  const hinge = new THREE.Group();
  hinge.position.z = zf;
  const left = half(0, 0.5);
  left.position.set(-w / 2, 0, -zf);
  const coverGlass = new THREE.Mesh(roundedPlane(w - 0.06, h - 0.1, [0, r - 0.05, r - 0.05, 0]), m.glass);
  coverGlass.rotation.y = Math.PI;
  coverGlass.position.set(0.03, 0, -zf - 0.001);
  const cover = new THREE.Mesh(
    roundedPlane(w - 0.1 - bezel * 2, h - 0.1 - bezel * 2, r - 0.08),
    new THREE.MeshBasicMaterial({ map: coverTex, toneMapped: false })
  );
  cover.rotation.y = Math.PI;
  cover.position.z = -zf - 0.002;
  left.add(coverGlass, cover);
  hinge.add(left);

  const spine = new THREE.Mesh(new THREE.CapsuleGeometry(zf, h - 0.5, 6, 16), m.frame);
  spine.position.z = 0;

  root.add(right, hinge, spine);

  const setFold = (f: number) => {
    hinge.rotation.y = f * Math.PI * 0.985;
    root.position.x = (-f * w) / 2;
    spine.visible = f > 0.05;
  };
  setFold(0);
  return { root, setFold };
}

/** Coin with the real Bitcoin mark on both faces. */
function buildCoin(env: THREE.Texture) {
  const R = 0.95,
    T = 0.16;
  const { canvas, tex } = canvasTexture(512, 512);
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#C46F00";
  c.fillRect(0, 0, 512, 512);
  drawBtcLogo(c, 256, 256, 500, 3);
  tex.needsUpdate = true;
  const faceMat = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.35, roughness: 0.35, clearcoat: 0.6, envMap: env });
  const g = new THREE.Group();
  const edge = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, T, 72, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xb85f00, metalness: 0.9, roughness: 0.3, envMap: env })
  );
  edge.rotation.x = Math.PI / 2;
  const front = new THREE.Mesh(new THREE.CircleGeometry(R, 72), faceMat);
  front.position.z = T / 2;
  const back = new THREE.Mesh(new THREE.CircleGeometry(R, 72), faceMat);
  back.rotation.y = Math.PI;
  back.position.z = -T / 2;
  g.add(edge, front, back);
  return g;
}

/* ------------------------------------------------------------- component */

/**
 * A realistic phone (bar or foldable) rendered with three.js, wearing the
 * site's colours: tilts toward the pointer, idles, spins on tap, and the
 * foldable opens up. A Bitcoin coin orbits in front.
 */
export default function PhoneScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const api = useRef<{ redraw: () => void } | null>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 16);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(5, 7, 9);
    scene.add(key);

    const m = materials(env);
    const barScreen = canvasTexture(600, 1300);
    const inner = canvasTexture(1200, 940);
    const cover = canvasTexture(600, 940);

    const bar = buildBar(m, barScreen.tex);
    const fold = buildFoldable(m, inner.tex, cover.tex);
    const rig = new THREE.Group();
    const holder = new THREE.Group();
    holder.add(bar, fold.root);
    rig.add(holder);
    scene.add(rig);

    const coin = buildCoin(env);
    const coinPivot = new THREE.Group();
    coinPivot.add(coin);
    scene.add(coinPivot);

    let fonts = readFonts();
    const redraw = () => {
      const p = live.current;
      const info: ScreenInfo = { model: p.model, sats: p.sats, btcPer: p.btcPer, btcPrice: p.btcPrice, laser: p.laser };
      drawPortrait(barScreen.canvas, info, fonts, true);
      drawInner(inner.canvas, info, fonts);
      drawPortrait(cover.canvas, info, fonts, false);
      barScreen.tex.needsUpdate = inner.tex.needsUpdate = cover.tex.needsUpdate = true;
    };
    redraw();
    document.fonts?.ready.then(() => {
      fonts = readFonts();
      redraw();
    });
    const clockTimer = setInterval(redraw, 30_000);

    // Motion state
    let shown: PhoneForm = live.current.form;
    bar.visible = shown === "bar";
    fold.root.visible = shown === "foldable";
    let pop = 1; // 0..1 scale-in when switching models
    let swapping = false;
    let foldT = shown === "foldable" ? 1 : 0; // current fold
    let foldTarget = 0;
    let spin = 0; // extra spin on tap, radians remaining
    const target = { x: 0, y: 0 };

    let tapped = false;
    api.current = { redraw };

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

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.y = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
      target.x = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
    };
    const onLeave = () => {
      target.x = target.y = 0;
    };
    const onClick = () => {
      tapped = true;
      live.current.onTap?.();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    const clock3 = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.max(0, Math.min(clock3.getDelta(), 0.05));
      const t = clock3.elapsedTime;
      const want = live.current.form;

      if (tapped) {
        tapped = false;
        if (shown === "foldable") foldTarget = foldTarget ? 0 : 1;
        spin += Math.PI * 2;
      }
      // Model switch: shrink, swap, pop back in
      if (want !== shown && !swapping) swapping = true;
      if (swapping) {
        pop = Math.max(0, pop - dt * 4);
        if (pop === 0) {
          shown = want;
          bar.visible = shown === "bar";
          fold.root.visible = shown === "foldable";
          foldT = 1;
          foldTarget = 0; // arrive shut, then unfold
          swapping = false;
          spin += Math.PI * 2;
        }
      } else pop = Math.min(1, pop + dt * 2.2);

      foldT += (foldTarget - foldT) * Math.min(1, dt * 3.2);
      fold.setFold(foldT);

      const spinStep = spin > 0 ? Math.min(spin, dt * (2.5 + spin * 1.1)) : 0;
      spin -= spinStep;
      const idle = reduced ? 0 : Math.sin(t * 0.6) * 0.22;
      rig.rotation.x += (target.x + 0.06 - rig.rotation.x) * 0.08;
      holder.rotation.y += spinStep;
      holder.rotation.y %= Math.PI * 2;
      rig.rotation.y += (target.y + idle - 0.18 - rig.rotation.y) * 0.06;
      rig.position.y = reduced ? 0 : Math.sin(t * 1.3) * 0.12;
      const base = shown === "foldable" ? 0.9 + foldT * 0.25 : 1;
      rig.scale.setScalar(base * easeOutBack(pop));

      // Coin floats at the lower right of the phone
      coinPivot.position.set(shown === "foldable" ? 2.45 - foldT * 0.35 : 2.1, -2.3 + Math.sin(t * 1.8) * 0.15, 1.6);
      coin.rotation.y += dt * (reduced ? 0.5 : 2.2);
      coin.rotation.x = 0.2;

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(clockTimer);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat) => {
            (mat as THREE.MeshBasicMaterial).map?.dispose();
            mat.dispose();
          });
        }
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, []);

  // Repaint screens when the numbers change
  useEffect(() => {
    api.current?.redraw();
  }, [props.model, props.sats, props.btcPer, props.btcPrice, props.laser]);

  return (
    <div
      ref={mount}
      className="phone-scene"
      role="img"
      aria-label={`A 3D ${props.model} whose lock screen reads ${props.sats} sats per ${props.model}. Click it to spin${
        props.form === "foldable" ? " and fold" : ""
      }.`}
    />
  );
}

function easeOutBack(x: number) {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
