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
  const startDate = new Date(config.start_date).getTime();
  const endDate = new Date(config.end_date).getTime();

  if (isNaN(startDate) || isNaN(endDate)) {
    throw new Error("Invalid date format in config");
  }

  if (startDate >= endDate) {
    throw new Error("start_date must be before end_date");
  }

  const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
  const maxStartDate = endDate - intervalInDays * MILLISECONDS_IN_A_DAY;
  const getRandomDate = (min: number, max: number) => {
    return min + Math.random() * (max - min);
  };

  const randomStartDate = getRandomDate(startDate, maxStartDate);
  const newEndDate = randomStartDate + intervalInDays * MILLISECONDS_IN_A_DAY;
  return {
    start_date: randomStartDate,
    end_date: newEndDate,
  };
}
