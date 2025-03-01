import { getConfig } from "./config";
import { DCAImproved } from "./scripts/DCA_improved";

const config = await getConfig();

DCAImproved(config);
