import { getConfig } from "./config";
import { DCA } from "./scripts/DCA";
import { DCAImproved } from "./scripts/DCA_improved";
import type { Config, Data } from "./types";
import {
  formatUSD,
  getData,
  getInvestmentsUSD,
  getNbBTC,
  getNbOfBuys,
  getNbOfSells,
  getNbUSD,
  getProfitPercentage,
  getProfitUSD,
} from "./utils";

const config = await getConfig();
const data = await getData({
  dataFile: config.dataFile,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

const args = Bun.argv.slice(2);
const isRandomDate = args.includes("--random-date");

function getRandomDateRange(config: Config) {
  const startDate = new Date(config.start_date);
  const endDate = new Date(config.end_date);
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  if (endDate.getTime() - startDate.getTime() < oneYearMs) {
    throw new Error("The provided date range must be at least one year apart.");
  }

  // Generate a random start date within the given range
  const randomStartTime =
    startDate.getTime() +
    Math.random() * (endDate.getTime() - startDate.getTime() - oneYearMs);
  const randomStartDate = new Date(randomStartTime);

  // Ensure the end date is at least one year after the start date
  const minEndTime = randomStartTime + oneYearMs;
  const randomEndTime =
    minEndTime + Math.random() * (endDate.getTime() - minEndTime);
  const randomEndDate = new Date(randomEndTime);

  return {
    start_date: randomStartDate.toISOString().split("T")[0],
    end_date: randomEndDate.toISOString().split("T")[0],
  };
}

if (isRandomDate) {
  const randomDateRange = getRandomDateRange(config);
  config.start_date = randomDateRange.start_date;
  config.end_date = randomDateRange.end_date;
}

const [{ config: updatedConfigDCAImproved }, { config: updatedConfigDCA }] =
  await Promise.all([
    DCAImproved(structuredClone(config), data),
    DCA(structuredClone(config), data),
  ]);

const calculateMetrics = (data: Data[], updatedConfig: Config) => {
  const startDate = new Date(data[0].timestamp);
  const endDate = new Date(data[data.length - 1].timestamp);
  const actualPrice = data[data.length - 1].close;

  const balanceUSD = getNbUSD(updatedConfig.transactions, endDate);
  const investmentUSD = getInvestmentsUSD(updatedConfig.transactions, endDate);
  const btcToUSD = getNbBTC(updatedConfig.transactions, endDate) * actualPrice;
  const totalUSD = balanceUSD + btcToUSD;

  const profitUSD = getProfitUSD(updatedConfig, endDate, actualPrice);
  const profitPercentage = getProfitPercentage(
    updatedConfig,
    endDate,
    actualPrice
  );

  const nbOfSells = getNbOfSells(updatedConfig, endDate);
  const nbOfBuys = getNbOfBuys(updatedConfig, endDate);

  return {
    startDate,
    endDate,
    actualPrice,
    balanceUSD,
    investmentUSD,
    btcToUSD,
    totalUSD,
    profitUSD,
    profitPercentage,
    nbOfSells,
    nbOfBuys,
  };
};

const {
  startDate: startDateDCA,
  endDate: endDateDCA,
  actualPrice: actualPriceDCA,
  balanceUSD: balanceUSDDCA,
  investmentUSD: investmentUSDDCA,
  btcToUSD: btcToUSDDCA,
  totalUSD: totalUSDDCA,
  profitUSD: profitUSDDCA,
  profitPercentage: profitPercentageDCA,
  nbOfSells: nbOfSellsDCA,
  nbOfBuys: nbOfBuysDCA,
} = calculateMetrics(data, updatedConfigDCA);

const {
  startDate: startDateDCAImproved,
  endDate: endDateDCAImproved,
  actualPrice: actualPriceDCAImproved,
  balanceUSD: balanceUSDDCAImproved,
  investmentUSD: investmentUSDDCAImproved,
  btcToUSD: btcToUSDDCAImproved,
  totalUSD: totalUSDDCAImproved,
  profitUSD: profitUSDDCAImproved,
  profitPercentage: profitPercentageDCAImproved,
  nbOfSells: nbOfSellsDCAImproved,
  nbOfBuys: nbOfBuysDCAImproved,
} = calculateMetrics(data, updatedConfigDCAImproved);

const formatDifference = (value: number) => {
  return value > 0 ? `+${formatUSD(value)}` : formatUSD(value);
};

console.table({
  Period: {
    DCA: `${startDateDCA.toLocaleDateString()} - ${endDateDCA.toLocaleDateString()}`,
    "DCA Improved": `${startDateDCAImproved.toLocaleDateString()} - ${endDateDCAImproved.toLocaleDateString()}`,
  },
  "Actual Price": {
    DCA: formatUSD(actualPriceDCA),
    "DCA Improved": formatUSD(actualPriceDCAImproved),
  },
});

console.table({
  "Balance (USD)": {
    DCA: formatUSD(balanceUSDDCA),
    "DCA Improved": formatUSD(balanceUSDDCAImproved),
    Difference: formatDifference(balanceUSDDCAImproved - balanceUSDDCA),
  },
  "Investment (USD)": {
    DCA: formatUSD(investmentUSDDCA),
    "DCA Improved": formatUSD(investmentUSDDCAImproved),
    Difference: formatDifference(investmentUSDDCAImproved - investmentUSDDCA),
  },
  "BTC to USD": {
    DCA: formatUSD(btcToUSDDCA),
    "DCA Improved": formatUSD(btcToUSDDCAImproved),
    Difference: formatDifference(btcToUSDDCAImproved - btcToUSDDCA),
  },
  "Total (USD)": {
    DCA: formatUSD(totalUSDDCA),
    "DCA Improved": formatUSD(totalUSDDCAImproved),
    Difference: formatDifference(totalUSDDCAImproved - totalUSDDCA),
  },
});

console.table({
  "Profit (USD)": {
    DCA: formatUSD(profitUSDDCA),
    "DCA Improved": formatUSD(profitUSDDCAImproved),
    Difference: formatDifference(profitUSDDCAImproved - profitUSDDCA),
  },
  "Profit (%)": {
    DCA: `${profitPercentageDCA.toFixed(2)}%`,
    "DCA Improved": `${profitPercentageDCAImproved.toFixed(2)}%`,
    Difference: `${
      profitPercentageDCAImproved - profitPercentageDCA > 0 ? "+" : ""
    }${(profitPercentageDCAImproved - profitPercentageDCA).toFixed(2)} pts`,
  },
});

console.table({
  "Number of Sells": {
    DCA: nbOfSellsDCA.toString(),
    "DCA Improved": nbOfSellsDCAImproved.toString(),
    Difference:
      nbOfSellsDCAImproved - nbOfSellsDCA > 0
        ? `+${nbOfSellsDCAImproved - nbOfSellsDCA}`
        : nbOfSellsDCAImproved - nbOfSellsDCA,
  },
  "Number of Buys": {
    DCA: nbOfBuysDCA.toString(),
    "DCA Improved": nbOfBuysDCAImproved.toString(),
    Difference:
      nbOfBuysDCAImproved - nbOfBuysDCA > 0
        ? `+${nbOfBuysDCAImproved - nbOfBuysDCA}`
        : (nbOfBuysDCAImproved - nbOfBuysDCA).toString(),
  },
});
