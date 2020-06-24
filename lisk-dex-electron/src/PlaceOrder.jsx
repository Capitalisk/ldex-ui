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
