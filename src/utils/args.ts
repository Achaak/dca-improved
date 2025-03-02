import type { Config } from "../types";

export function getArgConfigName(args: string[], argName = "-c") {
  if (args.includes(argName)) {
    return args[args.indexOf(argName) + 1];
  }
}

export function getArgStartDate(args: string[]) {
  if (args.includes("-s")) {
    return args[args.indexOf("-s") + 1];
  }
}

export function getArgEndDate(args: string[]) {
  if (args.includes("-e")) {
    return args[args.indexOf("-e") + 1];
  }
}

export function getArgDCAValues(args: string[]) {
  if (args.includes("-v")) {
    return parseFloat(args[args.indexOf("-v") + 1]);
  }
}

export function getArgIntervals(args: string[]) {
  if (args.includes("-i")) {
    const interval = args[args.indexOf("-i") + 1];

    if (!["1m", "5m", "15m", "30m", "1h", "4h", "1d"].includes(interval)) {
      console.error(
        `❌ Invalid interval "${interval}", must be one of: 1m, 5m, 15m, 30m, 1h, 4h, 1d`
      );

      process.exit(1);
    }

    return interval as Config["interval"];
  }
}

export function getArgFees(args: string[]) {
  if (args.includes("-f")) {
    return parseFloat(args[args.indexOf("-f") + 1]);
  }
}
