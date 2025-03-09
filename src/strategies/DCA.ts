import { buy, deposit } from "../transaction";
import type { Config, Data } from "../types";
import { invalidateCachePrefix } from "../utils/cache";
import { generateId } from "../utils/generate-id";

export async function DCA({ config, data }: { config: Config; data: Data[] }) {
  if (!config.id) {
    config.id = generateId();
  }

  for (const d of data) {
    const date = new Date(d.timestamp);

    const shouldDeposit =
      (config.deposit_interval === "1d" && d.isDaily) ||
      (config.deposit_interval === "1w" && d.isWeekly) ||
      (config.deposit_interval === "1mn" && d.isMonthly) ||
      (config.deposit_interval === "1y" && d.isYearly);

    if (shouldDeposit) {
      deposit({
        amountUSD: config.deposit_value,
        date,
        config,
      });
    }

    const shouldProcess =
      (config.DCA_Interval === "1d" && d.isDaily) ||
      (config.DCA_Interval === "1w" && d.isWeekly) ||
      (config.DCA_Interval === "1mn" && d.isMonthly) ||
      (config.DCA_Interval === "1y" && d.isYearly);

    if (shouldProcess) {
      buy({ amountUSD: config.deposit_value, price: d.close, date, config });
    }
  }

  invalidateCachePrefix(config.id);

  return {
    config,
    data,
  };
}
