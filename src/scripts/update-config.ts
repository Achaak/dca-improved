import {
  getArgConfigName,
  getArgDCAValues,
  getArgEndDate,
  getArgFees,
  getArgIntervals,
  getArgStartDate,
} from "../utils/args";
import { getConfig, writeConfig } from "../utils/config";

// Load the existing configuration
const config = await getConfig();

// Parse command line arguments
const args = Bun.argv.slice(2);
const configName = getArgConfigName(args, "-c") ?? "config";

const startDate = getArgStartDate(args);
if (startDate) {
  config.start_date = startDate;
}

const endDate = getArgEndDate(args);
if (endDate) {
  config.end_date = endDate;
}

const DCAValue = getArgDCAValues(args);
if (DCAValue) {
  config.DCA_Value = DCAValue;
}

const interval = getArgIntervals(args);
if (interval) {
  config.interval = interval;
}

const fee = getArgFees(args);
if (fee) {
  config.fee = fee;
}

// Write the updated configuration to a file
await writeConfig(config, configName);
console.log(`✅ Config file "${configName}.json" updated successfully`);
