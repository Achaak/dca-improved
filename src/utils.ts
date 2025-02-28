import path from "path";
import type { Config, Data, Transaction } from "./types";

export function getAverageCost(transactions: Transaction[], date: Date) {
  let sum = 0;
  let nb = 0;

  let allBuy = structuredClone(transactions)
    .filter((t): t is Extract<Transaction, { type: "buy" }> => t.type === 'buy' && t.date <= date)
    .sort((a, b) => a.price - b.price);

  let totalBTCSell = structuredClone(transactions)
    .filter((t): t is Extract<Transaction, { type: 'sell' }> => t.type === "sell" && t.date <= date)
    .reduce((acc, t) => acc + t.amountBTC, 0);

  for (const b of allBuy) {
    if (totalBTCSell === 0) {
      break;
    }

    if (b.amountBTC > totalBTCSell) {
      b.amountBTC -= totalBTCSell;
      totalBTCSell = 0;
    } else {
      totalBTCSell -= b.amountBTC;
      b.amountBTC = 0;
    }
  }

  allBuy = allBuy.filter((t) => t.amountBTC > 0);

  for (const t of allBuy) {
    sum += t.amountBTC * t.price + t.feeUSD;
    nb += t.amountBTC;
  }

  if (nb === 0) {
    return 0;
  }

  return sum / nb;
}

export function getNbBTC(transactions: Transaction[], date: Date) {
  return transactions.reduce((acc, t) => {
    if (t.date > date) {
      return acc;
    }

    if (t.type === "buy") {
      return acc + t.amountBTC;
    } else if (t.type === "sell") {
      return acc - t.amountBTC;
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
        return acc - t.amountBTC * t.price - t.feeUSD;
      case "sell":
        return acc + t.amountBTC * t.price - t.feeUSD;
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

export function formatUSD(amount: number) {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export function formatBTC(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
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
    console.error(`Not enough balance to withdraw ${formatUSD(amountUSD)}, only ${formatUSD(balanceUSD)} available`);
    return;
  }

  config.transactions.push({
    amountUSD,
    date,
    type: "withdraw",
  });
}

export function showStats(config: Config, actualPrice: number) {
  const date = config.transactions[config.transactions.length - 1].date;
  const balanceUSD = getNbUSD(config.transactions, date);
  const investmentUSD = getInvestmentsUSD(config.transactions, date);
  const btcToUSD = getNbBTC(config.transactions, date) * actualPrice;
  const totalUSD = balanceUSD + btcToUSD;

  console.log({
    balanceUSD: formatUSD(balanceUSD),
    nbBTC: formatBTC(getNbBTC(config.transactions, date)),
    averageCost: formatUSD(getAverageCost(config.transactions, date)),
    totalUSD: formatUSD(totalUSD),
    investmentUSD: formatUSD(investmentUSD),
    profitUSD: formatUSD(totalUSD - investmentUSD),
    profitPercentage: `${(
      ((totalUSD - investmentUSD) / investmentUSD) *
      100
    ).toFixed(2)}%`,
    nbSell: config.transactions.filter((t) => t.type === "sell" && t.date <= date).length,
    nbBuy: config.transactions.filter((t) => t.type === "buy" && t.date <= date).length,
  });
}

export async function getData({
  dataFile,
  startDate,
  endDate,
}: {
  dataFile: string;
  startDate: Date;
  endDate: Date;
}) {
  const module = await import(path.join(__dirname, "../download/", dataFile));
  const data = module.default as Data[];

  return data.filter(
    (d) =>
      new Date(d.timestamp) >= startDate && new Date(d.timestamp) <= endDate
  );
}
