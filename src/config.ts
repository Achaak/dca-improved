import path from "path";
import { promises as fs } from "fs";

export async function getConfig() {
  const args = process.argv.slice(2);
  const configFileName = getConfigFileName(args) || "config.json";
  const configFilePath = path.join(__dirname, "../config", configFileName);

  try {
    await fs.access(configFilePath);
  } catch {
    throw new Error(`Config file not found: ${configFilePath}`);
  }

  const configModule = await import(configFilePath);
  return configModule.default as Config;
}

function getConfigFileName(args: string[]): string | undefined {
  const index = args.indexOf("-n");
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
}
