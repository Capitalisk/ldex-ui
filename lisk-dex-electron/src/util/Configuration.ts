import { getClient } from '../API';

// All the information that the user needs to provide.
export interface UnprocessedDEXConfiguration {
    assets: {
        [symbol: string]: {
            name: string,
            apiUrl: string
        }
    },
    markets: {
        [key: string]: {
            assets: Array<string>,
            dexApiUrl: string
        }
    }
}

// A ready-to-use DEX configuration with the dexAddresses (which are fetched from the dexApiUrl) populated.
export interface DEXConfiguration {
    assets: {
        [symbol: string]: {
            name: string,
            apiUrl: string
        }
    },
    markets: {
        [key: string]: {
            assets: Array<string>,
            dexApiUrl: string,
            dexAddresses: {
                [key: string]: string
            }
        }
    }
}


export const defaultConfiguration: UnprocessedDEXConfiguration = {
    assets: {
        'lsk': {
            name: 'Lisk testnet',
            apiUrl: 'https://test-02.liskapi.io/api'
        },
        'lsh': {
            name: 'Leasehold testnet',
            apiUrl: 'http://54.174.172.179:7010/api'
        }
    },
    // lisk of markets.
    markets: {
        'lsh/lsk': {
            // API URL that serves orderbook information.
            // The addresses for the DEX are fetched from this endpoint.
            dexApiUrl: 'http://54.174.172.179:7011',
            assets: ['lsh', 'lsk']
        }
    }
}


export async function processConfiguration(config: UnprocessedDEXConfiguration) {
    const _config = config as DEXConfiguration

    for (let i = 0; i < Object.keys(config.markets).length; i++) {
        const market = config.markets[Object.keys(config.markets)[i]];
        const client = getClient(market.dexApiUrl);
        const data = (await client.get('/status')).data;
        if (!(data && data.chains)) {
            throw new Error(`DEX API ${market.dexApiUrl} returned an invalid response.`)
        }

        for (let j = 0; j < 2; j++) {
            const asset = data.chains[market.assets[j]];
            if (asset === undefined) {
                throw new Error("Market asset names do not match configuration. Please try a different configuration");
            }
            if (j === 0) {
                // initialize dexAddresses as it doesn't yet exist on this object.
                _config.markets[Object.keys(config.markets)[i]].dexAddresses = {};
            }
            _config.markets[Object.keys(config.markets)[i]].dexAddresses[market.assets[j]] = asset.walletAddress;

        }

    }
    console.log('Loaded configuration: ');
    console.log(_config);
    return _config;
}

export function processConfigurationString(config: string) {

}
