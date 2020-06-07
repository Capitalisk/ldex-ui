import React from 'react';
import OrderBookEntry from './OrderBookEntry';
import './OrderBook.css';
import { Values } from './Utils';

export default class OrderBook extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    let assets = this.props.assets || [];
    const quoteSymbol = assets[0];
    const baseSymbol = assets[1];
    if (this.props.side === 'asks') {
      const groupedAskOrders = Values(this.props.orderBookData.asks, 'price', 'sizeRemaining');
      const orders = groupedAskOrders.map((ask) => (
        <OrderBookEntry
          whole={10 ** 8} // 10 ** 8 beddow in one LSK
          key={ask.price}
          size={ask.sizeRemaining}
          price={ask.price}
          maxSize={this.props.orderBookData.maxSize}
          side={this.props.side}
          sizeDecimals={4}
          priceDecimals={this.props.priceDecimalPrecision}
          symbol={quoteSymbol}
        />
      ));
      return <div className="askOrderList">{orders}</div>;
    }
    if (this.props.side === 'bids') {
      const groupedBidsOrders = Values(this.props.orderBookData.bids, 'price', 'valueRemaining');
      const orders = groupedBidsOrders.map((bid) => (
        <OrderBookEntry
          whole={10 ** 8} // 10 ** 8 beddow in one LSK
          key={bid.price}
          size={bid.valueRemaining}
          price={bid.price}
          maxSize={this.props.orderBookData.maxSize}
          side={this.props.side}
          sizeDecimals={4}
          priceDecimals={this.props.priceDecimalPrecision}
          symbol={baseSymbol}
        />
      ));
      return <div className="bidOrderList">{orders}</div>;
    }
    return <></>;
  }
}
