import { getConfig } from "../utils/config";
import { DCACompare } from "../strategies/DCA-compare";
import { formatDifference, formatNumber, formatUSD } from "../utils/format";
import { getData } from "../utils/data";

const config = await getConfig();
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

const { DCAImprovedMetrics, DCAMetrics } = await DCACompare(config, data);

console.table({
  Period: `${new Date(config.start_date).toLocaleDateString()} - ${new Date(
    config.end_date
  ).toLocaleDateString()}`,
  "Actual Price": formatUSD(DCAMetrics.actualPrice),
});

console.table({
  "Balance (USD)": {
    DCA: formatUSD(DCAMetrics.balanceUSD),
    "DCA Improved": formatUSD(DCAImprovedMetrics.balanceUSD),
    Difference: formatDifference(
      DCAImprovedMetrics.balanceUSD - DCAMetrics.balanceUSD
    ),
  },
  "Investment (USD)": {
    DCA: formatUSD(DCAMetrics.investmentUSD),
    "DCA Improved": formatUSD(DCAImprovedMetrics.investmentUSD),
    Difference: formatDifference(
      DCAImprovedMetrics.investmentUSD - DCAMetrics.investmentUSD
    ),
  },
  "BTC to USD": {
    DCA: formatUSD(DCAMetrics.tokenToUSD),
    "DCA Improved": formatUSD(DCAImprovedMetrics.tokenToUSD),
    Difference: formatDifference(
      DCAImprovedMetrics.tokenToUSD - DCAMetrics.tokenToUSD
    ),
  },
  "Total (USD)": {
    DCA: formatUSD(DCAMetrics.totalUSD),
    "DCA Improved": formatUSD(DCAImprovedMetrics.totalUSD),
    Difference: formatDifference(
      DCAImprovedMetrics.totalUSD - DCAMetrics.totalUSD
    ),
  },
});

console.table({
  "Profit (USD)": {
    DCA: formatUSD(DCAMetrics.profitUSD),
    "DCA Improved": formatUSD(DCAImprovedMetrics.profitUSD),
    Difference: formatDifference(
      DCAImprovedMetrics.profitUSD - DCAMetrics.profitUSD
    ),
  },
  "Profit (%)": {
    DCA: `${DCAMetrics.profitPercentage.toFixed(2)}%`,
    "DCA Improved": `${DCAImprovedMetrics.profitPercentage.toFixed(2)}%`,
    Difference: `${
      DCAImprovedMetrics.profitPercentage - DCAMetrics.profitPercentage > 0
        ? "+"
        : ""
    }${(
      DCAImprovedMetrics.profitPercentage - DCAMetrics.profitPercentage
    ).toFixed(2)} pts`,
  },
});

console.table({
  "Number of Sells": {
    DCA: formatNumber(DCAMetrics.nbOfSells),
    "DCA Improved": formatNumber(DCAImprovedMetrics.nbOfSells),
    Difference:
      DCAImprovedMetrics.nbOfSells - DCAMetrics.nbOfSells > 0
        ? `+${formatNumber(
            DCAImprovedMetrics.nbOfSells - DCAMetrics.nbOfSells
          )}`
        : formatNumber(DCAImprovedMetrics.nbOfSells - DCAMetrics.nbOfSells),
  },
  "Number of Buys": {
    DCA: formatNumber(DCAMetrics.nbOfBuys),
    "DCA Improved": formatNumber(DCAImprovedMetrics.nbOfBuys),
    Difference:
      DCAImprovedMetrics.nbOfBuys - DCAMetrics.nbOfBuys > 0
        ? `+${formatNumber(DCAImprovedMetrics.nbOfBuys - DCAMetrics.nbOfBuys)}`
        : formatNumber(DCAImprovedMetrics.nbOfBuys - DCAMetrics.nbOfBuys),
  },
});
