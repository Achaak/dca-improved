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
import { SHOW_LOGS } from "../utils/env";
import { formatUSD } from "../utils/format";
import { generateId } from "../utils/generate-id";

// Default ratio functions with memoization
const defaultCalculateSellRatio = (nbLastSell: number) =>
  Math.min(0.08 * (nbLastSell + 1), 1);

const defaultCalculateBuyRatio = (nbLastBuy: number) =>
  Math.min(0.3 * (nbLastBuy + 1), 1);

export async function DCAImproved({
  config,
  data,
  ratioUnderToBuy = 1.5,
  ratioOverToSell = 4.5,
  calculateSellRatio = defaultCalculateSellRatio,
  calculateBuyRatio = defaultCalculateBuyRatio,
}: {
  config: Config;
  data: Data[];
  ratioUnderToBuy?: number;
  ratioOverToSell?: number;
  calculateBuyRatio?: (nbLastBuy: number) => number;
  calculateSellRatio?: (nbLastSell: number) => number;
}) {
  // Ensure config has an ID
  if (!config.id) {
    config.id = generateId();
  }

  // Pre-filter transactions once outside the loop
  let transactionsSortedByDate: Transaction[] = [];

  for (const d of data) {
    const date = new Date(d.timestamp);
    const price = d.close;

    // Handle deposits based on interval
    handleDeposit(config, d, date);

    // Update sorted transactions only when needed
    transactionsSortedByDate = getSortedTransactionsByDate(config.transactions);

    // Calculate metrics needed for decision making
    const averageCost = getAverageCost({ config, date });
    const priceUnderToBuy = averageCost * ratioUnderToBuy;
    const priceOverToSell = averageCost * ratioOverToSell;
    const nbToken = getNbToken({ config, date });

    // Execute buy or sell strategy
    if (shouldBuy({ price, priceUnderToBuy, d, config })) {
      handleBuy({
        config,
        date,
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
      })
    ) {
      handleSell({
        config,
        date,
        price,
        nbToken,
        transactions: transactionsSortedByDate,
        calculateSellRatio,
      });
    }

    // Log transaction details if enabled
    if (SHOW_LOGS) {
      logTransaction({
        date,
        config,
        averageCost,
        priceUnderToBuy,
        priceOverToSell,
      });
    }
  }

  // Invalidate cache for this config
  invalidateCachePrefix(config.id);

  return { config, data };
}

/**
 * Handles deposit based on the configured interval
 */
function handleDeposit(config: Config, d: Data, date: Date): void {
  const shouldDeposit =
    (config.deposit_interval === "1d" && d.isDaily) ||
    (config.deposit_interval === "1w" && d.isWeekly) ||
    (config.deposit_interval === "1mn" && d.isMonthly) ||
    (config.deposit_interval === "1y" && d.isYearly);

  if (shouldDeposit) {
    deposit({
      amountUSD: config.deposit_value,
      date,
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
    .sort((a, b) => b.date.getTime() - a.date.getTime());
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
  date,
  price,
  transactions,
  calculateBuyRatio,
}: {
  config: Config;
  date: Date;
  price: number;
  transactions: Transaction[];
  calculateBuyRatio: (nbLastBuy: number) => number;
}): void {
  const balanceUSD = getNbUSD({ config, date });
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
    buy({ amountUSD: amountUSDToBuy, price, date, config });
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
}: {
  price: number;
  priceOverToSell: number;
  nbToken: number;
  transactions: Transaction[];
}): boolean {
  if (nbToken <= 0) return false;

  const lastSell = transactions.find((t) => t.type === "sell");

  // Don't sell if the last sell price was significantly higher
  if (lastSell && lastSell.price > price * 1.05) {
    return false;
  }

  return price > priceOverToSell;
}

/**
 * Executes a sell transaction
 */
function handleSell({
  config,
  date,
  nbToken,
  price,
  transactions,
  calculateSellRatio,
}: {
  config: Config;
  date: Date;
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
    sell({ amountToken: totalTokenSell, price, date, config });
  }
}

/**
 * Logs transaction details
 */
function logTransaction({
  averageCost,
  config,
  date,
  priceOverToSell,
  priceUnderToBuy,
}: {
  date: Date;
  config: Config;
  averageCost: number;
  priceUnderToBuy: number;
  priceOverToSell: number;
}): void {
  const balanceUSD = getNbUSD({ config, date });
  console.log(
    `\x1b[34m${date.toLocaleString()} - ${formatUSD(
      balanceUSD
    )} USD - ${formatUSD(averageCost)} USD - Buy < ${formatUSD(
      priceUnderToBuy
    )} - Sell > ${formatUSD(priceOverToSell)} USD\x1b[0m`
  );
}
