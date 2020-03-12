import React from "react";
import "./App.css";

import Orderbook from "./Orderbook";
import Chart from "./Chart";
import PlaceOrder from "./PlaceOrder";
import YourOrders from "./YourOrders";
import SignInModal from "./SignInModal";
import SignInState from "./SignInState";
import { getOrderbook } from "./API";
import MarketList from "./MarketList";
import { userContext } from './context';
import * as cryptography from "@liskhq/lisk-cryptography";
import * as passphrase from "@liskhq/lisk-passphrase";
import LeaveWarning from "./LeaveWarning";
import { processConfiguration, defaultConfiguration } from "./util/Configuration";

// get what we're actually using from the passphrase library.
const { Mnemonic } = passphrase;

class App extends React.Component {
  constructor(props) {
    super(props);
    // This state has too many members. This is because we want to share data from API calls with various different components without
    // having to re-fetch the data in each.
    this.state = {
      orderBookData: { orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 } },
      currentMarket: ["lsh", "lsk"],
      enabledAssets: ["lsk", "lsh"],
      displaySigninModal: false,
      signedIn: false,
      signInFailure: false,
      displayLeaveWarning: false,
      maxBid: 0,
      minAsk: 0,
      myOrders: [],
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


    processConfiguration(defaultConfiguration);
}

refreshOrderbook = () => {
  console.log('refreshing orderbook');
  getOrderbook().then(results => {
    const bids = [];
    const asks = [];
    let maxSize = { bid: 0, ask: 0 };
    let myOrders = [];
    for (let result of results.data) {
      if (
        // filter for the turrent trading pair.
        (result.targetChain === this.state.currentMarket[0] || result.sourceChain === this.state.currentMarket[0]) &&
        (result.targetChain === this.state.currentMarket[1] || result.sourceChain === this.state.currentMarket[1])
      ) {
        if (result.side === "bid") {
          bids.push(result);
          if (result.value > maxSize.bid) {
            maxSize.bid = result.valueRemaining;
          }
          if (result.senderId === this.state.keys[this.state.currentMarket[1]]?.address) {
            myOrders.push(result);
          }
        } else if (result.side === "ask") {
          asks.push(result);
          if (result.size > maxSize.ask) {
            maxSize.ask = result.sizeRemaining;
          }
          if (result.senderId === this.state.keys[this.state.currentMarket[0]]?.address) {
            myOrders.push(result);
          }
        }
      }
    }
    console.log('my orders');
    console.log(myOrders);
    let maxBid = 0;
    let minAsk = 0;
    if (bids.length > 0) {
      maxBid = bids[bids.length - 1].price;
    }
    if (asks.length > 0) {
      minAsk = asks[0].price;
    }
    this.setState({ orderBookData: { bids, asks, maxSize }, maxBid, minAsk, myOrders });
  });
}

componentDidMount() {
  // Enable navigation prompt
  window.onbeforeunload = (e) => {
    //this.setDisplayLeaveWarning(true);
    //e.preventDefault();
    //return true;
  };

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
    this.refreshOrderbook();
  }
}

closeSignInModal = () => {
  this.setState({ displaySigninModal: false });
}

signOut = () => {
  this.setState({ signedIn: false, keys: {} });
}

setDisplayLeaveWarning = (val) => {
  this.setState({ displayLeaveWarning: val });
}


render() {
  return (
    <userContext.Provider value={{ ...this.state }}>
      {this.state.displaySigninModal && <SignInModal failure={this.state.signInFailure} passphraseSubmit={this.passphraseSubmit} enabledAssets={this.state.enabledAssets} close={this.closeSignInModal}></SignInModal>}
      {this.state.displayLeaveWarning && <LeaveWarning setDisplayLeaveWarning={this.setDisplayLeaveWarning}></LeaveWarning>}
      <div className="top-bar">
        <div>
          <b style={{ fontSize: '21px' }}>Lisk DEX</b> &nbsp;
            <a style={{ color: '#34cfeb', fontSize: '14px' }} href="https://github.com/Jaxkr/lisk-dex-ui/issues/new" rel="noopener noreferrer" target="_blank">Report bug / send feedback</a>
          {/* eslint-disable-next-line jsx-a11y/accessible-emoji*/}
          &nbsp; <span style={{ fontSize: '14px' }}>Thanks! 😊</span>
        </div>
        <div>
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
            Price: {this.state.maxBid} {this.state.currentMarket[1].toUpperCase()}
          </div>
          <div className="buy-orders">
            <Orderbook orderBookData={this.state.orderBookData} side="bids"></Orderbook>
          </div>
        </div>
        <div className="depth-chart">
          <Chart whole={Math.pow(10, 8)} currentMarket={this.state.currentMarket}></Chart>
        </div>
        <div className="your-orders">
          <YourOrders orders={this.state.myOrders}></YourOrders>
        </div>
        <div className="market-name-and-stats">
          <MarketList></MarketList>
        </div>
      </div>
    </userContext.Provider>
  );
}
}

export default App;
