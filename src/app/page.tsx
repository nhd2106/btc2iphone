import { Metadata } from "next";
import Site from "@/components/Site";
import { currentIphone, iphoneHistory } from "@/data/iphone";

const title = "Bitcoin to iPhone Calculator | btc2iphone.com";
const description =
  "How much bitcoin does an iPhone cost? Live BTC price, a stack calculator and the Hall of Regret: every iPhone priced in bitcoin.";

export const metadata: Metadata = {
  metadataBase: new URL("https://btc2iphone.com"),
  title,
  description,
  keywords: "bitcoin, iPhone, calculator, exchange rate, sats, btc to iphone",
  openGraph: {
    title,
    description,
    url: "https://btc2iphone.com",
    type: "website",
    images: [{ url: "https://btc2iphone.com/iphone.png", width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description },
};

// The page is regenerated at least every 5 minutes; the browser then keeps
// the price live over a WebSocket. The iPhone price is bundled data that a
// weekly GitHub Action refreshes (see scripts/update-iphone-price.mjs).
export const revalidate = 300;

async function getInitialBtcPrice(): Promise<number | null> {
  const sources: [string, (d: any) => unknown][] = [
    ["https://api.coinbase.com/v2/prices/BTC-USD/spot", (d) => d?.data?.amount],
    ["https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", (d) => d?.bitcoin?.usd],
  ];
  for (const [url, pick] of sources) {
    try {
      const res = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const price = Number(pick(await res.json()));
      if (price > 0) return price;
    } catch {}
  }
  return null;
}

export default async function Home() {
  const initialPrice = await getInitialBtcPrice();
  return <Site initialPrice={initialPrice} iphone={currentIphone} history={iphoneHistory} />;
}
