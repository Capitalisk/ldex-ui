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

// considering price unit is same for both buyer and seller, for current application it's in terms of lsk per lsh
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

const getCleanOrderBook = (contextOrderBook) => {
  const calculateAmount = (size, whole) => parseFloat((size / whole).toFixed(4));
  const asks = [];
  const bids = [];
  for (const ask of contextOrderBook.asks) {
    const size = ask.sizeRemaining;
    const whole = 10 ** 8;
    const amount = calculateAmount(size, whole);
    const { price } = ask;
    asks.push({ amount, price });
  }
  for (const bid of contextOrderBook.bids) {
    const size = bid.valueRemaining;
    const whole = 10 ** 8;
    const amount = calculateAmount(size, whole);
    const { price } = bid;
    bids.push({ amount, price });
  }
  return { asks, bids };
};


export {
  formatThousands, Keys, Values, estimateBestReturnsForSeller, estimatedBestReturnsForBuyer, EstimationStatus, getCleanOrderBook,
};
