import {
  groupByKey, Keys, Values, formatThousands, estimatedReturnsForSeller, estimatedReturnsForBuyer, EstimationStatus,
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
    sellerAmountInLshForSell      |        marketPriceInLsk            |     estimatedReturnsInLsk      |        buyerOrders    |     estimatedStatus        
    ${150}                        |        ${0.78}                     |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH}
    ${160}                        |        ${0.40}                     |         ${64}                  |        ${bids}        |     ${EstimationStatus.MATCH}
    ${142}                        |        ${0.48}                     |         ${68.16}               |        ${bids}        |     ${EstimationStatus.MATCH}               
  `('Should estimate $amountInLshForSell based on $lshPaidPerLsk to $estimatedReturnsInLsk', ({
  buyerOrders, sellerAmountInLshForSell, marketPriceInLsk, estimatedReturnsInLsk, estimatedStatus,
}) => {
  const actualEstimatedReturnsInLsk = estimatedReturnsForSeller(sellerAmountInLshForSell, marketPriceInLsk, buyerOrders);
  expect(actualEstimatedReturnsInLsk.estimatedReturns).toBe(estimatedReturnsInLsk);
  expect(actualEstimatedReturnsInLsk.status).toBe(estimatedStatus);
});

  test.each`
    buyerAmountInLskForSell       |         marketPriceInLsk        |      estimatedLshCanBeBought       |        sellerOrders    |     estimatedStatus
    ${2000}                       |         ${0.77}                 |              ${3.1169}             |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}
  `('Should estimate $amountInLskForSell based on $lskPaidPerLsh to $estimatedReturnsInLsh', ({
  sellerOrders, buyerAmountInLskForSell, marketPriceInLsk, estimatedLshCanBeBought, estimatedStatus,
}) => {
  const actualLshCanBeBought = estimatedReturnsForBuyer(buyerAmountInLskForSell, marketPriceInLsk, sellerOrders);
  expect(actualLshCanBeBought.estimatedReturns).toBe(estimatedLshCanBeBought);
  expect(actualLshCanBeBought.status).toBe(estimatedStatus);
});
});
