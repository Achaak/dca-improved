import { getConfig } from "../utils/config";
import { showMetrics } from "../utils/format";
import { DCA } from "../strategies/DCA";
import { formateData, getData } from "../utils/data";

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const jsonItem = await getData({
  token: config.token,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});
const data = formateData({
  data: jsonItem,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

// Run the DCA strategy
const { config: updatedConfig, data: updatedData } = await DCA({
  config,
  data,
});

// Show the statistics
showMetrics({
  config: updatedConfig,
  data,
  startTimestamp: updatedData[0].timestamp,
  endTimestamp: updatedData[updatedData.length - 1].timestamp,
});
