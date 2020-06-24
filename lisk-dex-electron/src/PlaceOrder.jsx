import React from 'react';
import './PlaceOrder.css';
import * as transactions from '@liskhq/lisk-transactions';
import axios from 'axios';
import BalanceDisplay from './BalanceDisplay';
import userContext from './context';
import Tooltip from './Tooltip';
import {
  getCleanOrderBook, estimateBestReturnsForSeller, estimatedBestReturnsForBuyer, EstimationStatus,
} from './Utils';

export default class PlaceOrder extends React.Component {
  static contextType = userContext;

  constructor(props, context) {
    super(props, context);
    this.state = {
      price: 0,
      amount: 0,
      marketMode: true,
      isSubmitting: false,
      errors: {},
    };
  }

  handleChange = (event) => {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value,
    });
  }

  showEstimateInfo = (statuses) => {
    if (this.props.showEstimateInfo) {
      const messageParts = ['This is an estimate of how many tokens you can expect to receive.'];
      if (statuses.includes('pending')) {
        messageParts.push(
          'A (pending) status means that some of the order cannot be filled immediately and will stay pending inside the order book until it is matched with future counteroffers.',
        );
      }
      if (statuses.includes('refund')) {
        messageParts.push(
          'A (refund) status means that a portion of the order cannot be filled immediately and some tokens will be refunded back to your wallet - It is recommended that you reduce the size of your order to avoid this situation.',
        );
      }
      // this.props.showEstimateInfo(messageParts.join(' '));
      return messageParts.join(' ');
    }
    return '';
  }

  getOrderType() {
    return this.state.marketMode ? 'market' : 'limit';
  }

  getEstimatedReturns() {
    const orderBook = getCleanOrderBook(this.context.orderBookData);
    const amount = parseFloat(this.state.amount) || 0;

    const { asks } = orderBook;
    const { bids } = orderBook;
    let estimatedReturns = { };
    let assetExchanged = '';
    let assetExchangedAgainst = '';
    const { price } = this.state;
    const isMarketOrder = this.getOrderType() === 'market';
    if (this.props.side === 'ask') {
      estimatedReturns = estimateBestReturnsForSeller(amount, price, bids, isMarketOrder);
      assetExchanged = this.context.activeAssets[1].toUpperCase();
      assetExchangedAgainst = this.context.activeAssets[0].toUpperCase();
    } else {
      estimatedReturns = estimatedBestReturnsForBuyer(amount, price, asks, isMarketOrder);
      assetExchanged = this.context.activeAssets[0].toUpperCase();
      assetExchangedAgainst = this.context.activeAssets[1].toUpperCase();
    }
    return { ...estimatedReturns, assetExchanged, assetExchangedAgainst };
  }

  getEstimatedReturnsBreakDown(estimate) {
    let verboseEstimation = `${estimate.estimatedReturns.toFixed(4)} ${estimate.assetExchanged}`;
    const statuses = [];
    if (estimate.status === EstimationStatus.PARTIAL_MATCH || estimate.amountYetToBeSold > 0) {
      verboseEstimation += ` + ${estimate.amountYetToBeSold.toFixed(4)} ${estimate.assetExchangedAgainst}`;
      if (this.getOrderType() === 'market') {
        verboseEstimation += ' (refund)';
        statuses.push('refund');
      } else {
        verboseEstimation += ' (pending)';
        statuses.push('pending');
      }
    }
    return (
      <span>
        <span>{verboseEstimation}</span>
        &nbsp;&nbsp;
        <Tooltip message={this.showEstimateInfo(statuses)} position="right">
          <img alt="info" width="18px" src="data:image/png;base64,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"/>
        </Tooltip>
      </span>
    );
  }

  handleSubmit = (event) => {
    event.preventDefault();
    this.clearErrors();
    if (this.validateOrder()) {
      const confirmed = window.confirm(`Are you sure you want to place this ${this.getOrderType()} order?`);
      if (confirmed) {
        this.placeOrder();
        this.clearValues();
      }
    }
  }

  switchMode = () => {
    this.clearErrors();
    this.setState((prevState) => ({ marketMode: !prevState.marketMode }));
  }

  validateOrder() {
    let success = true;
    const { dexOptions } = this.context.configuration.markets[this.context.activeMarket];
    const { priceDecimalPrecision } = dexOptions;
    const sourceAsset = this.props.side === 'bid' ? this.context.activeAssets[1] : this.context.activeAssets[0];
    const { unitValue } = this.context.configuration.assets[sourceAsset];
    const minOrderAmount = dexOptions.chains[sourceAsset].minOrderAmount / unitValue;
    const errors = {
      price: null,
      amount: null,
    };
    if (!this.state.marketMode) {
      if (Number.isNaN(this.state.price) || this.state.price === '') {
        errors.price = 'The order price must be a number.';
        success = false;
      } else {
        const price = parseFloat(this.state.price);
        if (price === 0) {
          errors.price = 'The order price cannot be 0.';
          success = false;
        } else if (priceDecimalPrecision != null && (this.state.price.toString().split('.')[1] || '').length > priceDecimalPrecision) {
          errors.price = `The order price for this DEX market cannot have more than ${priceDecimalPrecision} decimal place${priceDecimalPrecision === 1 ? '' : 's'}.`;
          success = false;
        }
      }
    }
    if (Number.isNaN(this.state.amount) || this.state.amount === '') {
      errors.amount = 'The order amount must be a number.';
      success = false;
    } else {
      const amount = parseFloat(this.state.amount);
      if (amount < minOrderAmount) {
        errors.amount = `The specified amount was less than the minimum order amount allowed by this DEX market which is ${
          minOrderAmount
        } ${sourceAsset.toUpperCase()}.`;
        success = false;
      }
    }

    if (!success) {
      this.setState({
        errors,
      });
    }
    return success;
  }

  clearErrors() {
    this.setState({
      errors: {},
    });
  }

  // todo : need to check at what other places this can be used
  clearValues() {
    this.setState({
      price: 0,
      amount: 0,
    });
  }


  generateOrder(tx, type, sourceChain, targetChain, side, price) {
    const order = {
      id: tx.id,
      type,
      side,
      senderId: tx.senderId,
      recipientId: tx.recipientId,
      sourceChain,
      targetChain,
    };
    if (side === 'bid') {
      order.value = tx.amount;
      order.valueRemaining = order.value;
    } else {
      order.size = tx.amount;
      order.sizeRemaining = order.size;
    }
    if (price != null) {
      order.price = price;
    }
    return order;
  }

  handleTransactionSubmit(tx, type, sourceChain, targetChain, side, price) {
    const order = this.generateOrder(tx, type, sourceChain, targetChain, side, price);
    this.props.orderSubmit(order);
  }

  placeOrder() {
    if (this.state.marketMode) {
      let dexAddress;
      let destAddress;
      let passphrase;
      let sourceChain;
      let targetChain;
      let broadcastURL;
      if (this.props.side === 'bid') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[1]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[0]].address;
        passphrase = this.context.keys[this.context.activeAssets[1]].passphrase;
        [targetChain, sourceChain] = this.context.activeAssets;
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[1]].apiUrl;
      } else if (this.props.side === 'ask') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[0]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[1]].address;
        passphrase = this.context.keys[this.context.activeAssets[0]].passphrase;
        [sourceChain, targetChain] = this.context.activeAssets;
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[0]].apiUrl;
      }

      if (dexAddress && destAddress && passphrase && targetChain && broadcastURL) {
        if (this.state.amount > 0) {
          const { side } = this.props;
          const tx = transactions.transfer({
            amount: transactions.utils.convertLSKToBeddows(this.state.amount.toString()).toString(),
            recipientId: dexAddress,
            data: `${targetChain},market,${destAddress}`,
            passphrase,
          });
          (async () => {
            this.setState({ isSubmitting: true });
            try {
              await axios.post(`${broadcastURL}/transactions`, tx);
            } catch (err) {
              const error = new Error(`Failed to post market order because of error: ${err.message}`);
              error.response = err.response;
              error.order = this.generateOrder(tx, 'market', sourceChain, targetChain, side);
              this.props.orderSubmitError && this.props.orderSubmitError(error);
              this.setState({ isSubmitting: false });
              return;
            }
            this.setState({ isSubmitting: false });
            this.handleTransactionSubmit(tx, 'market', sourceChain, targetChain, side);
          })();
        }
      }
    } else {
      let dexAddress;
      let destAddress;
      let passphrase;
      let sourceChain;
      let targetChain;
      let broadcastURL;
      if (this.props.side === 'bid') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[1]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[0]].address;
        passphrase = this.context.keys[this.context.activeAssets[1]].passphrase;
        [targetChain, sourceChain] = this.context.activeAssets;
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[1]].apiUrl;
      } else if (this.props.side === 'ask') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[0]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[1]].address;
        passphrase = this.context.keys[this.context.activeAssets[0]].passphrase;
        [sourceChain, targetChain] = this.context.activeAssets;
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[0]].apiUrl;
      }

      if (dexAddress && destAddress && passphrase && targetChain && broadcastURL) {
        if (this.state.amount > 0) {
          const { price } = this.state;
          const { side } = this.props;
          const tx = transactions.transfer({
            amount: transactions.utils.convertLSKToBeddows(this.state.amount.toString()).toString(),
            recipientId: dexAddress,
            data: `${targetChain},limit,${price},${destAddress}`,
            passphrase,
          });
          (async () => {
            this.setState({ isSubmitting: true });
            try {
              await axios.post(`${broadcastURL}/transactions`, tx);
            } catch (err) {
              const error = new Error(`Failed to post limit order because of error: ${err.message}`);
              error.response = err.response;
              error.order = this.generateOrder(tx, 'limit', sourceChain, targetChain, side, parseFloat(price));
              this.props.orderSubmitError && this.props.orderSubmitError(error);
              this.setState({ isSubmitting: false });
              return;
            }
            this.setState({ isSubmitting: false });
            this.handleTransactionSubmit(tx, 'limit', sourceChain, targetChain, side, parseFloat(price));
          })();
        }
      }
    }
  }

  render() {
    const canTrade = this.context.keys[this.context.activeAssets[0]] && this.context.keys[this.context.activeAssets[1]];
    const estimate = this.getEstimatedReturns();
    return (
      <div style={{ padding: '5px' }}>
        <div className="action-name">{this.props.side === 'bid' ? 'BUY' : 'SELL'}</div>
        <div className="market-limit-tabs" style={{ marginBottom: '10px' }}>
          <button type="button" className="tab-button" disabled={this.state.marketMode} onClick={this.switchMode}>Market</button>
          <button type="button" className="tab-button" disabled={!this.state.marketMode} onClick={this.switchMode}>Limit</button>
        </div>
        {this.props.side === 'bid' && this.context.keys[this.context.activeAssets[1]]
          && <BalanceDisplay whole={10 ** 8} asset={this.context.activeAssets[1]} balance={this.props.assetBalance} />}
        {this.props.side === 'ask' && this.context.keys[this.context.activeAssets[0]]
          && <BalanceDisplay whole={10 ** 8} asset={this.context.activeAssets[0]} balance={this.props.assetBalance} />}
        {canTrade
          && (
          <form onSubmit={this.handleSubmit}>
            {!this.state.marketMode
              && (
              <>
                Price:
                {' '}
                <br />
                {this.state.errors.price && <div className="error-message">{this.state.errors.price}</div>}
                <div className="price-container">
                  <input name="price" className="order-val-input" type="text" title="Decimal number" value={this.state.price} onChange={this.handleChange} />
                  <div className="input-chain-symbol">{(this.context.activeAssets[1] || '').toUpperCase()}</div>
                </div>
              </>
              )}
            Amount:
            {' '}
            <br />
            {this.state.errors.amount && <div className="error-message">{this.state.errors.amount}</div>}
            <div className="amount-container">
              <input name="amount" className="order-val-input" type="text" title="Decimal number" value={this.state.amount} onChange={this.handleChange} />
              <div className="input-chain-symbol">{(this.props.side === 'ask' ? this.context.activeAssets[0] : this.context.activeAssets[1] || '').toUpperCase()}</div>
            </div>
            {
               (
                 <div style={{ color: 'grey', fontSize: '15px', marginBottom: '10px' }}>
                   ≈
                   {this.getEstimatedReturnsBreakDown(estimate)}
                 </div>
               )
            }
            {this.props.side === 'bid' && <input className="place-buy-order-button" type="submit" value={this.state.isSubmitting ? '' : 'Submit'} disabled={this.state.isSubmitting} />}
            {this.props.side === 'ask' && <input className="place-sell-order-button" type="submit" value={this.state.isSubmitting ? '' : 'Submit'} disabled={this.state.isSubmitting} />}
            {this.state.isSubmitting && (
            <div
              className="lds-dual-ring"
              style={{
                display: 'inline-block', position: 'absolute', left: '48px', marginTop: '2px', marginLeft: '5px',
              }}
            />
            )}
          </form>
          )}
        {
          !canTrade
          && (
          <p style={{ color: 'grey' }}>
            Please sign in with your
            {' '}
            {this.context.activeAssets[0].toUpperCase()}
            {' '}
            <b>and</b>
            {' '}
            {this.context.activeAssets[1].toUpperCase()}
            {' '}
            passphrase to trade.
          </p>
          )
        }
      </div>
    );
  }
}
