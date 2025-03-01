import { getConfig } from "./config";
import { DCAImproved } from "./scripts/DCA_improved";
import { showStats } from "./utils";

const config = await getConfig();

const { data, config: updatedConfig } = await DCAImproved(config);

showStats({
  config: updatedConfig,
  actualPrice: data[data.length - 1].close,
  startDate: new Date(data[0].timestamp),
  endDate: new Date(data[data.length - 1].timestamp),
});
