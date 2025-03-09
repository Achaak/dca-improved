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
  timestamp,
  config,
}: {
  amountUSD: number;
  price: number;
  timestamp: number;
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
  const balanceUSD = getNbUSD({ config, timestamp });

  if (balanceUSD < amountUSD) {
    if (SHOW_LOGS) {
      console.error("Not enough balance");
    }
    return;
  }

  config.transactions.push({
    amountToken: amountTokenMinusFee,
    price,
    timestamp,
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
    )} USD/${config.token.toUpperCase()} on ${new Date(
      timestamp
    ).toLocaleString()}. Fee: ${formatUSD(feeUSD)} USD \x1b[0m`
  );
}

// Function to handle selling tokens
export function sell({
  amountToken,
  price,
  timestamp,
  config,
}: {
  amountToken: number;
  price: number;
  timestamp: number;
  config: Config;
}) {
  const totalTokens = getNbToken({ config, timestamp });

  if (totalTokens < amountToken && SHOW_LOGS) {
    console.error(`Not enough ${config.token.toUpperCase()}`);
    return;
  }

  const amountUSD = amountToken * price;
  const feeUSD = calculateFee(amountUSD, config.fee);

  config.transactions.push({
    amountToken,
    price,
    timestamp,
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
    )} USD/${config.token.toUpperCase()} on ${new Date(
      timestamp
    ).toLocaleString()}. Fee: ${formatUSD(feeUSD)} USD \x1b[0m`
  );
}

// Function to handle deposits
export function deposit({
  amountUSD,
  timestamp,
  config,
}: {
  amountUSD: number;
  timestamp: number;
  config: Config;
}) {
  const { accountActivities } = config;

  accountActivities.push({
    amountUSD,
    timestamp,
    type: "deposit",
  });

  logTransaction(
    `\x1b[36m Deposited ${formatUSD(amountUSD)} USD on ${new Date(
      timestamp
    ).toLocaleString()} \x1b[0m`
  );
}

// Function to handle withdrawals
export function withdraw({
  amountUSD,
  timestamp,
  config,
}: {
  amountUSD: number;
  timestamp: number;
  config: Config;
}) {
  const { accountActivities } = config;

  const balanceUSD = getNbUSD({
    config,
    timestamp,
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
    timestamp,
    type: "withdraw",
  });
}

// Function to calculate the average cost of tokens
export function getAverageCost({
  timestamp,
  config,
}: {
  timestamp: number;
  config: Config;
}) {
  const { transactions } = config;

  const cacheKey = getCacheKey("getAverageCost", config, [timestamp]);

  return memoize(cacheKey, () => {
    let totalCost = 0;
    let totalAmount = 0;

    // Convert date to timestamp for faster comparisons

    // Filter buy transactions without deep cloning
    const buyTransactions = transactions
      .filter(
        (transaction): transaction is Extract<Transaction, { type: "buy" }> =>
          transaction.type === "buy" && transaction.timestamp <= timestamp
      )
      // Sort by price (lowest first) for FIFO accounting
      .sort((a, b) => a.price - b.price);

    // Calculate total sold tokens up to the date
    let totalSoldTokens = transactions
      .filter(
        (transaction): transaction is Extract<Transaction, { type: "sell" }> =>
          transaction.type === "sell" && transaction.timestamp <= timestamp
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
export function getNbToken({
  config,
  timestamp,
}: {
  timestamp: number;
  config: Config;
}) {
  const { transactions } = config;

  const cacheKey = getCacheKey("getNbToken", config, [timestamp]);

  return memoize(cacheKey, () => {
    // Convert date to timestamp for faster comparisons

    return transactions.reduce((acc, transaction) => {
      if (transaction.timestamp > timestamp) {
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
      // Sort dates to potentially improve cache hits
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

      // Pre-calculate token balances for all dates
      const tokenBalances = new Map();
      let lastBalance = 0;
      for (const { timestamp } of sortedData) {
        lastBalance = getNbToken({
          timestamp,
          config,
        });
        tokenBalances.set(timestamp, lastBalance);
      }

      // Map the results back to the original data order
      return data.map((d) => {
        return {
          timestamp: d.timestamp,
          nbToken: tokenBalances.get(d.timestamp),
        };
      });
    },
    TTL
  );
}

// Function to get the balance in USD
export function getNbUSD({
  timestamp,
  config,
}: {
  timestamp: number;
  config: Config;
}) {
  const { transactions, accountActivities } = config;

  const cacheKey = getCacheKey("getNbUSD", config, [timestamp]);

  return memoize(cacheKey, () => {
    // Process transactions and account activities separately to avoid array concatenation
    const transactionsBalance = transactions.reduce((acc, entry) => {
      if (entry.timestamp > timestamp) {
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
      if (entry.timestamp > timestamp) {
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
      // Sort dates to potentially improve cache hits
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

      // Pre-calculate USD balances for all dates
      const usdBalances = new Map();
      let lastBalance = 0;
      for (const { timestamp } of sortedData) {
        lastBalance = getNbUSD({
          timestamp,
          config,
        });
        usdBalances.set(timestamp, lastBalance);
      }

      // Map the results back to the original data order
      return data.map((d) => {
        return {
          timestamp: d.timestamp,
          nbUSD: usdBalances.get(d.timestamp),
        };
      });
    },
    TTL
  );
}

// Function to get the deposits in USD
export function getDepositsUSD({
  config,
  timestamp,
}: {
  config: Config;
  timestamp: number;
}) {
  const { accountActivities } = config;

  const cacheKey = getCacheKey("getDepositsUSD", config, [timestamp]);

  return memoize(cacheKey, () => {
    return accountActivities.reduce((acc, accountActivity) => {
      if (accountActivity.timestamp > timestamp) {
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
export function getFeesUSD({
  config,
  timestamp,
}: {
  config: Config;
  timestamp: number;
}) {
  const { transactions } = config;

  const cacheKey = getCacheKey("getFeesUSD", config, [timestamp]);

  return memoize(cacheKey, () => {
    // Convert date to timestamp for faster comparisons

    return transactions.reduce((acc, transaction) => {
      if (transaction.timestamp > timestamp) {
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
  timestamp,
  actualPrice,
}: {
  config: Config;
  timestamp: number;
  actualPrice: number;
}) {
  const cacheKey = getCacheKey("getProfitUSD", config, [timestamp]);

  return memoize(cacheKey, () => {
    const investmentUSD = getDepositsUSD({ config, timestamp });
    const feesUSD = getFeesUSD({ config, timestamp });
    const balanceUSD = getNbUSD({ config, timestamp });
    const tokenToUSD = getNbToken({ config, timestamp }) * actualPrice;
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
      // Create a map of timestamp to price for quick lookup
      const priceMap = new Map(data.map((d) => [d.timestamp, d.close]));

      // Sort dates to potentially improve cache hits
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

      // Pre-calculate profits for all dates
      const profits = new Map();
      let lastProfitUSD = 0;
      for (const { timestamp } of sortedData) {
        const actualPrice = priceMap.get(timestamp) || 0;

        lastProfitUSD = getProfitUSD({
          config,
          timestamp,
          actualPrice,
        });
        profits.set(timestamp, lastProfitUSD);
      }

      // Map the results back to the original data order
      return data.map((d) => {
        return {
          timestamp: d.timestamp,
          profitUSD: profits.get(d.timestamp),
        };
      });
    },
    TTL
  );
}

// Function to calculate the profit percentage
export function getProfitPercentage({
  config,
  timestamp,
  actualPrice,
}: {
  config: Config;
  timestamp: number;
  actualPrice: number;
}) {
  const cacheKey = getCacheKey("getProfitPercentage", config, [timestamp]);

  return memoize(cacheKey, () => {
    const investmentUSD = getDepositsUSD({ config, timestamp });
    const feesUSD = getFeesUSD({ config, timestamp });
    const balanceUSD = getNbUSD({ config, timestamp });
    const tokenToUSD = getNbToken({ config, timestamp }) * actualPrice;
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
      // Create a map of timestamp to price for quick lookup
      const priceMap = new Map(data.map((d) => [d.timestamp, d.close]));

      // Sort dates to potentially improve cache hits
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

      // Pre-calculate profit percentages for all dates
      const profitPercentages = new Map();
      let lastProfitPercentage = 0;
      for (const { timestamp } of sortedData) {
        const actualPrice = priceMap.get(timestamp) || 0;

        lastProfitPercentage = getProfitPercentage({
          config,
          timestamp,
          actualPrice,
        });
        profitPercentages.set(timestamp, lastProfitPercentage);
      }

      // Map the results back to the original data order
      return data.map((d) => {
        return {
          timestamp: d.timestamp,
          profitPercentage: profitPercentages.get(d.timestamp),
        };
      });
    },
    TTL
  );
}

// Function to calculate various metrics
export function calculateMetrics({
  timestamp,
  config,
  data,
}: {
  timestamp: number;
  config: Config;
  data: Data[];
}) {
  const { transactions } = config;

  const cacheKey = getCacheKey("calculateMetrics", config, [timestamp]);
  // Add a TTL of 5 minutes for metrics data
  const TTL = 5 * 60 * 1000;

  return memoize(
    cacheKey,
    () => {
      const actualPrice = data[data.length - 1].close;

      // Use cached values for repeated calculations
      const balanceUSD = getNbUSD({ config, timestamp });
      const investmentUSD = getDepositsUSD({ config, timestamp });
      const nbToken = getNbToken({ config, timestamp });
      const tokenToUSD = nbToken * actualPrice;
      const totalUSD = balanceUSD + tokenToUSD;
      const feesUSD = getFeesUSD({ config, timestamp });

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
          if (transaction.timestamp <= timestamp) {
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
        timestamp,
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
