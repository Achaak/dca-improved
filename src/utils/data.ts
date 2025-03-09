import path from "path";
import ora from "ora";
import { getHistoricalRates, type JsonItem } from "dukascopy-node";
import type { Config, Data } from "../types";
import { getIntervalInDays } from "./date";
import { getCacheKey, memoize } from "./cache";

export const YEARS_PRE_FETCH = 4;
const YEARS_PRE_FETCH_MS =
  getIntervalInDays("1y") * YEARS_PRE_FETCH * 24 * 60 * 60 * 1000;
const DAYS_PRE_FETCH = getIntervalInDays("1y") * YEARS_PRE_FETCH;

export async function getData({
  token,
  endDate,
  startDate,
}: {
  token: string;
  startDate: Date;
  endDate: Date;
}) {
  const spinner = ora(
    `Fetching data for ${token} from ${startDate.toISOString()} to ${endDate.toISOString()}`
  ).start();

  try {
    const data = await getHistoricalRates({
      dates: {
        // Fetch 4 years of data before the start date
        from: new Date(startDate.getTime() - YEARS_PRE_FETCH_MS),
        to: endDate,
      },
      timeframe: "d1",
      instrument: `${token}usd` as any,
      format: "json",
      cacheFolderPath: path.join(__dirname, "../../.dukascopy-cache/"),
      useCache: true,
    });

    spinner.succeed("Data fetched successfully");
    return data;
  } catch (error) {
    spinner.fail("Failed to fetch data");
    throw error;
  }
}

export function formateData({
  data,
  endDate,
  startDate,
}: {
  data: JsonItem[];
  startDate: Date;
  endDate: Date;
}) {
  // Precalculate constants outside the loop
  const startTimestamp = startDate.getTime();
  const minTimestamp = startTimestamp - YEARS_PRE_FETCH_MS;
  const endTimestamp = endDate.getTime();

  // Precalculate interval days
  const yearlyInterval = getIntervalInDays("1y");
  const monthlyInterval = getIntervalInDays("1mn");
  const weeklyInterval = getIntervalInDays("1w");
  const dailyInterval = getIntervalInDays("1d");

  // Use a single loop instead of filter + map
  const dataFiltered: Data[] = [];
  let validItemIndex = -DAYS_PRE_FETCH; // Track index for interval calculations

  for (const d of data) {
    // Skip items outside our time range
    if (d.timestamp < minTimestamp || d.timestamp > endTimestamp) {
      continue;
    }

    validItemIndex++;
    const isDataPrefetch = d.timestamp < startTimestamp;

    if (isDataPrefetch) {
      dataFiltered.push({
        ...d,
        isDataPrefetch,
        isYearly: false,
        isMonthly: false,
        isWeekly: false,
        isDaily: false,
      });
    } else {
      dataFiltered.push({
        ...d,
        isDataPrefetch,
        isYearly: validItemIndex % yearlyInterval === 0,
        isMonthly: validItemIndex % monthlyInterval === 0,
        isWeekly: validItemIndex % weeklyInterval === 0,
        isDaily: validItemIndex % dailyInterval === 0,
      });
    }
  }

  return dataFiltered;
}

export function getDataWithoutPrefetch({
  data,
  config,
}: {
  data: Data[];
  config: Config;
}) {
  const cacheKey = getCacheKey("data", config);

  return memoize(cacheKey, () => {
    return data.filter((d) => !d.isDataPrefetch);
  });
}
