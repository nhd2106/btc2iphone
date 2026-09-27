#!/usr/bin/env node
// Weekly job: refresh the US starting price of every current iPhone in
// src/data/iphone.json, and follow Apple's lineup:
//   - a model page that newly appears on apple.com/iphone (higher number,
//     or a new name like "duo") is added to `current`;
//   - a current model that disappears from apple.com/iphone moves into the
//     Hall of Regret with its BTC price.
//
// Everything is best effort: if a page can't be fetched or parsed, that part
// is skipped and the job still exits 0, so a changed Apple page never breaks
// the site. Review the committed diff like any other change.

import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../src/data/iphone.json", import.meta.url);
const UA = { "user-agent": "Mozilla/5.0 (btc2iphone weekly price check)" };
const today = new Date().toISOString().slice(0, 10);

const JOKES = [
  "New phone, same regret.",
  "Thinner phone. Thinner stack.",
  "The camera got better. The HODLing didn’t.",
  "It folds. So did your conviction.",
];

async function text(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

export function startingPrice(html) {
  const found = [
    ...[...html.matchAll(/From\s*\$\s?(\d{1,3}(?:,\d{3})+|\d{3,4})(?:\.\d{2})?/g)].map((m) => m[1]),
    ...[...html.matchAll(/"(?:amount|currentPrice|price)"\s*:\s*"?(\d{3,4})(?:\.\d{2})?"?/g)].map((m) => m[1]),
  ]
    .map((v) => Number(String(v).replace(/,/g, "")))
    .filter((v) => v >= 399 && v <= 3999);
  return found.length ? Math.min(...found) : null;
}

/** Model pages linked from apple.com/iphone, e.g. iphone-18-pro, iphone-duo. */
export function modelSlugs(html) {
  const slugs = new Set();
  for (const m of html.matchAll(/href="\/(iphone-(?:\d{2}(?:-pro)?|air|duo|fold|flip)[a-z0-9-]*)\/"/g)) {
    if (!/compare|switch|accessories|trade|support|ios|why|business|education/.test(m[1])) slugs.add(m[1]);
  }
  return [...slugs];
}

export const nameFromSlug = (slug) =>
  slug
    .replace(/^iphone-/, "iPhone ")
    .replace(/-/g, " ")
    .replace(/\b(pro|max|plus|air|duo|fold|flip|mini)\b/g, (w) => w[0].toUpperCase() + w.slice(1));

async function priceFor(slug) {
  for (const url of [`https://www.apple.com/shop/buy-iphone/${slug}`, `https://www.apple.com/${slug}/`]) {
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
  let btc, slugs;
  try {
    btc = await btcUsd();
    slugs = modelSlugs(await text("https://www.apple.com/iphone/"));
  } catch (e) {
    console.warn("Skipping update:", String(e));
    return;
  }
  if (!slugs.length) {
    console.warn("Skipping update: no model pages found on apple.com/iphone");
    return;
  }

  const bySlug = new Map(data.current.map((c) => [c.slug, c]));
  const next = [];

  // Refresh or retire current models
  for (const c of data.current) {
    if (!slugs.includes(c.slug)) {
      data.history.push({
        year: Number(c.since.slice(0, 4)),
        model: c.model,
        btc: Number((c.launchBtc ?? c.priceUsd / btc).toPrecision(3)),
        joke: JOKES[data.history.length % JOKES.length],
      });
      console.log(`Retired ${c.model} to the Hall of Regret`);
      continue;
    }
    const usd = await priceFor(c.slug);
    if (usd && usd !== c.priceUsd) console.log(`${c.model}: $${c.priceUsd} → $${usd}`);
    next.push({ ...c, priceUsd: usd ?? c.priceUsd, launchBtc: c.launchBtc ?? Number(((usd ?? c.priceUsd) / btc).toPrecision(3)) });
  }

  // Add brand-new model lines (only newer numbers, or new form factors)
  const maxNum = Math.max(0, ...data.current.map((c) => Number(c.slug.match(/\d+/)?.[0] ?? 0)));
  for (const slug of slugs) {
    if (bySlug.has(slug)) continue;
    const num = Number(slug.match(/\d+/)?.[0] ?? 0);
    const isNewForm = !num && /duo|fold|flip/.test(slug);
    if (!(num > maxNum || isNewForm)) continue;
    const usd = await priceFor(slug);
    if (!usd) continue;
    next.push({
      model: nameFromSlug(slug),
      slug,
      form: /duo|fold|flip/.test(slug) ? "foldable" : "bar",
      priceUsd: usd,
      since: today,
      launchBtc: Number((usd / btc).toPrecision(3)),
    });
    console.log(`New model: ${nameFromSlug(slug)} at $${usd}`);
  }

  if (!next.length) {
    console.warn("Skipping update: would leave no current models");
    return;
  }
  data.current = next;
  data.checkedAt = today;
  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`Checked ${next.length} model(s) · BTC $${btc.toFixed(0)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
