import { getConfig } from "../utils/config";
import { showStats } from "../utils/format";
import { DCA } from "../strategies/DCA";
import { getData } from "../utils/data";
import { getProfitPercentageHistory } from "../transaction";
import { getDrawdown } from "../utils/drawdown";

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

// Run the DCA strategy
const { config: updatedConfig } = await DCA(config, data);

const nbUSDHistory = getProfitPercentageHistory({
  data,
  config: updatedConfig,
});
const balancesUSD = nbUSDHistory.map((b) => b.profitPercentage);
console.log(
  balancesUSD,
  getDrawdown({
    values: balancesUSD,
  })
);
// Show the statistics
showStats({
  config: updatedConfig,
  data,
  startDate: new Date(data[0].timestamp),
  endDate: new Date(data[data.length - 1].timestamp),
});
