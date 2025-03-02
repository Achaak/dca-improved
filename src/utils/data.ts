import type { Config, Data } from "../types";
import path from "path";
import { exec } from "child_process";
import { promises as fs } from "fs";

const dataDir = path.join(__dirname, "../../download/");

export async function getData({
  config,
  endDate,
  startDate,
}: {
  config: Config;
  startDate: Date;
  endDate: Date;
}) {
  const dataFilePath = path.join(dataDir, config.dataFile);

  console.log(`Checking data file: ${dataFilePath}`);
  try {
    await fs.access(dataFilePath);
  } catch {
    console.log("Data file not found, downloading...");
    await createDataFile({
      token: config.token,
      start_date: config.start_date,
      end_date: config.end_date,
      dataFileName: config.dataFile.split(".")[0],
    });
  }

  try {
    const module = await import(dataFilePath);
    const data = module.default as Data[];

    return data.filter(
      (d) =>
        new Date(d.timestamp) >= startDate && new Date(d.timestamp) <= endDate
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error importing data file: ${error.message}`);
    } else {
      console.error(`Error importing data file: ${error}`);
    }
    throw error;
  }
}

export async function createDataFile({
  token,
  start_date,
  end_date,
  dataFileName,
}: {
  token: string;
  start_date: string;
  end_date: string;
  dataFileName: string;
}) {
  await new Promise<void>((resolve, reject) => {
    exec(
      `bunx dukascopy-node -i ${token}usd -from ${start_date} -to ${end_date} -t mn1 -f json --cache --file-name ${dataFileName}`,
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
        console.log(stdout);
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
