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

export function getArgDepositValues(args: string[]) {
  if (args.includes("-v")) {
    return parseFloat(args[args.indexOf("-v") + 1]);
  }
}

export function getArgDCAIntervals(args: string[]) {
  if (args.includes("-i")) {
    const DCAInterval = args[args.indexOf("-i") + 1];

    if (!["1d", "1w", "1mn", "1y"].includes(DCAInterval)) {
      console.error(
        `❌ Invalid DCA interval "${DCAInterval}", must be one of: 1d, 1w, 1mn, 1y`
      );

      process.exit(1);
    }

    return DCAInterval as Config["DCA_Interval"];
  }
}

export function getArgFees(args: string[]) {
  if (args.includes("-f")) {
    return parseFloat(args[args.indexOf("-f") + 1]);
  }
}
