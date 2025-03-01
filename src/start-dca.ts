import { getConfig } from "./config";
import { DCA } from "./scripts/DCA";

const config = await getConfig();

DCA(config);
