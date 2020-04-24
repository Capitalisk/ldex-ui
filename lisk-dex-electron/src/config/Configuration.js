import { getClient } from '../API';
import { Number, String, Array, Record, Dictionary } from 'runtypes';

// All the information that the user needs to provide.

const assets = Dictionary(Record({
    'name': String,
    'apiUrl': String,
    'apiMaxPageSize': Number,
    'unitValue': Number,
    'processingHeightExpiry': Number
}))

const markets = Dictionary(Record({
    'assets': Array(String),
    'dexApiUrl': String
}))

const UnprocessedDEXConfiguration = Record ({
    'appTitle': String,
    'feedbackLink': Record({
      'text': String,
      'url': String
    }),
    'notificationDuration': Number,
    'refreshInterval': Number,
    'markets': markets,
    'assets': assets
})

// A ready-to-use DEX configuration with the dexOptions (which is fetched from the dexApiUrl) populated.
// eslint-disable-next-line no-unused-vars
const DEXConfiguration = Record( {
    'appTitle': String,
    'feedbackLink': Record({
      'text': String,
      'url': String
    }),
    'notificationDuration': Number,
    'refreshInterval': Number,
    'assets': Dictionary(Record({
            'name': String,
            'apiUrl': String,
            'apiMaxPageSize': Number,
            'unitValue': Number,
            'processingHeightExpiry': Number
        })),
    'markets': Dictionary(Record({
            'assets': Array(String),
            'dexApiUrl': String,
            'dexOptions': Record({
                'version': String,
                'baseChain': String,
                'priceDecimalPrecision': Number,
                'chainsWhitelist': Array(String),
                'chains': Dictionary(Record({
                        'walletAddress': String,
                        'multisigMembers': Array(String),
                        'multisigRequiredSignatureCount': Number,
                        'minOrderAmount': Number,
                        'exchangeFeeBase': Number,
                        'exchangeFeeRate': Number,
                        'requiredConfirmations': Number,
                        'orderHeightExpiry': Number
                    }))
            }),
        })),
    })

export async function processConfiguration(config) {
    console.dir(config)

    // Throws an exception if check fails for given config object
    const _config = UnprocessedDEXConfiguration.check(config);

    // if (DEXConfiguration.guard(config)) {
    //     console.log('Matched with Dex Configuration')

    for (let i = 0; i < Object.keys(config.markets).length; i++) {
        const market = config.markets[Object.keys(config.markets)[i]];
        const client = getClient(market.dexApiUrl);
        const data = (await client.get('/status')).data;
        if (!(data && data.chains)) {
            throw new Error(`DEX API ${market.dexApiUrl} returned an invalid response.`)
        }
        _config.markets[Object.keys(config.markets)[i]].dexOptions = data;
    }
    console.log('Loaded configuration: ');
    console.log(_config);
    return _config;
}
