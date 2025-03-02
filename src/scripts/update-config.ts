import {
  getConfig,
  getConfigName,
  getDataFileName,
  writeConfig,
} from "../utils/config";
import { deleteDataFile } from "../utils/data";

// Load the existing configuration
const config = await getConfig();

// Parse command line arguments
const args = Bun.argv.slice(2);
const configName = getConfigName(args, "-c") ?? "config";

// Process command line arguments to update the configuration
args.forEach((arg, index) => {
  switch (arg) {
    case "-s":
      if (index + 1 < args.length) {
        config.start_date = args[index + 1];
      }
      break;
    case "-e":
      if (index + 1 < args.length) {
        config.end_date = args[index + 1];
      }
      break;
  }
});

// Generate new data file name based on updated token and date range
const dataFileName = getDataFileName({
  token: config.token,
  start_date: config.start_date,
  end_date: config.end_date,
});
const oldDataFile = config.dataFile;
config.dataFile = `${dataFileName}.json`;

console.log(`📝 Generated new data file name: ${config.dataFile}`);

// Delete the old data file
await deleteDataFile(oldDataFile);
console.log(`🗑️ Deleted old data file: ${oldDataFile}`);

// Write the updated configuration to a file
await writeConfig(config, configName);
console.log(
  `✅ Config file "${configName}.json" updated successfully with new data file: ${config.dataFile}`
);
