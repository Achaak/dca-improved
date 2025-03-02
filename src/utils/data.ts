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
    });

    spinner.succeed("Data fetched successfully");
    return data;
  } catch (error) {
    spinner.fail("Failed to fetch data");
    throw error;
  }
}

export function formateData(data: JsonItem[], interval: Interval) {
  const intervalInDays = getIntervalInDays(interval);
  const dataFiltered: Data[] = data.map((d, i) => ({
    ...d,
    useInStrategy: i % intervalInDays === 0,
  }));

  return dataFiltered;
}
