import type { Config, Data } from "../types";
import path from "path";
import { exec as execCallback } from "child_process";
import { promises as fs } from "fs";
import { promisify } from "util";
import ora from "ora";

const exec = promisify(execCallback);
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

  const spinner = ora(
    `Checking if data file exists at: ${dataFilePath}`
  ).start();
  try {
    await fs.access(dataFilePath);
    spinner.succeed(`Data file found: ${dataFilePath}`);
  } catch {
    spinner.warn(`Data file not found at ${dataFilePath}, downloading...`);
    await createDataFile({
      token: config.token,
      start_date: config.start_date,
      end_date: config.end_date,
      dataFileName: config.dataFile.split(".")[0],
    });
  }

  try {
    spinner.start(`Importing data file: ${dataFilePath}`);
    const module = await import(dataFilePath);
    const data = module.default as Data[];
    spinner.succeed(`Data file imported successfully: ${dataFilePath}`);

    spinner.start(
      `Filtering data between ${startDate.toLocaleString()} and ${endDate.toLocaleString()}`
    );
    const filteredData = data.filter(
      (d) =>
        new Date(d.timestamp) >= startDate && new Date(d.timestamp) <= endDate
    );
    spinner.succeed(`Data filtered successfully`);
    return filteredData;
  } catch (error) {
    const errorMessage = `Error importing data file at ${dataFilePath}: ${
      error instanceof Error ? error.message : error
    }`;
    spinner.fail(errorMessage);
    throw new Error(errorMessage);
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
  const spinner = ora(`Executing command to create data file`).start();
  try {
    const { stdout, stderr } = await exec(
      `bunx dukascopy-node -i ${token}usd -from ${start_date} -to ${end_date} -t mn1 -f json --cache --file-name ${dataFileName}`
    );

    if (stderr) {
      const errorMessage = `Error output from command: ${stderr}`;
      spinner.fail(errorMessage);
      throw new Error(errorMessage);
    }

    spinner.succeed(`Command output: ${stdout}`);
  } catch (error) {
    const errorMessage = `Error executing command to create data file: ${
      error instanceof Error ? error.message : error
    }`;
    spinner.fail(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function deleteDataFile(dataFile: string) {
  const filePath = path.join(dataDir, dataFile);
  const spinner = ora(`Attempting to delete data file: ${filePath}`).start();
  try {
    await exec(`rm -f ${filePath}`);
    spinner.succeed(`Successfully deleted data file: ${filePath}`);
  } catch (error) {
    const errorMessage = `Error executing command to delete data file at ${filePath}: ${
      error instanceof Error ? error.message : error
    }`;
    spinner.fail(errorMessage);
    throw new Error(errorMessage);
  }
}
