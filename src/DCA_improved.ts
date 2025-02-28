import { buy, sell } from "./transaction";
import {
  deposit,
  formatUSD,
  getAverageCost,
  getData,
  getNbBTC,
  showStats,
} from "./utils";
import { getConfig } from "./config";

const RATIO_UNDER_TO_BUY = 2;
const RATIO_OVER_TO_SELL = 2.5;

const config = await getConfig();
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

  deposit(config.DCA_Value, config);

  if (price < priceUnderToBuy || priceUnderToBuy === 0) {
    buy(config.balanceUSD, price, date, config);
  } else if (price > priceOverToSell && nbBTC > 0) {
    const totalBTCSell = nbBTC * 0.05;
    sell(totalBTCSell, price, date, config);
  }

  if (process.env.LOGS) {
    console.log(
      `\x1b[34m${date.toLocaleString()} - ${formatUSD(
        config.balanceUSD
      )} USD - ${formatUSD(averageCost)} USD - Buy < ${formatUSD(
        priceUnderToBuy
      )} - Sell > ${formatUSD(priceOverToSell)} USD\x1b[0m`
    );
  }
}

showStats(config, data[data.length - 1].close);
