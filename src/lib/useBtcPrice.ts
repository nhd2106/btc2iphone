"use client";

import { useEffect, useRef, useState } from "react";

export type FeedStatus = "live" | "polling" | "offline";

export type BtcPrice = {
  price: number | null;
  /** 24h change in percent, when the feed provides it. */
  change24h: number | null;
  status: FeedStatus;
  /** Direction of the most recent move, for flashes and sounds. */
  lastMove: "up" | "down" | null;
  /** Increments on every price change. */
  tick: number;
};

const WS_URL = "wss://ws-feed.exchange.coinbase.com";
const POLL_MS = 30_000;
const UI_THROTTLE_MS = 1_000;

async function fetchSpot(): Promise<{ price: number; change24h: number | null } | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      { cache: "no-store" }
    );
    if (res.ok) {
      const d = await res.json();
      const price = Number(d?.bitcoin?.usd);
      if (price > 0) return { price, change24h: Number(d.bitcoin.usd_24h_change) || null };
    }
  } catch {}
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      const price = Number(d?.data?.amount);
      if (price > 0) return { price, change24h: null };
    }
  } catch {}
  return null;
}

/**
 * Real-time BTC/USD: Coinbase's public WebSocket ticker, with REST polling
 * (CoinGecko, then Coinbase) whenever the socket is down.
 */
export function useBtcPrice(initial: number | null): BtcPrice {
  const [state, setState] = useState<BtcPrice>({
    price: initial,
    change24h: null,
    status: "offline",
    lastMove: null,
    tick: 0,
  });
  const lastUi = useRef(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 2_000;
    let disposed = false;

    const push = (price: number, change24h: number | null, status: FeedStatus, force = false) => {
      const now = Date.now();
      if (!force && now - lastUi.current < UI_THROTTLE_MS) return;
      lastUi.current = now;
      setState((s) => {
        if (s.price === price && s.status === status) return s;
        const lastMove = s.price == null || s.price === price ? s.lastMove : price > s.price ? "up" : "down";
        return { price, change24h: change24h ?? s.change24h, status, lastMove, tick: s.tick + 1 };
      });
    };

    const poll = async () => {
      const r = await fetchSpot();
      if (disposed) return;
      if (r) push(r.price, r.change24h, "polling", true);
      else setState((s) => ({ ...s, status: s.status === "live" ? s.status : "offline" }));
    };

    const startPolling = () => {
      if (pollTimer) return;
      void poll();
      pollTimer = setInterval(poll, POLL_MS);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };

    const connect = () => {
      if (disposed) return;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        startPolling();
        return;
      }
      ws.onopen = () => {
        backoff = 2_000;
        ws?.send(JSON.stringify({ type: "subscribe", product_ids: ["BTC-USD"], channels: ["ticker"] }));
      };
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.type !== "ticker") return;
          const price = parseFloat(d.price);
          const open = parseFloat(d.open_24h);
          if (!(price > 0)) return;
          stopPolling();
          push(price, open > 0 ? ((price - open) / open) * 100 : null, "live");
        } catch {}
      };
      ws.onclose = () => {
        if (disposed) return;
        startPolling();
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 60_000);
      };
      ws.onerror = () => ws?.close();
    };

    // Show something fast, then upgrade to the socket.
    if (initial == null) void poll();
    connect();

    return () => {
      disposed = true;
      stopPolling();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [initial]);

  return state;
}
