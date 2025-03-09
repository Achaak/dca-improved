import { calculateMetrics, getNbToken, getAverageCost } from "../transaction";
import type { Config, Data } from "../types";

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

function logTable(title: string, data: Record<string, any>) {
  console.log(title);
  const coloredData = Object.entries(data).reduce((acc, [key, value]) => {
    if (typeof value === "object" && value !== null) {
      acc[key] = Object.entries(value).reduce((subAcc, [subKey, subValue]) => {
        if (subKey === "Difference" && typeof subValue === "string") {
          const color = subValue.startsWith("+") ? "\x1b[32m" : "\x1b[31m";
          subAcc[subKey] = `${color}${subValue}\x1b[0m`;
        } else {
          subAcc[subKey] = subValue;
        }
        return subAcc;
      }, {} as Record<string, any>);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
  console.table(coloredData);
}

export function showMetrics({
  config,
  data,
  startDate,
  endDate,
}: {
  config: Config;
  data: Data[];
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
    tokenToUSD,
    drawdown: { peak: drawdownPeak, trough: drawdownTrough },
  } = calculateMetrics({
    config,
    endDate,
    data,
  });

  logTable("📅 Period and Token Information", {
    Period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    Token: config.token.toUpperCase(),
  });

  logTable("💰 Balance and Investment Metrics", {
    "Balance (USD)": formatUSD(balanceUSD),
    [`Number of ${config.token.toUpperCase()}`]: formatToken(
      getNbToken({ config, date: endDate })
    ),
    [`${config.token.toUpperCase()} to USD`]: formatUSD(tokenToUSD),
    "Average Cost (USD)": formatUSD(getAverageCost({ config, date: endDate })),
    "Investment (USD)": formatUSD(investmentUSD),
    "Fees (USD)": formatUSD(feesUSD),
    "Total (USD)": formatUSD(totalUSD),
  });

  logTable("📊 Profit and Drawdown Metrics", {
    "Profit (USD)": formatUSD(profitUSD),
    "Profit Percentage": `${profitPercentage.toFixed(2)}%`,
    "Drawdown Peak (%)": `${drawdownPeak.toFixed(2)}%`,
    "Drawdown Trough (%)": `${drawdownTrough.toFixed(2)}%`,
    "Drawdown Gap": `${(drawdownPeak - drawdownTrough).toFixed(2)} pts`,
  });

  logTable("🔄 Transaction Metrics", {
    "Number of Sells": nbOfSells,
    "Number of Buys": nbOfBuys,
  });
}

interface Metrics {
  balanceUSD: number;
  investmentUSD: number;
  tokenToUSD: number;
  totalUSD: number;
  profitUSD: number;
  profitPercentage: number;
  nbOfSells: number;
  nbOfBuys: number;
  actualPrice?: number;
  feesUSD: number;
  drawdown: {
    peak: number;
    trough: number;
  };
}

export function showCompareMetrics({
  config,
  improvedMetrics,
  interval,
  metrics,
  nbRuns,
}: {
  metrics: Metrics;
  improvedMetrics: Metrics;
  config: Config;
  interval?: number;
  nbRuns?: number;
}) {
  const drawdownPeakDifference =
    improvedMetrics.drawdown.peak - metrics.drawdown.peak;
  const drawdownTroughDifference =
    improvedMetrics.drawdown.trough - metrics.drawdown.trough;
  const dcaDrawdownGap = metrics.drawdown.peak - metrics.drawdown.trough;
  const improvedDrawdownGap =
    improvedMetrics.drawdown.peak - improvedMetrics.drawdown.trough;
  const drawdownGapDifference = improvedDrawdownGap - dcaDrawdownGap;

  logTable("📅 Period and Token Information", {
    Period: `${new Date(config.start_date).toLocaleDateString()} - ${new Date(
      config.end_date
    ).toLocaleDateString()}`,
    Token: config.token.toUpperCase(),
    ...(interval && { Interval: `${interval} days` }),
    ...(nbRuns && { "Number of Runs": nbRuns }),
  });

  logTable("💰 Balance and Investment Details", {
    "Balance (USD)": {
      DCA: formatUSD(metrics.balanceUSD),
      "DCA Improved": formatUSD(improvedMetrics.balanceUSD),
      Difference: formatDifference(
        improvedMetrics.balanceUSD - metrics.balanceUSD
      ),
    },
    "Investment (USD)": {
      DCA: formatUSD(metrics.investmentUSD),
      "DCA Improved": formatUSD(improvedMetrics.investmentUSD),
      Difference: formatDifference(
        improvedMetrics.investmentUSD - metrics.investmentUSD
      ),
    },
    "Fees (USD)": {
      DCA: formatUSD(metrics.feesUSD),
      "DCA Improved": formatUSD(improvedMetrics.feesUSD),
      Difference: formatDifference(improvedMetrics.feesUSD - metrics.feesUSD),
    },
    [`${config.token.toUpperCase()} to USD`]: {
      DCA: formatUSD(metrics.tokenToUSD),
      "DCA Improved": formatUSD(improvedMetrics.tokenToUSD),
      Difference: formatDifference(
        improvedMetrics.tokenToUSD - metrics.tokenToUSD
      ),
    },
    "Total (USD)": {
      DCA: formatUSD(metrics.totalUSD),
      "DCA Improved": formatUSD(improvedMetrics.totalUSD),
      Difference: formatDifference(improvedMetrics.totalUSD - metrics.totalUSD),
    },
  });

  logTable("📊 Profit and Drawdown Metrics", {
    "Profit (USD)": {
      DCA: formatUSD(metrics.profitUSD),
      "DCA Improved": formatUSD(improvedMetrics.profitUSD),
      Difference: formatDifference(
        improvedMetrics.profitUSD - metrics.profitUSD
      ),
    },
    "Profit (%)": {
      DCA: `${metrics.profitPercentage.toFixed(2)}%`,
      "DCA Improved": `${improvedMetrics.profitPercentage.toFixed(2)}%`,
      Difference: `${
        improvedMetrics.profitPercentage - metrics.profitPercentage > 0
          ? "+"
          : ""
      }${(improvedMetrics.profitPercentage - metrics.profitPercentage).toFixed(
        2
      )} pts`,
    },
    "Drawdown Peak (%)": {
      DCA: `${metrics.drawdown.peak.toFixed(2)}%`,
      "DCA Improved": `${improvedMetrics.drawdown.peak.toFixed(2)}%`,
      Difference: `${
        drawdownPeakDifference > 0 ? "+" : ""
      }${drawdownPeakDifference.toFixed(2)} pts`,
    },
    "Drawdown Trough (%)": {
      DCA: `${metrics.drawdown.trough.toFixed(2)}%`,
      "DCA Improved": `${improvedMetrics.drawdown.trough.toFixed(2)}%`,
      Difference: `${
        drawdownTroughDifference > 0 ? "+" : ""
      }${drawdownTroughDifference.toFixed(2)} pts`,
    },
    "Drawdown Gap": {
      DCA: `${dcaDrawdownGap.toFixed(2)} pts`,
      "DCA Improved": `${improvedDrawdownGap.toFixed(2)} pts`,
      Difference: `${
        drawdownGapDifference > 0 ? "+" : ""
      }${drawdownGapDifference.toFixed(2)} pts`,
    },
  });

  logTable("🔄 Transaction Counts Overview", {
    "Number of Sells": {
      DCA: formatNumber(metrics.nbOfSells),
      "DCA Improved": formatNumber(improvedMetrics.nbOfSells),
      Difference:
        improvedMetrics.nbOfSells - metrics.nbOfSells > 0
          ? `+${formatNumber(improvedMetrics.nbOfSells - metrics.nbOfSells)}`
          : formatNumber(improvedMetrics.nbOfSells - metrics.nbOfSells),
    },
    "Number of Buys": {
      DCA: formatNumber(metrics.nbOfBuys),
      "DCA Improved": formatNumber(improvedMetrics.nbOfBuys),
      Difference:
        improvedMetrics.nbOfBuys - metrics.nbOfBuys > 0
          ? `+${formatNumber(improvedMetrics.nbOfBuys - metrics.nbOfBuys)}`
          : formatNumber(improvedMetrics.nbOfBuys - metrics.nbOfBuys),
    },
  });
}
