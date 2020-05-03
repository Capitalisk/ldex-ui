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
  MATCH: 1,
  PARTIAL_MATCH: 2,
  NO_MATCH: 3,
};

Object.freeze(EstimationStatus);
// considering price unit is same for both buyer and seller, for current application it's in terms of lsk per lsh
const estimatedReturnsForSeller = (amount, price, bids) => {
  let estimatedReturns = 0;
  let status = EstimationStatus.NO_MATCH;
  const maxAmountCanBeReturned = amount * price;
  for (const bid of bids) {
    const remainingAmount = maxAmountCanBeReturned - estimatedReturns;
    if (price <= bid.price) {
      if (bid.amount >= remainingAmount) {
        estimatedReturns += remainingAmount;
        status = EstimationStatus.MATCH;
        break;
      } else {
        estimatedReturns += bid.amount;
        status = EstimationStatus.PARTIAL_MATCH;
      }
    }
  }
  return { estimatedReturns, status };
};

const estimatedReturnsForBuyer = (amount, price, asks) => {
  let estimatedReturns = 0;
  let status = EstimationStatus.NO_MATCH;
  const maxAmountCanBeReturned = amount * (1 / price);
  for (const ask of asks) {
    const remainingAmount = maxAmountCanBeReturned - estimatedReturns;
    if (price >= ask.price) {
      if (ask.amount >= remainingAmount) {
        estimatedReturns += remainingAmount;
        status = EstimationStatus.MATCH;
        break;
      } else {
        estimatedReturns += ask.amount;
        status = EstimationStatus.PARTIAL_MATCH;
      }
    }
  }
  return { estimatedReturns, status };
};

export {
  formatThousands, groupByKey, Keys, Values, estimatedReturnsForBuyer, estimatedReturnsForSeller, EstimationStatus,
};
