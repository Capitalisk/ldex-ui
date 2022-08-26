import {
  Number, String, Array, Record, Dictionary,
} from 'runtypes';
import { getClient } from '../API';

// All the information that the user needs to provide.

const assets = Dictionary(Record({
  name: String,
  unitValue: Number,
  adapter: Record({
    type: String,
    apiURL: String,
    networkIdentifier: String.optional(),
    apiMaxPageSize: Number,
  }),
}));

const markets = Dictionary(Record({
  assets: Array(String),
  apiURL: String,
  orderBookDepth: Number,
  pendingOrderExpiry: Number,
}));

const UnprocessedDEXConfiguration = Record({
  appTitle: String,
  notificationDuration: Number,
  refreshInterval: Number,
  markets,
  assets,
});

// A ready-to-use DEX configuration with the marketOptions (which is fetched from the apiURL) populated.
// eslint-disable-next-line no-unused-vars
const DEXConfiguration = Record({
  appTitle: String,
  notificationDuration: Number,
  refreshInterval: Number,
  assets: Dictionary(Record({
    name: String,
    apiURL: String,
    apiMaxPageSize: Number,
    unitValue: Number,
  })),
  markets: Dictionary(Record({
    assets: Array(String),
    apiURL: String,
    orderBookDepth: Number,
    pendingOrderExpiry: Number,
    marketOptions: Record({
      version: String,
      baseChain: String,
      priceDecimalPrecision: Number,
      chainsWhitelist: Array(String),
      chains: Dictionary(Record({
        multisigAddress: String,
        multisigMembers: Array(String),
        multisigRequiredSignatureCount: Number,
        minOrderAmount: String,
        maxOrderAmount: String,
        exchangeFeeBase: String,
        exchangeFeeRate: Number,
        requiredConfirmations: Number,
        orderHeightExpiry: Number,
      })),
    }),
  })),
});

export default async function createRefinedGlobalConfig(config) {
  // Throws an exception if check fails for given config object
  const verifiedConfig = UnprocessedDEXConfiguration.check(config);
  const marketSymbols = Object.keys(config.markets);

  for (const marketSymbol of marketSymbols) {
    const market = config.markets[marketSymbol];
    const client = getClient(market.apiURL);
    const { data } = await client.get('/status');
    if (!(data && data.chains)) {
      throw new Error(`DEX API ${market.apiURL} returned an invalid response.`);
    }
    market.marketOptions = data;
  }

  console.log('Loaded configuration: ');
  console.log(verifiedConfig);
  return verifiedConfig;
}
