import { SHOW_LOGS } from "./utils/env";
import { formatToken, formatUSD } from "./utils/format";
import type { Config, Data, Transaction } from "./types";
import { getDrawdown } from "./utils/drawdown";

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
    console.error("Amount must be greater than 0");
    return;
  }

  const feeUSD = calculateFee(amountUSD, config.fee);
  const amountTokenMinusFee = (amountUSD - feeUSD) / price;
  const balanceUSD = getNbUSD({ transactions: config.transactions, date });

  if (balanceUSD < amountUSD && SHOW_LOGS) {
    console.error("Not enough balance");
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
  const totalTokens = getNbToken({ transactions: config.transactions, date });

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
  transactions,
}: {
  amountUSD: number;
  date: Date;
  transactions: Transaction[];
}) {
  transactions.push({
    amountUSD,
    date,
    type: "deposit",
  });
}

// Function to handle withdrawals
export function withdraw({
  amountUSD,
  date,
  transactions,
}: {
  amountUSD: number;
  date: Date;
  transactions: Transaction[];
}) {
  const balanceUSD = getNbUSD({ transactions: transactions, date });

  if (balanceUSD < amountUSD) {
    console.error(
      `Not enough balance to withdraw ${formatUSD(amountUSD)}, only ${formatUSD(
        balanceUSD
      )} available`
    );
    return;
  }

  transactions.push({
    amountUSD,
    date,
    type: "withdraw",
  });
}

// Function to calculate the average cost of tokens
export function getAverageCost({
  transactions,
  date,
}: {
  transactions: Transaction[];
  date: Date;
}) {
  let totalCost = 0;
  let totalAmount = 0;

  let buyTransactions = structuredClone(transactions)
    .filter(
      (transaction): transaction is Extract<Transaction, { type: "buy" }> =>
        transaction.type === "buy" && transaction.date <= date
    )
    .sort((a, b) => a.price - b.price);

  let totalSoldTokens = structuredClone(transactions)
    .filter(
      (transaction): transaction is Extract<Transaction, { type: "sell" }> =>
        transaction.type === "sell" && transaction.date <= date
    )
    .reduce((acc, transaction) => acc + transaction.amountToken, 0);

  for (const buyTransaction of buyTransactions) {
    if (totalSoldTokens === 0) {
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

  buyTransactions = buyTransactions.filter(
    (transaction) => transaction.amountToken > 0
  );

  for (const transaction of buyTransactions) {
    totalCost +=
      transaction.amountToken * transaction.price + transaction.feeUSD;
    totalAmount += transaction.amountToken;
  }

  return totalAmount === 0 ? 0 : totalCost / totalAmount;
}

// Function to get the number of tokens
export function getNbToken({
  transactions,
  date,
}: {
  transactions: Transaction[];
  date: Date;
}) {
  return transactions.reduce((acc, transaction) => {
    if (transaction.date > date) {
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
}

// Function to get the number of tokens history
export function getNbTokenHistory({
  transactions,
  data,
}: {
  transactions: Transaction[];
  data: Data[];
}) {
  return data.map((d) => {
    const nbToken = getNbToken({
      transactions,
      date: new Date(d.timestamp),
    });
    return {
      timestamp: d.timestamp,
      nbToken,
    };
  });
}

// Function to get the balance in USD
export function getNbUSD({
  transactions,
  date,
}: {
  transactions: Transaction[];
  date: Date;
}) {
  return transactions.reduce((acc, transaction) => {
    if (transaction.date > date) {
      return acc;
    }

    switch (transaction.type) {
      case "deposit":
        return acc + transaction.amountUSD;
      case "withdraw":
        return acc - transaction.amountUSD;
      case "buy":
        return (
          acc - transaction.amountToken * transaction.price - transaction.feeUSD
        );
      case "sell":
        return (
          acc + transaction.amountToken * transaction.price - transaction.feeUSD
        );
      default:
        return acc;
    }
  }, 0);
}

// Function to get the balance in USD history
export function getNbUSDHistory({
  transactions,
  data,
}: {
  transactions: Transaction[];
  data: Data[];
}) {
  return data.map((d) => {
    const nbUSD = getNbUSD({ transactions, date: new Date(d.timestamp) });
    return {
      timestamp: d.timestamp,
      nbUSD,
    };
  });
}

// Function to get the total investments in USD
export function getInvestmentsUSD({
  transactions,
  date,
}: {
  transactions: Transaction[];
  date: Date;
}) {
  return transactions.reduce((acc, transaction) => {
    if (transaction.date > date) {
      return acc;
    }

    if (transaction.type === "deposit") {
      return acc + transaction.amountUSD;
    } else {
      return acc;
    }
  }, 0);
}

// Function to get the total fees in USD
export function getFeesUSD({
  transactions,
  date,
}: {
  transactions: Transaction[];
  date: Date;
}) {
  return transactions.reduce((acc, transaction) => {
    if (transaction.date > date) {
      return acc;
    }

    if (transaction.type === "buy" || transaction.type === "sell") {
      return acc + transaction.feeUSD;
    } else {
      return acc;
    }
  }, 0);
}

// Function to calculate the profit in USD
export function getProfitUSD({
  transactions,
  date,
  actualPrice,
}: {
  transactions: Transaction[];
  date: Date;
  actualPrice: number;
}) {
  const investmentUSD = getInvestmentsUSD({
    transactions: transactions,
    date,
  });
  const feesUSD = getFeesUSD({ transactions, date });
  const balanceUSD = getNbUSD({ transactions, date });
  const tokenToUSD = getNbToken({ transactions, date }) * actualPrice;
  const totalUSD = balanceUSD + tokenToUSD;

  return totalUSD - investmentUSD - feesUSD;
}

// Function to get the profit in USD history
export function getProfitUSDHistory({
  transactions,
  data,
}: {
  transactions: Transaction[];
  data: Data[];
}) {
  return data.map((d) => {
    const actualPrice = d.close;
    const profitUSD = getProfitUSD({
      transactions,
      date: new Date(d.timestamp),
      actualPrice,
    });
    return {
      timestamp: d.timestamp,
      profitUSD,
    };
  });
}

// Function to calculate the profit percentage
export function getProfitPercentage({
  transactions,
  date,
  actualPrice,
}: {
  transactions: Transaction[];
  date: Date;
  actualPrice: number;
}) {
  const investmentUSD = getInvestmentsUSD({ transactions, date });
  const feesUSD = getFeesUSD({ transactions, date });
  const balanceUSD = getNbUSD({ transactions, date });
  const tokenToUSD = getNbToken({ transactions, date }) * actualPrice;
  const totalUSD = balanceUSD + tokenToUSD;

  return ((totalUSD - investmentUSD - feesUSD) / investmentUSD) * 100;
}

// Function to get the profit percentage history
export function getProfitPercentageHistory({
  transactions,
  data,
}: {
  transactions: Transaction[];
  data: Data[];
}) {
  return data.map((d) => {
    const actualPrice = d.close;
    const profitPercentage = getProfitPercentage({
      transactions,
      date: new Date(d.timestamp),
      actualPrice,
    });
    return {
      timestamp: d.timestamp,
      profitPercentage,
    };
  });
}

// Function to get the number of sell transactions
export function getNbOfSells({
  transactions,
  date,
}: {
  transactions: Transaction[];
  date: Date;
}) {
  return transactions.filter(
    (transaction) => transaction.type === "sell" && transaction.date <= date
  ).length;
}

// Function to get the number of buy transactions
export function getNbOfBuys({
  transactions,
  date,
}: {
  transactions: Transaction[];
  date: Date;
}) {
  return transactions.filter(
    (transaction) => transaction.type === "buy" && transaction.date <= date
  ).length;
}

// Function to calculate various metrics
export function calculateMetrics({
  endDate,
  transactions,
  data,
}: {
  endDate: Date;
  transactions: Transaction[];
  data: Data[];
}) {
  const actualPrice = data[data.length - 1].close;
  const profitPercentageHistory = getProfitPercentageHistory({
    data,
    transactions: transactions,
  });
  const balancesUSD = profitPercentageHistory.map((b) => b.profitPercentage);
  const drawdown = getDrawdown({
    values: balancesUSD,
  });
  const balanceUSD = getNbUSD({
    transactions: transactions,
    date: endDate,
  });
  const investmentUSD = getInvestmentsUSD({
    transactions: transactions,
    date: endDate,
  });
  const tokenToUSD =
    getNbToken({ transactions: transactions, date: endDate }) * actualPrice;
  const totalUSD = balanceUSD + tokenToUSD;
  const feesUSD = getFeesUSD({
    transactions: transactions,
    date: endDate,
  });

  const profitUSD = getProfitUSD({
    transactions: transactions,
    date: endDate,
    actualPrice,
  });
  const profitPercentage = getProfitPercentage({
    transactions: transactions,
    date: endDate,
    actualPrice,
  });

  const nbOfSells = getNbOfSells({ transactions, date: endDate });
  const nbOfBuys = getNbOfBuys({ transactions, date: endDate });

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
}
