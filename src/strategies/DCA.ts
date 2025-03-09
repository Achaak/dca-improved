import { buy, deposit } from "../transaction";
import type { Config, Data } from "../types";
import { invalidateCachePrefix } from "../utils/cache";
import { getDataWithoutPrefetch } from "../utils/data";
import { generateId } from "../utils/generate-id";

export async function DCA({
  config,
  data: dataWithPrefetch,
}: {
  config: Config;
  data: Data[];
}) {
  if (!config.id) {
    config.id = generateId();
  }

  const data = getDataWithoutPrefetch({ data: dataWithPrefetch, config });

  for (const d of data) {
    const shouldDeposit =
      (config.deposit_interval === "1d" && d.isDaily) ||
      (config.deposit_interval === "1w" && d.isWeekly) ||
      (config.deposit_interval === "1mn" && d.isMonthly) ||
      (config.deposit_interval === "1y" && d.isYearly);

    if (shouldDeposit) {
      deposit({
        amountUSD: config.deposit_value,
        timestamp: d.timestamp,
        config,
      });
    }

    const shouldProcess =
      (config.DCA_Interval === "1d" && d.isDaily) ||
      (config.DCA_Interval === "1w" && d.isWeekly) ||
      (config.DCA_Interval === "1mn" && d.isMonthly) ||
      (config.DCA_Interval === "1y" && d.isYearly);

    if (shouldProcess) {
      buy({
        amountUSD: config.deposit_value,
        price: d.close,
        timestamp: d.timestamp,
        config,
      });
    }
  }

  invalidateCachePrefix(config.id);

  return {
    config,
    data,
    dataWithPrefetch: dataWithPrefetch,
  };
}
