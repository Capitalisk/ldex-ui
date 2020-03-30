import React from 'react';
import './OrderbookEntry.css';

export default class OrderbookEntry extends React.Component {
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
    return (
      <div style={{ background: this.bgCSS(), marginTop: '1px', marginBottom: '1px' }} className="orderLine">
        {this.props.price}, {(this.props.size / this.props.whole).toFixed(this.props.decimals)}
      </div>
    );
  }
}
