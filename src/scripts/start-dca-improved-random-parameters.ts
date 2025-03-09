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

// Pre-parse dates from jsonItem to avoid repeated parsing
const parsedDates = jsonItem.map((item) => new Date(item.timestamp));
const originalData = jsonItem.map((item, index) => ({
  item,
  date: parsedDates[index],
}));

// Create a date index map for faster lookups
const dateIndexMap = new Map();
originalData.forEach((item, index) => {
  dateIndexMap.set(item.date.toISOString().split("T")[0], index);
});

// Memoize date range filtering
const dateRangeCache = new Map();
function getFilteredDataForDateRange(startDate: Date, endDate: Date) {
  const cacheKey = `${startDate.toISOString()}_${endDate.toISOString()}`;

  if (dateRangeCache.has(cacheKey)) {
    return dateRangeCache.get(cacheKey);
  }

  // Use binary search to find start and end indices for better performance
  let startIdx = 0;
  let endIdx = originalData.length - 1;

  // Find approximate start index
  while (startIdx < endIdx) {
    const mid = Math.floor((startIdx + endIdx) / 2);
    if (originalData[mid].date < startDate) {
      startIdx = mid + 1;
    } else {
      endIdx = mid;
    }
  }

  // Find approximate end index
  let endSearchIdx = originalData.length - 1;
  endIdx = startIdx;
  while (endIdx < endSearchIdx) {
    const mid = Math.floor((endIdx + endSearchIdx + 1) / 2);
    if (originalData[mid].date <= endDate) {
      endIdx = mid;
    } else {
      endSearchIdx = mid - 1;
    }
  }

  // Get the filtered data
  const filteredData = originalData
    .slice(startIdx, endIdx + 1)
    .map(({ item }) => item);

  // Cache the result
  dateRangeCache.set(cacheKey, filteredData);

  return filteredData;
}

type Iteration = {
  ratioOverToSell: number;
  ratioUnderToBuy: number;
  sellRatioValue: number;
  profitAvg: number;
  buyRatioValue: number;
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
  const ratioUnderToBuy = random(1, 4);
  const ratioOverToSell = random(ratioUnderToBuy, Math.max(5, ratioUnderToBuy));
  const sellRatioValue = random(0.05, 1);
  const buyRatioValue = random(0.05, 1);

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

        // Parse date range once
        const startDate = new Date(c.start_date);
        const endDate = new Date(c.end_date);

        // Use the optimized filtering function
        const filteredData = getFilteredDataForDateRange(startDate, endDate);
        const data = formateData(filteredData);

        const result = await DCAImproved({
          config: c,
          data,
          ratioOverToSell,
          ratioUnderToBuy,
          calculateSellRatio,
          calculateBuyRatio,
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
        date: new Date(lastDataPoint.timestamp),
        actualPrice: lastDataPoint.close,
      });
    })
  );

  const profitAvg = average(allProfit);

  console.log(`Iteration ${i + 1} - Profit avg: ${profitAvg.toFixed(2)}`);
  iterations.push({
    ratioOverToSell,
    ratioUnderToBuy,
    sellRatioValue,
    profitAvg,
    buyRatioValue,
  });

  // Use more efficient sorting and slicing
  iterations = iterations
    .sort((a, b) => b.profitAvg - a.profitAvg)
    .slice(0, 20);

  // Top 20 max profit
  console.table(
    iterations.map((i) => ({
      "Profit avg": i.profitAvg.toFixed(2),
      "Ratio under to buy": i.ratioUnderToBuy.toFixed(2),
      "Ratio over to sell": i.ratioOverToSell.toFixed(2),
      "Buy ratio value": i.buyRatioValue.toFixed(2),
      "Sell ratio value": i.sellRatioValue.toFixed(2),
    }))
  );

  // Clear cache if it gets too large to prevent memory issues
  if (dateRangeCache.size > 1000) {
    dateRangeCache.clear();
  }
}
