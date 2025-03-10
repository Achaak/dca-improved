import path from "path";
import { promises as fs } from "fs";
import ora from "ora";
import type { Config } from "../types";
import { getArgConfigName } from "./args";

const configDir = path.join(__dirname, "../../config/");

export async function getConfig() {
  const args = Bun.argv.slice(2);
  const configName = getArgConfigName(args) ?? "config";
  const configFilePath = path.join(configDir, `${configName}.json`);

  const spinner = ora(
    `Attempting to access config file: ${configFilePath}`
  ).start();
  try {
    await fs.access(configFilePath);
    spinner.succeed(`Config file found: ${configFilePath}`);
  } catch {
    const errorMessage = `Config file not found: ${configFilePath}`;
    spinner.fail(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    spinner.start(`Importing config file: ${configFilePath}`);
    const configModule = await import(configFilePath);
    spinner.succeed(`Config file imported successfully: ${configFilePath}`);

    return configModule.default as Config;
  } catch (error) {
    const errorMessage = `Error importing config file at ${configFilePath}: ${
      error instanceof Error ? error.message : error
    }`;
    spinner.fail(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function writeConfig(config: Config, configName: string) {
  const configFilePath = path.join(configDir, `${configName}.json`);

  const spinner = ora(`Ensuring config directory exists: ${configDir}`).start();
  await ensureConfigDirExists();
  spinner.succeed(`Config directory exists: ${configDir}`);

  spinner.start(`Writing config to file: ${configFilePath}`);
  try {
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
    spinner.succeed(`Config written successfully to: ${configFilePath}`);
  } catch (error) {
    const errorMessage = `Error writing config to file at ${configFilePath}: ${
      error instanceof Error ? error.message : error
    }`;
    spinner.fail(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function ensureConfigDirExists() {
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}
