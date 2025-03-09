import {
  getArgConfigName,
  getArgDepositValues,
  getArgEndDate,
  getArgFees,
  getArgDCAIntervals,
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

const depositValue = getArgDepositValues(args);
if (depositValue) {
  config.deposit_value = depositValue;
}

const DCAInterval = getArgDCAIntervals(args);
if (DCAInterval) {
  config.DCA_Interval = DCAInterval;
}

const fee = getArgFees(args);
if (fee) {
  config.fee = fee;
}

// Write the updated configuration to a file
await writeConfig(config, configName);
console.log(`✅ Config file "${configName}.json" updated successfully`);
