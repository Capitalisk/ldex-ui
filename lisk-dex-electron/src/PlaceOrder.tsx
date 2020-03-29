import React from "react";
import "./PlaceOrder.css";
import BalanceDisplay from './BalanceDisplay';
import { userContext } from './context';
import * as transactions from '@liskhq/lisk-transactions';
import axios from 'axios';

export default class PlaceOrder extends React.Component<any, any> {
  static contextType = userContext;
  constructor(props, context) {
    super(props, context);
    this.state = {
      price: 0,
      amount: 0,
      marketMode: true,
      errors: {},
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    this.clearErrors();
    if (this.validateOrder()) {
      this.placeOrder();
    }
  }

  switchMode = () => {
    this.clearErrors();
    this.setState({ marketMode: !this.state.marketMode });
  }

  validateOrder = () => {
    let success = true;
    let dexOptions = this.context.configuration.markets[this.context.activeMarket].dexOptions;
    let sourceAsset = this.props.side === 'bid' ? this.context.activeAssets[1] : this.context.activeAssets[0];
    let unitValue = this.context.configuration.assets[sourceAsset].unitValue;
    let minOrderAmount = dexOptions.chains[sourceAsset].minOrderAmount / unitValue;
    let errors = {
      price: null,
      amount: null
    };
    if (!this.state.marketMode) {
      if (isNaN(this.state.price) || this.state.price === '') {
        errors.price = 'The order price must be a number';
        success = false;
      } else {
        let price = parseFloat(this.state.price);
        if (price === 0) {
          errors.price = 'The order price cannot be 0';
          success = false;
        }
      }
    }
    if (isNaN(this.state.amount) || this.state.amount === '') {
      errors.amount = 'The order amount must be a number';
      success = false;
    } else {
      let amount = parseFloat(this.state.amount);
      if (amount < minOrderAmount) {
        errors.amount = `The specified amount was less than the minimum order amount allowed by this DEX market which is ${
          minOrderAmount
        } ${sourceAsset.toUpperCase()}`;
        success = false;
      }
    }

    if (!success) {
      this.setState({
        errors
      });
    }
    return success;
  }

  clearErrors = () => {
    this.setState({
      errors: {}
    })
  }

  handleTransactionSubmit = (tx, type, sourceChain, targetChain, side, price?) => {
    let order: any = {
      id: tx.id,
      type,
      side,
      senderId: tx.senderId,
      recipientId: tx.recipientId,
      sourceChain,
      targetChain
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
    this.props.orderSubmit(order);
  }

  placeOrder = () => {
    if (this.state.marketMode) {
      let dexAddress = undefined;
      let destAddress = undefined;
      let passphrase = undefined;
      let sourceChain = undefined;
      let targetChain = undefined;
      let broadcastURL = undefined;
      if (this.props.side === 'bid') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[1]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[0]].address;
        passphrase = this.context.keys[this.context.activeAssets[1]].passphrase;
        sourceChain = this.context.activeAssets[1];
        targetChain = this.context.activeAssets[0];
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[1]].apiUrl;
      } else if (this.props.side === 'ask') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[0]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[1]].address;
        passphrase = this.context.keys[this.context.activeAssets[0]].passphrase;
        sourceChain = this.context.activeAssets[0];
        targetChain = this.context.activeAssets[1];
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[0]].apiUrl;
      }

      if (dexAddress && destAddress && passphrase && targetChain && broadcastURL) {
        console.log(broadcastURL);
        if (this.state.amount > 0) {
          const tx = transactions.transfer({
            amount: transactions.utils.convertLSKToBeddows(this.state.amount.toString()).toString(),
            recipientId: dexAddress,
            data: `${targetChain},market,${destAddress}`,
            passphrase: passphrase,
          });
          axios.post(`${broadcastURL}/transactions`, tx).then((data) => {
            //console.log(data);
            this.handleTransactionSubmit(tx, 'market', sourceChain, targetChain, this.props.side);
            alert(data.data.data.message);
          });
        }
      }
    } else {
      let dexAddress = undefined;
      let destAddress = undefined;
      let passphrase = undefined;
      let sourceChain = undefined;
      let targetChain = undefined;
      let broadcastURL = undefined;
      if (this.props.side === 'bid') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[1]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[0]].address;
        passphrase = this.context.keys[this.context.activeAssets[1]].passphrase;
        sourceChain = this.context.activeAssets[1];
        targetChain = this.context.activeAssets[0];
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[1]].apiUrl;
      } else if (this.props.side === 'ask') {
        dexAddress = this.context.configuration.markets[this.context.activeMarket].dexOptions.chains[this.context.activeAssets[0]].walletAddress;
        destAddress = this.context.keys[this.context.activeAssets[1]].address;
        passphrase = this.context.keys[this.context.activeAssets[0]].passphrase;
        sourceChain = this.context.activeAssets[0];
        targetChain = this.context.activeAssets[1];
        broadcastURL = this.context.configuration.assets[this.context.activeAssets[0]].apiUrl;
      }

      if (dexAddress && destAddress && passphrase && targetChain && broadcastURL) {
        console.log(broadcastURL);
        if (this.state.amount > 0) {
          const tx = transactions.transfer({
            amount: transactions.utils.convertLSKToBeddows(this.state.amount.toString()).toString(),
            recipientId: dexAddress,
            data: `${targetChain},limit,${this.state.price},${destAddress}`,
            passphrase: passphrase,
          });
          axios.post(`${broadcastURL}/transactions`, tx).then((data) => {
            //console.log(data);
            this.handleTransactionSubmit(tx, 'limit', sourceChain, targetChain, this.props.side, parseFloat(this.state.price));
            alert(data.data.data.message);
          });
        }
      }
    }
  }

  render() {
    let canTrade = false;
    if (this.context.activeAssets[0] in this.context.keys && this.context.activeAssets[1] in this.context.keys) {
      canTrade = true;
    }
    return (
      <div style={{ padding: "5px" }}>
        <div className="action-name">{this.props.side === 'bid' ? 'BUY' : 'SELL'}</div>
        <div style={{ marginBottom: "10px" }}>
          <button className="tab-button" disabled={this.state.marketMode} onClick={this.switchMode}>Market</button>
          <button className="tab-button" disabled={!this.state.marketMode} onClick={this.switchMode}>Limit</button>
        </div>
        {(this.props.side === 'bid') &&
          <BalanceDisplay whole={Math.pow(10, 8)} asset={this.context.activeAssets[1]}></BalanceDisplay>
        }
        {(this.props.side === 'ask') &&
          <BalanceDisplay whole={Math.pow(10, 8)} asset={this.context.activeAssets[0]}></BalanceDisplay>
        }
        {canTrade &&
          <form onSubmit={this.handleSubmit}>
            {!this.state.marketMode &&
              <>
                Price: <br></br>
                {this.state.errors.price && <div className="error-message">{this.state.errors.price}</div>}
                <input name="price" className="order-val-input" type="text" title="Decimal number" value={this.state.price} onChange={this.handleChange} />
              </>
            }
            Amount: <br></br>
            {this.state.errors.amount && <div className="error-message">{this.state.errors.amount}</div>}
            <input name="amount" className="order-val-input" type="text" title="Decimal number" value={this.state.amount} onChange={this.handleChange} />
            {this.state.marketMode &&
              <>
                {
                  this.props.side === 'bid' &&
                  <div style={{ color: 'grey', fontSize: '15px', marginBottom: '10px' }}>≈ {(this.state.amount / this.context.minAsk).toFixed(4)} {this.context.activeAssets[0].toUpperCase()}</div>
                }
                {
                  this.props.side === 'ask' &&
                  <div style={{ color: 'grey', fontSize: '15px', marginBottom: '10px' }}>≈ {(this.state.amount * this.context.maxBid).toFixed(4)} {this.context.activeAssets[1].toUpperCase()}</div>
                }
              </>
            }
            {!this.state.marketMode &&
              <>
                {
                  this.props.side === 'bid' &&
                  <div style={{ color: 'grey', fontSize: '15px', marginBottom: '10px' }}>≈ {(this.state.amount / this.state.price).toFixed(4)} {this.context.activeAssets[0].toUpperCase()}</div>
                }
                {
                  this.props.side === 'ask' &&
                  <div style={{ color: 'grey', fontSize: '15px', marginBottom: '10px' }}>≈ {(this.state.amount * this.state.price).toFixed(4)} {this.context.activeAssets[1].toUpperCase()}</div>
                }
              </>
            }
            {
              this.props.side === 'bid' && <input className="place-buy-order-button" type="submit" value="Submit" />
            }
            {
              this.props.side === 'ask' && <input className="place-sell-order-button" type="submit" value="Submit" />
            }
          </form>
        }
        {
          !canTrade &&
          <p style={{ color: 'grey' }}>
            Please sign in with your {this.context.activeAssets[0].toUpperCase()} <b>and</b> {this.context.activeAssets[1].toUpperCase()} passphrase to trade.
          </p>
        }
      </div >
    );
  }
}
