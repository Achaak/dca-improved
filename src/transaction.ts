import { SHOW_LOGS } from "./utils/env";
import { formatToken, formatUSD } from "./utils/format";
import type { Config, Data, Transaction } from "./types";
import { getDrawdown } from "./utils/drawdown";
import { memoize, getCacheKey } from "./utils/cache";

// Helper function to log transactions
function logTransaction(message: string) {
  if (SHOW_LOGS) {
    console.log(message);
  }
}

// Helper function to calculate fees
function calculateFee(amountUSD: number, feeRate: number): number {
  return amountUSD * feeRate;
}

// Function to handle buying tokens
export function buy({
  amountUSD,
  price,
  date,
  config,
}: {
  amountUSD: number;
  price: number;
  date: Date;
  config: Config;
}) {
  if (amountUSD <= 0) {
    if (SHOW_LOGS) {
      console.error("Amount must be greater than 0");
    }
    return;
  }

  const feeUSD = calculateFee(amountUSD, config.fee);
  const amountTokenMinusFee = (amountUSD - feeUSD) / price;
  const balanceUSD = getNbUSD({ config, date });

  if (balanceUSD < amountUSD) {
    if (SHOW_LOGS) {
      console.error("Not enough balance");
    }
    return;
  }

  config.transactions.push({
    amountToken: amountTokenMinusFee,
    price,
    date,
    type: "buy",
    feeUSD,
  });

  logTransaction(
    `\x1b[32m Bought ${formatToken(
      amountTokenMinusFee
    )} ${config.token.toUpperCase()} for ${formatUSD(
      amountUSD
    )} USD at ${formatUSD(
      price
    )} USD/${config.token.toUpperCase()} on ${date.toLocaleString()}. Fee: ${formatUSD(
      feeUSD
    )} USD \x1b[0m`
  );
}

// Function to handle selling tokens
export function sell({
  amountToken,
  price,
  date,
  config,
}: {
  amountToken: number;
  price: number;
  date: Date;
  config: Config;
}) {
  const totalTokens = getNbToken({ config, date });

  if (totalTokens < amountToken && SHOW_LOGS) {
    console.error(`Not enough ${config.token.toUpperCase()}`);
    return;
  }

  const amountUSD = amountToken * price;
  const feeUSD = calculateFee(amountUSD, config.fee);

  config.transactions.push({
    amountToken,
    price,
    date,
    type: "sell",
    feeUSD,
  });

  logTransaction(
    `\x1b[31m Sold ${formatToken(
      amountToken
    )} ${config.token.toUpperCase()} for ${formatUSD(
      amountUSD
    )} USD at ${formatUSD(
      price
    )} USD/${config.token.toUpperCase()} on ${date.toLocaleString()}. Fee: ${formatUSD(
      feeUSD
    )} USD \x1b[0m`
  );
}

// Function to handle deposits
export function deposit({
  amountUSD,
  date,
  config,
}: {
  amountUSD: number;
  date: Date;
  config: Config;
}) {
  const { accountActivities } = config;

  accountActivities.push({
    amountUSD,
    date,
    type: "deposit",
  });
}

// Function to handle withdrawals
export function withdraw({
  amountUSD,
  date,
  config,
}: {
  amountUSD: number;
  date: Date;
  config: Config;
}) {
  const { accountActivities } = config;

  const balanceUSD = getNbUSD({
    config,
    date,
  });

  if (balanceUSD < amountUSD) {
    console.error(
      `Not enough balance to withdraw ${formatUSD(amountUSD)}, only ${formatUSD(
        balanceUSD
      )} available`
    );
    return;
  }

  accountActivities.push({
    amountUSD,
    date,
    type: "withdraw",
  });
}

// Function to calculate the average cost of tokens
export function getAverageCost({
  date,
  config,
}: {
  date: Date;
  config: Config;
}) {
  const { transactions } = config;

  const cacheKey = getCacheKey("getAverageCost", config, [date]);

  return memoize(cacheKey, () => {
    let totalCost = 0;
    let totalAmount = 0;

    // Convert date to timestamp for faster comparisons
    const targetTimestamp = date.getTime();

    // Filter buy transactions without deep cloning
    const buyTransactions = transactions
      .filter(
        (transaction): transaction is Extract<Transaction, { type: "buy" }> =>
          transaction.type === "buy" &&
          transaction.date.getTime() <= targetTimestamp
      )
      // Sort by price (lowest first) for FIFO accounting
      .sort((a, b) => a.price - b.price);

    // Calculate total sold tokens up to the date
    let totalSoldTokens = transactions
      .filter(
        (transaction): transaction is Extract<Transaction, { type: "sell" }> =>
          transaction.type === "sell" &&
          transaction.date.getTime() <= targetTimestamp
      )
      .reduce((acc, transaction) => acc + transaction.amountToken, 0);

    // Create a copy of buy transactions to avoid modifying the original array
    const adjustedBuyTransactions = buyTransactions.map((t) => ({ ...t }));

    // Adjust buy transactions based on sold tokens (FIFO)
    for (const buyTransaction of adjustedBuyTransactions) {
      if (totalSoldTokens <= 0) {
        break;
      }

      if (buyTransaction.amountToken > totalSoldTokens) {
        buyTransaction.amountToken -= totalSoldTokens;
        totalSoldTokens = 0;
      } else {
        totalSoldTokens -= buyTransaction.amountToken;
        buyTransaction.amountToken = 0;
      }
    }

    // Calculate total cost and amount from adjusted buy transactions
    for (const transaction of adjustedBuyTransactions) {
      if (transaction.amountToken > 0) {
        totalCost +=
          transaction.amountToken * transaction.price + transaction.feeUSD;
        totalAmount += transaction.amountToken;
      }
    }

    return totalAmount === 0 ? 0 : totalCost / totalAmount;
  });
}

// Function to get the number of tokens
export function getNbToken({ config, date }: { date: Date; config: Config }) {
  const { transactions } = config;

  const cacheKey = getCacheKey("getNbToken", config, [date]);

  return memoize(cacheKey, () => {
    // Convert date to timestamp for faster comparisons
    const targetTimestamp = date.getTime();

    return transactions.reduce((acc, transaction) => {
      if (transaction.date.getTime() > targetTimestamp) {
        return acc;
      }

      if (transaction.type === "buy") {
        return acc + transaction.amountToken;
      } else if (transaction.type === "sell") {
        return acc - transaction.amountToken;
      } else {
        return acc;
      }
    }, 0);
  });
}

// Function to get the number of tokens history
export function getNbTokenHistory({
  config,
  data,
}: {
  config: Config;
  data: Data[];
}) {
  const cacheKey = getCacheKey("getNbTokenHistory", config, [data]);
  // Add a TTL of 5 minutes for history data
  const TTL = 5 * 60 * 1000;

  return memoize(
    cacheKey,
    () => {
      // Pre-calculate dates to avoid repeated Date object creation
      const dates = data.map((d) => new Date(d.timestamp));

      // Sort dates to potentially improve cache hits
      const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

      // Pre-calculate token balances for all dates
      const tokenBalances = new Map();
      for (const date of sortedDates) {
        const nbToken = getNbToken({
          date,
          config,
        });
        tokenBalances.set(date.getTime(), nbToken);
      }

      // Map the results back to the original data order
      return data.map((d, index) => {
        return {
          timestamp: d.timestamp,
          nbToken: tokenBalances.get(dates[index].getTime()),
        };
      });
    },
    TTL
  );
}

// Function to get the balance in USD
export function getNbUSD({ date, config }: { date: Date; config: Config }) {
  const { transactions, accountActivities } = config;

  const cacheKey = getCacheKey("getNbUSD", config, [date]);

  return memoize(cacheKey, () => {
    // Convert date to timestamp for faster comparisons
    const targetTimestamp = date.getTime();

    // Process transactions and account activities separately to avoid array concatenation
    const transactionsBalance = transactions.reduce((acc, entry) => {
      if (entry.date.getTime() > targetTimestamp) {
        return acc;
      }

      if (entry.type === "buy") {
        return acc - entry.amountToken * entry.price - entry.feeUSD;
      } else if (entry.type === "sell") {
        return acc + entry.amountToken * entry.price - entry.feeUSD;
      }

      return acc;
    }, 0);

    const activitiesBalance = accountActivities.reduce((acc, entry) => {
      if (entry.date.getTime() > targetTimestamp) {
        return acc;
      }

      if (entry.type === "deposit") {
        return acc + entry.amountUSD;
      } else if (entry.type === "withdraw") {
        return acc - entry.amountUSD;
      }

      return acc;
    }, 0);

    // Combine the results
    return transactionsBalance + activitiesBalance;
  });
}

// Function to get the balance in USD history
export function getNbUSDHistory({
  data,
  config,
}: {
  config: Config;
  data: Data[];
}) {
  const cacheKey = getCacheKey("getNbUSDHistory", config, [data]);
  // Add a TTL of 5 minutes for history data
  const TTL = 5 * 60 * 1000;

  return memoize(
    cacheKey,
    () => {
      // Pre-calculate dates to avoid repeated Date object creation
      const dates = data.map((d) => new Date(d.timestamp));

      // Sort dates to potentially improve cache hits
      const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

      // Pre-calculate USD balances for all dates
      const usdBalances = new Map();
      for (const date of sortedDates) {
        const nbUSD = getNbUSD({
          date,
          config,
        });
        usdBalances.set(date.getTime(), nbUSD);
      }

      // Map the results back to the original data order
      return data.map((d, index) => {
        return {
          timestamp: d.timestamp,
          nbUSD: usdBalances.get(dates[index].getTime()),
        };
      });
    },
    TTL
  );
}

// Function to get the deposits in USD
export function getDepositsUSD({
  config,
  date,
}: {
  config: Config;
  date: Date;
}) {
  const { accountActivities } = config;

  const cacheKey = getCacheKey("getDepositsUSD", config, [date]);

  return memoize(cacheKey, () => {
    // Convert date to timestamp for faster comparisons
    const targetTimestamp = date.getTime();

    return accountActivities.reduce((acc, accountActivity) => {
      if (accountActivity.date.getTime() > targetTimestamp) {
        return acc;
      }

      if (accountActivity.type === "deposit") {
        return acc + accountActivity.amountUSD;
      } else {
        return acc;
      }
    }, 0);
  });
}

// Function to get the total fees in USD
export function getFeesUSD({ config, date }: { config: Config; date: Date }) {
  const { transactions } = config;

  const cacheKey = getCacheKey("getFeesUSD", config, [date]);

  return memoize(cacheKey, () => {
    // Convert date to timestamp for faster comparisons
    const targetTimestamp = date.getTime();

    return transactions.reduce((acc, transaction) => {
      if (transaction.date.getTime() > targetTimestamp) {
        return acc;
      }

      if (transaction.type === "buy" || transaction.type === "sell") {
        return acc + transaction.feeUSD;
      } else {
        return acc;
      }
    }, 0);
  });
}

// Function to calculate the profit in USD
export function getProfitUSD({
  config,
  date,
  actualPrice,
}: {
  config: Config;
  date: Date;
  actualPrice: number;
}) {
  const cacheKey = getCacheKey("getProfitUSD", config, [date]);

  return memoize(cacheKey, () => {
    const investmentUSD = getDepositsUSD({ config, date });
    const feesUSD = getFeesUSD({ config, date });
    const balanceUSD = getNbUSD({ config, date });
    const tokenToUSD = getNbToken({ config, date }) * actualPrice;
    const totalUSD = balanceUSD + tokenToUSD;

    return totalUSD - investmentUSD - feesUSD;
  });
}

// Function to get the profit in USD history
export function getProfitUSDHistory({
  config,
  data,
}: {
  data: Data[];
  config: Config;
}) {
  const cacheKey = getCacheKey("getProfitUSDHistory", config, [data]);
  // Add a TTL of 5 minutes for history data
  const TTL = 5 * 60 * 1000;

  return memoize(
    cacheKey,
    () => {
      // Pre-calculate dates to avoid repeated Date object creation
      const dates = data.map((d) => new Date(d.timestamp));

      // Create a map of timestamp to price for quick lookup
      const priceMap = new Map(
        data.map((d) => [new Date(d.timestamp).getTime(), d.close])
      );

      // Sort dates to potentially improve cache hits
      const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

      // Pre-calculate profits for all dates
      const profits = new Map();
      for (const date of sortedDates) {
        const actualPrice = priceMap.get(date.getTime()) || 0;

        const profitUSD = getProfitUSD({
          config,
          date,
          actualPrice,
        });
        profits.set(date.getTime(), profitUSD);
      }

      // Map the results back to the original data order
      return data.map((d, index) => {
        return {
          timestamp: d.timestamp,
          profitUSD: profits.get(dates[index].getTime()),
        };
      });
    },
    TTL
  );
}

// Function to calculate the profit percentage
export function getProfitPercentage({
  config,
  date,
  actualPrice,
}: {
  config: Config;
  date: Date;
  actualPrice: number;
}) {
  const cacheKey = getCacheKey("getProfitPercentage", config, [date]);

  return memoize(cacheKey, () => {
    const investmentUSD = getDepositsUSD({ config, date });
    const feesUSD = getFeesUSD({ config, date });
    const balanceUSD = getNbUSD({ config, date });
    const tokenToUSD = getNbToken({ config, date }) * actualPrice;
    const totalUSD = balanceUSD + tokenToUSD;

    // Handle the case when investmentUSD is 0 or very small
    if (investmentUSD <= 0 || !isFinite(investmentUSD)) {
      return 0; // Return 0% profit when there's no investment
    }

    const profitPercentage =
      ((totalUSD - investmentUSD - feesUSD) / investmentUSD) * 100;

    return profitPercentage;
  });
}

// Function to get the profit percentage history
export function getProfitPercentageHistory({
  config,
  data,
}: {
  config: Config;
  data: Data[];
}) {
  const cacheKey = getCacheKey("getProfitPercentageHistory", config, [data]);
  // Add a TTL of 5 minutes for history data
  const TTL = 5 * 60 * 1000;

  return memoize(
    cacheKey,
    () => {
      // Pre-calculate dates to avoid repeated Date object creation
      const dates = data.map((d) => new Date(d.timestamp));

      // Create a map of timestamp to price for quick lookup
      const priceMap = new Map(
        data.map((d) => [new Date(d.timestamp).getTime(), d.close])
      );

      // Sort dates to potentially improve cache hits
      const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

      // Pre-calculate profit percentages for all dates
      const profitPercentages = new Map();
      for (const date of sortedDates) {
        const actualPrice = priceMap.get(date.getTime()) || 0;

        const profitPercentage = getProfitPercentage({
          config,
          date,
          actualPrice,
        });
        profitPercentages.set(date.getTime(), profitPercentage);
      }

      // Map the results back to the original data order
      return data.map((d, index) => {
        return {
          timestamp: d.timestamp,
          profitPercentage: profitPercentages.get(dates[index].getTime()),
        };
      });
    },
    TTL
  );
}

// Function to calculate various metrics
export function calculateMetrics({
  endDate,
  config,
  data,
}: {
  endDate: Date;
  config: Config;
  data: Data[];
}) {
  const { transactions } = config;

  const cacheKey = getCacheKey("calculateMetrics", config, [endDate]);
  // Add a TTL of 5 minutes for metrics data
  const TTL = 5 * 60 * 1000;

  return memoize(
    cacheKey,
    () => {
      const actualPrice = data[data.length - 1].close;
      const targetTimestamp = endDate.getTime();

      // Use cached values for repeated calculations
      const balanceUSD = getNbUSD({ config, date: endDate });
      const investmentUSD = getDepositsUSD({ config, date: endDate });
      const nbToken = getNbToken({ config, date: endDate });
      const tokenToUSD = nbToken * actualPrice;
      const totalUSD = balanceUSD + tokenToUSD;
      const feesUSD = getFeesUSD({ config, date: endDate });

      const profitUSD = totalUSD - investmentUSD - feesUSD;
      // Handle the case when investmentUSD is 0 or very small
      const profitPercentage =
        investmentUSD <= 0 || !isFinite(investmentUSD)
          ? 0
          : (profitUSD / investmentUSD) * 100;

      const profitPercentageHistory = getProfitPercentageHistory({
        data,
        config,
      }).map((b) => b.profitPercentage);

      const drawdown = getDrawdown({ values: profitPercentageHistory });

      // Count transactions in a single pass
      const { nbOfSells, nbOfBuys } = transactions.reduce(
        (acc, transaction) => {
          if (transaction.date.getTime() <= targetTimestamp) {
            if (transaction.type === "sell") {
              acc.nbOfSells += 1;
            } else if (transaction.type === "buy") {
              acc.nbOfBuys += 1;
            }
          }
          return acc;
        },
        { nbOfSells: 0, nbOfBuys: 0 }
      );

      return {
        drawdown,
        endDate,
        actualPrice,
        balanceUSD,
        feesUSD,
        investmentUSD,
        tokenToUSD,
        totalUSD,
        profitUSD,
        profitPercentage,
        nbOfSells,
        nbOfBuys,
      };
    },
    TTL
  );
}
