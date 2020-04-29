import axios from 'axios';

export function getClient(apiBaseUrl) {
  return axios.create({
    baseURL: apiBaseUrl,
    timeout: 10000,
    headers: { 'X-LiskDexUI-Version': '0.2' },
  });
}

export async function getOrderbook(instance) {
  const [{ data: bids }, { data: asks }] = await Promise.all([
    instance.get('/orders/bids?sort=price:desc'),
    instance.get('/orders/asks?sort=price:asc'),
  ]);
  return bids.concat(asks);
}

export async function getBidsFromWallet(instance, sourceWalletAddress) {
  return (await instance.get(`/orders/bids?sourceWalletAddress=${sourceWalletAddress}&sort=price:desc`)).data;
}

export async function getAsksFromWallet(instance, sourceWalletAddress) {
  return (await instance.get(`/orders/asks?sourceWalletAddress=${sourceWalletAddress}&sort=price:asc`)).data;
}

export async function getPendingTransfers(instance, targetAssetSymbol, recipientId) {
  return (await instance.get(`/transfers/pending?targetChain=${targetAssetSymbol}&recipientId=${recipientId}&sort=timestamp:desc`)).data;
}

export async function getProcessedHeights(instance) {
  const status = (await instance.get('/status')).data;
  return status.processedHeights;
}

export async function getConfig(instance) {
  return (await instance.get('/config.json')).data;
}
