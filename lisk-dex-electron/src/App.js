import React from "react";
import "./App.css";

import Orderbook from "./Orderbook";
import Chart from "./Chart";
import PlaceOrder from "./PlaceOrder";
import YourOrders from "./YourOrders";
import SignInModal from "./SignInModal";
import SignInState from "./SignInState";
import { getOrderbook, getClient } from "./API";
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
      configurationLoaded: false,
      configuration: {},
      myPendingOrders: {},
      orderBookData: { orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 } },
      activeAssets: [],
      // new, activeMarket string for selecting the active market out of the configuration object.
      activeMarket: '',
      enabledAssets: [],
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
        'lsh': {
          passphrase: '',
          address: ''
        },
        */
      }
    };

    this.showSignIn = this.showSignIn.bind(this);
    this.intervalRegistered = false;
    this.passphraseSubmit = this.passphraseSubmit.bind(this);
    this.loadConfiguration();
  }

  loadConfiguration = async () => {
    const configuration = await processConfiguration(defaultConfiguration);
    const marketSymbols = Object.keys(configuration.markets);
    const defaultMarketKey = marketSymbols[0];
    this.setState({
      configuration,
      activeMarket: defaultMarketKey,
      activeAssets: configuration.markets[defaultMarketKey].assets,
      enabledAssets: Object.keys(configuration.assets),
      configurationLoaded: true
    });
  }

  orderSubmit = async (order) => {
    order.status = 'pending-chain';
    let myPendingOrders = {...this.state.myPendingOrders};
    myPendingOrders[order.id] = order;
    let myOrderMap = {};
    let myPendingOrderList = Object.values(myPendingOrders);
    for (let myPendingOrder of myPendingOrderList) {
      myOrderMap[myPendingOrder.id] = myPendingOrder;
    }
    for (let myOrder of this.state.myOrders) {
      myOrderMap[myOrder.id] = myOrder;
    }
    this.setState({
      myPendingOrders,
      myOrders: Object.values(myOrderMap)
    });
  }

  refreshOrderbook = async () => {
    //console.log('refreshing orderbook');
    getOrderbook(getClient(this.state.configuration.markets[this.state.activeMarket].dexApiUrl)).then(orders => {
      const bids = [];
      const asks = [];
      let maxSize = { bid: 0, ask: 0 };
      let myOrderMap = {};
      let myPendingOrders = {...this.state.myPendingOrders};
      let myPendingOrderList = Object.values(myPendingOrders);
      for (let myPendingOrder of myPendingOrderList) {
        myOrderMap[myPendingOrder.id] = myPendingOrder;
      }
      for (let order of orders) {
        if (myPendingOrders[order.id]) {
          delete myPendingOrders[order.id];
        }
        order.status = 'ready';
        if (order.side === "bid") {
          bids.push(order);
          if (order.value > maxSize.bid) {
            maxSize.bid = order.valueRemaining;
          }
          if (order.senderId === this.state.keys[this.state.activeAssets[1]]?.address) {
            myOrderMap[order.id] = order;
          }
        } else if (order.side === "ask") {
          asks.push(order);
          if (order.size > maxSize.ask) {
            maxSize.ask = order.sizeRemaining;
          }
          if (order.senderId === this.state.keys[this.state.activeAssets[0]]?.address) {
            myOrderMap[order.id] = order;
          }
        }
      }
      //console.log('my orders');
      //console.log(myOrderMap);
      let maxBid = 0;
      let minAsk = 0;
      if (bids.length > 0) {
        maxBid = bids[bids.length - 1].price;
      }
      if (asks.length > 0) {
        minAsk = asks[0].price;
      }
      this.setState({ orderBookData: { bids, asks, maxSize }, maxBid, minAsk, myOrders: Object.values(myOrderMap), myPendingOrders });
    });
  }

  componentDidMount() {
    // Enable navigation prompt
    window.onbeforeunload = (e) => {
      //this.setDisplayLeaveWarning(true);
      //e.preventDefault();
      //return true;
    };
  }

  componentDidUpdate() {
    if (this.state.configurationLoaded && !this.intervalRegistered) {
      this.refreshOrderbook();
      setInterval(this.refreshOrderbook, this.state.configuration.refreshInterval);
      this.intervalRegistered = true;
    }
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
    if (!this.state.configurationLoaded) {
      return <div style={{ padding: '10px' }}>Loading...</div>
    }
    return <>
      <userContext.Provider value={{ ...this.state }}>
        {this.state.displaySigninModal && <SignInModal failure={this.state.signInFailure} passphraseSubmit={this.passphraseSubmit} enabledAssets={this.state.enabledAssets} close={this.closeSignInModal}></SignInModal>}
        {this.state.displayLeaveWarning && <LeaveWarning setDisplayLeaveWarning={this.setDisplayLeaveWarning}></LeaveWarning>}
        <div className="top-bar">
          <div>
            <b style={{ fontSize: '21px' }}>{this.state.configuration.appTitle}</b> &nbsp;
            <a style={{ color: '#34cfeb', fontSize: '14px' }} href={this.state.configuration.feedbackLink.url} rel="noopener noreferrer" target="_blank">{this.state.configuration.feedbackLink.text}</a>
          </div>
          <div>
            <SignInState showSignIn={this.showSignIn} keys={this.state.keys} signedIn={this.state.signedIn} signOut={this.signOut}></SignInState>
          </div>
        </div>
        <div className="container">
          <div className="sell-panel">
            <PlaceOrder side="ask" orderSubmit={this.orderSubmit}></PlaceOrder>
          </div>
          <div className="buy-panel">
            <PlaceOrder side="bid" orderSubmit={this.orderSubmit}></PlaceOrder>
          </div>
          <div className="orderbook-container">
            <div className="sell-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="asks"></Orderbook>
            </div>
            <div className="price-display">
              Price: {this.state.maxBid} {this.state.activeAssets[1].toUpperCase()}
            </div>
            <div className="buy-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="bids"></Orderbook>
            </div>
          </div>
          <div className="depth-chart">
            <Chart whole={Math.pow(10, 8)} activeAssets={this.state.activeAssets}></Chart>
          </div>
          <div className="your-orders">
            <YourOrders orders={this.state.myOrders}></YourOrders>
          </div>
          <div className="market-name-and-stats">
            <MarketList markets={this.state.configuration.markets} refreshInterval={this.state.configuration.refreshInterval}></MarketList>
          </div>
        </div>
      </userContext.Provider>
    </>;
  }
}

export default App;
