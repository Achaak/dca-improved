# DCA Improved

## Create Config

### Usage

```bash
bun run create-config -n <configFileName> -t <token> -s <startDate> -e <endDate>
```

### Example

To create a configuration file for Bitcoin (BTC/USD) data from January 1, 2016, to January 1, 2025, run:

```bash
bun run src/create-config.ts -n myConfig -t btc -s 2016-01-01 -e 2025-01-01
```

This command generates a `myConfig.json` file in the `config` directory with the specified parameters.

## Use Config

## Update Config

### Usage

```bash
bun run update-config -n <configFileName> -s <startDate> -e <endDate>
```

### Example

To update the configuration file `myConfig.json` to use data from January 1, 2016, to January 1, 2025, run:

```bash
bun run update-config -n myConfig -s 2016-01-01 -e 2025-01-01
```

### Usage

To start the DCA Improved process using the generated configuration file, use:

```bash
bun run start:dca-improved -c <configFileName>
```

Alternatively, to start the standard DCA process, use:

```bash
bun run start:dca -c <configFileName>
```
