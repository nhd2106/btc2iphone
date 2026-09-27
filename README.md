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
| Headline intro, scroll reveals, marquee, chart line draw, rolling numbers, ticker flash | GSAP + ScrollTrigger |
| Coin rain, phone icons popping into the calculator | anime.js |
| Every sound effect (`src/lib/sound.ts`), synthesized with no audio files | Web Audio API |

All motion respects `prefers-reduced-motion`, and sound can be muted from the
nav (the choice is remembered). Tap the logo five times for a surprise.
