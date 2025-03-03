import type { Config, Data } from "../types";
import { DCA } from "./DCA";
import { DCAImproved } from "./DCA_improved";

export async function DCACompare(
  config: Config,
  data: {
    dca: Data[];
    dcaImproved: Data[];
  }
) {
  const configDAC = structuredClone(config);

  const configDCAImproved = structuredClone(config);

  const [resultDAC, resultDCAImproved] = await Promise.all([
    DCA({ config: configDAC, data: data.dca }),
    DCAImproved({ config: configDCAImproved, data: data.dcaImproved }),
  ]);

  return {
    resultDAC,
    resultDCAImproved,
  };
}
