# DCA Improved

## Create Config

### Usage

```bash
bun run create-config -n <configFileName> -t <token> -s <startDate> -e <endDate> -v <depositValue> -i <DCAInterval> -f <fee>
```

### Example

To create a configuration file for Bitcoin (BTC/USD) price data from January 1, 2016, to January 1, 2025, with a DCA value of 300, an DCA interval of 1 minute, and a fee of 0.001, run:

```bash
bun run src/create-config.ts -n myConfig -t btc -s 2016-01-01 -e 2025-01-01 -v 300 -i 1m -f 0.001
```

This command creates a `myConfig.json` file in the config directory containing the specified parameters.

## Use Config

To use a previously created configuration file, ensure that the file exists in the config directory. The following commands will utilize the specified configuration.

## Update Config

### Usage

```bash
bun run update-config -n <configFileName> -s <startDate> -e <endDate> -v <depositValue> -i <DCAInterval> -f <fee>
```

### Example

To update the configuration file `myConfig.json` to use data from January 1, 2016, to January 1, 2025, with a DCA value of 300, an DCA interval of 1 minute, and a fee of 0.001, run:

```bash
bun run update-config -n myConfig -s 2016-01-01 -e 2025-01-01 -v 300 -i 1m -f 0.001
```

## Start DCA Process

To start the **DCA Improved** process using the generated configuration file, use:

```bash
bun run start:dca-improved -c <configFileName>
```

Alternatively, to start the **standard DCA** process, use:

```bash
bun run start:dca -c <configFileName>
```

## Compare Results

To compare different DCA strategies using the specified configuration file, run:

```bash
bun start:compare -c <configFileName>
```

### Example

To compare results using the `myConfig` configuration file:

```bash
bun start:compare -c myConfig
```

This command will execute both the **DCA** and **DCA Improved** scripts and display the comparison results for analysis.

## Randomized DCA Comparison

To perform a randomized comparison over multiple runs and a specified number of days, use:

```bash
bun start:compare:random -c <configFileName> --nb-of-days <days> --nb-of-runs <runs>
```

### Example

To compare using the `myConfig` configuration with 1,000 days and 10,000 runs:

```bash
bun start:compare:random -c myConfig --nb-of-days 1000 --nb-of-runs 10000
```

This command runs multiple randomized simulations to compare the DCA strategies over different market conditions.
