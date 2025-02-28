import { exec } from "child_process";
import path from "path";
import { promises as fs } from "fs";
import type { Config } from "./types";

const defaultConfig: Config = {
  fee: 0.001,
  instrument: "btcusd",
  DCA_Value: 300,
  start_date: "2016-01-01",
  end_date: "2025-01-01",
  balanceUSD: 0,
  investmentUSD: 0,
  transactions: [],
  dataFile: "",
};

// Parse command line arguments
const args = Bun.argv.slice(2);
let configFileName = "config"; // Default config file name
let instrument = defaultConfig.instrument;
let startDate = defaultConfig.start_date;
let endDate = defaultConfig.end_date;

args.forEach((arg, index) => {
  switch (arg) {
    case "-n":
      if (index + 1 < args.length) configFileName = args[index + 1];
      break;
    case "-i":
      if (index + 1 < args.length) instrument = args[index + 1];
      break;
    case "-s":
      if (index + 1 < args.length) startDate = args[index + 1];
      break;
    case "-e":
      if (index + 1 < args.length) endDate = args[index + 1];
      break;
  }
});

const configDir = path.join(__dirname, "../config/");
const configFilePath = path.join(configDir, `${configFileName}.json`);

async function ensureConfigDirExists() {
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

async function createConfigFile() {
  const dataFile = `${instrument}-mn1-${startDate}-${endDate}`;
  defaultConfig.dataFile = `${dataFile}.json`;

  await new Promise<void>((resolve, reject) => {
    exec(
      `bunx dukascopy-node -i ${instrument} -from ${startDate} -to ${endDate} -t mn1 -f json --cache --file-name ${dataFile}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          reject(new Error(stderr));
          return;
        }
        console.log(`stdout: ${stdout}`);
        resolve();
      }
    );
  });

  await fs.writeFile(configFilePath, JSON.stringify(defaultConfig, null, 2));
  console.log("Config file created successfully at", configFilePath);
}

ensureConfigDirExists().then(createConfigFile).catch(console.error);
