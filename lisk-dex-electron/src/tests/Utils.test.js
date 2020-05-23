import {
  formatThousands, EstimationStatus, estimateBestReturnsForSeller, estimatedBestReturnsForBuyer, getCleanOrderBook,
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
    ${2034.65}                |           ${'2,034.65'}
    ${2340.65}                |           ${'2,340.65'}
    ${1342340.65}             |           ${'1,342,340.65'}
    ${-1342340.65}            |           ${'-1,342,340.65'}
    ${-1040.1}                |           ${'-1,040.1'}
  `('Should format $largeNumber to $expectedFormattedLargeNumber', ({ largeNumber, expectedFormattedLargeNumber }) => {
  const actualFormattedLargeNumber = formatThousands(largeNumber, ',');
  expect(actualFormattedLargeNumber).toEqual(expectedFormattedLargeNumber);
});

  test.each`
      sellerAmountInLshForSell      |        marketPriceInLsk            |     estimatedReturnsInLsk      |        buyerOrders    |     estimatedStatus                      |     amountYetToBeSold
      ${150}                        |        ${0.78}                     |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH}         |        ${150}
      ${160}                        |        ${0.40}                     |         ${94.5792}             |        ${bids}        |     ${EstimationStatus.MATCH}            |        ${0}
      ${142}                        |        ${0.48}                     |         ${85.2}                |        ${bids}        |     ${EstimationStatus.MATCH}            |        ${0}
      ${739.130434783}              |        ${0.23}                     |         ${178.2073}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}    |        ${340.25151811633344}
      ${947.368421053}              |        ${0.19}                     |         ${188.2073}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}    |        ${498.48950438633346}
      ${818.181818182}              |        ${0.22}                     |         ${178.2073}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}    |        ${419.3029015153333}
      ${327.868852459}              |        ${0.61}                     |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH}         |        ${327.868852459}
      ${457.142857143}              |        ${0.35}                     |         ${154.4369}            |        ${bids}        |     ${EstimationStatus.PARTIAL_MATCH}    |        ${147.49860714300002}
      ${1495.0166113}               |        ${0.602}                    |         ${0}                   |        ${bids}        |     ${EstimationStatus.NO_MATCH}         |        ${1495.0166113}
  `('Should estimate best returns for {$sellerAmountInLshForSell} LSH based on {$marketPriceInLsk} LSK/LSH', ({
  buyerOrders, sellerAmountInLshForSell, marketPriceInLsk, estimatedReturnsInLsk, estimatedStatus, amountYetToBeSold,
}) => {
  const actualEstimatedReturnsInLsk = estimateBestReturnsForSeller(sellerAmountInLshForSell, marketPriceInLsk, buyerOrders);
  expect(actualEstimatedReturnsInLsk.estimatedReturns.toFixed(4)).toBe(estimatedReturnsInLsk.toFixed(4));
  expect(actualEstimatedReturnsInLsk.status).toBe(estimatedStatus);
  expect(actualEstimatedReturnsInLsk.amountYetToBeSold).toBe(amountYetToBeSold);
});

  test.each`
    buyerAmountInLskForSell       |         marketPriceInLsk        |      estimatedLshCanBeBought       |        sellerOrders    |     estimatedStatus                      |     amountYetToBeSold
    ${2000}                       |         ${0.77}                 |              ${3.1169}             |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}    |        ${1997.599987}
    ${2793.6}                     |         ${0.96}                 |              ${2997.1761}          |        ${asks}         |     ${EstimationStatus.MATCH}            |        ${0}
    ${2821.5}                     |         ${0.95}                 |              ${2999.7445}          |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}    |        ${25.46005500000001}
    ${2845.25}                    |         ${0.95}                 |              ${2999.7445}          |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}    |        ${49.21005500000001}
    ${63.36}                      |         ${0.88}                 |              ${74.1392}            |        ${asks}         |     ${EstimationStatus.MATCH}            |        ${0}
    ${79.2}                       |         ${0.88}                 |              ${86.3001}            |        ${asks}         |     ${EstimationStatus.PARTIAL_MATCH}    |        ${5.260015000000003}
    ${76.244}                     |         ${0.76}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}         |        ${76.244}
    ${78}                         |         ${0.56}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}         |        ${78}
    ${974.86}                     |         ${0.20}                 |              ${0}                  |        ${asks}         |     ${EstimationStatus.NO_MATCH}         |        ${974.86}
  `('Should estimate best returns for {$buyerAmountInLskForSell} LSK based on {$marketPriceInLsk} LSK/LSH', ({
  sellerOrders, buyerAmountInLskForSell, marketPriceInLsk, estimatedLshCanBeBought, estimatedStatus, amountYetToBeSold,
}) => {
  const actualLshCanBeBought = estimatedBestReturnsForBuyer(buyerAmountInLskForSell, marketPriceInLsk, sellerOrders);
  expect(actualLshCanBeBought.estimatedReturns.toFixed(4)).toBe(estimatedLshCanBeBought.toFixed(4));
  expect(actualLshCanBeBought.status).toBe(estimatedStatus);
  expect(actualLshCanBeBought.amountYetToBeSold).toBe(amountYetToBeSold);
});

  it('Should Return UI Orderbook from context orderbook', () => {
    const expectedOrderBook = {
      asks: [
        { price: 0.8000, amount: 0.5000 },
        { price: 0.8700, amount: 66.7126 },
        { price: 0.9500, amount: 2000.0000 },
      ],
      bids: [
        { price: 0.6000, amount: 71.9376 },
        { price: 0.4000, amount: 62.6993 },
      ],
    };
    const actualProcessedOrderBook = getCleanOrderBook(context.orderBookData);
    expect(actualProcessedOrderBook).toStrictEqual(expectedOrderBook);
  });
});
