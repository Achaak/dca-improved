import path from "path";
import { promises as fs } from "fs";
import type { Config } from "../types";

const configDir = path.join(__dirname, "../../config/");

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
  return configModule.default as Config;
}

export function getConfigName(args: string[], argName = "-c") {
  const index = args.indexOf(argName);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
}

export async function writeConfig(config: Config, configName: string) {
  const configFilePath = path.join(configDir, `${configName}.json`);

  await ensureConfigDirExists();
  await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
}

export function getDataFileName({
  token,
  start_date,
  end_date,
}: {
  token: string;
  start_date: string;
  end_date: string;
}) {
  return `${token}usd mn1-${start_date}-${end_date}`;
}

export async function ensureConfigDirExists() {
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}
