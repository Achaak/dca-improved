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

type VariationResult = {
  // Indices in the data array
  indices: {
    start: number;
    end: number;
  };
  // Time information
  time: {
    startDate: number;
    endDate: number;
    durationDays: number;
  };
  // Value information
  values: {
    start: number;
    end: number;
    absoluteChange: number;
  };
  // Analysis results
  analysis: {
    percentChange: number;
    annualizedRate: number;
  };
};

/**
 * Calculates the most significant variation in a series of values with associated dates
 * @param data - Array of objects containing date and value pairs
 * @param windowSize - Optional window size to look for variations (default: entire array)
 * @param options - Additional options for customizing the analysis
 * @returns Object containing grouped information about the most significant variation
 */
export function getLastBigVariation({
  data,
  windowSize,
}: {
  data: Array<{ timestamp: number; close: number }>;
  windowSize: number;
}): VariationResult {
  // Define the return type with grouped data for better organization

  // Handle empty data case
  if (data.length === 0) {
    throw new Error("Data array cannot be empty");
  }

  // Determine the window to analyze
  const startIndex = Math.max(0, data.length - windowSize);
  const endIndex = data.length - 1;

  // Initialize variables to track the largest variation
  let maxVariation = -Infinity;
  let startVariationIndex = startIndex;
  let endVariationIndex = startIndex;

  // Optimize: Use a single pass algorithm instead of nested loops
  // This reduces time complexity from O(n²) to O(n)
  let minValueIndex = startIndex;
  let minValue = data[startIndex].close;

  // Find the largest variation in a single pass
  for (let i = startIndex + 1; i <= endIndex; i++) {
    const currentValue = data[i].close;

    // Calculate variation from the minimum value seen so far to the current value
    const variation = currentValue - minValue;

    // If we found a larger variation, update our result
    if (variation > maxVariation) {
      maxVariation = variation;
      startVariationIndex = minValueIndex;
      endVariationIndex = i;
    }

    // If we found a new minimum value, update it
    // This will be used for potential future variations
    if (currentValue < minValue) {
      minValue = currentValue;
      minValueIndex = i;
    }
  }

  // Calculate duration in days
  const startDate = data[startVariationIndex].timestamp;
  const endDate = data[endVariationIndex].timestamp;
  const durationMs = endDate - startDate;
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

  // Calculate values
  const startValue = data[startVariationIndex].close;
  const endValue = data[endVariationIndex].close;
  const absoluteChange = endValue - startValue;

  // Calculate analysis metrics
  const percentChange = absoluteChange / Math.abs(startValue);

  // Calculate annualized rate (using compound annual growth rate formula)
  // CAGR = (endValue / startValue)^(1/years) - 1
  const years = durationDays / 365;
  const annualizedRate =
    years > 0 ? Math.pow(endValue / startValue, 1 / years) - 1 : 0;

  return {
    indices: {
      start: startVariationIndex,
      end: endVariationIndex,
    },
    time: {
      startDate,
      endDate,
      durationDays,
    },
    values: {
      start: startValue,
      end: endValue,
      absoluteChange,
    },
    analysis: {
      percentChange,
      annualizedRate,
    },
  };
}
