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
  totalTokenSellRatio: number;
  profitAvg: number;
  totalTokenBuyRatio: number[];
};
const iterations: Iteration[] = [];

for (let i = 0; i < nbIterations; i++) {
  // Between 1 and 3
  const ratioOverToSell = Math.random() * 2 + 1;
  // Between 1 and 5 but upper than ratioOverToSell
  const ratioUnderToBuy = Math.random() * 4 + Math.max(1, ratioOverToSell);
  // Between 0.01 and 1
  const totalTokenSellRatio = Math.random() * 0.99 + 0.01;
  const totalTokenBuyRatio = [
    // Between 0.05 and 2.5
    Math.random() * 2.45 + 0.05,
    // Between 1 and 3
    Math.random() * 2 + 1,
  ];

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
          return nbToken * totalTokenSellRatio;
        },
      });

      return result;
    })
  );

  const allProfit = results.map((r) => {
    return getProfitUSD({
      transactions: r.config.transactions,
      date: new Date(r.data[r.data.length - 1].timestamp),
      actualPrice: r.data[r.data.length - 1].close,
    });
  });
  const profitAvg = average(allProfit);

  // Log the metrics
  console.table({
    "Average profit": profitAvg,
    "Ratio over to sell": ratioOverToSell,
    "Ratio under to buy": ratioUnderToBuy,
    "Total token sell ratio": totalTokenSellRatio,
    "Total token buy ratio": totalTokenBuyRatio.join(" - "),
  });

  iterations.push({
    ratioOverToSell,
    ratioUnderToBuy,
    totalTokenSellRatio,
    profitAvg,
    totalTokenBuyRatio,
  });
}

const sortedIterations = iterations.toSorted(
  (a, b) => b.profitAvg - a.profitAvg
);

// Top 100 max profit
console.table(
  sortedIterations
    .slice(0, 100)
    .map((i) => ({ ...i, profitAvg: i.profitAvg.toFixed(2) }))
);
