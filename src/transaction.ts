import { SHOW_LOGS } from "./utils/env";
import { formatToken, formatUSD } from "./utils/format";
import type { Config, Transaction } from "./types";

export function buy(
  amountUSD: number,
  price: number,
  date: Date,
  config: Config
) {
  if (amountUSD <= 0) {
    console.error("Amount must be greater than 0");
    return;
  }

  const feeUSD = amountUSD * config.fee;
  const amountTokenMinusFee = (amountUSD - feeUSD) / price;

  const balanceUSD = getNbUSD(config.transactions, date);

  if (balanceUSD < amountUSD && SHOW_LOGS) {
    console.error("Not enough balance");
    return;
  }

  config.transactions.push({
    amountToken: amountTokenMinusFee,
    price,
    date,
    type: "buy",
    feeUSD: feeUSD,
  });

  if (SHOW_LOGS) {
    console.log(
      `\x1b[32m Bought ${formatToken(amountTokenMinusFee)} BTC for ${formatUSD(
        amountUSD
      )} USD at ${formatUSD(
        price
      )} USD/BTC on ${date.toLocaleString()}. Fee: ${formatUSD(
        feeUSD
      )} USD \x1b[0m`
    );
  }
}

export function sell(
  amountToken: number,
  price: number,
  date: Date,
  config: Config
) {
  const nbToken = getNbToken(config.transactions, date);

  if (nbToken < amountToken && SHOW_LOGS) {
    console.error("Not enough BTC");
    return;
  }

  const amountUSD = amountToken * price;
  const feeUSD = amountUSD * config.fee;

  config.transactions.push({
    amountToken: amountToken,
    price,
    date,
    type: "sell",
    feeUSD,
  });

  if (SHOW_LOGS) {
    console.log(
      `\x1b[31m Sold ${formatToken(amountToken)} BTC for ${formatUSD(
        amountUSD
      )} USD at ${formatUSD(
        price
      )} USD/BTC on ${date.toLocaleString()}. Fee: ${formatUSD(
        feeUSD
      )} USD \x1b[0m`
    );
  }
}

export function deposit(amountUSD: number, date: Date, config: Config) {
  config.transactions.push({
    amountUSD,
    date,
    type: "deposit",
  });
}

export function withdraw(amountUSD: number, date: Date, config: Config) {
  const balanceUSD = getNbUSD(config.transactions, date);

  if (balanceUSD < amountUSD) {
    console.error(
      `Not enough balance to withdraw ${formatUSD(amountUSD)}, only ${formatUSD(
        balanceUSD
      )} available`
    );
    return;
  }

  config.transactions.push({
    amountUSD,
    date,
    type: "withdraw",
  });
}

export function getAverageCost(transactions: Transaction[], date: Date) {
  let sum = 0;
  let nb = 0;

  let allBuy = structuredClone(transactions)
    .filter(
      (t): t is Extract<Transaction, { type: "buy" }> =>
        t.type === "buy" && t.date <= date
    )
    .sort((a, b) => a.price - b.price);

  let totalBTCSell = structuredClone(transactions)
    .filter(
      (t): t is Extract<Transaction, { type: "sell" }> =>
        t.type === "sell" && t.date <= date
    )
    .reduce((acc, t) => acc + t.amountToken, 0);

  for (const b of allBuy) {
    if (totalBTCSell === 0) {
      break;
    }

    if (b.amountToken > totalBTCSell) {
      b.amountToken -= totalBTCSell;
      totalBTCSell = 0;
    } else {
      totalBTCSell -= b.amountToken;
      b.amountToken = 0;
    }
  }

  allBuy = allBuy.filter((t) => t.amountToken > 0);

  for (const t of allBuy) {
    sum += t.amountToken * t.price + t.feeUSD;
    nb += t.amountToken;
  }

  if (nb === 0) {
    return 0;
  }

  return sum / nb;
}

export function getNbToken(transactions: Transaction[], date: Date) {
  return transactions.reduce((acc, t) => {
    if (t.date > date) {
      return acc;
    }

    if (t.type === "buy") {
      return acc + t.amountToken;
    } else if (t.type === "sell") {
      return acc - t.amountToken;
    } else {
      return acc;
    }
  }, 0);
}

export function getNbUSD(transactions: Transaction[], date: Date) {
  return transactions.reduce((acc, t) => {
    if (t.date > date) {
      return acc;
    }

    switch (t.type) {
      case "deposit":
        return acc + t.amountUSD;
      case "withdraw":
        return acc - t.amountUSD;
      case "buy":
        return acc - t.amountToken * t.price - t.feeUSD;
      case "sell":
        return acc + t.amountToken * t.price - t.feeUSD;
    }
  }, 0);
}

export function getInvestmentsUSD(transactions: Transaction[], date: Date) {
  return transactions.reduce((acc, t) => {
    if (t.date > date) {
      return acc;
    }

    if (t.type === "deposit") {
      return acc + t.amountUSD;
    } else {
      return acc;
    }
  }, 0);
}

export function getProfitUSD(config: Config, date: Date, actualPrice: number) {
  const investmentUSD = getInvestmentsUSD(config.transactions, date);
  const feesUSD = getFeesUSD(config.transactions, date);
  const balanceUSD = getNbUSD(config.transactions, date);
  const tokenToUSD = getNbToken(config.transactions, date) * actualPrice;
  const totalUSD = balanceUSD + tokenToUSD;

  return totalUSD - investmentUSD - feesUSD;
}

export function getProfitPercentage(
  config: Config,
  date: Date,
  actualPrice: number
) {
  const investmentUSD = getInvestmentsUSD(config.transactions, date);
  const feesUSD = getFeesUSD(config.transactions, date);
  const balanceUSD = getNbUSD(config.transactions, date);
  const tokenToUSD = getNbToken(config.transactions, date) * actualPrice;
  const totalUSD = balanceUSD + tokenToUSD;

  return ((totalUSD - investmentUSD - feesUSD) / investmentUSD) * 100;
}

export function getNbOfSells(config: Config, date: Date) {
  return config.transactions.filter((t) => t.type === "sell" && t.date <= date)
    .length;
}

export function getNbOfBuys(config: Config, date: Date) {
  return config.transactions.filter((t) => t.type === "buy" && t.date <= date)
    .length;
}

export function getFeesUSD(transactions: Transaction[], date: Date) {
  return transactions.reduce((acc, t) => {
    if (t.date > date) {
      return acc;
    }

    if (t.type === "buy" || t.type === "sell") {
      return acc + t.feeUSD;
    } else {
      return acc;
    }
  }, 0);
}

export function calculateMetrics({
  actualPrice,
  endDate,
  config,
}: {
  config: Config;
  endDate: Date;
  actualPrice: number;
}) {
  const balanceUSD = getNbUSD(config.transactions, endDate);
  const investmentUSD = getInvestmentsUSD(config.transactions, endDate);
  const tokenToUSD = getNbToken(config.transactions, endDate) * actualPrice;
  const totalUSD = balanceUSD + tokenToUSD;
  const feesUSD = getFeesUSD(config.transactions, endDate);

  const profitUSD = getProfitUSD(config, endDate, actualPrice);
  const profitPercentage = getProfitPercentage(config, endDate, actualPrice);

  const nbOfSells = getNbOfSells(config, endDate);
  const nbOfBuys = getNbOfBuys(config, endDate);

  return {
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
