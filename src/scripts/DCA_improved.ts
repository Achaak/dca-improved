import { buy, sell } from "../transaction";
import {
  deposit,
  formatUSD,
  getAverageCost,
  getData,
  getNbBTC,
  getNbUSD,
} from "../utils";
import { SHOW_LOGS } from "../config";
import type { Config } from "../types";

const RATIO_UNDER_TO_BUY = 2;
const RATIO_OVER_TO_SELL = 2.5;

const NB_BTC_SELL_RATIOS = [
  0.05, 0.05, 0.05, 0.05, 0.15, 0.15, 0.15, 0.2, 0.2, 0.2, 0.2, 0.25, 0.25,
  0.25,
];

export async function DCAImproved(config: Config) {
  const data = await getData({
    dataFile: config.dataFile,
    startDate: new Date(config.start_date),
    endDate: new Date(config.end_date),
  });

  for (const d of data) {
    const date = new Date(d.timestamp);
    const price = d.close;
    const averageCost = getAverageCost(config.transactions, date);
    const priceUnderToBuy = averageCost * RATIO_UNDER_TO_BUY;
    const priceOverToSell = averageCost * RATIO_OVER_TO_SELL;
    const nbBTC = getNbBTC(config.transactions, date);

    deposit(config.DCA_Value, date, config);

    if (price < priceUnderToBuy || priceUnderToBuy === 0) {
      const balanceUSD = getNbUSD(config.transactions, date);
      buy(balanceUSD, price, date, config);
    } else if (price > priceOverToSell && nbBTC > 0) {
      const transactions = structuredClone(config.transactions)
        .filter((t) => t.type === "buy" || t.type === "sell")
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      let nbLastSell = 0;
      for (const transaction of transactions) {
        if (transaction.type === "sell") {
          nbLastSell++;
        } else {
          break;
        }
      }

      const nbBTCSellRatio =
        NB_BTC_SELL_RATIOS[nbLastSell] ??
        NB_BTC_SELL_RATIOS[NB_BTC_SELL_RATIOS.length - 1];

      const totalBTCSell = nbBTC * nbBTCSellRatio;
      sell(totalBTCSell, price, date, config);
    }

    if (SHOW_LOGS) {
      const balanceUSD = getNbUSD(config.transactions, date);
      console.log(
        `\x1b[34m${date.toLocaleString()} - ${formatUSD(
          balanceUSD
        )} USD - ${formatUSD(averageCost)} USD - Buy < ${formatUSD(
          priceUnderToBuy
        )} - Sell > ${formatUSD(priceOverToSell)} USD\x1b[0m`
      );
    }
  }

  return {
    config,
    data,
  };
}
