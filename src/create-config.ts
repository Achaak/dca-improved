import type { Config } from "./types";
import { getDataFile, writeConfig } from "./config";

const defaultConfig: Config = {
  fee: 0.001,
  instrument: "btcusd",
  DCA_Value: 300,
  start_date: "2016-01-01",
  end_date: "2025-01-01",
  transactions: [],
  dataFile: "",
};

// Parse command line arguments
const args = Bun.argv.slice(2);
let configName = "config"; // Default config file name
let instrument = defaultConfig.instrument;
let startDate = defaultConfig.start_date;
let endDate = defaultConfig.end_date;

args.forEach((arg, index) => {
  switch (arg) {
    case "-n":
      if (index + 1 < args.length) {
        configName = args[index + 1];
      }
      break;
    case "-i":
      if (index + 1 < args.length) {
        instrument = args[index + 1];
      }
      break;
    case "-s":
      if (index + 1 < args.length) {
        startDate = args[index + 1];
      }
      break;
    case "-e":
      if (index + 1 < args.length) {
        endDate = args[index + 1];
      }
      break;
  }
});

async function createConfigFile() {
  const dataFileName = `${instrument}-mn1-${startDate}-${endDate}`;
  defaultConfig.dataFile = `${dataFileName}.json`;

  await getDataFile({
    instrument,
    start_date: startDate,
    end_date: endDate,
    dataFileName,
  });
  await writeConfig(defaultConfig);
  console.log("Config file created successfully");
}

createConfigFile();
