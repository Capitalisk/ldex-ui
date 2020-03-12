import { getClient } from '../API';

// All the information that the user needs to provide.
export interface UnprocessedDEXConfiguration {
    markets: {
        [key: string]: {
            ASSETS: Array<{ name: string, ticker: string }>,
            DEX_API_URL: string,
            LISK_API_URLS: {
                [key: string]: string
            }
        }
    }
}

// A ready-to-use DEX configuration with the DEX_ADDRESSES (which are fetched from the DEX_API_URL) populated.
export interface DEXConfiguration {
    markets: {
        [key: string]: {
            ASSETS: Array<{ name: string, ticker: string }>,
            DEX_API_URL: string,
            LISK_API_URLS: {
                [key: string]: string
            },
            DEX_ADDRESSES: {
                [key: string]: string
            }
        }
    }
}


export const defaultConfiguration: UnprocessedDEXConfiguration = {
    // lisk of markets.
    markets: {
        // <asset ticket>/<base ticker>
        'LSH/LSK': {
            // the assets of this pair, in the order they appear in the key.
            ASSETS: [
                { name: 'Leasehold Token', ticker: 'LSH' },
                { name: 'Testnet Lisk', ticker: 'LSK' }
            ],
            // API URL that serves orderbook information.
            // The addresses for the DEX are fetched from this endpoint.
            DEX_API_URL: 'http://54.174.172.179:7011',
            // Endpoints that are used for broadcasting transactions.
            LISK_API_URLS: {
                'LSH': 'http://54.174.172.179:7010',
                'LSK': 'https://test-02.liskapi.io/api',
            },
        }
    }
}


export async function processConfiguration(config: UnprocessedDEXConfiguration) {
    const _config = config as DEXConfiguration

    for (let i = 0; i < Object.keys(config.markets).length; i++) {
        const market = config.markets[Object.keys(config.markets)[i]];
        const client = getClient(market.DEX_API_URL);
        const data = (await client.get('/status')).data;

        for (let j = 0; j < 2; j++) {
            const asset = data.chains[market.ASSETS[j].ticker.toLowerCase()];
            if (asset === undefined) {
                throw new Error("Market asset names do not match configuration. Please try a different configuration");
            }
            if (j === 0) {
                // initialize DEX_ADDRESSES as it doesn't yet exist on this object.
                _config.markets[Object.keys(config.markets)[i]].DEX_ADDRESSES = {};
            }
            _config.markets[Object.keys(config.markets)[i]].DEX_ADDRESSES[market.ASSETS[j].ticker] = asset.walletAddress;

        }

    }
    console.log(_config);
    return _config;
}

export function processConfigurationString(config: string) {

}