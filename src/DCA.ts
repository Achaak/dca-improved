import { buy } from "./transaction";
import { deposit, getData, getNbBTC, showStats } from "./utils";
import { getConfig } from "./config";

const config = await getConfig();
const data = await getData({
  dataFile: config.dataFile,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

for (const d of data) {
  deposit(config.DCA_Value, config);

  const date = new Date(d.timestamp);

  buy(config.DCA_Value, d.close, date, config);
}

const nbBTC = getNbBTC(
  config.transactions,
  new Date(data[data.length - 1].timestamp)
);

showStats(config, data[data.length - 1].close);
