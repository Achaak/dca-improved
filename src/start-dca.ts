import { getConfig } from "./config";
import { DCA } from "./scripts/DCA";
import { showStats } from "./utils";

const config = await getConfig();

const { data, config: updatedConfig } = await DCA(config);

showStats({
  config: updatedConfig,
  actualPrice: data[data.length - 1].close,
  startDate: new Date(data[0].timestamp),
  endDate: new Date(data[data.length - 1].timestamp),
});
