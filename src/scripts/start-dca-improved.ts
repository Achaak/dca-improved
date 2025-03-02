import { getConfig } from "../config";
import { showStats } from "../utils/format";
import { DCAImproved } from "../strategies/DCA_improved";
import { getData } from "../utils/get-data";

const config = await getConfig();
const data = await getData({
  config,
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
