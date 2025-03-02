import { getConfig } from "../utils/config";
import { DCACompare } from "../strategies/DCA-compare";
import { showCompareMetrics } from "../utils/format";
import { getData } from "../utils/data";

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

// Run the DCA comparison
const { DCAImprovedMetrics, DCAMetrics } = await DCACompare(config, data);

// Log the metrics
showCompareMetrics({
  config,
  improvedMetrics: DCAImprovedMetrics,
  metrics: DCAMetrics,
});
