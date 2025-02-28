import path from "path";

export function getAverageCost(transactions: Transaction[], date: Date) {
  let sum = 0;
  let nb = 0;

  let allBuy = structuredClone(transactions)
    .filter((t) => t.type === "buy" && t.date <= date)
    .sort((a, b) => a.price - b.price);

  let totalBTCSell = structuredClone(transactions)
    .filter((t) => t.type === "sell" && t.date <= date)
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
    } else {
      return acc - t.amountBTC;
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

export function deposit(amountUSD: number, config: Config) {
  config.balanceUSD += amountUSD;
  config.investmentUSD += amountUSD;
}

export function showStats(config: Config, actualPrice: number) {
  const date = config.transactions[config.transactions.length - 1].date;
  const balanceUSD = config.balanceUSD;
  const btcToUSD = getNbBTC(config.transactions, date) * actualPrice;
  const totalUSD = balanceUSD + btcToUSD;

  console.log({
    balanceUSD: formatUSD(config.balanceUSD),
    nbBTC: formatBTC(getNbBTC(config.transactions, date)),
    averageCost: formatUSD(getAverageCost(config.transactions, date)),
    totalUSD: formatUSD(totalUSD),
    investmentUSD: formatUSD(config.investmentUSD),
    profitUSD: formatUSD(totalUSD - config.investmentUSD),
    profitPercentage: `${(
      ((totalUSD - config.investmentUSD) / config.investmentUSD) *
      100
    ).toFixed(2)}%`,
    nbSell: config.transactions.filter((t) => t.type === "sell").length,
    nbBuy: config.transactions.filter((t) => t.type === "buy").length,
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
