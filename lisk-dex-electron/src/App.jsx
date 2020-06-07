import React from 'react';
import './App.css';

import * as cryptography from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import axios from 'axios';
import OrderBook from './OrderBook';
import PriceHistoryChart from './PriceHistoryChart';
import PlaceOrder from './PlaceOrder';
import YourOrders from './YourOrders';
import SignInModal from './SignInModal';
import SignInState from './SignInState';
import {
  getOrderBook,
  getAsksFromWallet,
  getBidsFromWallet,
  getPendingTransfers,
  getProcessedHeights,
  getClient,
  getConfig,
} from './API';
import MarketList from './MarketList';
import Notification from './Notification';
import userContext from './context';
import LeaveWarning from './LeaveWarning';
import processConfiguration from './config/Configuration';

const NOTIFICATIONS_MAX_QUEUE_LENGTH = 3;
const DEFAULT_API_MAX_PAGE_SIZE = 100;
const DEFAULT_PRICE_DECIMAL_PRECISION = 4;
const DEFAULT_ORDER_BOOK_DEPTH = 20;

class App extends React.Component {
  constructor(props) {
    super(props);
    // This state has too many members. This is because we want to share data from API calls with various different components without
    // having to re-fetch the data in each.
    this.state = {
      configurationLoaded: false,
      configuration: {},
      orderBookData: {
        orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 },
      },
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
      windowHeight: 0,
    };

    this.notificationId = 0;
    this.showSignIn = this.showSignIn.bind(this);
    this.intervalRegistered = false;
    this.passphraseSubmit = this.passphraseSubmit.bind(this);
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
    this.loadConfiguration();
  }

  getDexClient() {
    return getClient(this.state.configuration.markets[this.state.activeMarket].dexApiUrl);
  }

  async loadConfiguration() {
    const localClient = getClient('');
    const defaultConfiguration = await getConfig(localClient);
    const configuration = await processConfiguration(defaultConfiguration);
    const marketSymbols = Object.keys(configuration.markets);
    const defaultMarketKey = marketSymbols[0];
    this.setState({
      configuration,
      activeMarket: defaultMarketKey,
      activeAssets: configuration.markets[defaultMarketKey].assets,
      enabledAssets: Object.keys(configuration.assets),
      configurationLoaded: true,
    });
  }

  getTakerOrderIdFromTransaction(transaction) {
    const transactionData = transaction.asset.data || '';
    const header = transactionData.split(':')[0];
    const parts = header.split(',');
    const txnType = parts[0];
    if (txnType === 't1') {
      return parts[2];
    }
    if (txnType === 't2') {
      return parts[3];
    }
    return null;
  }

  isTakerTransaction(transaction) {
    const transactionData = transaction.asset.data || '';
    const header = transactionData.split(':')[0];
    return header.split(',')[0] === 't1';
  }

  isMakerTransaction(transaction) {
    const transactionData = transaction.asset.data || '';
    const header = transactionData.split(':')[0];
    return header.split(',')[0] === 't2';
  }

  _getExpectedCounterpartyTransactionCount(transaction) {
    const transactionData = transaction.asset.data || '';
    const header = transactionData.split(':')[0];
    const parts = header.split(',');
    const txnType = parts[0];
    if (txnType === 't1') {
      return parts[3] || 1;
    }
    if (txnType === 't2') {
      return 1;
    }
    return 0;
  }

  async fetchPriceHistoryState() {
    const [quoteChainTxns, baseChainTxns] = await Promise.all(
      this.state.activeAssets.map(async (assetSymbol) => {
        const asset = this.state.configuration.assets[assetSymbol];
        const client = axios.create();
        const targetEndpoint = asset.apiUrl;
        const { dexOptions } = this.state.configuration.markets[this.state.activeMarket];
        const dexWalletAddress = dexOptions.chains[assetSymbol].walletAddress;
        const result = await client.get(
          `${targetEndpoint}/transactions?senderId=${
            dexWalletAddress
          }&limit=${
            asset.apiMaxPageSize || DEFAULT_API_MAX_PAGE_SIZE
          }&sort=timestamp:desc`,
        );
        return result.data.data;
      }),
    );

    const quoteChainMakers = {};
    const quoteChainTakers = {};

    for (const txn of quoteChainTxns) {
      const isMaker = this.isMakerTransaction(txn);
      const isTaker = this.isTakerTransaction(txn);
      const takerOrderId = this.getTakerOrderIdFromTransaction(txn);
      if (isMaker) {
        if (!quoteChainMakers[takerOrderId]) {
          quoteChainMakers[takerOrderId] = [];
        }
        quoteChainMakers[takerOrderId].push(txn);
      } else if (isTaker) {
        quoteChainTakers[takerOrderId] = [txn];
      }
    }

    const txnPairsMap = {};

    for (const txn of baseChainTxns) {
      const isMaker = this.isMakerTransaction(txn);
      const isTaker = this.isTakerTransaction(txn);

      if (!isMaker && !isTaker) {
        continue;
      }

      const counterpartyTakerId = this.getTakerOrderIdFromTransaction(txn);
      const counterpartyTxns = quoteChainMakers[counterpartyTakerId] || quoteChainTakers[counterpartyTakerId] || [];

      if (!counterpartyTxns.length) {
        continue;
      }

      // Group base chain orders which were matched with the same counterparty order together.
      if (!txnPairsMap[counterpartyTakerId]) {
        txnPairsMap[counterpartyTakerId] = {
          base: [],
          quote: counterpartyTxns,
        };
      }
      const txnPair = txnPairsMap[counterpartyTakerId];
      txnPair.base.push(txn);
    }

    const priceHistory = [];

    // Filter out all entries which are incompete.
    const txnPairsList = Object.values(txnPairsMap).filter((txnPair) => {
      const firstBaseTxn = txnPair.base[0];
      const firstQuoteTxn = txnPair.quote[0];
      if (!firstBaseTxn || !firstQuoteTxn) {
        return false;
      }
      const expectedBaseCount = this._getExpectedCounterpartyTransactionCount(firstQuoteTxn);
      const expectedQuoteCount = this._getExpectedCounterpartyTransactionCount(firstBaseTxn);

      return txnPair.base.length >= expectedBaseCount && txnPair.quote.length >= expectedQuoteCount;
    });

    const { dexOptions } = this.state.configuration.markets[this.state.activeMarket];
    const priceDecimalPrecision = this.getPriceDecimalPrecision();

    for (const txnPair of txnPairsList) {
      const baseChainOptions = dexOptions.chains[this.state.activeAssets[1]];
      const baseChainFeeBase = baseChainOptions.exchangeFeeBase;
      const baseChainFeeRate = baseChainOptions.exchangeFeeRate;
      const baseTotalFee = baseChainFeeBase * txnPair.base.length;
      const fullBaseAmount = txnPair.base.reduce((accumulator, txn) => accumulator + Number(txn.amount) / (1 - baseChainFeeRate), 0) + baseTotalFee;

      const quoteChainOptions = dexOptions.chains[this.state.activeAssets[0]];
      const quoteChainFeeBase = quoteChainOptions.exchangeFeeBase;
      const quoteChainFeeRate = quoteChainOptions.exchangeFeeRate;
      const quoteTotalFee = quoteChainFeeBase * txnPair.quote.length;
      const fullQuoteAmount = txnPair.quote.reduce((accumulator, txn) => accumulator + Number(txn.amount) / (1 - quoteChainFeeRate), 0) + quoteTotalFee;

      const price = Number((fullBaseAmount / fullQuoteAmount).toFixed(priceDecimalPrecision));
      priceHistory.push({
        timestamp: txnPair.base[txnPair.base.length - 1].timestamp,
        price,
        volume: Math.round(fullBaseAmount / 1000000) / 100,
      });
    }

    priceHistory.reverse();

    const newState = {
      priceHistory,
      priceDecimalPrecision,
    };

    return newState;
  }

  orderCancelFail = async (error) => {
    let errorDetails = this._prepareErrorMessage(error);
    let message = `Failed to cancel the order with id ${error.orderToCancel.id} - ${errorDetails}.`;
    this.notify(message, true);
  }

  orderCancel = async (order) => {
    const { unitValue } = this.state.configuration.assets[order.sourceChain];
    const chainSymbol = order.sourceChain.toUpperCase();

    order.status = 'canceling';

    let message;
    if (order.type === 'limit') {
      message = `A cancel order was submitted for the limit order with amount ${
        Math.round(((order.value || order.size) * 100) / unitValue) / 100
      } ${chainSymbol} at price ${
        order.price
      }`;
    } else {
      message = `A cancel order was submitted for the market order with amount ${
        Math.round(((order.value || order.size) * 100) / unitValue) / 100
      } ${chainSymbol}`;
    }
    this.notify(message);

    this.setState((prevState) => ({
      yourOrders: prevState.yourOrders,
    }));
  }

  _prepareErrorMessage = (error) => {
    let errorDetails;
    if (
      error.response
      && error.response.data
      && error.response.data.errors
      && error.response.data.errors.length
      && error.response.data.errors[0].message
    ) {
      errorDetails = error.response.data.errors[0].message;
    } else {
      errorDetails = 'Check your connection';
    }
    return errorDetails;
  }

  orderSubmitError = async (error) => {
    const { order } = error;
    let errorDetails = this._prepareErrorMessage(error);

    const { unitValue } = this.state.configuration.assets[order.sourceChain];
    const chainSymbol = order.sourceChain.toUpperCase();
    let message;
    if (order.type === 'limit') {
      message = `Failed to submit the limit order with amount ${
        Math.round(((order.value || order.size) * 100) / unitValue) / 100
      } ${chainSymbol} at price ${
        order.price
      } - ${errorDetails}.`;
    } else {
      message = `Failed to submit the market order with amount ${
        Math.round(((order.value || order.size) * 100) / unitValue) / 100
      } ${chainSymbol} - ${errorDetails}.`;
    }
    this.notify(message, true);
  }

  orderSubmit = async (order) => {
    const dexClient = this.getDexClient();
    const processedHeights = await getProcessedHeights(dexClient);

    const heightSafetyMargin = this.state.configuration.assets[order.sourceChain].processingHeightExpiry;
    order.submitHeight = processedHeights[order.sourceChain];
    order.submitExpiryHeight = order.submitHeight + this.state.configuration
      .markets[this.state.activeMarket].dexOptions.chains[order.sourceChain].requiredConfirmations + heightSafetyMargin;

    const yourOrderMap = {};
    for (const yourOrder of this.state.yourOrders) {
      yourOrderMap[yourOrder.id] = yourOrder;
    }

    order.status = 'pending';
    yourOrderMap[order.id] = order;

    const orderDexAddress = this.state.configuration.markets[this.state.activeMarket].dexOptions.chains[order.sourceChain].walletAddress;
    const { unitValue } = this.state.configuration.assets[order.sourceChain];
    const chainSymbol = order.sourceChain.toUpperCase();

    let message;
    if (order.type === 'limit') {
      message = `A limit order with amount ${
        Math.round(((order.value || order.size) * 100) / unitValue) / 100
      } ${chainSymbol} at price ${
        order.price
      } was submitted to the DEX address ${
        orderDexAddress
      } on the ${chainSymbol} blockchain`;
    } else {
      message = `A market order with amount ${
        Math.round(((order.value || order.size) * 100) / unitValue) / 100
      } ${chainSymbol} was submitted to the DEX address ${
        orderDexAddress
      } on the ${chainSymbol} blockchain`;
    }

    this.notify(message);

    this.setState({
      yourOrders: Object.values(yourOrderMap),
    });
  }

  notify(message, isError) {
    const newNotification = {
      id: this.notificationId += 1,
      message,
      isActive: true,
      isError: isError || false,
    };

    // eslint-disable-next-line react/no-access-state-in-setstate
    const updatedNotifications = this.state.notifications.map((notification) => ({ ...notification, isActive: false }));
    updatedNotifications.push(newNotification);

    if (updatedNotifications.length >= NOTIFICATIONS_MAX_QUEUE_LENGTH) {
      updatedNotifications.shift();
    }

    setTimeout(() => {
      newNotification.isActive = false;
      this.setState((prevState) => ({
        notifications: prevState.notifications,
      }));
    }, this.state.configuration.notificationDuration);

    this.setState({
      notifications: updatedNotifications,
    });
  }

  async fetchOrderBookState() {
    const dexClient = this.getDexClient();

    const quoteAsset = this.state.activeAssets[0];
    const baseAsset = this.state.activeAssets[1];

    const { orderBookDepth } = this.state.configuration.markets[this.state.activeMarket] || {};

    const apiResults = [
      getOrderBook(dexClient, orderBookDepth == null ? DEFAULT_ORDER_BOOK_DEPTH : orderBookDepth),
      getProcessedHeights(dexClient),
    ];
    if (this.state.keys[quoteAsset]) {
      const quoteWalletAddress = this.state.keys[quoteAsset].address;
      apiResults.push(getAsksFromWallet(dexClient, quoteWalletAddress));
      apiResults.push(getPendingTransfers(dexClient, quoteAsset, quoteWalletAddress));
    } else {
      apiResults.push(Promise.resolve([]));
      apiResults.push(Promise.resolve([]));
    }
    if (this.state.keys[baseAsset]) {
      const baseWalletAddress = this.state.keys[baseAsset].address;
      apiResults.push(getBidsFromWallet(dexClient, baseWalletAddress));
      apiResults.push(getPendingTransfers(dexClient, baseAsset, baseWalletAddress));
    } else {
      apiResults.push(Promise.resolve([]));
      apiResults.push(Promise.resolve([]));
    }

    const [
      orderLevels,
      processedHeights,
      yourAsks,
      pendingQuoteAssetTransfers,
      yourBids,
      pendingBaseAssetTransfers,
    ] = await Promise.all(apiResults);

    const yourOrders = [...yourAsks, ...yourBids];

    const bids = [];
    const asks = [];
    const maxSize = { bid: 0, ask: 0 };
    const yourOrderMap = {};

    for (const yourOrder of this.state.yourOrders) {
      yourOrderMap[yourOrder.id] = yourOrder;
    }

    const yourOrderBookIds = new Set();

    for (const order of yourOrders) {
      yourOrderBookIds.add(order.id);
      const existingOrder = yourOrderMap[order.id];
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

    for (const orderLvl of orderLevels) {
      if (orderLvl.side === 'bid') {
        bids.push(orderLvl);
        if (orderLvl.valueRemaining > maxSize.bid) {
          maxSize.bid = orderLvl.valueRemaining;
        }
      } else if (orderLvl.side === 'ask') {
        asks.push(orderLvl);
        if (orderLvl.sizeRemaining > maxSize.ask) {
          maxSize.ask = orderLvl.sizeRemaining;
        }
      }
    }

    asks.reverse();

    let maxBid = 0;
    let minAsk = 0;
    if (bids.length > 0) {
      maxBid = bids[0].price;
    }
    if (asks.length > 0) {
      minAsk = asks[0].price;
    }

    const getTransferType = (pendingTransfer) => {
      const transactionData = pendingTransfer.transaction.asset.data || '';
      return transactionData.charAt(0);
    };

    const getOriginOrderId = (pendingTransfer) => {
      const transactionData = pendingTransfer.transaction.asset.data || '';
      const header = transactionData.split(':')[0];
      return header.split(',')[2] || null;
    };

    const pendingTransfers = [...pendingBaseAssetTransfers, ...pendingQuoteAssetTransfers];
    const tradeTransfers = pendingTransfers.filter((transfer) => getTransferType(transfer) === 't');
    const tradeTransfersOriginOrderIds = new Set(tradeTransfers.map((transfer) => getOriginOrderId(transfer)));
    const uniqueRefundTransfers = pendingTransfers.filter((transfer) => getTransferType(transfer) === 'r' && !tradeTransfersOriginOrderIds.has(getOriginOrderId(transfer)));
    const uniquePendingTransfers = [...tradeTransfers, ...uniqueRefundTransfers];

    const transferOrderIds = new Set();
    for (const pendingTransfer of uniquePendingTransfers) {
      const originOrderId = getOriginOrderId(pendingTransfer);
      transferOrderIds.add(originOrderId);
    }

    const yourOrderList = Object.values(yourOrderMap);

    for (const yourOrder of yourOrderList) {
      if (yourOrder.status === 'pending') {
        const currentHeight = processedHeights[yourOrder.sourceChain];
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
    const newState = {
      orderBookData: { bids, asks, maxSize },
      priceDecimalPrecision: this.getPriceDecimalPrecision(),
      maxBid,
      minAsk,
      yourOrders: Object.values(yourOrderMap),
    };
    return newState;
  }

  getPriceDecimalPrecision() {
    const { dexOptions } = this.state.configuration.markets[this.state.activeMarket];
    return dexOptions.priceDecimalPrecision == null ? DEFAULT_PRICE_DECIMAL_PRECISION : dexOptions.priceDecimalPrecision;
  }

  async _updateUIWithNewData() {
    let combinedStateUpdate;
    try {
      const [newOrderBookState, newPriceHistoryState] = await Promise.all([this.fetchOrderBookState(), this.fetchPriceHistoryState()]);
      combinedStateUpdate = { ...newOrderBookState, ...newPriceHistoryState };
    } catch (error) {
      console.error(error);
      this.notify('Failed to refresh data - Check your connection.', true);

      return;
    }
    this.setState(combinedStateUpdate);
  }

  componentDidUpdate() {
    if (this.state.configurationLoaded && !this.intervalRegistered) {
      this._updateUIWithNewData();
      setInterval(async () => {
        this._updateUIWithNewData();
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
        }
        const { address } = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
        keys[asset] = { address, passphrase };
      }
    }
    if (atLeastOneKey) {
      await this.setState({ keys, signedIn: true, displaySigninModal: false });
      let newOrderBookState;
      try {
        newOrderBookState = await this.fetchOrderBookState();
      } catch (error) {
        console.error(error);
        this.notify('Failed to fetch order book - Check your connection.', true);

        return;
      }
      await this.setState(newOrderBookState);
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
      return <div style={{ padding: '10px' }}>Loading...</div>;
    }
    return (
      <>
        <userContext.Provider value={{ ...this.state }}>
          {this.state.displaySigninModal && <SignInModal failure={this.state.signInFailure} passphraseSubmit={this.passphraseSubmit} enabledAssets={this.state.enabledAssets} close={this.closeSignInModal} walletGenerated={this.walletGenerated} />}
          {this.state.displayLeaveWarning && <LeaveWarning setDisplayLeaveWarning={this.setDisplayLeaveWarning} />}
          <div className="top-bar">
            <div>
              <b style={{ fontSize: '21px' }}>{this.state.configuration.appTitle}</b>
              {' '}
              &nbsp;
              <a className="feedback-link" style={{ color: '#34cfeb', fontSize: '14px' }} href={this.state.configuration.feedbackLink.url} rel="noopener noreferrer" target="_blank">{this.state.configuration.feedbackLink.text}</a>
            </div>
            <div>
              <SignInState className="sign-in-state" showSignIn={this.showSignIn} keys={this.state.keys} signedIn={this.state.signedIn} signOut={this.signOut} />
            </div>
          </div>
          <div className="container">
            <div className="notifications">
              {this.state.notifications.map((data) => <Notification key={data.id} data={data} />)}
            </div>
            <div className="sell-panel">
              <PlaceOrder side="ask" orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError} />
            </div>
            <div className="buy-panel">
              <PlaceOrder side="bid" orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError} />
            </div>
            <div className="order-book-container">
              <div className="sell-orders">
                <OrderBook side="asks" orderBookData={this.state.orderBookData} priceDecimalPrecision={this.state.priceDecimalPrecision} assets={this.state.activeAssets} />
              </div>
              <div className="price-display">
                Price:
                {' '}
                {this.state.minAsk}
                {' '}
                {this.state.activeAssets[1].toUpperCase()}
              </div>
              <div className="buy-orders">
                <OrderBook side="bids" orderBookData={this.state.orderBookData} priceDecimalPrecision={this.state.priceDecimalPrecision} assets={this.state.activeAssets} />
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
              />
            </div>
            <div className="your-orders">
              <YourOrders orders={this.state.yourOrders} orderCanceled={this.orderCancel} handleCancelFail={this.orderCancelFail} />
            </div>
            <div className="market-name-and-stats">
              <MarketList markets={this.state.configuration.markets} refreshInterval={this.state.configuration.refreshInterval} />
            </div>
          </div>
        </userContext.Provider>
      </>
    );
  }
}

export default App;
