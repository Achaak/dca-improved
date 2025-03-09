import {
  buy,
  deposit,
  sell,
  getAverageCost,
  getNbToken,
  getNbUSD,
} from "../transaction";
import type { Config, Data, Transaction } from "../types";
import { invalidateCachePrefix } from "../utils/cache";
import { getDataWithoutPrefetch, YEARS_PRE_FETCH } from "../utils/data";
import { getIntervalInDays } from "../utils/date";
import { getLastBigVariation } from "../utils/drawdown";
import { SHOW_LOGS } from "../utils/env";
import { formatUSD } from "../utils/format";
import { generateId } from "../utils/generate-id";

// Default ratio functions with memoization
const defaultCalculateSellRatio = (nbLastSell: number) => {
  // return Math.min(0.05 * (nbLastSell + 1), 1);
  const ratio = [
    0.05, 0.05, 0.05, 0.05, 0.15, 0.15, 0.15, 0.2, 0.2, 0.2, 0.2, 0.25, 0.25,
    0.25,
  ];
  return ratio[nbLastSell] || 0.25;
};

const defaultCalculateBuyRatio = (nbLastBuy: number) => {
  return Math.min(0.5 * (nbLastBuy + 1), 1);
};

export async function DCAImproved({
  config,
  data: dataWithPrefetch,
  calculateSellRatio = defaultCalculateSellRatio,
  calculateBuyRatio = defaultCalculateBuyRatio,
  ratioBetweenSells = 0.05,
}: {
  config: Config;
  data: Data[];
  calculateBuyRatio?: (nbLastBuy: number) => number;
  calculateSellRatio?: (nbLastSell: number) => number;
  ratioBetweenSells?: number;
}) {
  // Ensure config has an ID
  if (!config.id) {
    config.id = generateId();
  }

  // Pre-filter transactions once outside the loop
  let transactionsSortedByDate: Transaction[] = [];

  const data = getDataWithoutPrefetch({ data: dataWithPrefetch, config });

  for (const d of data) {
    const price = d.close;

    // Handle deposits based on interval
    handleDeposit(config, d, d.timestamp);

    // Update sorted transactions only when needed
    transactionsSortedByDate = getSortedTransactionsByDate(config.transactions);

    // Calculate metrics needed for decision making
    const averageCost = getAverageCost({ config, timestamp: d.timestamp });

    const variation = getLastBigVariation({
      data: dataWithPrefetch.filter((item) => item.timestamp <= d.timestamp),
      windowSize: getIntervalInDays("1y") * YEARS_PRE_FETCH,
    });

    const priceUnderToBuy = averageCost * variation.analysis.annualizedRate;
    const priceOverToSell =
      (averageCost * variation.analysis.percentChange) / 2;
    const nbToken = getNbToken({ config, timestamp: d.timestamp });

    // Execute buy or sell strategy
    if (shouldBuy({ price, priceUnderToBuy, d, config })) {
      handleBuy({
        config,
        timestamp: d.timestamp,
        price,
        transactions: transactionsSortedByDate,
        calculateBuyRatio,
      });
    } else if (
      shouldSell({
        price,
        priceOverToSell,
        nbToken,
        transactions: transactionsSortedByDate,
        ratioBetweenSells,
      })
    ) {
      handleSell({
        config,
        timestamp: d.timestamp,
        price,
        nbToken,
        transactions: transactionsSortedByDate,
        calculateSellRatio,
      });
    }

    // Log transaction details if enabled
    if (SHOW_LOGS) {
      logTransaction({
        timestamp: d.timestamp,
        config,
        averageCost,
        priceUnderToBuy,
        priceOverToSell,
      });
    }
  }

  // Invalidate cache for this config
  invalidateCachePrefix(config.id);

  return { config, data, dataWithPrefetch };
}

/**
 * Handles deposit based on the configured interval
 */
function handleDeposit(config: Config, d: Data, timestamp: number): void {
  const shouldDeposit =
    (config.deposit_interval === "1d" && d.isDaily) ||
    (config.deposit_interval === "1w" && d.isWeekly) ||
    (config.deposit_interval === "1mn" && d.isMonthly) ||
    (config.deposit_interval === "1y" && d.isYearly);

  if (shouldDeposit) {
    deposit({
      amountUSD: config.deposit_value,
      timestamp,
      config,
    });
  }
}

/**
 * Returns transactions sorted by date (newest first)
 */
function getSortedTransactionsByDate(
  transactions: Transaction[]
): Transaction[] {
  return transactions
    .filter((t) => t.type === "buy" || t.type === "sell")
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Determines if a buy should be executed based on price and interval
 */
function shouldBuy({
  price,
  priceUnderToBuy,
  d,
  config,
}: {
  price: number;
  priceUnderToBuy: number;
  config: Config;
  d: Data;
}): boolean {
  const isIntervalMatch =
    (config.DCA_Interval === "1d" && d.isDaily) ||
    (config.DCA_Interval === "1w" && d.isWeekly) ||
    (config.DCA_Interval === "1mn" && d.isMonthly) ||
    (config.DCA_Interval === "1y" && d.isYearly);

  return (price < priceUnderToBuy || priceUnderToBuy === 0) && isIntervalMatch;
}

/**
 * Executes a buy transaction
 */
function handleBuy({
  config,
  timestamp,
  price,
  transactions,
  calculateBuyRatio,
}: {
  config: Config;
  timestamp: number;
  price: number;
  transactions: Transaction[];
  calculateBuyRatio: (nbLastBuy: number) => number;
}): void {
  const balanceUSD = getNbUSD({ config, timestamp });
  if (balanceUSD <= 0) return;

  // Count consecutive buy transactions
  let nbLastBuy = 0;
  for (const transaction of transactions) {
    if (transaction.type === "buy") {
      nbLastBuy++;
    } else {
      break;
    }
  }

  const buyRatio = calculateBuyRatio(nbLastBuy);
  const amountUSDToBuy = Math.min(balanceUSD * buyRatio, balanceUSD);

  if (amountUSDToBuy > 0) {
    buy({ amountUSD: amountUSDToBuy, price, timestamp, config });
  }
}

/**
 * Determines if a sell should be executed based on price
 */
function shouldSell({
  price,
  priceOverToSell,
  nbToken,
  transactions,
  ratioBetweenSells,
}: {
  price: number;
  priceOverToSell: number;
  nbToken: number;
  transactions: Transaction[];
  ratioBetweenSells: number;
}): boolean {
  if (nbToken <= 0) return false;

  const lastSell = transactions.find((t) => t.type === "sell");

  // Don't sell if the last sell price was significantly higher
  if (lastSell && price > lastSell.price * (1 + ratioBetweenSells)) {
    return false;
  }

  return price > priceOverToSell;
}

/**
 * Executes a sell transaction
 */
function handleSell({
  config,
  timestamp,
  nbToken,
  price,
  transactions,
  calculateSellRatio,
}: {
  config: Config;
  timestamp: number;
  price: number;
  nbToken: number;
  transactions: Transaction[];
  calculateSellRatio: (nbLastSell: number) => number;
}): void {
  if (nbToken <= 0) return;

  // Count consecutive sell transactions
  let nbLastSell = 0;
  for (const transaction of transactions) {
    if (transaction.type === "sell") {
      nbLastSell++;
    } else {
      break;
    }
  }

  const sellRatio = calculateSellRatio(nbLastSell);
  const totalTokenSell = nbToken * sellRatio;

  if (totalTokenSell > 0) {
    sell({ amountToken: totalTokenSell, price, timestamp, config });
  }
}

/**
 * Logs transaction details
 */
function logTransaction({
  averageCost,
  config,
  timestamp,
  priceOverToSell,
  priceUnderToBuy,
}: {
  timestamp: number;
  config: Config;
  averageCost: number;
  priceUnderToBuy: number;
  priceOverToSell: number;
}): void {
  const balanceUSD = getNbUSD({ config, timestamp });
  console.log(
    `\x1b[34m${new Date(timestamp).toLocaleString()} - ${formatUSD(
      balanceUSD
    )} USD - ${formatUSD(averageCost)} USD - Buy < ${formatUSD(
      priceUnderToBuy
    )} - Sell > ${formatUSD(priceOverToSell)} USD\x1b[0m`
  );
}
