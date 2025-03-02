import type { JsonItem } from "dukascopy-node";

export type Transaction =
  | {
      amountToken: number;
      price: number;
      date: Date;
      type: "buy";
      // Fee is not included in the amountToken bought
      feeUSD: number;
    }
  | {
      amountToken: number;
      price: number;
      date: Date;
      type: "sell";
      // Fee included in the amountToken sold
      feeUSD: number;
    }
  | { amountUSD: number; date: Date; type: "deposit" | "withdraw" };

export type Interval = "1d" | "1w" | "1m" | "1y";

export interface Config {
  fee: number;
  token: string;
  DCA_Value: number;
  start_date: string;
  end_date: string;
  transactions: Transaction[];
  interval: Interval;
}

export interface Data extends JsonItem {
  useInStrategy: boolean;
}
