import { getConfig } from "../utils/config";
import { DCAImproved } from "../strategies/DCA_improved";
import { formateData, getData } from "../utils/data";
import { getRandomDateRange } from "../utils/get-random-date-range";
import { average } from "../utils/average";
import { getProfitUSD } from "../transaction";

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
const nbOfDays = args.includes("--nb-of-days")
  ? parseInt(args[args.indexOf("--nb-of-days") + 1])
  : 365;
const nbIterations = args.includes("--nb-iterations")
  ? parseInt(args[args.indexOf("--nb-iterations") + 1])
  : 1;
const nbOfRunsByIteration = args.includes("--nb-of-runs-by-iteration")
  ? parseInt(args[args.indexOf("--nb-of-runs-by-iteration") + 1])
  : 1;

type Iteration = {
  ratioOverToSell: number;
  ratioUnderToBuy: number;
  totalTokenSellRatio: number[];
  profitAvg: number;
  totalTokenBuyRatio: number[];
};
let iterations: Iteration[] = [];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

for (let i = 0; i < nbIterations; i++) {
  const ratioUnderToBuy = random(1, 4);
  const ratioOverToSell = random(ratioUnderToBuy, Math.max(5, ratioUnderToBuy));
  const totalTokenSellRatio = [random(0.05, 3), random(1, 4)];
  const totalTokenBuyRatio = [random(0.05, 3), random(1, 4)];

  // Run the comparison for the specified number of runs
  const results = await Promise.all(
    Array.from({ length: nbOfRunsByIteration }).map(async () => {
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

      const result = await DCAImproved({
        config: c,
        data: dDCA,
        ratioOverToSell,
        ratioUnderToBuy,
        calculateNbTokenBuyRatio: (nbLastBuy: number) => {
          return totalTokenBuyRatio[0] * (totalTokenBuyRatio[1] * nbLastBuy);
        },
        calculateTotalTokenSell: (nbToken: number) => {
          return totalTokenSellRatio[0] * (totalTokenSellRatio[1] * nbToken);
        },
      });

      return result;
    })
  );

  const allProfit = results.map((r) => {
    return getProfitUSD({
      transactions: r.config.transactions,
      accountActivities: r.config.accountActivities,
      date: new Date(r.data[r.data.length - 1].timestamp),
      actualPrice: r.data[r.data.length - 1].close,
    });
  });
  const profitAvg = average(allProfit);

  console.log(`Iteration ${i + 1} - Profit avg: ${profitAvg.toFixed(2)}`);
  iterations.push({
    ratioOverToSell,
    ratioUnderToBuy,
    totalTokenSellRatio,
    profitAvg,
    totalTokenBuyRatio,
  });

  iterations = iterations
    .toSorted((a, b) => b.profitAvg - a.profitAvg)
    .slice(0, 20);

  // Top 20 max profit
  console.table(
    iterations.map((i) => ({
      "Profit avg": i.profitAvg.toFixed(2),
      "Ratio over to sell": i.ratioOverToSell.toFixed(2),
      "Ratio under to buy": i.ratioUnderToBuy.toFixed(2),
      "Total token sell ratio": i.totalTokenSellRatio
        .map((r) => r.toFixed(2))
        .join(" - "),
      "Total token buy ratio": i.totalTokenBuyRatio
        .map((r) => r.toFixed(2))
        .join(" - "),
    }))
  );
}
