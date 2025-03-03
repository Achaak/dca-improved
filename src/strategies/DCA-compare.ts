import type { Config, Data } from "../types";
import { DCA } from "./DCA";
import { DCAImproved } from "./DCA_improved";

export async function DCACompare(config: Config, data: Data[]) {
  const configDAC = structuredClone(config);
  const configDCAImproved = structuredClone(config);

  const dataDCA = structuredClone(data);
  const dataDCAImproved = structuredClone(data);

  const [resultDAC, resultDCAImproved] = await Promise.all([
    DCA({ config: configDAC, data: dataDCA }),
    DCAImproved({ config: configDCAImproved, data: dataDCAImproved }),
  ]);

  return {
    resultDAC,
    resultDCAImproved,
  };
}
