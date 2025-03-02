import type { Config, Data } from "../types";
import { DCA } from "./DCA";
import { DCAImproved } from "./DCA_improved";

export async function DCACompare(config: Config, data: Data[]) {
  const configDAC = structuredClone(config);
  const dataDAC = structuredClone(data);

  const configDCAImproved = structuredClone(config);
  const dataDCAImproved = structuredClone(data);

  const [resultDAC, resultDCAImproved] = await Promise.all([
    DCA(configDAC, dataDAC),
    DCAImproved(configDCAImproved, dataDCAImproved),
  ]);

  return {
    resultDAC,
    resultDCAImproved,
  };
}
