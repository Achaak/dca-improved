import { calculateMetrics, getNbToken, getAverageCost } from "../transaction";
import type { Config } from "../types";

export function formatUSD(amount: number) {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export function formatToken(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export function formatDifference(value: number) {
  return value > 0 ? `+${formatUSD(value)}` : formatUSD(value);
}

export function formatNumber(value: number) {
  return value % 1 === 0 ? value.toString() : value.toFixed(2);
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
  const {
    balanceUSD,
    totalUSD,
    investmentUSD,
    feesUSD,
    profitUSD,
    profitPercentage,
    nbOfSells,
    nbOfBuys,
  } = calculateMetrics({ config, endDate, actualPrice });

  console.table({
    Period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    "Balance (USD)": formatUSD(balanceUSD),
    "Number of BTC": formatToken(getNbToken(config.transactions, endDate)),
    "Average Cost (USD)": formatUSD(
      getAverageCost(config.transactions, endDate)
    ),
    "Total Value (USD)": formatUSD(totalUSD),
  });

  console.table({
    "Investment (USD)": formatUSD(investmentUSD),
    "Fees (USD)": formatUSD(feesUSD),
    "Profit (USD)": formatUSD(profitUSD),
    "Profit Percentage": `${profitPercentage.toFixed(2)}%`,
  });

  console.table({
    "Number of Sells": nbOfSells,
    "Number of Buys": nbOfBuys,
  });
}
