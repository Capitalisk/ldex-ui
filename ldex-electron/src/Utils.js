// Eventually store all config in singleton class and make it accessible everywhere
function required(varName) {
  throw new Error(`${varName} is required. `);
}

const GlobalConfiguration = (() => {
  let globalConfig = { };

  return {
    getConfig() {
      return globalConfig;
    },
    setConfig(config = required('config')) {
      globalConfig = config;
    },
    getAppTitle() {
      return globalConfig.appTitle;
    },
    getNotificationDuration() {
      return globalConfig.notificationDuration;
    },
    getRefreshInterval() {
      return globalConfig.refreshInterval;
    },
    getAssetNames() {
      return globalConfig.assets && Object.keys(globalConfig.assets);
    },
    getAsset(assetName = required('assetName')) {
      return globalConfig.assets && globalConfig.assets[assetName];
    },
    getAssetApiURL(assetName = required('assetName')) {
      return this.getAsset(assetName).apiURL;
    },
    getAssetUnitValue(assetName = required('assetName')) {
      return this.getAsset(assetName).unitValue;
    },
    getAssetTimeOffset(assetName = required('assetName')) {
      return this.getAsset(assetName).timeOffset;
    },
    getAssetTimeMultiplier(assetName = required('assetName')) {
      return this.getAsset(assetName).timeMultiplier;
    },
    getMarketNames() {
      return globalConfig.markets && Object.keys(globalConfig.markets);
    },
    getMarket(market) {
      return globalConfig.markets && globalConfig.markets[market];
    },
    getDefaultActiveMarketName() {
      return this.getMarketNames()[0];
    },
    getMarketAssets(market = required('market')) {
      return this.getMarket(market).assets;
    },
    getMarketApiURL(market = required('market')) {
      return this.getMarket(market).apiURL;
    },
    getMarketPendingOrderExpiry(market = required('market')) {
      return this.getMarket(market).pendingOrderExpiry;
    },
    getMarketOptions(market = required('market')) {
      return this.getMarket(market).marketOptions;
    },
    getMarketVersion(market = required('market')) {
      return this.getMarketOptions(market).version;
    },
    getMarketBaseChain(market = required('market')) {
      return this.getMarketOptions(market).baseChain;
    },
    getMarketPriceDecimalPrecision(market = required('market')) {
      return this.getMarketOptions(market).priceDecimalPrecision;
    },
    getMarketChainNames(market = required('market')) {
      return Object.keys(this.getMarketOptions(market).chains);
    },
    getMarketChain(market = required('market'), assetName = required('assetName')) {
      return this.getMarketOptions(market).chains[assetName];
    },
    getMarketChainMinOrderAmount(market = required('market'), assetName = required('assetName')) {
      return this.getMarketChain(market, assetName).minOrderAmount;
    },
    getMarketChainMinPartialTakeAmount(market = required('market'), assetName = required('assetName')) {
      return this.getMarketChain(market, assetName).minPartialTake;
    },
    getMarketChainWalletAddress(market = required('market'), assetName = required('assetName')) {
      let marketChain = this.getMarketChain(market, assetName);
      return marketChain.multisigAddress || marketChain.walletAddress;
    },
    getMarketChainExchangeFeeBase(market = required('market'), assetName = required('assetName')) {
      return this.getMarketChain(market, assetName).exchangeFeeBase;
    },
    getMarketChainRequiredConfirmations(market = required('market'), assetName = required('assetName')) {
      return this.getMarketChain(market, assetName).requiredConfirmations;
    },
    getMarketChainRequiredSignatureCount(market = required('market'), assetName = required('assetName')) {
      return this.getMarketChain(market, assetName).multisigRequiredSignatureCount;
    },
  };
})();

// returns number
const getNumericAssetBalance = (assetAmount, assetName, decimal = 2) => {
  // eslint-disable-next-line no-restricted-properties
  const uptoDecimalPlaces = Math.pow(10, decimal);
  const unitValue = GlobalConfiguration.getAssetUnitValue(assetName);
  return Math.round((assetAmount * uptoDecimalPlaces) / unitValue) / uptoDecimalPlaces;
};

// returns string
const getLiteralAssetBalance = (assetAmount, assetName, decimals = 4) => {
  const unitValue = Number(GlobalConfiguration.getAssetUnitValue(assetName));
  return parseFloat((assetAmount / unitValue).toFixed(decimals));
};


const formatThousands = (num, separator) => {
  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);
  separator = separator || ',';
  const numParts = [];
  const paddingZero = '0';

  let fractionDecimals = num.toString().split('.')[1] || '';
  if (fractionDecimals.length) {
    fractionDecimals = `.${fractionDecimals}`;
  }
  let remaining = Math.floor(num);
  if (remaining === 0) {
    return remaining + fractionDecimals;
  }

  let lastDigits;
  while (remaining !== 0) {
    lastDigits = (remaining % 1000).toString();
    remaining = Math.floor(remaining / 1000);
    if (remaining !== 0) {
      lastDigits = paddingZero.repeat(3 - lastDigits.length) + lastDigits;
    }
    numParts.push(lastDigits);
  }
  return sign + numParts.reverse().join(separator) + fractionDecimals;
};

const Keys = (dict) => Object.keys(dict);

const Values = (dict) => Object.values(dict);

const EstimationStatus = {
  MATCH: 'MATCH',
  PARTIAL_MATCH: 'PARTIAL_MATCH',
  NO_MATCH: 'NO_MATCH',
};

Object.freeze(EstimationStatus);

const estimateBestReturnsForSeller = (amount, price, bids, isMarketOrder) => {
  bids = [...bids].sort((a, b) => {
    if (a.price > b.price) {
      return -1;
    }
    if (a.price < b.price) {
      return 1;
    }
    return 0;
  });
  let estimatedReturns = 0;
  let status = EstimationStatus.NO_MATCH;
  let amountYetToBeSold = amount;
  for (const bid of bids) {
    if (isMarketOrder || price <= bid.price) {
      const bestBidReturns = amountYetToBeSold * bid.price;
      if (bid.amount >= bestBidReturns) {
        estimatedReturns += bestBidReturns;
        amountYetToBeSold = 0;
        status = EstimationStatus.MATCH;
        break;
      } else {
        estimatedReturns += bid.amount;
        const amountSold = bid.amount / bid.price;
        amountYetToBeSold -= amountSold;
        status = EstimationStatus.PARTIAL_MATCH;
      }
    }
  }
  return { amountYetToBeSold, estimatedReturns, status };
};

const estimatedBestReturnsForBuyer = (amount, price, asks, isMarketOrder) => {
  asks = [...asks].sort((a, b) => {
    if (a.price < b.price) {
      return -1;
    }
    if (a.price > b.price) {
      return 1;
    }
    return 0;
  });
  let estimatedReturns = 0;
  let status = EstimationStatus.NO_MATCH;
  let amountYetToBeSold = amount;
  for (const ask of asks) {
    if (isMarketOrder || price >= ask.price) {
      const bestAskReturns = amountYetToBeSold / ask.price;
      if (ask.amount >= bestAskReturns) {
        estimatedReturns += bestAskReturns;
        amountYetToBeSold = 0;
        status = EstimationStatus.MATCH;
        break;
      } else {
        estimatedReturns += ask.amount;
        const amountSold = ask.amount * ask.price;
        amountYetToBeSold -= amountSold;
        status = EstimationStatus.PARTIAL_MATCH;
      }
    }
  }
  return { amountYetToBeSold, estimatedReturns, status };
};

const getCleanOrderBook = (contextOrderBook, sourceAsset, targetAsset) => {
  const asks = [];
  const bids = [];
  for (const ask of contextOrderBook.asks) {
    const size = ask.sizeRemaining;
    const amount = getLiteralAssetBalance(size, sourceAsset);
    const { price } = ask;
    asks.push({ amount, price });
  }
  for (const bid of contextOrderBook.bids) {
    const size = bid.valueRemaining;
    const amount = getLiteralAssetBalance(size, targetAsset);
    const { price } = bid;
    bids.push({ amount, price });
  }
  return { asks, bids };
};

export {
  formatThousands, Keys, Values, estimateBestReturnsForSeller, estimatedBestReturnsForBuyer, EstimationStatus, getCleanOrderBook, GlobalConfiguration, getNumericAssetBalance, getLiteralAssetBalance,
};
