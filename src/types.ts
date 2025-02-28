export type Transaction =
  | { amountBTC: number; price: number; date: Date; type: "buy"; feeUSD: number; }
  | { amountBTC: number; price: number; date: Date; type: "sell"; feeUSD: number; }
  | { amountUSD: number; date: Date; type: "deposit" | "withdraw"; };

export interface Config {
  fee: number;
  instrument: string;
  DCA_Value: number;
  start_date: string;
  end_date: string;
  transactions: Transaction[];
  dataFile: string;
}

export interface Data {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
