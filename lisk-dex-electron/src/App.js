import React from "react";
import Orderbook from "./Orderbook";
import Chart from "./Chart";
import PlaceOrder from "./PlaceOrder";
import YourOrders from "./YourOrders";
import SignInModal from "./SignInModal";
import SignInState from "./SignInState";
import { getOrderbook } from "./API";
import "./App.css";
import MarketList from "./MarketList";
import { userContext } from './context';

import * as cryptography from "@liskhq/lisk-cryptography";
import * as passphrase from "@liskhq/lisk-passphrase";
const { Mnemonic } = passphrase;



class App extends React.Component {
  constructor(props) {
    super(props);
    // This state has too many members. This is because we want to share data from API calls with various different components without
    // having to re-fetch the data in each.
    this.state = {
      orderBookData: { orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 } },
      currentMarket: ["clsk", "lsk"],
      enabledAssets: ["lsk", "clsk"],
      displaySigninModal: false,
      signedIn: false,
      signInFailure: false,
      currentPrice: 0,
      // to prevent cross-chain replay attacks, the user can specify a key for each chain that they are trading on.
      // the address will be used when the asset is being used as the destination chain.
      keys: {
        /*
        'lsk': {
          passphrase: '',
          address: ''
        },
        */
      }
    };


    this.showSignIn = this.showSignIn.bind(this);
    this.passphraseSubmit = this.passphraseSubmit.bind(this);
  }

  refreshOrderbook = () => {
    console.log('refreshing orderbook');
    getOrderbook().then(results => {
      const bids = [];
      const asks = [];
      let maxSize = { bid: 0, ask: 0 };
      for (let result of results.data) {
        if (
          // filter for the turrent trading pair.
          (result.targetChain === this.state.currentMarket[0] || result.sourceChain === this.state.currentMarket[0]) &&
          (result.targetChain === this.state.currentMarket[1] || result.sourceChain === this.state.currentMarket[1])
        ) {
          if (result.side === "bid") {
            bids.push(result);
            if (result.size > maxSize.bid) {
              maxSize.bid = result.sizeRemaining;
            }
          } else if (result.side === "ask") {
            asks.push(result);
            if (result.size > maxSize.ask) {
              maxSize.ask = result.sizeRemaining;
            }
          }
        }
      }
      let currentPrice = 0;
      if (bids.length > 0) {
        currentPrice = bids[bids.length - 1].price;
      }
      this.setState({ orderBookData: { bids, asks, maxSize }, currentPrice});
    });
  }

  componentDidMount() {
    this.refreshOrderbook();
    setInterval(this.refreshOrderbook, 10000);
  }

  showSignIn() {
    this.setState({ displaySigninModal: true, signInFailure: false, });
  }

  passphraseSubmit(payload) {
    const keys = {};
    let atLeastOneKey = false;
    for (const asset in payload) {
      console.log(payload);
      if (payload[asset] !== undefined) {
        atLeastOneKey = true;
        const passphrase = payload[asset].trim();
        if (!Mnemonic.validateMnemonic(passphrase, Mnemonic.wordlists.english)) {
          this.setState({ signInFailure: true });
          return;
        } else {
          const address = (cryptography.getAddressAndPublicKeyFromPassphrase(passphrase)).address;
          keys[asset] = { address, passphrase };
        }
      }
    }
    if (atLeastOneKey) {
      this.setState({ keys, signedIn: true, displaySigninModal: false });
    }
  }

  closeSignInModal = () => {
    this.setState({ displaySigninModal: false });
  }

  signOut = () => {
    this.setState({ signedIn: false, keys: {} });
  }


  render() {
    return (
      <userContext.Provider value={{ ...this.state }}>
        {this.state.displaySigninModal && <SignInModal failure={this.state.signInFailure} passphraseSubmit={this.passphraseSubmit} enabledAssets={this.state.enabledAssets} close={this.closeSignInModal}></SignInModal>}
        <div className="top-bar">
          <div className="top-bar-right">
            <b>Lisk DEX</b>
          </div>
          <div className="top-bar-left">
            <SignInState showSignIn={this.showSignIn} keys={this.state.keys} signedIn={this.state.signedIn} signOut={this.signOut}></SignInState>
          </div>
        </div>
        <div className="container">
          <div className="buy-panel">
            <PlaceOrder side="buy"></PlaceOrder>
          </div>
          <div className="sell-panel">
            <PlaceOrder side="sell"></PlaceOrder>
          </div>
          <div className="orderbook-container">
            <div className="sell-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="asks"></Orderbook>
            </div>
            <div className="price-display">
              Price: {this.state.currentPrice} {this.state.currentMarket[1].toUpperCase()}
            </div>
            <div className="buy-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="bids"></Orderbook>
            </div>
          </div>
          <div className="depth-chart">
            <Chart whole={Math.pow(10, 8)} currentMarket={this.state.currentMarket}></Chart>
          </div>
          <div className="your-orders">
            <YourOrders></YourOrders>
          </div>
          <div className="market-name-and-stats">
            <MarketList></MarketList>
            <small>
              API Status: <span style={{ color: "green" }}>Connected</span>. <br></br>Data refreshed every 10 seconds.
            </small>
          </div>
        </div>
      </userContext.Provider>
    );
  }
}

export default App;
