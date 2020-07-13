import {
  Number, String, Array, Record, Dictionary,
} from 'runtypes';
import { getClient } from '../API';

// All the information that the user needs to provide.

const assets = Dictionary(Record({
  name: String,
  apiUrls: Array(String),
  apiMaxPageSize: Number,
  unitValue: Number,
  processingHeightExpiry: Number,
}));

const markets = Dictionary(Record({
  assets: Array(String),
  apiUrls: Array(String),
}));

const UnprocessedDEXConfiguration = Record({
  appTitle: String,
  feedbackLink: Record({
    text: String,
    url: String,
  }),
  notificationDuration: Number,
  refreshInterval: Number,
  markets,
  assets,
});

// A ready-to-use DEX configuration with the marketOptions (which is fetched from the apiUrl) populated.
// eslint-disable-next-line no-unused-vars
const DEXConfiguration = Record({
  appTitle: String,
  feedbackLink: Record({
    text: String,
    url: String,
  }),
  notificationDuration: Number,
  refreshInterval: Number,
  assets: Dictionary(Record({
    name: String,
    apiUrls: Array(String),
    apiMaxPageSize: Number,
    unitValue: Number,
    processingHeightExpiry: Number,
  })),
  markets: Dictionary(Record({
    assets: Array(String),
    apiUrls: Array(String),
    marketOptions: Record({
      version: String,
      baseChain: String,
      priceDecimalPrecision: Number,
      chainsWhitelist: Array(String),
      chains: Dictionary(Record({
        walletAddress: String,
        multisigMembers: Array(String),
        multisigRequiredSignatureCount: Number,
        minOrderAmount: Number,
        exchangeFeeBase: Number,
        exchangeFeeRate: Number,
        requiredConfirmations: Number,
        orderHeightExpiry: Number,
      })),
    }),
  })),
});

export default async function processConfiguration(config) {
  // Throws an exception if check fails for given config object
  const _config = UnprocessedDEXConfiguration.check(config);

  const assetSymbols = Object.keys(_config.assets);

  // Select a random URL for each asset.
  for (const assetSymbol of assetSymbols) {
    const asset = _config.assets[assetSymbol];
    const randomIndex = Math.floor(Math.random() * asset.apiUrls.length);
    asset.apiUrl = asset.apiUrls[randomIndex];
  }

  const marketSymbols = Object.keys(config.markets);

  for (const marketSymbol of marketSymbols) {
    const market = config.markets[marketSymbol];
    const randomIndex = Math.floor(Math.random() * market.apiUrls.length);
    market.apiUrl = market.apiUrls[randomIndex];
    const client = getClient(market.apiUrl);
    const { data } = await client.get('/status');
    if (!(data && data.chains)) {
      throw new Error(`DEX API ${market.apiUrl} returned an invalid response.`);
    }
    market.marketOptions = data;
  }
  console.log('Loaded configuration: ');
  console.log(_config);
  return _config;
}
