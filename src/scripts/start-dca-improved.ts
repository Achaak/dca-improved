import { getConfig } from "../utils/config";
import { showStats } from "../utils/format";
import { DCAImproved } from "../strategies/DCA_improved";
import { getData } from "../utils/data";
import { getDrawdown } from "../utils/drawdown";
import { getProfitPercentageHistory } from "../transaction";

// Load the existing configuration
const config = await getConfig();

// Fetch data based on the configuration
const data = await getData({
  config,
  startDate: new Date(config.start_date),
  endDate: new Date(config.end_date),
});

// Run the DCA Improved strategy
const { config: updatedConfig } = await DCAImproved(config, data);

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
