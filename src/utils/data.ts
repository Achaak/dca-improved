import path from "path";
import ora from "ora";
import { getHistoricalRates } from "dukascopy-node";

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
      timeframe: "mn1",
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
