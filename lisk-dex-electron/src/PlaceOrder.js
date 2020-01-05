import React from "react";
import "./PlaceOrder.css";
import BalanceDisplay from './BalanceDisplay';
import { userContext } from './context';
import { blockchainAPIURLS } from './BalanceDisplay';
import * as transactions from '@liskhq/lisk-transactions';
import axios from 'axios';


export default class PlaceOrder extends React.Component {
  static contextType = userContext;
  constructor(props) {
    super(props);
    this.state = {
      price: 0,
      amount: 0,
      marketMode: true,
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
    this.placeOrder();
  }

  switchMode = () => {
    this.setState({ marketMode: !this.state.marketMode });
  }

  dex_addresses = {
    'lsk': '11279270540263472697L',
    'clsk': '6054385933994690091L',
  }
  placeOrder = () => {
    if (this.state.marketMode) {
      let dexAddress = undefined;
      let destAddress = undefined;
      let passphrase = undefined;
      let destChain = undefined;
      let broadcastURL = undefined;
      if (this.props.side === 'buy') {
        dexAddress = this.dex_addresses[this.context.currentMarket[1]]
        destAddress = this.context.keys[this.context.currentMarket[0]].address;
        passphrase = this.context.keys[this.context.currentMarket[1]].passphrase;
        destChain = this.context.currentMarket[0];
        broadcastURL = blockchainAPIURLS[this.context.currentMarket[1]];
      } else if (this.props.side === 'sell') {
        dexAddress = this.dex_addresses[this.context.currentMarket[0]]
        destAddress = this.context.keys[this.context.currentMarket[1]].address;
        passphrase = this.context.keys[this.context.currentMarket[0]].passphrase;
        destChain = this.context.currentMarket[1];
        broadcastURL = blockchainAPIURLS[this.context.currentMarket[0]];

      }

      if (dexAddress && destAddress && passphrase && destChain && broadcastURL) {
        broadcastURL = broadcastURL[0];
        console.log(broadcastURL);
        if (this.state.amount > 0) {
          const tx = transactions.transfer({
            amount: transactions.utils.convertLSKToBeddows(this.state.amount.toString()).toString(),
            recipientId: dexAddress,
            data: `${destChain},market,${destAddress}`,
            passphrase: passphrase,
          });
          console.log(tx);
          axios.post(`${broadcastURL}/transactions`, tx).then((data) => {
            //console.log(data);
            alert(data.data.data.message);
          });
        }
      }

    } else {
      let dexAddress = undefined;
      let destAddress = undefined;
      let passphrase = undefined;
      let destChain = undefined;
      let broadcastURL = undefined;
      if (this.props.side === 'buy') {
        dexAddress = this.dex_addresses[this.context.currentMarket[1]]
        destAddress = this.context.keys[this.context.currentMarket[0]].address;
        passphrase = this.context.keys[this.context.currentMarket[1]].passphrase;
        destChain = this.context.currentMarket[0];
        broadcastURL = blockchainAPIURLS[this.context.currentMarket[1]];
      } else if (this.props.side === 'sell') {
        dexAddress = this.dex_addresses[this.context.currentMarket[0]]
        destAddress = this.context.keys[this.context.currentMarket[1]].address;
        passphrase = this.context.keys[this.context.currentMarket[0]].passphrase;
        destChain = this.context.currentMarket[1];
        broadcastURL = blockchainAPIURLS[this.context.currentMarket[0]];

      }

      if (dexAddress && destAddress && passphrase && destChain && broadcastURL) {
        broadcastURL = broadcastURL[0];
        console.log(broadcastURL);
        if (this.state.amount > 0) {
          const tx = transactions.transfer({
            amount: transactions.utils.convertLSKToBeddows(this.state.amount.toString()).toString(),
            recipientId: dexAddress,
            data: `${destChain},limit,${this.state.price},${destAddress}`,
            passphrase: passphrase,
          });
          console.log(tx);
          axios.post(`${broadcastURL}/transactions`, tx).then((data) => {
            //console.log(data);
            alert(data.data.data.message);
          });
        }
      }
    }
  }

  render() {
    let canTrade = false;
    if (this.context.currentMarket[0] in this.context.keys && this.context.currentMarket[1] in this.context.keys) {
      canTrade = true;
    }
    return (
      <div style={{ padding: "5px" }}>
        <div className="action-name">{this.props.side.toUpperCase()}</div>
        <button className="market-limit-buttons" disabled={this.state.marketMode} onClick={this.switchMode}>Market</button>
        <button className="market-limit-buttons" disabled={!this.state.marketMode} onClick={this.switchMode}>Limit</button>
        {(this.props.side === 'buy') &&
          <BalanceDisplay whole={Math.pow(10, 8)} asset={this.context.currentMarket[1]}></BalanceDisplay>
        }
        {(this.props.side === 'sell') &&
          <BalanceDisplay whole={Math.pow(10, 8)} asset={this.context.currentMarket[0]}></BalanceDisplay>
        }
        {canTrade &&
          <form onSubmit={this.handleSubmit}>
            {!this.state.marketMode &&
              <>
                Price: <br></br>
                <input name="price" className="order-val-input" type="number" value={this.state.price} onChange={this.handleChange} />
              </>
            }
            Amount: <br></br>
            <input name="amount" className="order-val-input" type="number" value={this.state.amount} onChange={this.handleChange} />
            <input className="place-order-button" type="submit" value="Submit" />
          </form>
        }
        {!canTrade &&
          <p style={{ color: 'grey' }}>
            Please sign in with your {this.context.currentMarket[0].toUpperCase()} <b>and</b> {this.context.currentMarket[1].toUpperCase()} passphrase to trade.
          </p>
        }
      </div >
    );
  }
}
