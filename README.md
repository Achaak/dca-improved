# DCA Improved

A powerful tool for simulating and comparing Dollar-Cost Averaging (DCA) investment strategies using historical price data.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration Management](#configuration-management)
  - [Creating a Configuration](#creating-a-configuration)
  - [Updating a Configuration](#updating-a-configuration)
- [Running Simulations](#running-simulations)
  - [Standard DCA](#standard-dca)
  - [DCA Improved](#dca-improved)
  - [Comparing Strategies](#comparing-strategies)
  - [Randomized Comparisons](#randomized-comparisons)
- [Advanced Usage](#advanced-usage)
  - [Randomized Parameters](#randomized-parameters)
  - [Custom Date Ranges](#custom-date-ranges)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Technical Details](#technical-details)

## 🔍 Overview

DCA Improved is a tool that allows investors to simulate and compare different Dollar-Cost Averaging strategies using historical price data. The tool supports:

- Standard DCA: Regular fixed-amount investments at set intervals
- DCA Improved: An enhanced strategy that optimizes investment timing based on market conditions
- Comparative analysis between different strategies
- Randomized simulations to test strategy performance across various market conditions

## 🚀 Installation

1. Ensure you have [Bun](https://bun.sh/) installed on your system
2. Clone this repository
3. Install dependencies:

```bash
bun install
```

## ⚙️ Configuration Management

### Creating a Configuration

Before running simulations, you need to create a configuration file that defines parameters for your investment strategy.

#### Usage

```bash
bun run create-config -n <configFileName> -t <token> -s <startDate> -e <endDate> -v <depositValue> -i <DCAInterval> -f <fee>
```

#### Parameters

| Parameter | Description                                   | Example      |
| --------- | --------------------------------------------- | ------------ |
| `-n`      | Configuration file name (without extension)   | `myConfig`   |
| `-t`      | Token/asset symbol                            | `btc`        |
| `-s`      | Start date for historical data (YYYY-MM-DD)   | `2016-01-01` |
| `-e`      | End date for historical data (YYYY-MM-DD)     | `2025-01-01` |
| `-v`      | Amount to invest per interval (in USD)        | `300`        |
| `-i`      | Investment interval (`1d`, `1w`, `1mn`, `1y`) | `1w`         |
| `-f`      | Transaction fee (decimal, e.g., 0.001 = 0.1%) | `0.001`      |

#### Example

```bash
bun run create-config -n btcWeekly -t btc -s 2016-01-01 -e 2025-01-01 -v 300 -i 1w -f 0.001
```

This creates a `btcWeekly.json` file in the `config` directory with the specified parameters.

### Updating a Configuration

You can update an existing configuration file without recreating it from scratch.

#### Usage

```bash
bun run update-config -n <configFileName> -s <startDate> -e <endDate> -v <depositValue> -i <DCAInterval> -f <fee>
```

#### Example

```bash
bun run update-config -n btcWeekly -s 2018-01-01 -e 2023-01-01 -v 500 -i 1w -f 0.0015
```

## 🏃 Running Simulations

### Standard DCA

Run a simulation using the standard Dollar-Cost Averaging strategy:

```bash
bun run start:dca -c <configFileName>
```

This command executes a traditional DCA strategy where a fixed amount is invested at regular intervals regardless of market conditions.

### DCA Improved

Run a simulation using the enhanced DCA Improved strategy:

```bash
bun run start:dca-improved -c <configFileName>
```

The DCA Improved strategy optimizes investment timing based on market conditions, potentially improving returns compared to standard DCA.

### Comparing Strategies

Compare the performance of standard DCA against DCA Improved:

```bash
bun run start:compare -c <configFileName>
```

This command executes both strategies and displays comparative results for analysis, including:

- Total investment amount
- Final portfolio value
- Profit/loss in USD and percentage
- Number of transactions
- Average purchase price

### Randomized Comparisons

Perform multiple randomized simulations to test strategy performance across different market conditions:

```bash
bun run start:compare:random -c <configFileName> --nb-of-days <days> --nb-of-runs <runs>
```

#### Parameters

| Parameter      | Description                        | Default | Example |
| -------------- | ---------------------------------- | ------- | ------- |
| `--nb-of-days` | Number of days for each simulation | 365     | `1000`  |
| `--nb-of-runs` | Number of simulation runs          | 1       | `10000` |

#### Example

```bash
bun run start:compare:random -c btcWeekly --nb-of-days 1000 --nb-of-runs 10000
```

This command runs multiple simulations with randomly selected date ranges of the specified length, providing statistical insights into strategy performance across various market conditions.

## 🔧 Advanced Usage

### Randomized Parameters

For advanced users, you can run a simulation with randomized strategy parameters to find optimal settings:

```bash
bun run start:dca-improved-random-params -c <configFileName> [--nb-of-days <days>] [--nb-iterations <iterations>] [--nb-of-runs-by-iteration <runs>]
```

#### Parameters

| Parameter                   | Description                              | Default | Example |
| --------------------------- | ---------------------------------------- | ------- | ------- |
| `--nb-of-days`              | Number of days for each simulation       | 365     | `500`   |
| `--nb-iterations`           | Number of parameter combinations to test | 1       | `10`    |
| `--nb-of-runs-by-iteration` | Number of runs per parameter combination | 1       | `100`   |

This advanced feature tests various combinations of buy/sell ratio parameters to identify potentially optimal settings for the DCA Improved strategy.

### Custom Date Ranges

All simulation commands support custom date ranges through the configuration file. This allows you to test strategies during specific market conditions:

- Bull markets
- Bear markets
- Sideways markets
- High volatility periods
- Market crashes

## 📊 Examples

### Basic Weekly Bitcoin DCA

```bash
# Create configuration
bun run create-config -n btcWeekly -t btc -s 2018-01-01 -e 2023-01-01 -v 100 -i 1w -f 0.001

# Run standard DCA
bun run start:dca -c btcWeekly

# Run DCA Improved
bun run start:dca-improved -c btcWeekly

# Compare results
bun run start:compare -c btcWeekly
```

### Extensive Randomized Testing

```bash
# Create configuration
bun run create-config -n ethTesting -t eth -s 2017-01-01 -e 2023-01-01 -v 200 -i 1w -f 0.001

# Run randomized comparison with 500 days and 5000 runs
bun run start:compare:random -c ethTesting --nb-of-days 500 --nb-of-runs 5000
```

### Parameter Optimization

```bash
# Create configuration
bun run create-config -n btcOptimize -t btc -s 2016-01-01 -e 2023-01-01 -v 100 -i 1w -f 0.001

# Run parameter optimization with 10 iterations and 100 runs each
bun run start:dca-improved-random-params -c btcOptimize --nb-iterations 10 --nb-of-runs-by-iteration 100
```

## ❓ Troubleshooting

- **Missing Configuration File**: Ensure your configuration file exists in the `config` directory
- **Data Range Issues**: Verify that your date range is valid and historical data is available
- **Performance Concerns**: For large simulations, consider reducing the number of days or runs
- **Memory Issues**: When running many iterations or large datasets, you may need to increase available memory
- **Data Availability**: Some tokens may have limited historical data; adjust date ranges accordingly

## 🔬 Technical Details

### Data Source

The tool uses [Dukascopy](https://www.dukascopy.com/) as the data source for historical price information. Data is cached locally to improve performance for subsequent runs.

### Strategy Implementation

- **Standard DCA**: Implements a traditional dollar-cost averaging approach with fixed investment amounts at regular intervals
- **DCA Improved**: Uses market indicators and ratio-based calculations to optimize entry and exit points

### Performance Metrics

The comparison tools calculate and display several key metrics:

- Total investment amount
- Final portfolio value
- Absolute profit/loss (USD)
- Relative profit/loss (%)
- Number of transactions
- Average purchase price
- Maximum drawdown
- Sharpe ratio (for randomized comparisons)

---

For more information or to report issues, please open an issue in the repository.
