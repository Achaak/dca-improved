import { getConfig } from "../config";
import { DCACompare } from "../strategies/DCA-compare";
import { calculateMetrics } from "../transaction";
import { average } from "../utils/average";
import { formatDifference, formatNumber, formatUSD } from "../utils/format";
import { getData } from "../utils/get-data";
import { getRandomDateRange } from "../utils/get-random-date-range";

const config = await getConfig();
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

const args = Bun.argv.slice(2);
const nbOfRuns = args.includes("--nb-of-runs")
  ? parseInt(args[args.indexOf("--nb-of-runs") + 1])
  : 1;
const nbOfDays = args.includes("--nb-of-days")
  ? parseInt(args[args.indexOf("--nb-of-days") + 1])
  : 365;

const results = await Promise.all(
  Array.from({ length: nbOfRuns }).map(async () => {
    const c = structuredClone(config);
    const d = structuredClone(data);

    const randomDateRange = getRandomDateRange(c, nbOfDays);
    c.start_date = randomDateRange.start_date;
    c.end_date = randomDateRange.end_date;

    const dataFiltered = d.filter(
      (d) =>
        new Date(d.timestamp) >= new Date(c.start_date) &&
        new Date(d.timestamp) <= new Date(c.end_date)
    );

    return DCACompare(c, dataFiltered);
  })
);

const DCAMetrics = results.map((r) => r.DCAMetrics);
const DCAImprovedMetrics = results.map((r) => r.DCAImprovedMetrics);

const calculateAverageMetrics = (
  metrics: ReturnType<typeof calculateMetrics>[]
) => {
  return {
    actualPrice: average(metrics.map((m) => m.actualPrice)),
    balanceUSD: average(metrics.map((m) => m.balanceUSD)),
    feesUSD: average(metrics.map((m) => m.feesUSD)),
    investmentUSD: average(metrics.map((m) => m.investmentUSD)),
    tokenToUSD: average(metrics.map((m) => m.tokenToUSD)),
    totalUSD: average(metrics.map((m) => m.totalUSD)),
    profitUSD: average(metrics.map((m) => m.profitUSD)),
    profitPercentage: average(metrics.map((m) => m.profitPercentage)),
    nbOfSells: average(metrics.map((m) => m.nbOfSells)),
    nbOfBuys: average(metrics.map((m) => m.nbOfBuys)),
  };
};

const DCAMetricsAverage = calculateAverageMetrics(DCAMetrics);
const DCAImprovedMetricsAverage = calculateAverageMetrics(DCAImprovedMetrics);

console.table({
  Period: `${new Date(config.start_date).toLocaleDateString()} - ${new Date(
    config.end_date
  ).toLocaleDateString()}`,
  "Actual Price": formatUSD(DCAMetricsAverage.actualPrice),
  "Interval (days)": nbOfDays,
  "Number of Runs": nbOfRuns,
});

console.table({
  "Balance (USD)": {
    DCA: formatUSD(DCAMetricsAverage.balanceUSD),
    "DCA Improved": formatUSD(DCAImprovedMetricsAverage.balanceUSD),
    Difference: formatDifference(
      DCAImprovedMetricsAverage.balanceUSD - DCAMetricsAverage.balanceUSD
    ),
  },
  "Investment (USD)": {
    DCA: formatUSD(DCAMetricsAverage.investmentUSD),
    "DCA Improved": formatUSD(DCAImprovedMetricsAverage.investmentUSD),
    Difference: formatDifference(
      DCAImprovedMetricsAverage.investmentUSD - DCAMetricsAverage.investmentUSD
    ),
  },
  "Fees (USD)": {
    DCA: formatUSD(DCAMetricsAverage.feesUSD),
    "DCA Improved": formatUSD(DCAImprovedMetricsAverage.feesUSD),
    Difference: formatDifference(
      DCAImprovedMetricsAverage.feesUSD - DCAMetricsAverage.feesUSD
    ),
  },
  "BTC to USD": {
    DCA: formatUSD(DCAMetricsAverage.tokenToUSD),
    "DCA Improved": formatUSD(DCAImprovedMetricsAverage.tokenToUSD),
    Difference: formatDifference(
      DCAImprovedMetricsAverage.tokenToUSD - DCAMetricsAverage.tokenToUSD
    ),
  },
  "Total (USD)": {
    DCA: formatUSD(DCAMetricsAverage.totalUSD),
    "DCA Improved": formatUSD(DCAImprovedMetricsAverage.totalUSD),
    Difference: formatDifference(
      DCAImprovedMetricsAverage.totalUSD - DCAMetricsAverage.totalUSD
    ),
  },
});

console.table({
  "Profit (USD)": {
    DCA: formatUSD(DCAMetricsAverage.profitUSD),
    "DCA Improved": formatUSD(DCAImprovedMetricsAverage.profitUSD),
    Difference: formatDifference(
      DCAImprovedMetricsAverage.profitUSD - DCAMetricsAverage.profitUSD
    ),
  },
  "Profit (%)": {
    DCA: `${DCAMetricsAverage.profitPercentage.toFixed(2)}%`,
    "DCA Improved": `${DCAImprovedMetricsAverage.profitPercentage.toFixed(2)}%`,
    Difference: `${
      DCAImprovedMetricsAverage.profitPercentage -
        DCAMetricsAverage.profitPercentage >
      0
        ? "+"
        : ""
    }${(
      DCAImprovedMetricsAverage.profitPercentage -
      DCAMetricsAverage.profitPercentage
    ).toFixed(2)} pts`,
  },
});

console.table({
  "Number of Sells": {
    DCA: formatNumber(DCAMetricsAverage.nbOfSells),
    "DCA Improved": formatNumber(DCAImprovedMetricsAverage.nbOfSells),
    Difference:
      DCAImprovedMetricsAverage.nbOfSells - DCAMetricsAverage.nbOfSells > 0
        ? `+${formatNumber(
            DCAImprovedMetricsAverage.nbOfSells - DCAMetricsAverage.nbOfSells
          )}`
        : formatNumber(
            DCAImprovedMetricsAverage.nbOfSells - DCAMetricsAverage.nbOfSells
          ),
  },
  "Number of Buys": {
    DCA: formatNumber(DCAMetricsAverage.nbOfBuys),
    "DCA Improved": formatNumber(DCAImprovedMetricsAverage.nbOfBuys),
    Difference:
      DCAImprovedMetricsAverage.nbOfBuys - DCAMetricsAverage.nbOfBuys > 0
        ? `+${formatNumber(
            DCAImprovedMetricsAverage.nbOfBuys - DCAMetricsAverage.nbOfBuys
          )}`
        : formatNumber(
            DCAImprovedMetricsAverage.nbOfBuys - DCAMetricsAverage.nbOfBuys
          ),
  },
});
