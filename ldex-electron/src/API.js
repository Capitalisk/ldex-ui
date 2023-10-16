import axios from 'axios';

export function getClient(apiBaseURL) {
  return axios.create({
    baseURL: apiBaseURL,
    timeout: 20000
  });
}

export async function getOrderBook(instance, orderBookDepth) {
  const { data: orderBook } = await instance.get(`/order-book?depth=${orderBookDepth}`);
  return orderBook.map((orderLvl) => {
    if (orderLvl.side === 'ask') {
      return {
        ...orderLvl,
        sizeRemaining: Number(orderLvl.sizeRemaining)
      };
    }
    return {
      ...orderLvl,
      valueRemaining: Number(orderLvl.valueRemaining)
    };
  });
}

export async function getBidsFromWallet(instance, sourceWalletAddress) {
  return (await instance.get(`/orders/bids?sourceWalletAddress=${encodeURIComponent(sourceWalletAddress)}`)).data;
}

export async function getAsksFromWallet(instance, sourceWalletAddress) {
  return (await instance.get(`/orders/asks?sourceWalletAddress=${encodeURIComponent(sourceWalletAddress)}`)).data;
}

export async function getPendingTransfers(instance, targetAssetSymbol, recipientAddress) {
  return (await instance.get(`/transfers/pending?targetChain=${targetAssetSymbol}&recipientId=${encodeURIComponent(recipientAddress)}`)).data;
}

export async function getRecentTransfers(instance, orderId) {
  let [ takerResult, makerResult, originResult ] = await Promise.all([
    instance.get(`/transfers/recent?takerOrderId=${encodeURIComponent(orderId)}`),
    instance.get(`/transfers/recent?makerOrderId=${encodeURIComponent(orderId)}`),
    instance.get(`/transfers/recent?originOrderId=${encodeURIComponent(orderId)}`)
  ]);
  return [ ...takerResult.data, ...makerResult.data, ...originResult.data ];
}

export async function getProcessedHeights(instance) {
  const status = (await instance.get('/status')).data;
  return status.processedHeights;
}

export async function getPriceHistory(instance, offset, limit) {
  return (await instance.get('/prices/recent')).data;
}

export async function getConfig(instance) {
  if (process.env.NODE_ENV === 'development') {
    return (await instance.get('config-dev.json')).data;
  }
  return (await instance.get('config.json')).data;
}
