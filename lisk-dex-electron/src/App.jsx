import React from 'react';
import './App.css';

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
  getPriceHistory,
  getClient,
  getConfig,
} from './API';
import MarketList from './MarketList';
import Notification from './Notification';
import userContext from './context';
import LeaveWarning from './LeaveWarning';
import createRefinedGlobalConfig from './config/Configuration';
import { getNumericAssetBalance, GlobalConfiguration as GC } from './Utils';

// Import supported adapters.
import LiskAdapter from 'ldex-ui-lisk-adapter';
import LiskV3Adapter from 'ldex-ui-lisk-v3-adapter';
import LDPoSAdapter from 'ldex-ui-ldpos-adapter';

// The property names in this object can be used as the adapter 'type' in the config file.
const adapterClasses = {
  lisk: LiskAdapter,
  lisk3: LiskV3Adapter,
  ldpos: LDPoSAdapter,
};

const NOTIFICATIONS_MAX_QUEUE_LENGTH = 3;
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
    };

    this.notificationId = 0;
    this.intervalRegistered = false;
    this.assetAdapters = {};
    this.load();
  }

  getDexClient() {
    return getClient(GC.getMarketApiURL(this.state.activeMarket));
  }

  async load() {
    const localClient = getClient('');
    const defaultConfiguration = await getConfig(localClient);
    const config = await createRefinedGlobalConfig(defaultConfiguration);
    // set global config
    GC.setConfig(config);
    this.initPendingOrders(GC.getMarketNames());
    const enabledAssets = GC.getAssetNames();
    for (const asset of enabledAssets) {
      const assetConfig = GC.getAsset(asset);
      const adapterConfig = { chainSymbol: asset, ...assetConfig.adapter };
      const AssetAdapterClass = adapterClasses[adapterConfig.type];
      if (!AssetAdapterClass) {
        throw new Error(
          `The ${adapterConfig.type} adapter type is not supported`
        );
      }
      const assetAdapter = new AssetAdapterClass(adapterConfig);
      this.assetAdapters[asset] = assetAdapter;
    }

    await this.setState({
      configuration: GC.getConfig(),
      activeMarket: GC.getDefaultActiveMarketName(),
      activeAssets: GC.getMarketAssets(GC.getDefaultActiveMarketName()),
      enabledAssets,
      assetAdapters: this.assetAdapters,
      configurationLoaded: true,
    });
  }

  getTransactionMessage(transaction) {
    return transaction.message || '';
  }

  getTakerOrderIdFromTransaction(transaction) {
    const transactionData = this.getTransactionMessage(transaction);
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
    const transactionData = this.getTransactionMessage(transaction);
    const header = transactionData.split(':')[0];
    return header.split(',')[0] === 't1';
  }

  isMakerTransaction(transaction) {
    const transactionData = this.getTransactionMessage(transaction);
    const header = transactionData.split(':')[0];
    return header.split(',')[0] === 't2';
  }

  _getExpectedCounterpartyTransactionCount(transaction) {
    const transactionData = this.getTransactionMessage(transaction);
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
    const baseChain = this.state.activeAssets[1];
    const unitValue = Number(GC.getAssetUnitValue(baseChain));
    const timeOffset = Number(GC.getAssetTimeOffset(baseChain));
    const timeMultiplier = Number(GC.getAssetTimeMultiplier(baseChain));
    const dexClient = this.getDexClient();
    const priceHistory = (await getPriceHistory(dexClient)).map((historyItem) => {
      return {
        ...historyItem,
        baseTimestamp: Math.round(historyItem.baseTimestamp * timeMultiplier + timeOffset),
        volume: Math.round(Number(historyItem.volume) * 100 / unitValue) / 100
      };
    });
    priceHistory.reverse();
    const priceDecimalPrecision = this.getPriceDecimalPrecision();
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

  orderCancel = (order) => {
    const chainSymbol = order.sourceChain.toUpperCase();

    order.status = 'canceling';
    this.pendingOrders[this.state.activeMarket][order.id] = order;
    this.savePendingOrders();

    let message;
    if (order.type === 'limit') {
      message = `A cancel order was submitted for the limit order with amount ${
        getNumericAssetBalance(order.value || order.size, order.sourceChain)
      } ${chainSymbol} at price ${
        order.price
      }`;
    } else {
      message = `A cancel order was submitted for the market order with amount ${
        getNumericAssetBalance(order.value || order.size, order.sourceChain)
      } ${chainSymbol}`;
    }
    this.notify(message);

    this.setState(({ yourOrders }) => ({
      yourOrders,
    }));
  }

  showEstimateInfo = async (message) => {
    this.notify(message);
  }

  _prepareErrorMessage = (error) => {
    let errorDetails;
    if (
      error.response &&
      error.response.data
    ) {
      if (
        error.response.data.errors &&
        error.response.data.errors.length &&
        error.response.data.errors[0].message != null
      ) {
        errorDetails = error.response.data.errors[0].message;
      } else if (
        error.response.data.message != null
      ) {
        errorDetails = error.response.data.message;
      }
    }
    if (errorDetails == null) {
      errorDetails = error.message;
    }
    return errorDetails;
  }

  orderSubmitError = async (error) => {
    const { order } = error;
    const errorDetails = this._prepareErrorMessage(error);

    const chainSymbol = order.sourceChain.toUpperCase();
    let message;
    if (order.type === 'limit') {
      message = `Failed to submit the limit order with amount ${
        getNumericAssetBalance(order.value || order.size, order.sourceChain)
      } ${chainSymbol} at price ${
        order.price
      } - ${errorDetails}.`;
    } else {
      message = `Failed to submit the market order with amount ${
        getNumericAssetBalance(order.value || order.size, order.sourceChain)
      } ${chainSymbol} - ${errorDetails}.`;
    }
    console.error(error);
    this.notify(message, true);
  }

  orderSubmit = async (order) => {
    const pendingOrderExpiry = GC.getMarketPendingOrderExpiry(this.state.activeMarket);
    order.submitExpiryTime = Date.now() + pendingOrderExpiry;
    order.status = 'pending';

    this.pendingOrders[this.state.activeMarket][order.id] = order;
    this.savePendingOrders();

    await this.setState(({ yourOrders, activeMarket }) => {
      const yourOrderMap = {};
      for (const yourOrder of yourOrders) {
        yourOrderMap[yourOrder.id] = yourOrder;
      }
      const pendingMarketOrders = Object.values(this.pendingOrders[activeMarket] || {});

      for (const pendingOrder of pendingMarketOrders) {
        yourOrderMap[pendingOrder.id] = pendingOrder;
      }
      return {
        yourOrders: Object.values(yourOrderMap),
      };
    });

    const orderDexAddress = GC.getMarketChainWalletAddress(this.state.activeMarket, order.sourceChain);
    const chainSymbol = order.sourceChain.toUpperCase();

    let message;
    if (order.type === 'limit') {
      message = `A limit order with amount ${
        getNumericAssetBalance(order.value || order.size, order.sourceChain)
      } ${chainSymbol} at price ${
        order.price
      } was submitted to the DEX address ${
        orderDexAddress
      } on the ${chainSymbol} blockchain`;
    } else {
      message = `A market order with amount ${
        getNumericAssetBalance(order.value || order.size, order.sourceChain)
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
    }, GC.getNotificationDuration());

    this.setState({
      notifications: updatedNotifications,
    });
  }

  getTransferType(pendingTransfer) {
    return (pendingTransfer.type || '').charAt(0);
  }

  getInitiatingOrderId(pendingTransfer) {
    if (pendingTransfer.type === 'r3') {
      return pendingTransfer.closerOrderId || null;
    }
    return pendingTransfer.originOrderId || null;
  }

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

  orderBelongsToCurrentUser(order) {
    let loggedInUser = this.state.keys[order.sourceChain];
    if (!loggedInUser) {
      return false;
    }
    return order.senderAddress === loggedInUser.address;
  }

  async fetchOrderBookState() {
    const dexClient = this.getDexClient();

    const quoteAsset = this.state.activeAssets[0];
    const baseAsset = this.state.activeAssets[1];

    const { activeMarket } = this.state;
    const { orderBookDepth } = GC.getMarket(activeMarket) || {};

    const orderBookDataAPIResults = [
      getOrderBook(dexClient, orderBookDepth ?? DEFAULT_ORDER_BOOK_DEPTH),
    ];
    let quoteWalletAddress;
    let baseWalletAddress;

    if (this.state.keys[quoteAsset]) {
      quoteWalletAddress = this.state.keys[quoteAsset].address;
      orderBookDataAPIResults.push(getAsksFromWallet(dexClient, quoteWalletAddress));
    } else {
      orderBookDataAPIResults.push(Promise.resolve([]));
    }
    if (this.state.keys[baseAsset]) {
      baseWalletAddress = this.state.keys[baseAsset].address;
      orderBookDataAPIResults.push(getBidsFromWallet(dexClient, baseWalletAddress));
    } else {
      orderBookDataAPIResults.push(Promise.resolve([]));
    }

    const [
      orderLevels,
      yourAsks,
      yourBids,
    ] = await Promise.all(orderBookDataAPIResults);

    await this.updatePendingOrders();
    const pendingTransfersAPIResults = [];

    if (this.state.keys[quoteAsset]) {
      quoteWalletAddress = this.state.keys[quoteAsset].address;
      pendingTransfersAPIResults.push(getPendingTransfers(dexClient, quoteAsset, quoteWalletAddress));
    } else {
      pendingTransfersAPIResults.push(Promise.resolve([]));
    }
    if (this.state.keys[baseAsset]) {
      baseWalletAddress = this.state.keys[baseAsset].address;
      pendingTransfersAPIResults.push(getPendingTransfers(dexClient, baseAsset, baseWalletAddress));
    } else {
      pendingTransfersAPIResults.push(Promise.resolve([]));
    }

    const [
      pendingQuoteAssetTransfers,
      pendingBaseAssetTransfers,
    ] = await Promise.all(pendingTransfersAPIResults);

    const yourOpenOrders = [...yourAsks, ...yourBids];

    const bids = [];
    const asks = [];
    const maxSize = { bid: 0, ask: 0 };
    const yourOrderMap = {};

    const pendingTransfers = [...pendingBaseAssetTransfers, ...pendingQuoteAssetTransfers];
    const takerTradeTransfers = pendingTransfers.filter(transfer => transfer.type === 't1');
    const takerTradeOrderIds = new Set(takerTradeTransfers.map(transfer => transfer.takerOrderId));

    const makerTradeTransfers = pendingTransfers.filter(transfer => transfer.type === 't2');
    const makerTradeOrderIds = new Set(makerTradeTransfers.map(transfer => transfer.makerOrderId));

    const unmatchedMarketPartTransfers = pendingTransfers.filter(transfer => transfer.type === 'r4');
    const unmatchedMarketPartOrderIds = new Set(unmatchedMarketPartTransfers.map(transfer => transfer.originOrderId));

    const rejectedTransfers = pendingTransfers.filter(transfer => transfer.type === 'r1' || transfer.type === 'r5' || transfer.type === 'r6');
    const rejectedOrderIds = new Set(rejectedTransfers.map(transfer => transfer.originOrderId));

    for (const yourOrder of yourOpenOrders) {
      yourOrder.status = 'ready';
      yourOrderMap[yourOrder.id] = yourOrder;
    }

    const pendingOrdersForActiveMarket = Object.values(this.pendingOrders[activeMarket]);
    const cancelingOrders = pendingOrdersForActiveMarket.filter(pendingOrder => pendingOrder.status === 'canceling');
    const pendingTradeOrders = pendingOrdersForActiveMarket.filter(pendingOrder => pendingOrder.status === 'pending');
    const processingTradeOrders = pendingOrdersForActiveMarket.filter(pendingOrder => pendingOrder.status === 'processing');
    const matchingTradeOrders = pendingOrdersForActiveMarket.filter(pendingOrder => pendingOrder.status === 'matching');
    const tradeOrders = [...pendingTradeOrders, ...processingTradeOrders, ...matchingTradeOrders];

    for (const order of cancelingOrders) {
      const yourOrder = yourOrderMap[order.id];
      if (yourOrder) {
        yourOrder.status = 'canceling';
      } else if (this.orderBelongsToCurrentUser(order)) {
        yourOrderMap[order.id] = order;
      }
    }

    for (const order of tradeOrders) {
      if (takerTradeOrderIds.has(order.id)) {
        order.status = 'processing';
      } else if (makerTradeOrderIds.has(order.id)) {
        order.status = 'matching';
      } else if (unmatchedMarketPartOrderIds.has(order.id)) {
        order.status = 'canceling';
      } else if (rejectedOrderIds.has(order.id)) {
        order.status = 'canceling';
      }
      const yourOrder = yourOrderMap[order.id];
      if (yourOrder) {
        if (order.status === 'pending' || order.status === 'matching') {
          delete this.pendingOrders[activeMarket][order.id];
          yourOrder.status = 'ready';
        } else {
          yourOrder.status = order.status;
        }
      } else if (this.orderBelongsToCurrentUser(order)) {
        yourOrderMap[order.id] = order;
      }
    }

    const yourOrderIds = new Set(yourOpenOrders.map(yourOrder => yourOrder.id));
    const previousYourOrders = this.state.yourOrders;
    const yourOutOfBookOrders = previousYourOrders.filter(yourOrder => !yourOrderIds.has(yourOrder.id));

    for (const order of yourOpenOrders) {
      let isPendingOutbound = false;
      if (takerTradeOrderIds.has(order.id)) {
        order.status = 'processing';
        isPendingOutbound = true;
      } else if (makerTradeOrderIds.has(order.id)) {
        order.status = 'matching';
        isPendingOutbound = true;
      }
      if (isPendingOutbound && order.type === 'limit') {
        this.pendingOrders[activeMarket][order.id] = order;
        if (this.orderBelongsToCurrentUser(order)) {
          yourOrderMap[order.id] = order;
        }
      }
    }

    for (const order of yourOutOfBookOrders) {
      let isPendingOutbound = false;
      if (takerTradeOrderIds.has(order.id)) {
        order.status = 'processing';
        isPendingOutbound = true;
      } else if (makerTradeOrderIds.has(order.id)) {
        order.status = 'matching';
        isPendingOutbound = true;
      }
      if (isPendingOutbound && order.type === 'limit') {
        this.pendingOrders[activeMarket][order.id] = order;
        if (this.orderBelongsToCurrentUser(order)) {
          yourOrderMap[order.id] = order;
        }
      }
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

    let yourOrders = Object.values(yourOrderMap);
    for (let order of yourOrders) {
      let existingPendingOrder = this.pendingOrders[activeMarket][order.id];
      if (existingPendingOrder && existingPendingOrder.submitExpiryTime != null) {
        order.submitExpiryTime = existingPendingOrder.submitExpiryTime;
      } else {
        const pendingOrderExpiry = GC.getMarketPendingOrderExpiry(activeMarket);
        order.submitExpiryTime = Date.now() + pendingOrderExpiry;
      }
    }

    const newState = {
      orderBookData: { bids, asks, maxSize },
      priceDecimalPrecision: this.getPriceDecimalPrecision(),
      maxBid,
      minAsk,
      yourOrders,
    };
    return newState;
  }

  getPriceDecimalPrecision() {
    return GC.getMarketPriceDecimalPrecision(this.state.activeMarket) ?? DEFAULT_PRICE_DECIMAL_PRECISION;
  }

  async updatePendingOrders() {
    const pendingMarketSymbols = Object.keys(this.pendingOrders);
    const marketCompletedOrders = await Promise.all(
      pendingMarketSymbols.map(async (market) => {
        const dexClient = getClient(GC.getMarketApiURL(market));
        const pendingOrders = Object.values(this.pendingOrders[market]);

        if (!pendingOrders.length) {
          return {
            market,
            completedOrders: [],
          };
        }
        try {
          const processedOrExpiredTransfers = await Promise.all(
            pendingOrders.map(async (order) => {
              if (order.submitExpiryTime == null || Date.now() >= order.submitExpiryTime) {
                return order.id;
              }
              const result = await getRecentTransfers(dexClient, order.id);
              return result && result.length ? order.id : null;
            }),
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
          completedOrders: [],
        };
      }),
    );
    const completedOrderIds = [];
    for (const { market, completedOrders } of marketCompletedOrders) {
      for (const orderId of completedOrders) {
        completedOrderIds.push(orderId);
        delete this.pendingOrders[market][orderId];
      }
    }
    return completedOrderIds;
  }

  async updateUIWithNewData() {
    let combinedStateUpdate = {};
    try {
      let newPriceHistoryState = await this.fetchPriceHistoryStateFromDEX();
      combinedStateUpdate = { ...newPriceHistoryState };
    } catch (error) {
      console.error(error);
      this.notify('Failed to update price history - Check your connection.', true);

      return;
    }
    if (this.isSignedIn(true)) {
      try {
        const assetBalances = await this.fetchAssetBalances(this.state.keys);
        combinedStateUpdate = { ...combinedStateUpdate, ...assetBalances };
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

    try {
      let newOrderBookState = await this.fetchOrderBookState();
      combinedStateUpdate = { ...combinedStateUpdate, ...newOrderBookState };
    } catch (error) {
      console.error(error);
      this.notify('Failed to update order book - Check your connection.', true);

      return;
    }

    await this.setState(combinedStateUpdate);
  }

  componentDidUpdate() {
    if (this.state.configurationLoaded && !this.intervalRegistered) {
      const locationProps = this.getPropsFromURL();
      this.activateMarket(locationProps.market);
      setInterval(async () => {
        this.updateUIWithNewData();
      }, GC.getRefreshInterval());
      this.intervalRegistered = true;
    }
  }

  showSignIn = () => {
    this.notify(
      <span>
        <span style={{ color: 'red' }}>Be careful!</span>
        <span>
          {' '}
          {'Never share your passphrase with anyone! Only enter your passphrase in '}
          {'applications you trust and which are obtained from official sources. '}
          {'It is strongly recommended that you provide a separate passphrase for every '}
          {'chain you will trade across.'}
        </span>
      </span>
    );
    this.setState({ displaySigninModal: true });
  }

  submitLoginDetails = async (assetLoginDetails) => {
    const newKeys = {};
    let atLeastOneKey = false;
    for (const asset in assetLoginDetails) {
      if (assetLoginDetails[asset] && assetLoginDetails[asset].passphrase && assetLoginDetails[asset].address) {
        const passphrase = assetLoginDetails[asset].passphrase.trim();
        const address = assetLoginDetails[asset].address.trim();
        const assetAdapter = this.assetAdapters[asset];
        let isPassphraseValid = assetAdapter.validatePassphrase({ passphrase });
        if (!isPassphraseValid) {
          delete newKeys[asset];
          return false;
        }
        try {
          await assetAdapter.connect({ passphrase });
          newKeys[asset] = { address, passphrase };
          atLeastOneKey = true;
        } catch (error) {
          this.notify(`Failed to login to asset ${asset} - Check that your wallet details are correct`, true);
          return false;
        }
      }
    }

    // The keys need to be updated on the state before we fetch the order book.
    await this.setState((state) => ({
      quoteAssetBalance: null,
      baseAssetBalance: null,
      keys: {
        ...state.keys,
        ...newKeys,
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
    window.addEventListener('hashchange', this.locationHashChange, false);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.locationHashChange, false);
  }

  isSignedIn(any) {
    if (!this.state.activeAssets[0] || !this.state.activeAssets[1]) {
      return false;
    }
    const quoteAssetInfo = this.state.keys[this.state.activeAssets[0]];
    const baseAssetInfo = this.state.keys[this.state.activeAssets[1]];
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
    const balances = await Promise.all(
      this.state.activeAssets.map(async (asset) => {
        if (asset in assetInfos) {
          let address = assetInfos[asset].address;
          try {
            return await this.assetAdapters[asset].getAccountBalance({
              address,
            });
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
      activeMarket = this.state.activeMarket;
    }
    const activeAssets = GC.getMarketAssets(activeMarket);
    // We need to await setState or else this.updateUIWithNewData() may use the previous market state.
    await this.setState({
      yourOrders: Object.values(this.pendingOrders[activeMarket] || {}),
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
    }
  }

  render() {
    if (!this.state.configurationLoaded) {
      return <div style={{ padding: '10px' }}>Loading...</div>;
    }
    return (
      <>
        <userContext.Provider value={{ ...this.state }}>
          {this.state.displaySigninModal && <SignInModal submitLoginDetails={this.submitLoginDetails} enabledAssets={this.state.activeAssets} close={this.closeSignInModal} walletGenerated={this.walletGenerated} assetAdapters={this.assetAdapters} />}
          {this.state.displayLeaveWarning && <LeaveWarning setDisplayLeaveWarning={this.setDisplayLeaveWarning} />}
          <div className="top-bar">
            <div className="top-bar-title">
              <b style={{ fontSize: '21px' }}>{GC.getAppTitle()}</b>
              {' '}
              &nbsp;
              <a className="feedback-link" style={{ fontSize: '14px' }} href={GC.getFeedbackLink()} rel="noopener noreferrer" target="_blank">{GC.getFeedbackText()}</a>
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
              <PlaceOrder side="ask" activeMarket={this.state.activeMarket} orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError} showEstimateInfo={this.showEstimateInfo} assetBalance={this.state.baseAssetBalance} assetAdapters={this.assetAdapters} />
            </div>
            <div className="buy-panel">
              <PlaceOrder side="bid" activeMarket={this.state.activeMarket} orderSubmit={this.orderSubmit} orderSubmitError={this.orderSubmitError} showEstimateInfo={this.showEstimateInfo} assetBalance={this.state.quoteAssetBalance} assetAdapters={this.assetAdapters} />
            </div>
            <div className="order-book-container">
              <div className="sell-orders-title">Asks</div>
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
              <div className="buy-orders-title">Bids</div>
            </div>
            <div className="price-chart">
              <PriceHistoryChart
                key="price-history-chart"
                type="hybrid"
                market={this.state.activeMarket}
                assets={this.state.activeAssets}
                data={this.state.priceHistory}
              />
            </div>
            <div className="your-orders">
              <YourOrders orders={this.state.yourOrders} orderCanceled={this.orderCancel} handleCancelFail={this.orderCancelFail} />
            </div>
            <div className="market-name-and-stats">
              <MarketList activeMarket={this.state.activeMarket} signOut={this.signOut} />
            </div>
          </div>
        </userContext.Provider>
      </>
    );
  }
}

export default App;
