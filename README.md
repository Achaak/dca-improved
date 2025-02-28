# DCA Improved

## Create Config

The `create-config.ts` script helps you generate a configuration file for fetching historical price data. You can specify the instrument, start date, end date, and config file name through command line arguments.

### Usage

```bash
bun run create-config -n <configFileName> -i <instrument> -s <startDate> -e <endDate>
```

### Example

To create a configuration file for Bitcoin (BTC/USD) data from January 1, 2016, to January 1, 2025, run:

```bash
bun run src/create-config.ts -n myConfig -i btcusd -s 2016-01-01 -e 2025-01-01
```

This command generates a `myConfig.json` file in the `config` directory with the specified parameters.

## Use Config

### Usage

To start the DCA Improved process using the generated configuration file, use:

```bash
bun run start:dca-improved -c <configFileName>
```

Alternatively, to start the standard DCA process, use:

```bash
bun run start:dca -c <configFileName>
```
