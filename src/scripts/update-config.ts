import { getConfig, getConfigName, writeConfig } from "../utils/config";

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

// Write the updated configuration to a file
await writeConfig(config, configName);
console.log(`✅ Config file "${configName}.json" updated successfully`);
