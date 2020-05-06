const formatThousands = (num, separator) => {
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
      lastDigits += paddingZero.repeat(3 - lastDigits.length);
    }
    numParts.push(lastDigits);
  }
  return numParts.reverse().join(separator) + fractionDecimals;
};

const groupByKey = (array, Key, sumKey) => array.reduce((accumulator, newItem) => {
  const groupByKeyValue = newItem[Key];
  if (groupByKeyValue in accumulator) {
    const prevItem = accumulator[groupByKeyValue];
    prevItem[sumKey] += newItem[sumKey];
    accumulator[groupByKeyValue] = prevItem;
  } else {
    accumulator[groupByKeyValue] = newItem;
  }
  return accumulator;
}, {});

const Keys = (dict) => Object.keys(dict);

const Values = (dict) => Object.values(dict);

const EstimationStatus = {
  MATCH: 'MATCH',
  PARTIAL_MATCH: 'PARTIAL_MATCH',
  NO_MATCH: 'NO_MATCH',
};

Object.freeze(EstimationStatus);

// considering price unit is same for both buyer and seller, for current application it's in terms of lsk per lsh
const estimateBestReturnsForSeller = (amount, price, bids) => {
  let estimatedReturns = 0;
  let status = EstimationStatus.NO_MATCH;
  let amountYetToBeSold = amount;
  for (const bid of bids) {
    if (price <= bid.price) {
      const bestBidReturns = amountYetToBeSold * bid.price;
      if (bid.amount >= bestBidReturns) {
        estimatedReturns += bestBidReturns;
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
  return { estimatedReturns, status };
};

const estimatedBestReturnsForBuyer = (amount, price, asks) => {
  let estimatedReturns = 0;
  let status = EstimationStatus.NO_MATCH;
  let amountYetToBeSold = amount;
  for (const ask of asks) {
    if (price >= ask.price) {
      const bestAskReturns = amountYetToBeSold / ask.price;
      if (ask.amount >= bestAskReturns) {
        estimatedReturns += bestAskReturns;
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
  return { estimatedReturns, status };
};

// todo - reuse the function in orderbook.js, make sure calculations are in one place
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
  asks.sort((ask1, ask2) => ask2.price - ask1.price);
  for (const bid of contextOrderBook.bids) {
    const size = bid.valueRemaining;
    const whole = 10 ** 8;
    const amount = calculateAmount(size, whole);
    const { price } = bid;
    bids.push({ amount, price });
  }
  bids.sort((bid1, bid2) => bid2.price - bid1.price);
  return { asks, bids };
};


export {
  formatThousands, groupByKey, Keys, Values, estimateBestReturnsForSeller, estimatedBestReturnsForBuyer, EstimationStatus, getCleanOrderBook,
};
