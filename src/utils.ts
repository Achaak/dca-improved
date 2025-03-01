import path from "path";
import type { Config, Data, Transaction } from "./types";

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

export function getProfitUSD(config: Config, date: Date, actualPrice: number) {
  const investmentUSD = getInvestmentsUSD(config.transactions, date);
  const balanceUSD = getNbUSD(config.transactions, date);
  const btcToUSD = getNbBTC(config.transactions, date) * actualPrice;
  const totalUSD = balanceUSD + btcToUSD;

  return totalUSD - investmentUSD;
}

export function getProfitPercentage(
  config: Config,
  date: Date,
  actualPrice: number
) {
  const balanceUSD = getNbUSD(config.transactions, date);
  const investmentUSD = getInvestmentsUSD(config.transactions, date);
  const btcToUSD = getNbBTC(config.transactions, date) * actualPrice;
  const totalUSD = balanceUSD + btcToUSD;

  return ((totalUSD - investmentUSD) / investmentUSD) * 100;
}

export function getNbOfSells(config: Config, date: Date) {
  return config.transactions.filter((t) => t.type === "sell" && t.date <= date)
    .length;
}

export function getNbOfBuys(config: Config, date: Date) {
  return config.transactions.filter((t) => t.type === "buy" && t.date <= date)
    .length;
}

export function showStats({
  config,
  actualPrice,
  startDate,
  endDate,
}: {
  config: Config;
  actualPrice: number;
  startDate: Date;
  endDate: Date;
}) {
  const balanceUSD = getNbUSD(config.transactions, endDate);
  const investmentUSD = getInvestmentsUSD(config.transactions, endDate);
  const btcToUSD = getNbBTC(config.transactions, endDate) * actualPrice;
  const totalUSD = balanceUSD + btcToUSD;

  const profitUSD = getProfitUSD(config, endDate, actualPrice);
  const profitPercentage = getProfitPercentage(config, endDate, actualPrice);

  const nbOfSells = getNbOfSells(config, endDate);
  const nbOfBuys = getNbOfBuys(config, endDate);

  console.table({
    Period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    "Balance (USD)": formatUSD(balanceUSD),
    "Number of BTC": formatBTC(getNbBTC(config.transactions, endDate)),
    "Average Cost (USD)": formatUSD(
      getAverageCost(config.transactions, endDate)
    ),
    "Total Value (USD)": formatUSD(totalUSD),
  });

  console.table({
    "Investment (USD)": formatUSD(investmentUSD),
    "Profit (USD)": formatUSD(profitUSD),
    "Profit Percentage": `${profitPercentage.toFixed(2)}%`,
  });

  console.table({
    "Number of Sells": nbOfSells,
    "Number of Buys": nbOfBuys,
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
