import path from "path";
import ora from "ora";
import { getHistoricalRates, type JsonItem } from "dukascopy-node";
import type { Data, Interval } from "../types";
import { getIntervalInDays } from "./date";

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
        from: startDate,
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

export function formateData(data: JsonItem[]) {
  const dataFiltered: Data[] = data.map((d, i) => {
    return {
      ...d,
      isYearly: i % getIntervalInDays("1y") === 0,
      isMonthly: i % getIntervalInDays("1mn") === 0,
      isWeekly: i % getIntervalInDays("1w") === 0,
      isDaily: i % getIntervalInDays("1d") === 0,
    };
  });

  return dataFiltered;
}
