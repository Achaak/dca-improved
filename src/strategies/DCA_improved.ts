import {
  buy,
  deposit,
  sell,
  getAverageCost,
  getNbToken,
  getNbUSD,
} from "../transaction";
import type { Config, Data, Transaction } from "../types";
import { SHOW_LOGS } from "../utils/env";
import { formatUSD } from "../utils/format";

const RATIO_UNDER_TO_BUY = 1.5;
const RATIO_OVER_TO_SELL = 2.5;

function calculateNbTokenBuyRatio(nbLastBuy: number) {
  return 0.1 * (1.1 * nbLastBuy);
}

function calculateTotalTokenSell(nbToken: number) {
  return nbToken * 0.2;
}

export async function DCAImproved(config: Config, data: Data[]) {
  for (const d of data) {
    if (!d.useInStrategy) {
      continue;
    }

    const date = new Date(d.timestamp);
    const price = d.close;
    const averageCost = getAverageCost({
      transactions: config.transactions,
      date,
    });
    const priceUnderToBuy = averageCost * RATIO_UNDER_TO_BUY;
    const priceOverToSell = averageCost * RATIO_OVER_TO_SELL;
    const nbToken = getNbToken({ transactions: config.transactions, date });

    deposit({
      date,
      transactions: config.transactions,
      amountUSD: config.DCA_Value,
    });

    const transactionsSortedByDate = getSortedTransactionsByDate(
      config.transactions
    );

    if (
      shouldBuy({
        price,
        priceUnderToBuy,
      })
    ) {
      handleBuy({
        config,
        date,
        price,
        transactions: transactionsSortedByDate,
      });
    } else if (shouldSell(price, priceOverToSell, nbToken)) {
      handleSell({
        config,
        date,
        price,
        nbToken,
        transactions: transactionsSortedByDate,
      });
    }

    if (SHOW_LOGS) {
      logTransaction({
        date,
        transactions: config.transactions,
        averageCost,
        priceUnderToBuy,
        priceOverToSell,
      });
    }
  }

  return {
    config,
    data,
  };
}

function getSortedTransactionsByDate(transactions: Transaction[]) {
  return structuredClone(transactions)
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function shouldBuy({
  price,
  priceUnderToBuy,
}: {
  price: number;
  priceUnderToBuy: number;
}) {
  return price < priceUnderToBuy || priceUnderToBuy === 0;
}

function handleBuy({
  config,
  date,
  price,
  transactions,
}: {
  config: Config;
  date: Date;
  price: number;
  transactions: Transaction[];
}) {
  const balanceUSD = getNbUSD({ transactions: config.transactions, date });

  let nbLastBuy = 0;
  for (const transaction of transactions) {
    if (transaction.type === "buy") {
      nbLastBuy++;
    } else {
      break;
    }
  }

  const nbTokenBuyRatio = calculateNbTokenBuyRatio(nbLastBuy);
  const amountUSDToBuy = Math.max(balanceUSD * nbTokenBuyRatio, balanceUSD);
  buy({ amountUSD: amountUSDToBuy, price, date, config });
}

function shouldSell(price: number, priceOverToSell: number, nbToken: number) {
  return price > priceOverToSell && nbToken > 0;
}

function handleSell({
  config,
  date,
  nbToken,
  price,
  transactions,
}: {
  config: Config;
  date: Date;
  price: number;
  nbToken: number;
  transactions: Transaction[];
}) {
  let nbLastSell = 0;
  for (const transaction of transactions) {
    if (transaction.type === "sell") {
      nbLastSell++;
    } else {
      break;
    }
  }

  const totalTokenSell = calculateTotalTokenSell(nbToken);
  sell({ amountToken: totalTokenSell, price, date, config });
}

function logTransaction({
  averageCost,
  transactions,
  date,
  priceOverToSell,
  priceUnderToBuy,
}: {
  date: Date;
  transactions: Transaction[];
  averageCost: number;
  priceUnderToBuy: number;
  priceOverToSell: number;
}) {
  const balanceUSD = getNbUSD({ transactions, date });
  console.log(
    `\x1b[34m${date.toLocaleString()} - ${formatUSD(
      balanceUSD
    )} USD - ${formatUSD(averageCost)} USD - Buy < ${formatUSD(
      priceUnderToBuy
    )} - Sell > ${formatUSD(priceOverToSell)} USD\x1b[0m`
  );
}
