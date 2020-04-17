import React from 'react';
import './App.css';

import Orderbook from './Orderbook';
import PriceHistoryChart from './PriceHistoryChart';
import PlaceOrder from './PlaceOrder';
import YourOrders from './YourOrders';
import SignInModal from './SignInModal';
import SignInState from './SignInState';
import {
  getOrderbook,
  getAsksFromWallet,
  getBidsFromWallet,
  getPendingTransfers,
  getProcessedHeights,
  getClient
} from './API';
import MarketList from './MarketList';
import Notification from './Notification';
import { userContext } from './context';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as passphrase from '@liskhq/lisk-passphrase';
import LeaveWarning from './LeaveWarning';
import axios from 'axios';
import { processConfiguration, defaultConfiguration } from './config/Configuration';

// get what we're actually using from the passphrase library.
const { Mnemonic } = passphrase;

const NOTIFICATIONS_MAX_QUEUE_LENGTH = 3;
const DEFAULT_API_MAX_PAGE_SIZE = 100;
const DEFAULT_PRICE_DECIMAL_PRECISION = 4;

class App extends React.Component {
  constructor(props) {
    super(props);
    // This state has too many members. This is because we want to share data from API calls with various different components without
    // having to re-fetch the data in each.
    this.state = {
      configurationLoaded: false,
      configuration: {},
      orderBookData: { orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 } },
      activeAssets: [],
      // new, activeMarket string for selecting the active market out of the configuration object.
      activeMarket: '',
      enabledAssets: [],
      priceHistory: [],
      displaySigninModal: false,
      signedIn: false,
      signInFailure: false,
      displayLeaveWarning: false,
      maxBid: 0,
      minAsk: 0,
      yourOrders: [],
      // to prevent cross-chain replay attacks, the user can specify a key for each chain that they are trading on.
      // the address will be used when the asset is being used as the destination chain.
      notifications: [],
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
      },
      windowWidth: 0,
      windowHeight: 0
    };

    this.notificationId = 0;
    this.showSignIn = this.showSignIn.bind(this);
    this.intervalRegistered = false;
    this.passphraseSubmit = this.passphraseSubmit.bind(this);
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
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

  getTakerOrderIdFromTransaction(transaction) {
    // TODO: Match order id based on position in protocol argument list instead of regex.
    const takerOrderIdRegex = /,[0-9]+:/g;

    let transactionData = transaction.asset.data || '';
    let matches = transactionData.match(takerOrderIdRegex);
    if (matches) {
      let match = matches[0];
      return match.slice(1, match.length - 1);
    }
    return null;
  }

  isTakerTransaction(transaction) {
    const takerRegex = /^t1,/g;

    let transactionData = transaction.asset.data || '';
    return takerRegex.test(transactionData);
  }

  isMakerTransaction(transaction) {
    const makerRegex = /^t2,/g;

    let transactionData = transaction.asset.data || '';
    return makerRegex.test(transactionData);
  }

  refreshPriceHistory = async () => {
    try {
      await this._refreshPriceHistory();
    } catch (error) {
      console.error(error);
      this.notify('Failed to refresh the market price history - Check your connection.', true);
    }
  }

  _refreshPriceHistory = async () => {
    let [quoteChainTxns, baseChainTxns] = await Promise.all(
      this.state.activeAssets.map(async (assetSymbol) => {
        let asset = this.state.configuration.assets[assetSymbol];
        let client = axios.create();
        let targetEndpoint = asset.apiUrl;
        let dexOptions =  this.state.configuration.markets[this.state.activeMarket].dexOptions;
        let dexWalletAddress = dexOptions.chains[assetSymbol].walletAddress
        let result = await client.get(
          `${targetEndpoint}/transactions?senderId=${
            dexWalletAddress
          }&limit=${
            asset.apiMaxPageSize || DEFAULT_API_MAX_PAGE_SIZE
          }&sort=timestamp:desc`
        );
        return result.data.data;
      })
    );

    let quoteChainMakers = {};
    let quoteChainTakers = {};

    for (let txn of quoteChainTxns) {
      let isMaker = this.isMakerTransaction(txn);
      let isTaker = this.isTakerTransaction(txn);
      let takerOrderId = this.getTakerOrderIdFromTransaction(txn);
      if (isMaker) {
        if (!quoteChainMakers[takerOrderId]) {
          quoteChainMakers[takerOrderId] = [];
        }
        quoteChainMakers[takerOrderId].push(txn);
      } else if (isTaker) {
        quoteChainTakers[takerOrderId] = [txn];
      }
    }

    let txnPairsMap = {};

    for (let txn of baseChainTxns) {
      let isMaker = this.isMakerTransaction(txn);
      let isTaker = this.isTakerTransaction(txn);

      if (!isMaker && !isTaker) {
        continue;
      }

      let counterpartyTakerId = this.getTakerOrderIdFromTransaction(txn);
      let counterpartyTxns = quoteChainMakers[counterpartyTakerId] || quoteChainTakers[counterpartyTakerId] || [];
        // Group base chain orders which were matched with the same counterparty order together.
      if (!txnPairsMap[counterpartyTakerId]) {
        txnPairsMap[counterpartyTakerId] = {
          base: [],
          quote: counterpartyTxns
        };
      }
      let txnPair = txnPairsMap[counterpartyTakerId];
      txnPair.base.push(txn)
    }

    let priceHistory = [];
    let txnPairsList = Object.values(txnPairsMap);

    // Pop out all entries which are definitely incompete or possibly incompete due to result limit.
    while (txnPairsList.length) {
      let lastPair = txnPairsList.pop();
      if (lastPair.base.length > 0 && lastPair.quote.length > 0) {
        break;
      }
    }

    for (let txnPair of txnPairsList) {
      let dexOptions =  this.state.configuration.markets[this.state.activeMarket].dexOptions;
      let priceDecimalPrecision = dexOptions.priceDecimalPrecision == null ? DEFAULT_PRICE_DECIMAL_PRECISION : dexOptions.priceDecimalPrecision;

      let baseChainOptions = dexOptions.chains[this.state.activeAssets[1]];
      let baseChainFeeBase = baseChainOptions.exchangeFeeBase;
      let baseChainFeeRate = baseChainOptions.exchangeFeeRate;
      let baseTotalFee = baseChainFeeBase * txnPair.base.length;
      let fullBaseAmount = txnPair.base.reduce((accumulator, txn) => accumulator + Number(txn.amount) / (1 - baseChainFeeRate), 0) + baseTotalFee;

      let quoteChainOptions = dexOptions.chains[this.state.activeAssets[0]];
      let quoteChainFeeBase = quoteChainOptions.exchangeFeeBase;
      let quoteChainFeeRate = quoteChainOptions.exchangeFeeRate;
      let quoteTotalFee = quoteChainFeeBase * txnPair.quote.length;
      let fullQuoteAmount = txnPair.quote.reduce((accumulator, txn) => accumulator + Number(txn.amount) / (1 - quoteChainFeeRate), 0) + quoteTotalFee;

      let price = Number((fullBaseAmount / fullQuoteAmount).toFixed(priceDecimalPrecision));
      priceHistory.push({
        timestamp: txnPair.base[txnPair.base.length - 1].timestamp,
        price,
        volume: Math.round(fullBaseAmount / 1000000) / 100
      });
    }

    priceHistory.reverse();

    this.setState({
      priceHistory
    });
  }

  orderCancel = async (order) => {
    let unitValue = this.state.configuration.assets[order.sourceChain].unitValue;
    let chainSymbol = order.sourceChain.toUpperCase();

    order.status = 'canceling';

    let message;
    if (order.type === 'limit') {
      message = `A cancel order was submitted for the limit order with amount ${
        Math.round((order.value || order.size) * 100 / unitValue) / 100
      } ${chainSymbol} at price ${
        order.price
      }`;
    } else {
      message = `A cancel order was submitted for the market order with amount ${
        Math.round((order.value || order.size) * 100 / unitValue) / 100
      } ${chainSymbol}`;
    }
    this.notify(message);

    this.setState({
      yourOrders: this.state.yourOrders
    });
  }

  orderSubmitError = async (error) => {
    let order = error.order;
    let errorDetails;
    if (
      error.response.data &&
      error.response.data.errors &&
      error.response.data.errors.length &&
      error.response.data.errors[0].message
    ) {
      errorDetails = error.response.data.errors[0].message;
    } else {
      errorDetails = 'Check your connection';
    }
    let unitValue = this.state.configuration.assets[order.sourceChain].unitValue;
    let chainSymbol = order.sourceChain.toUpperCase();
    let message;
    if (order.type === 'limit') {
      message = `Failed to submit the limit order with amount ${
        Math.round((order.value || order.size) * 100 / unitValue) / 100
      } ${chainSymbol} at price ${
        order.price
      } - ${errorDetails}.`;
    } else {
      message = `Failed to submit the market order with amount ${
        Math.round((order.value || order.size) * 100 / unitValue) / 100
      } ${chainSymbol} - ${errorDetails}.`;
    }
    this.notify(message, true);
  }

  orderSubmit = async (order) => {
    let dexClient = getClient(this.state.configuration.markets[this.state.activeMarket].dexApiUrl);
    let processedHeights = await getProcessedHeights(dexClient);

    let heightSafetyMargin = this.state.configuration.assets[order.sourceChain].processingHeightExpiry;
    order.submitHeight = processedHeights[order.sourceChain];
    order.submitExpiryHeight = order.submitHeight + this.state.configuration
    .markets[this.state.activeMarket].dexOptions.chains[order.sourceChain].requiredConfirmations + heightSafetyMargin;

    let yourOrderMap = {};
    for (let yourOrder of this.state.yourOrders) {
      yourOrderMap[yourOrder.id] = yourOrder;
    }

    order.status = 'pending';
    yourOrderMap[order.id] = order;

    let orderDexAddress = this.state.configuration.markets[this.state.activeMarket].dexOptions.chains[order.sourceChain].walletAddress;
    let unitValue = this.state.configuration.assets[order.sourceChain].unitValue;
    let chainSymbol = order.sourceChain.toUpperCase();

    let message;
    if (order.type === 'limit') {
      message = `A limit order with amount ${
        Math.round((order.value || order.size) * 100 / unitValue) / 100
      } ${chainSymbol} at price ${
        order.price
      } was submitted to the DEX address ${
        orderDexAddress
      } on the ${chainSymbol} blockchain`;
    } else {
      message = `A market order with amount ${
        Math.round((order.value || order.size) * 100 / unitValue) / 100
      } ${chainSymbol} was submitted to the DEX address ${
        orderDexAddress
      } on the ${chainSymbol} blockchain`;
    }

    this.notify(message);

    this.setState({
      yourOrders: Object.values(yourOrderMap)
    });
  }

  notify = (message, isError) => {
    let newNotification = {
      id: this.notificationId++,
      message,
      isActive: true,
      isError: isError || false
    };

    let updatedNotifications = this.state.notifications.map(notification => ({...notification, isActive: false}));
    updatedNotifications.push(newNotification);

    if (updatedNotifications.length >= NOTIFICATIONS_MAX_QUEUE_LENGTH) {
      updatedNotifications.shift();
    }

    setTimeout(() => {
      newNotification.isActive = false;
      this.setState({
        notifications: this.state.notifications
      });
    }, this.state.configuration.notificationDuration);

    this.setState({
      notifications: updatedNotifications
    });
  }

  refreshOrderbook = async () => {
    try {
      await this._refreshOrderbook();
    } catch (error) {
      console.error(error);
      this.notify('Failed to refresh the order book - Check your connection.', true);
    }
  }

  _refreshOrderbook = async () => {
    let dexClient = getClient(this.state.configuration.markets[this.state.activeMarket].dexApiUrl);

    let quoteAsset = this.state.activeAssets[0];
    let baseAsset = this.state.activeAssets[1];

    let apiResults = [
      getOrderbook(dexClient),
      getProcessedHeights(dexClient)
    ];
    if (this.state.keys[quoteAsset]) {
      let quoteWalletAddress = this.state.keys[quoteAsset].address;
      apiResults.push(getAsksFromWallet(dexClient, quoteWalletAddress));
      apiResults.push(getPendingTransfers(dexClient, quoteAsset, quoteWalletAddress));
    } else {
      apiResults.push(Promise.resolve([]));
      apiResults.push(Promise.resolve([]));
    }
    if (this.state.keys[baseAsset]) {
      let baseWalletAddress = this.state.keys[baseAsset].address;
      apiResults.push(getBidsFromWallet(dexClient, baseWalletAddress));
      apiResults.push(getPendingTransfers(dexClient, baseAsset, baseWalletAddress));
    } else {
      apiResults.push(Promise.resolve([]));
      apiResults.push(Promise.resolve([]));
    }

    const [
      orders,
      processedHeights,
      yourAsks,
      pendingQuoteAssetTransfers,
      yourBids,
      pendingBaseAssetTransfers
    ] = await Promise.all(apiResults);

    let yourOrders = [...yourAsks, ...yourBids];

    const bids = [];
    const asks = [];
    let maxSize = { bid: 0, ask: 0 };
    let yourOrderMap = {};

    for (let yourOrder of this.state.yourOrders) {
      yourOrderMap[yourOrder.id] = yourOrder;
    }

    let yourOrderBookIds = new Set();

    for (let order of yourOrders) {
      yourOrderBookIds.add(order.id);
      let existingOrder = yourOrderMap[order.id];
      if (!existingOrder || existingOrder.status === 'pending') {
        order.status = 'ready';
      } else {
        order.status = existingOrder.status;
      }
      if (order.side === 'bid') {
        yourOrderMap[order.id] = order;
      } else if (order.side === 'ask') {
        yourOrderMap[order.id] = order;
      }
    }

    for (let order of orders) {
      if (order.side === 'bid') {
        bids.push(order);
        if (order.value > maxSize.bid) {
          maxSize.bid = order.valueRemaining;
        }
      } else if (order.side === 'ask') {
        asks.push(order);
        if (order.size > maxSize.ask) {
          maxSize.ask = order.sizeRemaining;
        }
      }
    }

    let maxBid = 0;
    let minAsk = 0;
    if (bids.length > 0) {
      maxBid = bids[0].price;
    }
    if (asks.length > 0) {
      minAsk = asks[0].price;
    }

    const getTransferType = (pendingTransfer) => {
      let transactionData = pendingTransfer.transaction.asset.data || '';
      return transactionData.charAt(0);
    };

    // TODO: Match order id based on position in protocol argument list instead of regex.
    const originOrderIdRegexT1 = /,[0-9]+:/g;
    const originOrderIdRegexOthers = /,[0-9]+,/g;

    const getOriginOrderId = (pendingTransfer) => {
      let transactionData = pendingTransfer.transaction.asset.data || '';
      let regex = transactionData.slice(0, 2) === 't1' ? originOrderIdRegexT1 : originOrderIdRegexOthers;
      let matches = transactionData.match(regex);
      if (matches) {
        let match = matches[0];
        return match.slice(1, match.length - 1);
      }
      return null;
    };

    let pendingTransfers = [...pendingBaseAssetTransfers, ...pendingQuoteAssetTransfers];
    let tradeTransfers = pendingTransfers.filter(transfer => getTransferType(transfer) === 't');
    let tradeTransfersOriginOrderIds = new Set(tradeTransfers.map(transfer => getOriginOrderId(transfer)));
    let uniqueRefundTransfers = pendingTransfers.filter((transfer) => {
      return getTransferType(transfer) === 'r' && !tradeTransfersOriginOrderIds.has(getOriginOrderId(transfer));
    });
    let uniquePendingTransfers = [...tradeTransfers, ...uniqueRefundTransfers];

    let transferOrderIds = new Set();
    for (let pendingTransfer of uniquePendingTransfers) {
      let originOrderId = getOriginOrderId(pendingTransfer);
      transferOrderIds.add(originOrderId);
    }

    let yourOrderList = Object.values(yourOrderMap);

    for (let yourOrder of yourOrderList) {
      if (yourOrder.status === 'pending') {
        let currentHeight = processedHeights[yourOrder.sourceChain];
        if (currentHeight >= yourOrder.submitExpiryHeight) {
          delete yourOrderMap[yourOrder.id];
          continue;
        }
      }
      if (transferOrderIds.has(yourOrder.id)) {
        if (yourOrder.status === 'pending') {
          yourOrder.status = 'processing';
        } else if (yourOrder.status === 'ready') {
          yourOrder.status = 'matching';
        }
      } else {
        if (yourOrder.status !== 'pending' && !yourOrderBookIds.has(yourOrder.id)) {
          delete yourOrderMap[yourOrder.id];
          continue;
        }
        if (yourOrder.status === 'matching') {
          yourOrder.status = 'ready';
        }
      }
    }

    let newState = {
      orderBookData: { bids, asks, maxSize },
      maxBid, minAsk,
      yourOrders: Object.values(yourOrderMap)
    };

    this.setState(newState);
  }

  componentDidUpdate() {
    if (this.state.configurationLoaded && !this.intervalRegistered) {
      this.refreshOrderbook();
      this.refreshPriceHistory();
      setInterval(async () => {
        this.refreshOrderbook();
        this.refreshPriceHistory();
      }, this.state.configuration.refreshInterval);
      this.intervalRegistered = true;
    }
  }

  showSignIn() {
    this.setState({ displaySigninModal: true, signInFailure: false });
  }

  async passphraseSubmit(payload) {
    const keys = {};
    let atLeastOneKey = false;
    for (const asset in payload) {
      if (payload[asset] !== undefined) {
        atLeastOneKey = true;
        const passphrase = payload[asset].trim();
        if (!Mnemonic.validateMnemonic(passphrase, Mnemonic.wordlists.english)) {
          delete keys[asset];
          this.setState({ signInFailure: true });
          return;
        } else {
          const address = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase).address;
          keys[asset] = { address, passphrase };
        }
      }
    }
    if (atLeastOneKey) {
      await this.setState({ keys, signedIn: true, displaySigninModal: false });
      this.refreshOrderbook();
    }
  }

  walletGenerated = (address) => {
    this.notify(`Created wallet ${address}! Please store the passphrase in a safe place!`);
  }

  closeSignInModal = () => {
    this.setState({ displaySigninModal: false });
  }

  signOut = () => {
    this.setState({ signedIn: false, keys: {}, yourOrders: [] });
  }

  setDisplayLeaveWarning = (val) => {
    this.setState({ displayLeaveWarning: val });
  }

  componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
  }

  updateWindowDimensions() {
    this.setState({ windowWidth: window.innerWidth, windowHeight: window.innerHeight });
  }

  render() {
    if (!this.state.configurationLoaded) {
      return <div style={{ padding: '10px' }}>Loading...</div>
    }
    return <>
      <userContext.Provider value={{ ...this.state }}>
        {this.state.displaySigninModal && <SignInModal failure={this.state.signInFailure} passphraseSubmit={this.passphraseSubmit} enabledAssets={this.state.enabledAssets} close={this.closeSignInModal} walletGenerated={this.walletGenerated}></SignInModal>}
        {this.state.displayLeaveWarning && <LeaveWarning setDisplayLeaveWarning={this.setDisplayLeaveWarning}></LeaveWarning>}
        <div className="top-bar">
          <div>
            <b style={{ fontSize: '21px' }}>{this.state.configuration.appTitle}</b> &nbsp;
            <a className="feedback-link" style={{ color: '#34cfeb', fontSize: '14px' }} href={this.state.configuration.feedbackLink.url} rel="noopener noreferrer" target="_blank">{this.state.configuration.feedbackLink.text}</a>
          </div>
          <div>
            <SignInState className="sign-in-state" showSignIn={this.showSignIn} keys={this.state.keys} signedIn={this.state.signedIn} signOut={this.signOut}></SignInState>
          </div>
        </div>
        <div className="container">
          <div className="notifications">
            {this.state.notifications.map(data => <Notification key={data.id} data={data}></Notification>)}
          </div>
          <div className="sell-panel">
            <PlaceOrder side="ask" orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError}></PlaceOrder>
          </div>
          <div className="buy-panel">
            <PlaceOrder side="bid" orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError}></PlaceOrder>
          </div>
          <div className="orderbook-container">
            <div className="sell-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="asks"></Orderbook>
            </div>
            <div className="price-display">
              Price: {this.state.minAsk} {this.state.activeAssets[1].toUpperCase()}
            </div>
            <div className="buy-orders">
              <Orderbook orderBookData={this.state.orderBookData} side="bids"></Orderbook>
            </div>
          </div>
          <div className="price-chart">
            <PriceHistoryChart
              key="price-history-chart"
              type="hybrid"
              market={this.state.activeMarket}
              assets={this.state.activeAssets}
              data={this.state.priceHistory}
              windowWidth={this.state.windowWidth}
              windowHeight={this.state.windowHeight}
            >
            </PriceHistoryChart>
          </div>
          <div className="your-orders">
            <YourOrders orders={this.state.yourOrders} orderCanceled={this.orderCancel}></YourOrders>
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
