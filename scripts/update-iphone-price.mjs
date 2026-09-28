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

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The "From $X" price shown right after the model's own name. Apple pages
 * also advertise cheaper models and trade-in offers, so a price anywhere
 * else on the page is ignored. Returns the most common match, or null.
 */
export function startingPrice(html, model) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|\s+/g, " ");
  const counts = new Map();
  for (const m of text.matchAll(new RegExp(escapeRe(model) + "(?! ?(?:Max|Plus|mini)\\b)", "gi"))) {
    const near = text.slice(m.index, m.index + 300);
    const hit = near.match(/From \$ ?(\d{1,3}(?:,\d{3})+|\d{3,4})(?:\.\d{2})?/);
    if (!hit) continue;
    const v = Number(hit[1].replace(/,/g, ""));
    if (v >= 399 && v <= 3999) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = null;
  for (const [v, n] of counts) if (!best || n > best[1]) best = [v, n];
  return best ? best[0] : null;
}

/** Biggest believable weekly change; anything larger is treated as a misread. */
const MAX_CHANGE = 0.25;

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

async function priceFor(slug, model) {
  for (const url of [`https://www.apple.com/${slug}/`, `https://www.apple.com/shop/buy-iphone/${slug}`]) {
    try {
      const p = startingPrice(await text(url), model);
      if (p) return p;
    } catch (e) {
      console.warn(String(e));
    }
  }
  return null;
}

/** True only when Apple's page for the model is really gone (404/410). */
async function pageGone(slug) {
  try {
    const res = await fetch(`https://www.apple.com/${slug}/`, { headers: UA, signal: AbortSignal.timeout(15000) });
    return res.status === 404 || res.status === 410;
  } catch {
    return false;
  }
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
    if (!slugs.includes(c.slug) && (await pageGone(c.slug))) {
      data.history.push({
        year: Number(c.since.slice(0, 4)),
        model: c.model,
        btc: Number((c.launchBtc ?? c.priceUsd / btc).toPrecision(3)),
        joke: JOKES[data.history.length % JOKES.length],
      });
      console.log(`Retired ${c.model} to the Hall of Regret`);
      continue;
    }
    let usd = await priceFor(c.slug, c.model);
    if (usd && Math.abs(usd - c.priceUsd) / c.priceUsd > MAX_CHANGE) {
      console.warn(`::warning::${c.model}: read $${usd} but have $${c.priceUsd}; change too big, keeping $${c.priceUsd}`);
      usd = null;
    }
    if (usd && usd !== c.priceUsd) console.log(`${c.model}: $${c.priceUsd} → $${usd}`);
    const priceUsd = usd ?? c.priceUsd;
    next.push({ ...c, priceUsd, launchBtc: c.launchBtc ?? Number((priceUsd / btc).toPrecision(3)) });
  }

  // Add brand-new model lines (only newer numbers, or new form factors)
  const maxNum = Math.max(0, ...data.current.map((c) => Number(c.slug.match(/\d+/)?.[0] ?? 0)));
  for (const slug of slugs) {
    if (bySlug.has(slug)) continue;
    const num = Number(slug.match(/\d+/)?.[0] ?? 0);
    const isNewForm = !num && /duo|fold|flip/.test(slug);
    if (!(num > maxNum || isNewForm)) continue;
    const name = nameFromSlug(slug);
    const usd = await priceFor(slug, name);
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
