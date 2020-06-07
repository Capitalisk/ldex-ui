import React from 'react';
import './OrderBookEntry.css';
import { formatThousands } from './Utils';

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
    const formattedPrice = this.props.price.toFixed(this.props.priceDecimals);
    const size = (this.props.size / this.props.whole).toFixed(this.props.sizeDecimals);
    const formattedSize = formatThousands(size);

    return (
      <div style={{ background: this.bgCSS(), marginTop: '1px', marginBottom: '1px' }} className="orderLine">
        {formattedPrice}
        {' '}
        &nbsp;|&nbsp;
        {' '}
        {formattedSize}
        {' '}
        {(this.props.symbol || '').toUpperCase()}
      </div>
    );
  }
}
