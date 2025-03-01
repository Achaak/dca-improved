import { getConfig } from "./config";
import { DCAImproved } from "./scripts/DCA_improved";
import { getData, showStats } from "./utils";

const config = await getConfig();
const data = await getData({
  dataFile: config.dataFile,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

const { config: updatedConfig } = await DCAImproved(config, data);

showStats({
  config: updatedConfig,
  actualPrice: data[data.length - 1].close,
  startDate: new Date(data[0].timestamp),
  endDate: new Date(data[data.length - 1].timestamp),
});
