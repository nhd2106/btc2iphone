import data from "./iphone.json";

export type HistoryPoint = {
  year: number;
  model: string;
  /** Launch price of the base model, in BTC at launch. */
  btc: number;
  joke: string;
};

export type CurrentIphone = {
  model: string;
  priceUsd: number;
  /** BTC per phone when this model was first seen by the weekly updater. */
  launchBtc: number;
  /** Date this model became the current one (YYYY-MM-DD). */
  since: string;
  /** Date of the last successful weekly price check (YYYY-MM-DD). */
  checkedAt: string;
};

export const currentIphone: CurrentIphone = data.current;
export const iphoneHistory: HistoryPoint[] = data.history;
