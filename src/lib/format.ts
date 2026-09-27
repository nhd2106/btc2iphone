export const fmtUsd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtBigUsd = (n: number) =>
  n >= 1e9
    ? "$" + (n / 1e9).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "B"
    : n >= 1e6
    ? "$" + (n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "M"
    : fmtUsd(n);

export const fmtBtc = (n: number) =>
  n >= 10 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n >= 1 ? n.toFixed(2) : n.toFixed(5);

export const fmtCount = (n: number) =>
  n < 10 ? n.toFixed(2) : Math.floor(n).toLocaleString("en-US");

export const fmtSats = (btc: number) => Math.round(btc * 1e8).toLocaleString("en-US");
