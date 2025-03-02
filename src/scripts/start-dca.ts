import { getConfig } from "../utils/config";
import { showMetrics } from "../utils/format";
import { DCA } from "../strategies/DCA";
import { getData } from "../utils/data";

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

// Run the DCA strategy
const { config: updatedConfig } = await DCA(config, data);

// Show the statistics
showMetrics({
  config: updatedConfig,
  data,
  startDate: new Date(data[0].timestamp),
  endDate: new Date(data[data.length - 1].timestamp),
});
