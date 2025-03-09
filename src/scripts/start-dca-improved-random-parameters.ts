import { getConfig } from "../utils/config";
import { DCAImproved } from "../strategies/DCA_improved";
import { formateData, getData } from "../utils/data";
import { getRandomDateRange } from "../utils/get-random-date-range";
import { average } from "../utils/average";
import { getProfitUSD } from "../transaction";

// Parse command line arguments
const args = Bun.argv.slice(2);
const nbOfDays = args.includes("--nb-of-days")
  ? parseInt(args[args.indexOf("--nb-of-days") + 1])
  : 365;
const nbIterations = args.includes("--nb-iterations")
  ? parseInt(args[args.indexOf("--nb-iterations") + 1])
  : 1;
const nbOfRunsByIteration = args.includes("--nb-of-runs-by-iteration")
  ? parseInt(args[args.indexOf("--nb-of-runs-by-iteration") + 1])
  : 1;

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const jsonItem = await getData({
  token: config.token,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

type Iteration = {
  sellRatioValue: number;
  profitAvg: number;
  buyRatioValue: number;
  ratioBetweenSells: number;
};
let iterations: Iteration[] = [];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Prepare calculation functions outside the loop to avoid recreating them
const createCalculateSellRatio = (sellRatioValue: number) => {
  return (nbLastSell: number) => Math.min(sellRatioValue * (nbLastSell + 1), 1);
};

const createCalculateBuyRatio = (buyRatioValue: number) => {
  return (nbLastBuy: number) => Math.min(buyRatioValue * (nbLastBuy + 1), 1);
};

// Process iterations in batches for better memory management
const BATCH_SIZE = Math.min(nbOfRunsByIteration, 10); // Process in batches of 10 or less

for (let i = 0; i < nbIterations; i++) {
  const sellRatioValue = random(0.05, 1);
  const buyRatioValue = random(0.1, 1);
  const ratioBetweenSells = random(0.01, 1);

  // Create calculation functions once per iteration
  const calculateSellRatio = createCalculateSellRatio(sellRatioValue);
  const calculateBuyRatio = createCalculateBuyRatio(buyRatioValue);

  // Process in batches
  const allResults = [];
  for (
    let batchStart = 0;
    batchStart < nbOfRunsByIteration;
    batchStart += BATCH_SIZE
  ) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, nbOfRunsByIteration);
    const batchSize = batchEnd - batchStart;

    const batchResults = await Promise.all(
      Array.from({ length: batchSize }).map(async () => {
        const c = structuredClone(config);

        const randomDateRange = getRandomDateRange(c, nbOfDays);
        c.start_date = randomDateRange.start_date;
        c.end_date = randomDateRange.end_date;

        const data = formateData({
          data: jsonItem,
          startDate: new Date(c.start_date),
          endDate: new Date(c.end_date),
        });

        const result = await DCAImproved({
          config: c,
          data,
          calculateSellRatio,
          calculateBuyRatio,
          ratioBetweenSells,
        });

        return result;
      })
    );

    allResults.push(...batchResults);
  }

  // Calculate profits in parallel
  const allProfit = await Promise.all(
    allResults.map(async (r) => {
      const lastDataPoint = r.data[r.data.length - 1];
      return getProfitUSD({
        config: r.config,
        timestamp: lastDataPoint.timestamp,
        actualPrice: lastDataPoint.close,
      });
    })
  );

  const profitAvg = average(allProfit);

  console.log(`Iteration ${i + 1} - Profit avg: ${profitAvg.toFixed(2)}`);
  iterations.push({
    sellRatioValue,
    profitAvg,
    buyRatioValue,
    ratioBetweenSells,
  });

  // Use more efficient sorting and slicing
  iterations = iterations
    .sort((a, b) => b.profitAvg - a.profitAvg)
    .slice(0, 20);

  // Top 20 max profit
  console.table(
    iterations.map((i) => ({
      "Profit avg": i.profitAvg.toFixed(2),
      "Buy ratio value": i.buyRatioValue.toFixed(2),
      "Sell ratio value": i.sellRatioValue.toFixed(2),
      "Ratio between sells": i.ratioBetweenSells.toFixed(2),
    }))
  );
}
