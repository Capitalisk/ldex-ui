import React from 'react';
import userContext from './context';
import './App.css';
import { formatThousands } from './Utils';

export default class BalanceDisplay extends React.Component {
  static contextType = userContext;

  interval = undefined;

  constructor(props, context) {
    super(props, context);
    this.state = {};
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <div>
        <div style={{ color: '#FFFFFF', marginBottom: '10px' }}>
          Wallet address:
          {' '}
          <span className="place-order-wallet-address" style={{ fontWeight: 'bold' }}>
            {' '}
            {this.props.walletAddress}
          </span>
        </div>
        <div style={{ color: '#FFFFFF', marginBottom: '10px' }}>
          Balance:
          {' '}
          <span className="place-order-balance" style={{ fontWeight: 'bold' }}>
            {this.props.balance == null ? 'Loading...' : `${formatThousands(this.props.balance)} ${this.props.asset.toUpperCase()}`}
          </span>
        </div>
      </div>
    );
  }
}
