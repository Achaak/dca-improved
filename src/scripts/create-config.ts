import { getConfigName, writeConfig } from "../utils/config";
import type { Config } from "../types";

// Default configuration
const defaultConfig: Config = {
  fee: 0.001,
  token: "btc",
  DCA_Value: 300,
  start_date: "2016-01-01",
  end_date: "2025-01-01",
  transactions: [],
};

// Parse command line arguments
const args = Bun.argv.slice(2);
const configName = getConfigName(args, "-n") ?? "config";

// Process command line arguments
args.forEach((arg, index) => {
  switch (arg) {
    case "-t":
      if (index + 1 < args.length) {
        defaultConfig.token = args[index + 1];
      }
      break;
    case "-s":
      if (index + 1 < args.length) {
        defaultConfig.start_date = args[index + 1];
      }
      break;
    case "-e":
      if (index + 1 < args.length) {
        defaultConfig.end_date = args[index + 1];
      }
      break;
  }
});

// Write the configuration to a file
await writeConfig(defaultConfig, configName);
console.log(`✅ Config file "${configName}.json" created successfully`);
