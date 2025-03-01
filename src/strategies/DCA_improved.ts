import {
  buy,
  deposit,
  sell,
  getAverageCost,
  getNbToken,
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
    const nbToken = getNbToken(config.transactions, date);

    deposit(config.DCA_Value, date, config);

    const transactions = getSortedTransactions(config);

    if (shouldBuy(price, priceUnderToBuy)) {
      handleBuy(config, date, price, transactions);
    } else if (shouldSell(price, priceOverToSell, nbToken)) {
      handleSell(config, date, price, transactions, nbToken);
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

  const nbTokenBuyRatio = 0.1 * (1.1 * nbLastBuy);

  const amountUSDToBuy = Math.min(
    Math.max(balanceUSD * nbTokenBuyRatio, config.DCA_Value),
    balanceUSD
  );
  buy(amountUSDToBuy, price, date, config);
}

function shouldSell(price: number, priceOverToSell: number, nbToken: number) {
  return price > priceOverToSell && nbToken > 0;
}

function handleSell(
  config: Config,
  date: Date,
  price: number,
  transactions: any[],
  nbToken: number
) {
  let nbLastSell = 0;
  for (const transaction of transactions) {
    if (transaction.type === "sell") {
      nbLastSell++;
    } else {
      break;
    }
  }

  const totalTokenSell = nbToken * 0.2;
  sell(totalTokenSell, price, date, config);
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
