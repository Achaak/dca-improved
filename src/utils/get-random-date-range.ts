import type { Config } from "../types";

export function getRandomDateRange(config: Config, intervalInDays: number) {
  const startDate = new Date(config.start_date);
  const endDate = new Date(config.end_date);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid date format in config");
  }

  if (startDate >= endDate) {
    throw new Error("start_date must be before end_date");
  }

  const maxStartDate = new Date(
    endDate.getTime() - intervalInDays * 24 * 60 * 60 * 1000
  );

  const getRandomDate = (min: Date, max: Date) => {
    const minTime = min.getTime();
    const maxTime = max.getTime();
    return new Date(minTime + Math.random() * (maxTime - minTime));
  };

  let randomStartDate = getRandomDate(new Date(startDate), maxStartDate);
  const newEndDate = new Date(
    randomStartDate.getTime() + intervalInDays * 24 * 60 * 60 * 1000
  );

  return {
    start_date: randomStartDate.toISOString().split("T")[0],
    end_date: newEndDate.toISOString().split("T")[0],
  };
}
