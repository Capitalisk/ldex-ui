import React from 'react';
import './OrderBookEntry.css';
import { formatThousands, getLiteralAssetBalance } from './Utils';

const MIN_QTY_LABEL = '< 0.0001';

export default class OrderBookEntry extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  bgCSS() {
    if (this.props.side === 'asks') {
      const percentOfMaxSize = (this.props.size / this.props.maxSize.ask) * 100;
      return `linear-gradient(to right, #700d0d ${percentOfMaxSize}%, rgba(0,0,0,0) 1%)`;
    }
    if (this.props.side === 'bids') {
      const percentOfMaxSize = (this.props.size / this.props.maxSize.bid) * 100;
      return `linear-gradient(to right, #286113 ${percentOfMaxSize}%, rgba(0,0,0,0) 1%)`;
    }
  }

  render() {
    const orderAssetBalance = getLiteralAssetBalance(this.props.size, this.props.symbol);
    const formattedPrice = this.props.price;
    const formattedAssetBalance = orderAssetBalance === 0 ? MIN_QTY_LABEL: formatThousands(orderAssetBalance);

    return (
      <div style={{ background: this.bgCSS(), marginTop: '1px', marginBottom: '1px' }} className="orderLine">
        {formattedPrice}
        {' '}
        &nbsp;|&nbsp;
        {' '}
        {formattedAssetBalance}
        {' '}
        {(this.props.symbol || '').toUpperCase()}
      </div>
    );
  }
}
