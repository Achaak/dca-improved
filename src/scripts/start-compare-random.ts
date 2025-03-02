import ora from "ora";
import { getConfig } from "../utils/config";
import { DCACompare } from "../strategies/DCA-compare";
import { calculateMetrics } from "../transaction";
import { average } from "../utils/average";
import { showCompareMetrics } from "../utils/format";
import { getData } from "../utils/data";
import { getRandomDateRange } from "../utils/get-random-date-range";

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

// Parse command line arguments
const args = Bun.argv.slice(2);
const nbOfRuns = args.includes("--nb-of-runs")
  ? parseInt(args[args.indexOf("--nb-of-runs") + 1])
  : 1;
const nbOfDays = args.includes("--nb-of-days")
  ? parseInt(args[args.indexOf("--nb-of-days") + 1])
  : 365;

let runFinished = 0;
const spinner = ora(`Running DCACompare for ${nbOfRuns} runs...`).start();

// Run the comparison for the specified number of runs
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

    const result = await DCACompare(c, dataFiltered);

    runFinished++;

    return result;
  })
);

spinner.succeed(`Completed DCACompare for ${nbOfRuns} runs.`);

// Calculate metrics for DCA and DCA Improved
const DCAMetrics = results.map((r) => r.DCAMetrics);
const DCAImprovedMetrics = results.map((r) => r.DCAImprovedMetrics);

const calculateAverageMetrics = (
  metrics: ReturnType<typeof calculateMetrics>[]
) => {
  return {
    drawdown: {
      peak: average(metrics.map((m) => m.drawdown.peak)),
      trough: average(metrics.map((m) => m.drawdown.trough)),
    },
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

// Log the metrics
showCompareMetrics({
  config,
  improvedMetrics: DCAImprovedMetricsAverage,
  metrics: DCAMetricsAverage,
  interval: nbOfDays,
  nbRuns: nbOfRuns,
});
