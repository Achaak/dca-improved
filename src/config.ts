import path from "path";
import { promises as fs } from "fs";
import type { Config } from "./types";
import { exec } from "child_process";

const configDir = path.join(__dirname, "../config/");
const dataDir = path.join(__dirname, "../download/");

export const SHOW_LOGS =
  Bun.env["SHOW_LOGS"] === "true" || Bun.env["SHOW_LOGS"] === "1";

export async function getConfig() {
  const args = Bun.argv.slice(2);
  const configName = getConfigName(args) ?? "config";
  const configFilePath = path.join(configDir, `${configName}.json`);

  try {
    await fs.access(configFilePath);
  } catch {
    throw new Error(`Config file not found: ${configFilePath}`);
  }

  const configModule = await import(configFilePath);
  const config = configModule.default as Config;

  try {
    await fs.access(path.join(dataDir, config.dataFile));
  } catch {
    await getDataFile({
      instrument: config.instrument,
      start_date: config.start_date,
      end_date: config.end_date,
      dataFileName: config.dataFile,
    });
  }

  return config;
}

function getConfigName(args: string[], argName = "-c") {
  const index = args.indexOf(argName);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
}
export async function writeConfig(config: Config) {
  const args = Bun.argv.slice(2);
  const configName = getConfigName(args, "-n") ?? "config";
  const configFilePath = path.join(configDir, `${configName}.json`);

  await ensureConfigDirExists();
  await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
}

export async function getDataFile({
  instrument,
  start_date,
  end_date,
  dataFileName,
}: {
  instrument: string;
  start_date: string;
  end_date: string;
  dataFileName: string;
}) {
  await new Promise<void>((resolve, reject) => {
    exec(
      `bunx dukascopy-node -i ${instrument} -from ${start_date} -to ${end_date} -t mn1 -f json --cache --file-name ${dataFileName}`,
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
}

export async function deleteDataFile(dataFile: string) {
  const filePath = path.join(dataDir, dataFile);
  console.log(`Deleting data file: ${filePath}`);
  await new Promise<void>((resolve, reject) => {
    exec(`rm -f ${filePath}`, (error, _, stderr) => {
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
      resolve();
    });
  });
}

export async function ensureConfigDirExists() {
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}
