const marketInfoDescriptor = {
    "version": {
        "name": "Version",
        "desc": "It is the version of lisk-dex for this market",
    },
    "walletAddress" : {
        "name": "Wallet Address",
        "desc": "It is the address of the DEX market on each of the two blockchains",
    },
    "multisigMembers":  {
        "name": "Multi-Signature Members",
        "desc":"It is a list of all the member wallets who are participating in the DEX market on each blockchain",
    },
    "multisigRequiredSignatureCount": {
        "name": "Multi-Signature Count",
        "desc": "It is the is the number of signatures (e.g. how many members) need to sign each trade for it to be valid",
    },
    "minOrderAmount":  {
        "name": "Min Order Amount",
        "desc":"It is the minimum order size allowed on each blockchain",
    },
    "minPartialTake":  {
        "name":"Min Partial Take",
        "desc": "It is the minimum amount that can be taken from a counter offer",
    },
    "exchangeFeeBase":  {
        "name": "Exchange Base Fee",
        "desc": "It is the base transaction fee (flat fee; e.g. 0.1 LSK/LSH)",
    },
    "exchangeFeeRate": {
        "name": "Exchange Fee Rate",
        "desc": "It is the rate (%) fee taken by the DEX on each trade",
    },
    "requiredConfirmations":  {
        "name": "Required Confirmations",
        "desc": "It is the number of blocks delay that the DEX requires before processing a trade (2 blocks on Lisk means 2 * 10 seconds = 20 seconds) - It depends on the blockchain block time though"
    },
    "orderHeightExpiry":  {
        "name": "Order Height Expiry",
        "desc": "It is how many blocks before the order expires from the order book (maximum amount of time it can stay inside the order book)"
    },
    "baseChain":  {
        "name" : "Base Chain",
        "desc" : "It tells it which is the base currency (also not very important to show)"
    },
    "priceDecimalPrecision":  {
        "name" : "Price Decimal Precision",
        "desc" : "It is the maximum number of decimals allowed in price (all exchanges have this) we should show the amount - This is kind of important"
    },
}

export default marketInfoDescriptor;