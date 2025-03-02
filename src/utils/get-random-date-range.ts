import type { Config } from "../types";

/**
 * Generates a random date range within the specified interval.
 *
 * @param {Config} config - The configuration object containing start and end dates.
 * @param {number} intervalInDays - The interval in days for the date range.
 * @returns {{ start_date: string, end_date: string }} - The random date range.
 * @throws {Error} - If the date format in config is invalid or start_date is not before end_date.
 */
export function getRandomDateRange(config: Config, intervalInDays: number) {
  const startDate = new Date(config.start_date);
  const endDate = new Date(config.end_date);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid date format in config");
  }

  if (startDate >= endDate) {
    throw new Error("start_date must be before end_date");
  }

  const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
  const maxStartDate = new Date(
    endDate.getTime() - intervalInDays * MILLISECONDS_IN_A_DAY
  );

  const getRandomDate = (min: Date, max: Date) => {
    const minTime = min.getTime();
    const maxTime = max.getTime();
    return new Date(minTime + Math.random() * (maxTime - minTime));
  };

  const randomStartDate = getRandomDate(startDate, maxStartDate);
  const newEndDate = new Date(
    randomStartDate.getTime() + intervalInDays * MILLISECONDS_IN_A_DAY
  );

  return {
    start_date: randomStartDate.toISOString().split("T")[0],
    end_date: newEndDate.toISOString().split("T")[0],
  };
}
