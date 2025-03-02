import ora from "ora";
import { getConfig } from "../utils/config";
import { DCACompare } from "../strategies/DCA-compare";
import { calculateMetrics } from "../transaction";
import { average } from "../utils/average";
import { showCompareMetrics } from "../utils/format";
import { formateData, getData } from "../utils/data";
import { getRandomDateRange } from "../utils/get-random-date-range";
import type { Config, Data } from "../types";

console.time("DCACompare");
// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const jsonItem = await getData({
  token: config.token,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});
const data = formateData(jsonItem, config.interval);

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

    const randomDateRange = getRandomDateRange(c, nbOfDays);
    c.start_date = randomDateRange.start_date;
    c.end_date = randomDateRange.end_date;

    const dDCA = structuredClone(data).filter(
      (d) =>
        new Date(d.timestamp) >= new Date(c.start_date) &&
        new Date(d.timestamp) <= new Date(c.end_date) &&
        d.useInStrategy
    );
    const dDCAImproved = structuredClone(data).filter(
      (d) =>
        new Date(d.timestamp) >= new Date(c.start_date) &&
        new Date(d.timestamp) <= new Date(c.end_date) &&
        d.useInStrategy
    );

    const result = await DCACompare(c, {
      dca: dDCA,
      dcaImproved: dDCAImproved,
    });

    runFinished++;

    return result;
  })
);

spinner.succeed(`Completed DCACompare for ${nbOfRuns} runs.`);

function calculateAverageMetrics(
  results: {
    config: Config;
    data: Data[];
  }[]
) {
  const metrics = results.map((r) =>
    calculateMetrics({
      transactions: r.config.transactions,
      data: r.data,
      endDate: new Date(r.data[r.data.length - 1].timestamp),
    })
  );

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
}

const DCAMetricsAverage = calculateAverageMetrics(
  results.map((r) => r.resultDAC)
);
const DCAImprovedMetricsAverage = calculateAverageMetrics(
  results.map((r) => r.resultDCAImproved)
);

// Log the metrics
showCompareMetrics({
  config,
  improvedMetrics: DCAImprovedMetricsAverage,
  metrics: DCAMetricsAverage,
  interval: nbOfDays,
  nbRuns: nbOfRuns,
});

console.timeEnd("DCACompare");
