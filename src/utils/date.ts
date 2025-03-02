import type { Interval } from "../types";

export function getIntervalInDays(interval: Interval) {
  switch (interval) {
    case "1d":
      return 1;
    case "1w":
      return 7;
    case "1mn":
      return 30;
    case "1y":
      return 365;
    default:
      return 1;
  }
}
