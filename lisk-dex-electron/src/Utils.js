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

export {
  formatThousands, groupByKey, Keys, Values,
};
