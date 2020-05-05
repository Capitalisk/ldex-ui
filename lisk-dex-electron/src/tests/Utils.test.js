import {
  groupByKey, Keys, Values, formatThousands, EstimationStatus, estimateBestReturnsForSeller, estimatedBestReturnsForBuyer, getUIOrderBookFrom,
} from '../Utils';

import { asks, bids } from './fixtures/orderbook/orderbook';
import context from './fixtures/context/context';

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
      ${160}                        |        ${0.40}                     |         ${94.5792}             |        ${bids}        |     ${EstimationStatus.MATCH}
      ${142}                        |        ${0.48}                     |         ${85.2}                |        ${bids}        |     ${EstimationStatus.MATCH}
      ${739.130434783}              |        ${0.23}                     |         ${178.2073}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}
      ${947.368421053}              |        ${0.19}                     |         ${188.2073}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}
      ${818.181818182}              |        ${0.22}                     |         ${178.2073}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}
      ${327.868852459}              |        ${0.61}                     |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH}
      ${457.142857143}              |        ${0.35}                     |         ${154.4369}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}
      ${1495.0166113}               |        ${0.602}                    |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH}
    `('Should estimate best returns for {$sellerAmountInLshForSell} LSH based on {$marketPriceInLsk} LSK/LSH', ({
  buyerOrders, sellerAmountInLshForSell, marketPriceInLsk, estimatedReturnsInLsk, estimatedStatus,
}) => {
  const actualEstimatedReturnsInLsk = estimateBestReturnsForSeller(sellerAmountInLshForSell, marketPriceInLsk, buyerOrders);
  expect(actualEstimatedReturnsInLsk.estimatedReturns.toFixed(4)).toBe(estimatedReturnsInLsk.toFixed(4));
  expect(actualEstimatedReturnsInLsk.status).toBe(estimatedStatus);
});

  test.each`
    buyerAmountInLskForSell       |         marketPriceInLsk        |      estimatedLshCanBeBought       |        sellerOrders    |     estimatedStatus
    ${2000}                       |         ${0.77}                 |              ${3.1169}             |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}
    ${2793.6}                     |         ${0.96}                 |              ${2996.5777}          |        ${asks}         |     ${EstimationStatus.MATCH}
    ${2821.5}                     |         ${0.95}                 |              ${2999.7445}          |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}
    ${2845.25}                    |         ${0.95}                 |              ${2999.7445}          |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}
    ${63.36}                      |         ${0.88}                 |              ${72.9715}            |        ${asks}         |     ${EstimationStatus.MATCH}
    ${79.2}                       |         ${0.88}                 |              ${86.3001}            |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}
    ${76.244}                     |         ${0.76}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}
    ${78}                         |         ${0.56}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}
    ${974.86}                     |         ${0.20}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}
  `('Should estimate best returns for {$buyerAmountInLskForSell} LSK based on {$marketPriceInLsk} LSK/LSH', ({
  sellerOrders, buyerAmountInLskForSell, marketPriceInLsk, estimatedLshCanBeBought, estimatedStatus,
}) => {
  const actualLshCanBeBought = estimatedBestReturnsForBuyer(buyerAmountInLskForSell, marketPriceInLsk, sellerOrders);
  expect(actualLshCanBeBought.estimatedReturns.toFixed(4)).toBe(estimatedLshCanBeBought.toFixed(4));
  expect(actualLshCanBeBought.status).toBe(estimatedStatus);
});

  it('Should Return UI Orderbook from context orderbook', () => {
    const expectedOrderBook = {
      asks: [
        { price: 0.9500, amount: 2000.0000 },
        { price: 0.8700, amount: 66.7126 },
        { price: 0.8000, amount: 0.5000 },
      ],
      bids: [
        { price: 0.6000, amount: 71.9376 },
        { price: 0.4000, amount: 62.6993 },
      ],
    };
    const actualProcessedOrderBook = getUIOrderBookFrom(context.orderBookData);
    expect(actualProcessedOrderBook).toStrictEqual(expectedOrderBook);
  });
});
