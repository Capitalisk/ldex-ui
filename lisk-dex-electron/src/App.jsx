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
  getRecentTransfers,
  getProcessedHeights,
  getPriceHistory,
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
      displayLeaveWarning: false,
      maxBid: 0,
      minAsk: 0,
      lastTradePrice: null,
      baseAssetBalance: null,
      quoteAssetBalance: null,
      yourOrders: [],
      // to prevent cross-chain replay attacks, the user can specify a key for each chain that they are trading on.
      // the address will be used when the asset is being used as the destination chain.
      notifications: [],
      keys: {},
      windowWidth: 0,
      windowHeight: 0,
    };

    this.notificationId = 0;
    this.intervalRegistered = false;
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
    this.initPendingOrders(marketSymbols);
    const defaultMarketKey = marketSymbols[0];
    this.defaultMarket = defaultMarketKey;
    await this.setState({
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

  async fetchPriceHistoryStateFromDEX() {
    const dexClient = this.getDexClient();
    const priceHistory = await getPriceHistory(dexClient);
    priceHistory.reverse();
    const priceDecimalPrecision = this.getPriceDecimalPrecision();
    return {
      priceHistory,
      priceDecimalPrecision,
    };
  }

  async fetchPriceHistoryStateFromBlockchains() {
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
        baseTimestamp: txnPair.base[txnPair.base.length - 1].timestamp,
        price,
        volume: Math.round(fullBaseAmount / 1000000) / 100,
      });
    }

    priceHistory.reverse();

    return {
      priceHistory,
      priceDecimalPrecision,
    };
  }

  orderCancelFail = async (error) => {
    const errorDetails = this._prepareErrorMessage(error);
    const message = `Failed to cancel the order with id ${error.orderToCancel.id} - ${errorDetails}.`;
    this.notify(message, true);
  }

  orderCancel = async (order) => {
    const { unitValue } = this.state.configuration.assets[order.sourceChain];
    const chainSymbol = order.sourceChain.toUpperCase();

    order.status = 'canceling';
    this.pendingOrders[this.state.activeMarket][order.id] = order;
    this.savePendingOrders();

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

    await this.setState(({ yourOrders }) => ({
      yourOrders,
    }));
  }

  showEstimateInfo = async (message) => {
    this.notify(message);
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
    const errorDetails = this._prepareErrorMessage(error);

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
    order.status = 'pending';

    this.pendingOrders[this.state.activeMarket][order.id] = order;
    this.savePendingOrders();

    await this.setState(({ yourOrders }) => {
      const yourOrderMap = {};
      for (const yourOrder of yourOrders) {
        yourOrderMap[yourOrder.id] = yourOrder;
      }
      yourOrderMap[order.id] = order;
      return {
        yourOrders: Object.values(yourOrderMap),
      };
    });

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

  getTransferType(pendingTransfer) {
    const transactionData = pendingTransfer.transaction.asset.data || '';
    return transactionData.charAt(0);
  };

  getOriginOrderId(pendingTransfer) {
    const transactionData = pendingTransfer.transaction.asset.data || '';
    const header = transactionData.split(':')[0];
    return header.split(',')[2] || null;
  };

  savePendingOrders() {
    window.localStorage.pendingOrders = JSON.stringify(this.pendingOrders);
  }

  initPendingOrders(supportedMarkets) {
    this.pendingOrders = {};
    if (window.localStorage.pendingOrders) {
      const prevPendingOrders = JSON.parse(window.localStorage.pendingOrders);
      for (const market of supportedMarkets) {
        this.pendingOrders[market] = prevPendingOrders[market] || {};
      }
    } else {
      for (const market of supportedMarkets) {
        this.pendingOrders[market] = {};
      }
    }
  }

  async fetchOrderBookState() {
    const dexClient = this.getDexClient();

    const quoteAsset = this.state.activeAssets[0];
    const baseAsset = this.state.activeAssets[1];

    const activeMarket = this.state.activeMarket;
    const { orderBookDepth } = this.state.configuration.markets[activeMarket] || {};

    const apiResults = [
      getOrderBook(dexClient, orderBookDepth == null ? DEFAULT_ORDER_BOOK_DEPTH : orderBookDepth),
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
      yourAsks,
      pendingQuoteAssetTransfers,
      yourBids,
      pendingBaseAssetTransfers,
    ] = await Promise.all(apiResults);

    const yourOpenOrders = [...yourAsks, ...yourBids];

    const bids = [];
    const asks = [];
    const maxSize = { bid: 0, ask: 0 };
    const yourOrderMap = {};

    const pendingTransfers = [...pendingBaseAssetTransfers, ...pendingQuoteAssetTransfers];
    const tradeTransfers = pendingTransfers.filter((transfer) => this.getTransferType(transfer) === 't');
    const tradeTransfersOriginOrderIds = new Set(tradeTransfers.map((transfer) => this.getOriginOrderId(transfer)));
    const uniqueRefundTransfers = pendingTransfers.filter((transfer) => this.getTransferType(transfer) === 'r' && !tradeTransfersOriginOrderIds.has(this.getOriginOrderId(transfer)));
    const uniquePendingTransfers = [...tradeTransfers, ...uniqueRefundTransfers];

    const pendingTransferOrderIds = new Set();
    for (const pendingTransfer of uniquePendingTransfers) {
      const originOrderId = this.getOriginOrderId(pendingTransfer);
      pendingTransferOrderIds.add(originOrderId);
    }

    const pendingOrdersForActiveMarket = Object.values(this.pendingOrders[activeMarket]);
    for (const pendingOrder of pendingOrdersForActiveMarket) {
      if (pendingTransferOrderIds.has(pendingOrder.id)) {
        pendingOrder.status = 'processing';
      }
      if (this.state.keys[pendingOrder.sourceChain]) {
        yourOrderMap[pendingOrder.id] = pendingOrder;
      }
    }

    for (const order of yourOpenOrders) {
      let pendingOrder = this.pendingOrders[activeMarket][order.id];
      if (pendingOrder) {
        if (pendingOrder.status === 'pending') {
          delete this.pendingOrders[activeMarket][order.id];
        } else if (pendingOrder.status === 'canceling') {
          order.status = 'canceling';
          yourOrderMap[order.id] = order;
          continue;
        }
      }
      if (pendingTransferOrderIds.has(order.id)) {
        order.status = 'matching';
      } else {
        order.status = 'ready';
      }
      yourOrderMap[order.id] = order;
    }
    this.savePendingOrders();

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

    const newState = {
      orderBookData: { bids, asks, maxSize },
      priceDecimalPrecision: this.getPriceDecimalPrecision(),
      maxBid,
      minAsk,
      yourOrders: Object.values(yourOrderMap),
    };
    return newState;
  }

  getActiveMarketOptions() {
    return this.state.configuration.markets[this.state.activeMarket];
  }

  getPriceDecimalPrecision() {
    const { dexOptions } = this.getActiveMarketOptions();
    return dexOptions.priceDecimalPrecision == null ? DEFAULT_PRICE_DECIMAL_PRECISION : dexOptions.priceDecimalPrecision;
  }

  async updatePendingOrders() {
    const pendingMarketSymbols = Object.keys(this.pendingOrders);
    const marketCompletedOrders = await Promise.all(
      pendingMarketSymbols.map(async (market) => {
        const dexClient = getClient(this.state.configuration.markets[market].dexApiUrl);
        const pendingOrders = Object.values(this.pendingOrders[market]);

        if (!pendingOrders.length) {
          return {
            market,
            completedOrders: [],
          };
        }

        const processedHeights = await getProcessedHeights(dexClient);

        try {
          const processedOrExpiredTransfers = await Promise.all(
            pendingOrders.map(async (order) => {
              const currentHeight = processedHeights[order.sourceChain];
              if (currentHeight >= order.submitExpiryHeight) {
                return order.id;
              }
              let result = await getRecentTransfers(dexClient, order.id);
              return result && result.length ? order.id : null;
            })
          );
          const completedOrders = processedOrExpiredTransfers.filter((result) => result != null);

          return {
            market,
            completedOrders,
          };
        } catch (error) {
          console.error(error);
        }
        return {
          market,
          completedOrders: []
        };
      })
    );
    for (const {market, completedOrders} of marketCompletedOrders) {
      for (const orderId of completedOrders) {
        delete this.pendingOrders[market][orderId];
      }
    }
    this.savePendingOrders();
  }

  async updateUIWithNewData() {
    await this.updatePendingOrders();
    let combinedStateUpdate = {};
    const dexOptions = this.getActiveMarketOptions();
    try {
      let fetchHistoryPromise;
      if (dexOptions.priceHistoryAPI === 'dex') {
        fetchHistoryPromise = this.fetchPriceHistoryStateFromDEX();
      } else {
        fetchHistoryPromise = this.fetchPriceHistoryStateFromBlockchains();
      }
      const [newOrderBookState, newPriceHistoryState] = await Promise.all([
        this.fetchOrderBookState(),
        fetchHistoryPromise,
      ]);
      combinedStateUpdate = { ...newOrderBookState, ...newPriceHistoryState };
    } catch (error) {
      console.error(error);
      this.notify('Failed to refresh data - Check your connection.', true);

      return;
    }
    if (this.isSignedIn(true)) {
      try {
        const assetBalances = await this.fetchAssetBalances(this.state.keys);
        combinedStateUpdate = { ...combinedStateUpdate, ...assetBalances};
      } catch (error) {
        console.error(error);
        this.notify('Failed to update asset balances - Check your connection.', true);
      }
    }
    if (combinedStateUpdate.priceHistory.length) {
      combinedStateUpdate.lastTradePrice = combinedStateUpdate.priceHistory[combinedStateUpdate.priceHistory.length - 1].price;
    } else {
      combinedStateUpdate.lastTradePrice = null;
    }
    await this.setState(combinedStateUpdate);
  }

  componentDidUpdate() {
    if (this.state.configurationLoaded && !this.intervalRegistered) {
      const locationProps = this.getPropsFromURL();
      this.activateMarket(locationProps.market);
      setInterval(async () => {
        this.updateUIWithNewData();
      }, this.state.configuration.refreshInterval);
      this.intervalRegistered = true;
    }
  }

  showSignIn = () => {
    this.setState({ displaySigninModal: true });
  }

  passphraseSubmit = async (payload) => {
    const newKeys = {};
    let atLeastOneKey = false;
    for (const asset in payload) {
      if (payload[asset] !== undefined) {
        atLeastOneKey = true;
        const passphrase = payload[asset].trim();
        if (!Mnemonic.validateMnemonic(passphrase, Mnemonic.wordlists.english)) {
          delete newKeys[asset];

          return false;
        }
        const { address } = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
        newKeys[asset] = { address, passphrase };
      }
    }

    // The keys need to be updated on the state before we fetch the order book.
    await this.setState((state) => ({
      quoteAssetBalance: null,
      baseAssetBalance: null,
      keys: {
        ...state.keys,
        ...newKeys
      },
    }));

    let combinedStateUpdate = {};
    if (atLeastOneKey) {
      let newOrderBookState;
      try {
        newOrderBookState = await this.fetchOrderBookState();
      } catch (error) {
        console.error(error);
        this.notify('Failed to fetch order book - Check your connection.', true);

        return false;
      }
      combinedStateUpdate = { ...newOrderBookState };

      try {
        const assetBalances = await this.fetchAssetBalances(this.state.keys);
        combinedStateUpdate = { ...combinedStateUpdate, ...assetBalances };
      } catch (error) {
        console.error(error);
        this.notify('Failed to fetch asset balances - Check your connection.', true);
      }
      await this.setState({
        ...combinedStateUpdate,
        displaySigninModal: false,
      });

      return true;
    }

    return false;
  }

  walletGenerated = (address) => {
    this.notify(`Created wallet ${address}! Please store the passphrase in a safe place!`);
  }

  closeSignInModal = () => {
    this.setState({ displaySigninModal: false });
  }

  signOut = async () => {
    await this.setState({ keys: {}, yourOrders: [] });
    await this.updateUIWithNewData();
  }

  setDisplayLeaveWarning = (val) => {
    this.setState({ displayLeaveWarning: val });
  }

  componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions);
    window.addEventListener('hashchange', this.locationHashChange, false);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions);
    window.removeEventListener('hashchange', this.locationHashChange, false);
  }

  isSignedIn(any) {
    if (!this.state.activeAssets[0] || !this.state.activeAssets[1]) {
      return false;
    }
    let quoteAssetInfo = this.state.keys[this.state.activeAssets[0]];
    let baseAssetInfo = this.state.keys[this.state.activeAssets[1]];
    if (any) {
      return quoteAssetInfo || baseAssetInfo;
    }
    return quoteAssetInfo && baseAssetInfo;
  }

  getActiveKeys() {
    const activeKeyMap = {};
    this.state.activeAssets.forEach((assetSymbol) => {
      activeKeyMap[assetSymbol] = this.state.keys[assetSymbol];
    });
    return activeKeyMap;
  }

  async fetchAssetBalances(assetInfos) {
    const client = axios.create();
    client.defaults.timeout = 10000;
    const balances = await Promise.all(
      this.state.activeAssets.map(async (asset) => {
        if (asset in assetInfos) {
          const targetEndpoint = this.state.configuration.assets[asset].apiUrl;
          try {
            const response = await client.get(`${targetEndpoint}/accounts?address=${assetInfos[asset].address}`);
            const balanceList = Array.isArray(response.data) ? response.data : response.data.data;
            if (balanceList.length > 0) {
              return balanceList[0].balance;
            }
          } catch (error) {
            console.error(error);
          }
        }
        return null;
      }),
    );
    return {
      baseAssetBalance: balances[0] || 0,
      quoteAssetBalance: balances[1] || 0,
    };
  }

  async activateMarket(activeMarket) {
    if (!activeMarket) {
      activeMarket = this.defaultMarket;
    }
    const activeAssets = activeMarket.split('/');
    await this.setState({
      yourOrders: [],
      orderBookData: {
        orders: [], bids: [], asks: [], maxSize: { bid: 0, ask: 0 },
      },
      lastTradePrice: null,
      baseAssetBalance: null,
      quoteAssetBalance: null,
      activeMarket,
      activeAssets,
    });
    await this.updateUIWithNewData();
  }

  getPropsFromURL() {
    const locationHash = window.location.hash.slice(1);
    const locationProps = locationHash.split('&')
      .map((part) => part.split('='))
      .reduce(
        (propAccumulator, keyValuePair) => {
          propAccumulator[keyValuePair[0]] = keyValuePair[1];
          return propAccumulator;
        },
        {},
      );
    return locationProps;
  }

  locationHashChange = (_event) => {
    const locationProps = this.getPropsFromURL();
    if (locationProps.market) {
      this.activateMarket(locationProps.market);
    } else if (this.defaultMarket) {
      this.activateMarket(this.defaultMarket);
    }
  }

  updateWindowDimensions = () => {
    this.setState({ windowWidth: window.innerWidth, windowHeight: window.innerHeight });
  }

  render() {
    if (!this.state.configurationLoaded) {
      return <div style={{ padding: '10px' }}>Loading...</div>;
    }
    return (
      <>
        <userContext.Provider value={{ ...this.state }}>
          {this.state.displaySigninModal && <SignInModal passphraseSubmit={this.passphraseSubmit} enabledAssets={this.state.activeAssets} close={this.closeSignInModal} walletGenerated={this.walletGenerated} />}
          {this.state.displayLeaveWarning && <LeaveWarning setDisplayLeaveWarning={this.setDisplayLeaveWarning} />}
          <div className="top-bar">
            <div>
              <b style={{ fontSize: '21px' }}>{this.state.configuration.appTitle}</b>
              {' '}
              &nbsp;
              <a className="feedback-link" style={{ fontSize: '14px' }} href={this.state.configuration.feedbackLink.url} rel="noopener noreferrer" target="_blank">{this.state.configuration.feedbackLink.text}</a>
            </div>
            <div>
              <SignInState className="sign-in-state" showSignIn={this.showSignIn} keys={this.getActiveKeys()} signedIn={this.isSignedIn()} signOut={this.signOut} />
              {' '}
              &nbsp;
              {this.isSignedIn(true) && (
                <button type="button" onClick={this.signOut} className="button-sign-out">
                  Sign out
                </button>
              )}
            </div>
          </div>
          <div className="container">
            <div className="notifications">
              {this.state.notifications.map((data) => <Notification key={data.id} data={data} />)}
            </div>
            <div className="sell-panel">
              <PlaceOrder side="ask" orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError} showEstimateInfo={this.showEstimateInfo} assetBalance={this.state.baseAssetBalance} />
            </div>
            <div className="buy-panel">
              <PlaceOrder side="bid" orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError} showEstimateInfo={this.showEstimateInfo} assetBalance={this.state.quoteAssetBalance} />
            </div>
            <div className="order-book-container">
              <div className="sell-orders">
                <OrderBook side="asks" orderBookData={this.state.orderBookData} assets={this.state.activeAssets} />
              </div>
              {this.state.lastTradePrice == null ? <div className="price-display" /> : (
                <div className="price-display">
                  Price:
                  {' '}
                  {this.state.lastTradePrice}
                  {' '}
                  {this.state.activeAssets[1].toUpperCase()}
                </div>
              )}
              <div className="buy-orders">
                <OrderBook side="bids" orderBookData={this.state.orderBookData} assets={this.state.activeAssets} />
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
              <MarketList configuration={this.state.configuration} activeMarket={this.state.activeMarket} signOut={this.signOut} />
            </div>
          </div>
        </userContext.Provider>
      </>
    );
  }
}

export default App;
