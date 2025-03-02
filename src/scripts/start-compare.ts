import { getConfig } from "../utils/config";
import { DCACompare } from "../strategies/DCA-compare";
import { showCompareMetrics } from "../utils/format";
import { formateData, getData } from "../utils/data";
import { calculateMetrics } from "../transaction";

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const jsonItem = await getData({
  token: config.token,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});
const data = formateData(jsonItem, config.interval);

// Run the DCA comparison
const { resultDAC, resultDCAImproved } = await DCACompare(config, data);

const DCAMetrics = calculateMetrics({
  transactions: resultDAC.config.transactions,
  data: resultDAC.data,
  endDate: new Date(resultDAC.data[resultDAC.data.length - 1].timestamp),
});

const DCAImprovedMetrics = calculateMetrics({
  transactions: resultDCAImproved.config.transactions,
  data: resultDCAImproved.data,
  endDate: new Date(
    resultDCAImproved.data[resultDCAImproved.data.length - 1].timestamp
  ),
});

// Log the metrics
showCompareMetrics({
  config,
  improvedMetrics: DCAImprovedMetrics,
  metrics: DCAMetrics,
});
