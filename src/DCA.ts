import { buy } from "./transaction";
import { deposit, getData, showStats } from "./utils";
import { getConfig } from "./config";

const config = await getConfig();
const data = await getData({
  dataFile: config.dataFile,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

for (const d of data) {
  const date = new Date(d.timestamp);
  deposit(config.DCA_Value, date, config);
  buy(config.DCA_Value, d.close, date, config);
}

showStats(config, data[data.length - 1].close);
