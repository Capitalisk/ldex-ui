import { getClient } from '../API';

// All the information that the user needs to provide.
export interface UnprocessedDEXConfiguration {
    appTitle: string,
    feedbackLink: {
      text: string,
      url: string
    },
    refreshInterval: number,
    assets: {
        [symbol: string]: {
            name: string,
            apiUrl: string,
            unitValue: number
        }
    },
    markets: {
        [key: string]: {
            assets: Array<string>,
            dexApiUrl: string
        }
    }
}

// A ready-to-use DEX configuration with the dexOptions (which is fetched from the dexApiUrl) populated.
export interface DEXConfiguration {
    appTitle: string,
    feedbackLink: {
      text: string,
      url: string
    },
    refreshInterval: number,
    assets: {
        [symbol: string]: {
            name: string,
            apiUrl: string,
            unitValue: number
        }
    },
    markets: {
        [key: string]: {
            assets: Array<string>,
            dexApiUrl: string,
            dexOptions: {
                version: string,
                baseChain: string,
                chainsWhitelist: Array<string>,
                chains: {
                    [symbol: string]: {
                        walletAddress: string,
                        multisigMembers: Array<string>,
                        multisigRequiredSignatureCount: number,
                        minOrderAmount: number,
                        exchangeFeeBase: number,
                        exchangeFeeRate: number,
                        requiredConfirmations: number,
                        orderHeightExpiry: number
                    }
                }
            }
        }
    }
}


export const defaultConfiguration: UnprocessedDEXConfiguration = {
    appTitle: 'Lisk DEX',
    feedbackLink: {
      text: 'Report bug / send feedback',
      url: 'https://github.com/Jaxkr/lisk-dex-ui/issues/new'
    },
    refreshInterval: 10000,
    assets: {
        'lsk': {
            name: 'Lisk testnet',
            apiUrl: 'https://test-02.liskapi.io/api',
            unitValue: 100000000
        },
        'lsh': {
            name: 'Leasehold testnet',
            apiUrl: 'http://54.174.172.179:7010/api',
            unitValue: 100000000
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
        _config.markets[Object.keys(config.markets)[i]].dexOptions = data;
    }
    console.log('Loaded configuration: ');
    console.log(_config);
    return _config;
}

export function processConfigurationString(config: string) {

}
