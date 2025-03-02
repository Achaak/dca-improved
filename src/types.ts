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

export interface Config {
  fee: number;
  token: string;
  DCA_Value: number;
  start_date: string;
  end_date: string;
  transactions: Transaction[];
}

export interface Data {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
