import data from "./iphone.json";

export type HistoryPoint = {
  year: number;
  model: string;
  /** Launch price of the base model, in BTC at launch. */
  btc: number;
  joke: string;
};

export type PhoneForm = "bar" | "foldable";

export type CurrentIphone = {
  model: string;
  /** apple.com page slug, used by the weekly price check. */
  slug: string;
  form: PhoneForm;
  priceUsd: number;
  /** Date this model went on sale or was announced (YYYY-MM-DD). */
  since: string;
  /** BTC per phone, recorded by the weekly check when first seen. */
  launchBtc: number | null;
};

export const currentIphones = data.current as CurrentIphone[];
export const iphoneHistory: HistoryPoint[] = data.history;
/** Date of the last weekly price check (YYYY-MM-DD). */
export const checkedAt: string = data.checkedAt;
