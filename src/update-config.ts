import { deleteDataFile, getConfig, getDataFile, writeConfig } from "./config";

const config = await getConfig();

// Parse command line arguments
const args = Bun.argv.slice(2);
let configName = "config"; // Default config file name

args.forEach((arg, index) => {
  switch (arg) {
    case "-c":
      if (index + 1 < args.length) {
        configName = args[index + 1];
      }
      break;
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

async function updateConfigFile() {
  const dataFileName = `${config.instrument}-mn1-${config.start_date}-${config.end_date}`;
  const oldDataFile = config.dataFile;
  config.dataFile = `${dataFileName}.json`;

  await getDataFile({
    instrument: config.instrument,
    start_date: config.start_date,
    end_date: config.end_date,
    dataFileName,
  });
  await deleteDataFile(oldDataFile);
  await writeConfig(config);
  console.log(
    `Config file updated successfully with new data file ${config.dataFile}`
  );
}

updateConfigFile();
