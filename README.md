# btc2iphone

How much bitcoin does an iPhone cost? A playful Next.js site with a live BTC
price, a 3D phone, a stack calculator and the Hall of Regret (every iPhone
priced in the bitcoin it cost at launch).

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How prices stay fresh

- **BTC price: real time.** The server renders the page with a spot price
  (Coinbase, then CoinGecko; cached for 5 minutes). In the browser,
  `src/lib/useBtcPrice.ts` streams the Coinbase WebSocket ticker and falls back
  to polling every 30 s if the socket drops.
- **iPhone prices: weekly.** `src/data/iphone.json` holds the current models
  (iPhone 18 Pro and the foldable iPhone Duo; visitors switch between them),
  their prices and the history. `.github/workflows/update-iphone-price.yml`
  runs `scripts/update-iphone-price.mjs` every Monday: it refreshes each
  model's starting price from apple.com, adds new model lines that appear on
  apple.com/iphone, and moves models Apple drops into the Hall of Regret.
  Changes are committed, which redeploys the site. Anything it can't parse is
  left alone. You can also run it by hand from the Actions tab or edit the JSON.

## What makes it move

| Where | Library |
| --- | --- |
| Realistic 3D iPhone 18 Pro and foldable iPhone Duo in the site's colours, with a live lock screen, pointer tilt, tap to spin and fold, and a Bitcoin coin (`PhoneScene.tsx`) | three.js |
| "Mining" intro loader, letter-by-letter headline, scribble underline, scroll reveals, pinned Hall of Regret scrubbed by scroll, speed-reactive marquee, throwable stickers, scrambled nav links, rolling numbers | GSAP (ScrollTrigger, SplitText-style chars, DrawSVG, ScrambleText, Draggable + Inertia) |
| Coin rain, phones popping into the calculator, the xylophone footer logo | anime.js |
| Escaped phones that pile up and can be grabbed, flung and shaken (`PhonePit.tsx`, loaded on demand) | Matter.js |
| Coin cursor with context labels and magnetic buttons (fine pointers only), slot-machine price, film grain, torn-paper edges, shareable brag card (`src/lib/brag.ts`) | CSS + canvas |
| Every sound effect (`src/lib/sound.ts`), synthesized with no audio files | Web Audio API |

All motion respects `prefers-reduced-motion`, and sound can be muted from the
nav (the choice is remembered). Tap the logo five times for a surprise.
