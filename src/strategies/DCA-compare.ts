import { calculateMetrics } from "../transaction";
import type { Config, Data } from "../types";
import { DCA } from "./DCA";
import { DCAImproved } from "./DCA_improved";

export async function DCACompare(config: Config, data: Data[]) {
  const configDAC = structuredClone(config);
  const dataDAC = structuredClone(data);

  const configDCAImproved = structuredClone(config);
  const dataDCAImproved = structuredClone(data);

  const [{ config: updatedConfigDCA }, { config: updatedConfigDCAImproved }] =
    await Promise.all([
      DCA(configDAC, dataDAC),
      DCAImproved(configDCAImproved, dataDCAImproved),
    ]);

  const DCAMetrics = calculateMetrics({
    config: updatedConfigDCA,
    data: dataDAC,
    endDate: new Date(dataDAC[dataDAC.length - 1].timestamp),
  });

  const DCAImprovedMetrics = calculateMetrics({
    config: updatedConfigDCAImproved,
    data: dataDCAImproved,
    endDate: new Date(dataDCAImproved[dataDCAImproved.length - 1].timestamp),
  });

  return {
    DCAMetrics,
    DCAImprovedMetrics,
  };
}
