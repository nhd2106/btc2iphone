#!/usr/bin/env node
// Weekly job: find Apple's newest base iPhone and its US starting price, and
// update src/data/iphone.json. When a new model appears, the previous one is
// moved into the Hall of Regret with the BTC price it had while current.
//
// Every scrape is best effort: if anything can't be parsed, the file is left
// untouched and the job exits 0, so a changed Apple page never breaks the site.

import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/iphone.json", import.meta.url);
const UA = { "user-agent": "Mozilla/5.0 (btc2iphone weekly price check)" };
const today = new Date().toISOString().slice(0, 10);

const JOKES = [
  "New phone, same regret.",
  "Thinner phone. Thinner stack.",
  "The camera got better. The HODLing didn’t.",
  "Apple Intelligence. Your trading, less so.",
];

async function text(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function latestModelNumber() {
  const html = await text("https://www.apple.com/iphone/");
  const nums = [...html.matchAll(/iPhone\s+(\d{2})(?!\d)/g)].map((m) => Number(m[1])).filter((n) => n >= 15 && n < 40);
  if (!nums.length) throw new Error("no iPhone model numbers found");
  return Math.max(...nums);
}

function startingPrice(html) {
  const found = [
    ...[...html.matchAll(/From\s*\$\s?(\d{3,4}(?:,\d{3})?)(?:\.\d{2})?/g)].map((m) => m[1]),
    ...[...html.matchAll(/"(?:amount|currentPrice|price)"\s*:\s*"?(\d{3,4})(?:\.\d{2})?"?/g)].map((m) => m[1]),
  ]
    .map((v) => Number(String(v).replace(/,/g, "")))
    .filter((v) => v >= 399 && v <= 2999);
  return found.length ? Math.min(...found) : null;
}

async function priceFor(n) {
  for (const url of [`https://www.apple.com/shop/buy-iphone/iphone-${n}`, `https://www.apple.com/iphone-${n}/`]) {
    try {
      const p = startingPrice(await text(url));
      if (p) return p;
    } catch (e) {
      console.warn(String(e));
    }
  }
  return null;
}

async function btcUsd() {
  const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", { signal: AbortSignal.timeout(10000) });
  const price = Number((await res.json())?.data?.amount);
  if (!(price > 0)) throw new Error("bad BTC price");
  return price;
}

async function main() {
  const data = JSON.parse(await readFile(FILE, "utf8"));
  const cur = data.current;

  let n, usd, btc;
  try {
    n = await latestModelNumber();
    usd = await priceFor(n);
    btc = await btcUsd();
  } catch (e) {
    console.warn("Skipping update:", String(e));
    return;
  }
  if (!usd) {
    console.warn(`Skipping update: no price found for iPhone ${n}`);
    return;
  }

  const model = `iPhone ${n}`;
  if (model !== cur.model) {
    data.history.push({
      year: Number(cur.since.slice(0, 4)),
      model: cur.model,
      btc: Number(cur.launchBtc.toPrecision(3)),
      joke: JOKES[data.history.length % JOKES.length],
    });
    data.current = {
      model,
      priceUsd: usd,
      launchBtc: Number((usd / btc).toPrecision(3)),
      since: today,
      checkedAt: today,
    };
    console.log(`New model: ${cur.model} → ${model} at $${usd}`);
  } else {
    if (usd !== cur.priceUsd) console.log(`${model}: $${cur.priceUsd} → $${usd}`);
    data.current = { ...cur, priceUsd: usd, checkedAt: today };
  }

  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`Checked ${model}: $${usd} (BTC $${btc.toFixed(0)})`);
}

main();
