import { writeConfig } from "../utils/config";
import type { Config } from "../types";
import {
  getArgConfigName,
  getArgDepositValues,
  getArgEndDate,
  getArgFees,
  getArgDCAIntervals,
  getArgStartDate,
} from "../utils/args";

// Default configuration
const defaultConfig: Config = {
  fee: 0.001,
  token: "btc",
  DCA_Interval: "1w",
  deposit_value: 300,
  deposit_interval: "1mn",
  start_date: "2016-01-01",
  end_date: "2025-01-01",
  transactions: [],
  accountActivities: [],
};

// Parse command line arguments
const args = Bun.argv.slice(2);
const configName = getArgConfigName(args, "-n") ?? "config";

// Process command line arguments
const handleToken = (index: number) => {
  if (index + 1 < args.length) {
    defaultConfig.token = args[index + 1];
  }
};

args.forEach((arg, index) => {
  switch (arg) {
    case "-t":
      handleToken(index);
      break;
    case "-s":
      getArgStartDate(args);
      break;
    case "-e":
      getArgEndDate(args);
      break;
    case "-v":
      getArgDepositValues(args);
      break;
    case "-i":
      getArgDCAIntervals(args);
      break;
    case "-f":
      getArgFees(args);
      break;
  }
});

// Write the configuration to a file
await writeConfig(defaultConfig, configName);
console.log(`✅ Config file "${configName}.json" created successfully`);
