import React from 'react';
import userContext from './context';
import './App.scss';
import { formatThousands, getNumericAssetBalance } from './Utils';

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
    const approxBalance = this.props.balance && getNumericAssetBalance(this.props.balance, this.props.asset);
    const formattedBalance = `${formatThousands(approxBalance)} ${this.props.asset.toUpperCase()}`;
    return (
      <div>
        <div style={{ color: '#FFFFFF', marginBottom: '10px' }}>
          {`${this.props.asset.toUpperCase()} Wallet address:`}
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
            {approxBalance == null ? 'Loading...' : formattedBalance}
          </span>
        </div>
      </div>
    );
  }
}
