export type Transaction = {
  amountBTC: number;
  price: number;
  date: Date;
  type: "buy" | "sell";
  feeUSD: number;
};

export interface Config {
  fee: number;
  instrument: string;
  DCA_Value: number;
  start_date: string;
  end_date: string;
  transactions: Transaction[];
  dataFile: string;
  balanceUSD: number;
  investmentUSD: number;
}

export interface Data {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
