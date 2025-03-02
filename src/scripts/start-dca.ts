import { getConfig } from "../config";
import { showStats } from "../utils/format";
import { DCA } from "../strategies/DCA";
import { getData } from "../utils/get-data";

const config = await getConfig();
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

const { config: updatedConfig } = await DCA(config, data);

showStats({
  config: updatedConfig,
  actualPrice: data[data.length - 1].close,
  startDate: new Date(data[0].timestamp),
  endDate: new Date(data[data.length - 1].timestamp),
});
