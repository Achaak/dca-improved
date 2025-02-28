import { buy } from "../transaction";
import { deposit } from "../utils";
import type { Config, Data } from "../types";

export async function DCA(config: Config, data: Data[]) {
  for (const d of data) {
    const date = new Date(d.timestamp);
    deposit(config.DCA_Value, date, config);
    buy(config.DCA_Value, d.close, date, config);
  }

  return {
    config,
    data,
  };
}
