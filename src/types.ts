import type { JsonItem } from "dukascopy-node";

export type Transaction =
  | {
      amountToken: number;
      price: number;
      timestamp: number;
      type: "buy";
      // Fee is not included in the amountToken bought
      feeUSD: number;
    }
  | {
      amountToken: number;
      price: number;
      timestamp: number;
      type: "sell";
      // Fee included in the amountToken sold
      feeUSD: number;
    };

export type AccountActivity = {
  amountUSD: number;
  timestamp: number;
  type: "deposit" | "withdraw";
};

export type Interval = "1d" | "1w" | "1mn" | "1y";

export interface Config {
  fee: number;
  token: string;
  DCA_Interval: Interval;
  deposit_value: number;
  deposit_interval: Interval;
  start_date: string;
  end_date: string;
  transactions: Transaction[];
  accountActivities: AccountActivity[];
  id?: string;
}

//JsonItem without the timestamp
export interface Data extends JsonItem {
  isYearly: boolean;
  isMonthly: boolean;
  isWeekly: boolean;
  isDaily: boolean;
  isDataPrefetch: boolean;
}
