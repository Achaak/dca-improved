type Transaction = {
  amountBTC: number;
  price: number;
  date: Date;
  type: "buy" | "sell";
  feeUSD: number;
};

interface Config {
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

interface Data {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
