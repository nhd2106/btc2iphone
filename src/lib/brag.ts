import { BTC_B, BTC_DISC } from "@/components/BtcLogo";

type Brag = { stack: string; count: string; verdict: string; model: string };

const INK = "#17140F";
const CREAM = "#F3EEE3";
const ORANGE = "#F7931A";
const BLUE = "#2D3BFF";

function fonts() {
  const root = getComputedStyle(document.documentElement);
  return {
    display: getComputedStyle(document.body).fontFamily,
    mono: root.getPropertyValue("--font-mono").trim() || "monospace",
  };
}

/** Draws a 1200×630 sticker-style brag card. */
export function drawBrag(b: Brag): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = 1200;
  cv.height = 630;
  const c = cv.getContext("2d")!;
  const f = fonts();

  c.fillStyle = CREAM;
  c.fillRect(0, 0, 1200, 630);
  // hard-shadow card
  c.fillStyle = INK;
  c.beginPath();
  c.roundRect(62, 62, 1090, 520, 36);
  c.fill();
  c.fillStyle = "#FFFFFF";
  c.beginPath();
  c.roundRect(48, 48, 1090, 520, 36);
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = INK;
  c.stroke();

  // coin
  c.save();
  c.translate(930, 150);
  c.rotate(0.25);
  c.scale(3.2, 3.2);
  c.translate(-32, -32);
  c.fillStyle = ORANGE;
  c.fill(new Path2D(BTC_DISC));
  c.lineWidth = 2;
  c.strokeStyle = INK;
  c.stroke(new Path2D(BTC_DISC));
  c.fillStyle = "#FFFFFF";
  c.fill(new Path2D(BTC_B));
  c.restore();

  c.fillStyle = INK;
  c.font = `800 44px ${f.display}`;
  c.fillText(`My ${b.stack} BTC buys`, 100, 150);
  c.fillStyle = ORANGE;
  c.font = `800 ${b.count.length > 9 ? 110 : 150}px ${f.mono}`;
  c.fillText(b.count, 96, 310);
  c.fillStyle = INK;
  c.font = `800 56px ${f.display}`;
  c.fillText(`${b.model}s`, 100, 385);
  c.font = `600 34px ${f.display}`;
  c.fillStyle = "#4E4839";
  c.fillText(b.verdict, 100, 450);

  // footer pill
  c.fillStyle = BLUE;
  c.beginPath();
  c.roundRect(100, 490, 330, 56, 28);
  c.fill();
  c.fillStyle = "#FFFFFF";
  c.font = `800 28px ${f.mono}`;
  c.fillText("btc2iphone.com", 124, 528);
  c.fillStyle = INK;
  c.font = `700 22px ${f.display}`;
  c.fillText("Not financial advice. Definitely not phone advice.", 460, 527);
  return cv;
}

/** Share the card via the Web Share API, or download it. */
export async function shareBrag(b: Brag) {
  const cv = drawBrag(b);
  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/png"));
  if (!blob) return;
  const file = new File([blob], "my-btc-iphones.png", { type: "image/png" });
  const text = `My ${b.stack} BTC buys ${b.count} ${b.model}s. ${b.verdict}`;
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, url: "https://btc2iphone.com" });
      return;
    }
  } catch {
    // user cancelled or share failed: fall through to download
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
