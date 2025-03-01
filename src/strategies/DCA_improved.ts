import {
  buy,
  deposit,
  sell,
  getAverageCost,
  getNbBTC,
  getNbUSD,
} from "../transaction";
import { SHOW_LOGS } from "../config";
import type { Config, Data } from "../types";
import { formatUSD } from "../utils/format";

const RATIO_UNDER_TO_BUY = 1.5;
const RATIO_OVER_TO_SELL = 2.5;

export async function DCAImproved(config: Config, data: Data[]) {
  for (const d of data) {
    const date = new Date(d.timestamp);
    const price = d.close;
    const averageCost = getAverageCost(config.transactions, date);
    const priceUnderToBuy = averageCost * RATIO_UNDER_TO_BUY;
    const priceOverToSell = averageCost * RATIO_OVER_TO_SELL;
    const nbBTC = getNbBTC(config.transactions, date);

    deposit(config.DCA_Value, date, config);

    const transactions = getSortedTransactions(config);

    if (shouldBuy(price, priceUnderToBuy)) {
      handleBuy(config, date, price, transactions);
    } else if (shouldSell(price, priceOverToSell, nbBTC)) {
      handleSell(config, date, price, transactions, nbBTC);
    }

    if (SHOW_LOGS) {
      logTransaction(
        date,
        config,
        averageCost,
        priceUnderToBuy,
        priceOverToSell
      );
    }
  }

  return {
    config,
    data,
  };
}

function getSortedTransactions(config: Config) {
  return structuredClone(config.transactions)
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function shouldBuy(price: number, priceUnderToBuy: number) {
  return price < priceUnderToBuy || priceUnderToBuy === 0;
}

function handleBuy(
  config: Config,
  date: Date,
  price: number,
  transactions: any[]
) {
  const balanceUSD = getNbUSD(config.transactions, date);

  let nbLastBuy = 0;
  for (const transaction of transactions) {
    if (transaction.type === "buy") {
      nbLastBuy++;
    } else {
      break;
    }
  }

  const nbBTCBuyRatio = 0.1 * (1.1 * nbLastBuy);

  const amountUSDToBuy = Math.min(
    Math.max(balanceUSD * nbBTCBuyRatio, config.DCA_Value),
    balanceUSD
  );
  buy(amountUSDToBuy, price, date, config);
}

function shouldSell(price: number, priceOverToSell: number, nbBTC: number) {
  return price > priceOverToSell && nbBTC > 0;
}

function handleSell(
  config: Config,
  date: Date,
  price: number,
  transactions: any[],
  nbBTC: number
) {
  let nbLastSell = 0;
  for (const transaction of transactions) {
    if (transaction.type === "sell") {
      nbLastSell++;
    } else {
      break;
    }
  }

  const totalBTCSell = nbBTC * 0.2;
  sell(totalBTCSell, price, date, config);
}

function logTransaction(
  date: Date,
  config: Config,
  averageCost: number,
  priceUnderToBuy: number,
  priceOverToSell: number
) {
  const balanceUSD = getNbUSD(config.transactions, date);
  console.log(
    `\x1b[34m${date.toLocaleString()} - ${formatUSD(
      balanceUSD
    )} USD - ${formatUSD(averageCost)} USD - Buy < ${formatUSD(
      priceUnderToBuy
    )} - Sell > ${formatUSD(priceOverToSell)} USD\x1b[0m`
  );
}
