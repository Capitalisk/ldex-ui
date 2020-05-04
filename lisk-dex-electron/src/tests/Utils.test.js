import {
  groupByKey, Keys, Values, formatThousands, estimatedReturnsForSeller, estimatedReturnsForBuyer, EstimationStatus,
} from '../Utils';

import { asks, bids } from './fixtures/orderbook';

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
    ${739.130434783}              |        ${0.23}                     |         ${170}                 |        ${bids}        |     ${EstimationStatus.MATCH} 
    ${947.368421053}              |        ${0.19}                     |         ${180}                 |        ${bids}        |     ${EstimationStatus.MATCH} 
    ${818.181818182}              |        ${0.22}                     |         ${180}                 |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH} 
    ${327.868852459}              |        ${0.61}                     |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH} 
    ${457.142857143}              |        ${0.35}                     |         ${160}                 |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH} 
    ${1495.0166113}               |        ${0.602}                    |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH} 
  `('Should estimate $sellerAmountInLshForSell based on $marketPriceInLsk to $estimatedReturnsInLsk', ({
  buyerOrders, sellerAmountInLshForSell, marketPriceInLsk, estimatedReturnsInLsk, estimatedStatus,
}) => {
  const actualEstimatedReturnsInLsk = estimatedReturnsForSeller(sellerAmountInLshForSell, marketPriceInLsk, buyerOrders);
  expect(actualEstimatedReturnsInLsk.estimatedReturns.toFixed(4)).toBe(estimatedReturnsInLsk.toFixed(4));
  expect(actualEstimatedReturnsInLsk.status).toBe(estimatedStatus);
});

  test.each`
    buyerAmountInLskForSell       |         marketPriceInLsk        |      estimatedLshCanBeBought       |        sellerOrders    |     estimatedStatus
    ${2000}                       |         ${0.77}                 |              ${3.1169}             |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}
    ${2793.6}                     |         ${0.96}                 |              ${2910}               |        ${asks}         |     ${EstimationStatus.MATCH}
    ${2821.5}                     |         ${0.95}                 |              ${2970}               |        ${asks}         |     ${EstimationStatus.MATCH}
    ${2845.25}                    |         ${0.95}                 |              ${2995}               |        ${asks}         |     ${EstimationStatus.MATCH}
    ${63.36}                      |         ${0.88}                 |              ${72}                 |        ${asks}         |     ${EstimationStatus.MATCH}
    ${79.2}                       |         ${0.88}                 |              ${90}                 |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}
    ${76.244}                     |         ${0.76}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}
    ${78}                         |         ${0.56}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}
    ${974.86}                     |         ${0.20}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}
  `('Should estimate $buyerAmountInLskForSell based on $marketPriceInLsk to $estimatedLshCanBeBought', ({
  sellerOrders, buyerAmountInLskForSell, marketPriceInLsk, estimatedLshCanBeBought, estimatedStatus,
}) => {
  const actualLshCanBeBought = estimatedReturnsForBuyer(buyerAmountInLskForSell, marketPriceInLsk, sellerOrders);
  expect(actualLshCanBeBought.estimatedReturns).toBe(estimatedLshCanBeBought);
  expect(actualLshCanBeBought.status).toBe(estimatedStatus);
});
});
