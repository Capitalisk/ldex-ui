import {
  groupByKey, Keys, Values, formatThousands,
} from '../Utils';

import { asks, bids } from './fixtures/orderbook1';

describe('Utils tests => ', () => {
  test.each`
    largeNumber               |           expectedFormattedLargeNumber
    ${344332234.9789999}      |           ${'344,332,234.9789999'}
    ${43311223.099009000}     |           ${'43,311,223.099009'}
    ${122323421313.000}       |           ${'122,323,421,313'}
    ${23.0000}                |           ${'23'}  
    ${7.00000}                |           ${'7'}     
    ${232.000978393434}       |           ${'232.000978393434'}
    ${6764.000978393434}      |           ${'6,764.000978393434'}
  `('Should format $largeNumber to $expectedFormattedLargeNumber', ({ largeNumber, expectedFormattedLargeNumber }) => {
  const actualFormattedLargeNumber = formatThousands(largeNumber, ',');
  expect(actualFormattedLargeNumber).toEqual(expectedFormattedLargeNumber);
});

  it('Reduces an array with group by query', () => {
    const actualArray = [{ price: 0.8, value: 1 }, { price: 0.8, value: 2 }, { price: 0.85, value: 1 }, { price: 0.86, value: 1 },
      { price: 0.9, value: 1 }, { price: 0.92, value: 2 }, { price: 0.92, value: 4 }, { price: 0.8, value: 4 }];

    const expectedReduction = {
      0.8: { price: 0.8, value: 7 },
      0.85: { price: 0.85, value: 1 },
      0.86: { price: 0.86, value: 1 },
      0.9: { price: 0.9, value: 1 },
      0.92: { price: 0.92, value: 6 },
    };

    expect(groupByKey(actualArray, 'price', 'value')).toEqual(expectedReduction);
  });

  it('Gets keys from dict in correct order', () => {
    const actualDict = {
      0.8: { price: 0.8, value: 7 },
      0.85: { price: 0.85, value: 1 },
      0.86: { price: 0.86, value: 1 },
      0.9: { price: 0.9, value: 1 },
      0.92: { price: 0.92, value: 6 },
    };

    const expectedKeys = ['0.8', '0.85', '0.86', '0.9', '0.92'];

    expect(Keys(actualDict)).toEqual(expectedKeys);
  });

  it('Gets values from dict in correct order', () => {
    const actualDict = {
      0.8: { price: 0.8, value: 7 },
      0.85: { price: 0.85, value: 1 },
      0.86: { price: 0.86, value: 1 },
      0.9: { price: 0.9, value: 1 },
      0.92: { price: 0.92, value: 6 },
    };
    const expectedValues = [{ price: 0.8, value: 7 }, { price: 0.85, value: 1 }, { price: 0.86, value: 1 }, { price: 0.9, value: 1 }, { price: 0.92, value: 6 }];
    expect(Values(actualDict)).toEqual(expectedValues);
  });

  test.each`
    sellerAmountInLshForSell      |        marketPriceInLsk            |     estimatedReturnsInLsk      |        buyerOrders            
    ${150}                        |        ${0.78}                     |         ${120}                 |        ${bids}               
  `('Should estimate $amountInLshForSell based on $lshPaidPerLsk to $estimatedReturnsInLsk', ({ buyerOrders, sellerAmountInLshForSell, marketPriceInLsk }) => {
  console.log(`orderbook is ${buyerOrders}`);
  console.log(`amount in lsh is ${sellerAmountInLshForSell}`);
  console.log(`market price is 1 LSH = ${marketPriceInLsk} LSK`);
});

  test.each`
    buyerAmountInLskForSell       |         marketPriceInLsk        |      estimatedLshCanBeBought       |        sellerOrders       
    ${2000}                       |         ${0.77}                 |              ${2300}               |        ${asks}        
  `('Should estimate $amountInLskForSell based on $lskPaidPerLsh to $estimatedReturnsInLsh', ({ sellerOrders, buyerAmountInLskForSell, marketPriceInLsk }) => {
  console.log(`orderbook is ${sellerOrders}`);
  console.log(`amount in lsk is ${buyerAmountInLskForSell}`);
  console.log(`market price is 1 LSH = ${marketPriceInLsk} LSK`);
});
});
