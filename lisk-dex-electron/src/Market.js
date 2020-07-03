const marketInfoDescriptor = {
  version: {
    name: 'Version',
    desc: 'It is the version of lisk-dex for this market',
  },
  walletAddress: {
    name: 'Wallet address',
    desc: 'It is the address of the DEX market on each of the two blockchains',
  },
  multisigMembers: {
    name: 'Multi-signature members',
    desc: 'It is a list of all the member wallets who are participating in the DEX market on each blockchain',
  },
  multisigRequiredSignatureCount: {
    name: 'Number of signatures required',
    desc: 'It is the is the number of signatures (e.g. how many members) need to sign each trade for it to be valid',
  },
  minOrderAmount: {
    name: 'Min order amount',
    desc: 'It is the minimum order size allowed on each blockchain',
    div: 100000000,
  },
  minPartialTake: {
    name: 'Min partial take',
    desc: 'It is the minimum amount that can be taken from a counter offer',
    div: 100000000,
  },
  exchangeFeeBase: {
    name: 'Exchange fee base',
    desc: 'It is the base transaction fee (flat fee; e.g. 0.1 LSK/LSH)',
    div: 100000000,
  },
  exchangeFeeRate: {
    name: 'Exchange fee rate',
    desc: 'It is the rate (%) fee taken by the DEX on each trade',
    mult: 100,
  },
  requiredConfirmations: {
    name: 'Required confirmations',
    desc: 'It is the number of blocks delay that the DEX requires before processing a trade (2 blocks on Lisk means 2 * 10 seconds = 20 seconds) - It depends on the blockchain block time though',
  },
  orderHeightExpiry: {
    name: 'Order height expiry',
    desc: 'It is how many blocks before the order expires from the order book (maximum amount of time it can stay inside the order book)',
  },
  baseChain: {
    name: 'Base chain',
    desc: 'It tells it which is the base currency (also not very important to show)',
  },
  priceDecimalPrecision: {
    name: 'Price decimal precision',
    desc: 'It is the maximum number of decimals allowed in price (all exchanges have this) we should show the amount - This is kind of important',
  },
  processedHeights: {
    name: 'Processed heights',
    desc: 'Not available',
  },
};

export default marketInfoDescriptor;
