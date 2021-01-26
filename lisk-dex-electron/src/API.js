import axios from 'axios';

export function getClient(apiBaseURL) {
  return axios.create({
    baseURL: apiBaseURL,
    timeout: 10000,
    headers: { 'X-LiskDexUI-Version': '0.2' },
  });
}

export async function getOrderBook(instance, orderBookDepth) {
  const { data: orderBook } = await instance.get(`/order-book?depth=${orderBookDepth}`);
  return orderBook;
}

export async function getBidsFromWallet(instance, sourceWalletAddress) {
  return (await instance.get(`/orders/bids?sourceWalletAddress=${sourceWalletAddress}`)).data;
}

export async function getAsksFromWallet(instance, sourceWalletAddress) {
  return (await instance.get(`/orders/asks?sourceWalletAddress=${sourceWalletAddress}`)).data;
}

export async function getPendingTransfers(instance, targetAssetSymbol, recipientAddress) {
  return (await instance.get(`/transfers/pending?targetChain=${targetAssetSymbol}&recipientId=${recipientAddress}`)).data;
}

export async function getRecentTransfers(instance, originOrderId) {
  return (await instance.get(`/transfers/recent?originOrderId=${originOrderId}`)).data;
}

export async function getProcessedHeights(instance) {
  const status = (await instance.get('/status')).data;
  return status.processedHeights;
}

export async function getPriceHistory(instance) {
  return (await instance.get('/prices/recent')).data;
}

export async function getConfig(instance) {
  if (process.env.REACT_APP_PRODUCTION) {
    return (await instance.get('config.json')).data;
  }
  return (await instance.get('config-dev.json')).data;
}
