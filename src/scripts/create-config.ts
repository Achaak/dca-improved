import { writeConfig } from "../utils/config";
import type { Config } from "../types";
import { getArgConfigName } from "../utils/args";

// Default configuration
const defaultConfig: Config = {
  fee: 0.001,
  token: "btc",
  DCA_Value: 300,
  start_date: "2016-01-01",
  end_date: "2025-01-01",
  transactions: [],
  accountActivities: [],
  interval: "1mn",
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

const handleStartDate = (index: number) => {
  if (index + 1 < args.length) {
    defaultConfig.start_date = args[index + 1];
  }
};

const handleEndDate = (index: number) => {
  if (index + 1 < args.length) {
    defaultConfig.end_date = args[index + 1];
  }
};

const handleDCAValue = (index: number) => {
  if (index + 1 < args.length) {
    defaultConfig.DCA_Value = parseFloat(args[index + 1]);
  }
};

const handleInterval = (index: number) => {
  if (index + 1 < args.length) {
    const interval = args[index + 1];

    if (!["1d", "1w", "1mn", "1y"].includes(interval)) {
      console.error(
        `❌ Invalid interval "${interval}", must be one of: 1d, 1w, 1mn, 1y`
      );

      process.exit(1);
    }

    defaultConfig.interval = interval as Config["interval"];
  }
};

const handleFee = (index: number) => {
  if (index + 1 < args.length) {
    defaultConfig.fee = parseFloat(args[index + 1]);
  }
};

args.forEach((arg, index) => {
  switch (arg) {
    case "-t":
      handleToken(index);
      break;
    case "-s":
      handleStartDate(index);
      break;
    case "-e":
      handleEndDate(index);
      break;
    case "-v":
      handleDCAValue(index);
      break;
    case "-i":
      handleInterval(index);
      break;
    case "-f":
      handleFee(index);
      break;
  }
});

// Write the configuration to a file
await writeConfig(defaultConfig, configName);
console.log(`✅ Config file "${configName}.json" created successfully`);
