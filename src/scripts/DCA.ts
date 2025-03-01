import { buy } from "../transaction";
import { deposit, getData, showStats } from "../utils";
import type { Config } from "../types";

export async function DCA(config: Config) {
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

  showStats({
    config,
    actualPrice: data[data.length - 1].close,
    startDate: new Date(data[0].timestamp),
    endDate: new Date(data[data.length - 1].timestamp),
  });
}
