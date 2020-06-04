import React from 'react';
import './PlaceOrder.css';
import * as transactions from '@liskhq/lisk-transactions';
import axios from 'axios';
import BalanceDisplay from './BalanceDisplay';
import userContext from './context';
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
    if (estimate.status === EstimationStatus.PARTIAL_MATCH || estimate.amountYetToBeSold > 0) {
      verboseEstimation += ` + ${estimate.amountYetToBeSold.toFixed(4)} ${estimate.assetExchangedAgainst}`;
      if (this.getOrderType() === 'market') {
        verboseEstimation += ' (refund)';
      } else {
        verboseEstimation += ' (pending)';
      }
    }
    return verboseEstimation;
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
          const side = this.props.side;
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
          const price = this.state.price;
          const side = this.props.side;
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
          && <BalanceDisplay whole={10 ** 8} asset={this.context.activeAssets[1]} />}
        {this.props.side === 'ask' && this.context.keys[this.context.activeAssets[0]]
          && <BalanceDisplay whole={10 ** 8} asset={this.context.activeAssets[0]} />}
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
                <input name="price" className="order-val-input" type="text" title="Decimal number" value={this.state.price} onChange={this.handleChange} />
              </>
              )}
            Amount:
            {' '}
            <br />
            {this.state.errors.amount && <div className="error-message">{this.state.errors.amount}</div>}
            <input name="amount" className="order-val-input" type="text" title="Decimal number" value={this.state.amount} onChange={this.handleChange} />
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
