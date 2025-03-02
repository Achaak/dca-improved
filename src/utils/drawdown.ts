export function getDrawdown({ values }: { values: number[] }) {
  let peak = -Infinity;
  let trough = Infinity;
  let peakIndex = 0;
  let troughIndex = 0;
  let drawdown = 0;

  for (let i = 0; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      peakIndex = i;
    }

    if (values[i] < trough) {
      trough = values[i];
      troughIndex = i;
    }

    drawdown = Math.min(drawdown, (trough - peak) / peak);
  }

  return {
    drawdown,
    peak,
    peakIndex,
    trough,
    troughIndex,
  };
}
