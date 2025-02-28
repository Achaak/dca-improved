import { SHOW_LOGS } from "./config";
import type { Config } from "./types";
import { formatBTC, formatUSD, getNbBTC, getNbUSD } from "./utils";

export function buy(
  amountUSD: number,
  price: number,
  date: Date,
  config: Config
) {
  if (amountUSD <= 0) {
    console.error("Amount must be greater than 0");
    return;
  }

  const feeUSD = amountUSD * config.fee;
  const amountBTCMinusFee = (amountUSD - feeUSD) / price;

  const balanceUSD = getNbUSD(config.transactions, date);

  if (balanceUSD < amountUSD) {
    console.error("Not enough balance");
    return;
  }

  config.transactions.push({
    amountBTC: amountBTCMinusFee,
    price,
    date,
    type: "buy",
    feeUSD: feeUSD,
  });

  if (SHOW_LOGS) {
    console.log(
      `\x1b[32m Bought ${formatBTC(amountBTCMinusFee)} BTC for ${formatUSD(
        amountUSD
      )} USD at ${formatUSD(
        price
      )} USD/BTC on ${date.toLocaleString()}. Fee: ${formatUSD(
        feeUSD
      )} USD \x1b[0m`
    );
  }
}

export function sell(
  amountBTC: number,
  price: number,
  date: Date,
  config: Config
) {
  const nbBTC = getNbBTC(config.transactions, date);

  if (nbBTC < amountBTC) {
    console.error("Not enough BTC");
    return;
  }

  const amountUSD = amountBTC * price;
  const feeUSD = amountUSD * config.fee;

  config.transactions.push({
    amountBTC,
    price,
    date,
    type: "sell",
    feeUSD,
  });

  if (SHOW_LOGS) {
    console.log(
      `\x1b[31m Sold ${formatBTC(amountBTC)} BTC for ${formatUSD(
        amountUSD
      )} USD at ${formatUSD(
        price
      )} USD/BTC on ${date.toLocaleString()}. Fee: ${formatUSD(
        feeUSD
      )} USD \x1b[0m`
    );
  }
}
