import axios, { AxiosInstance } from 'axios';

export function getClient(api_base_url: string) {
  return axios.create({
    baseURL: api_base_url,
    timeout: 10000,
    headers: { 'X-LiskDexUI-Version': '0.2' }
  });
}

export async function getOrderbook(instance: AxiosInstance) {
  const [{data: bids}, {data: asks}] = await Promise.all([
    instance.get('/orders/bids?sort=price:desc'),
    instance.get('/orders/asks?sort=price:asc')
  ]);
  return bids.concat(asks);
}

export async function getPendingTransfers(instance: AxiosInstance, targetAssetSymbol: string, recipientId: string) {
  const transfers: Array<any> = (await instance.get(`/transfers/pending?targetChain=${targetAssetSymbol}&sort=timestamp:desc`)).data; // TODO 22 use query params to filter by transfer recipientId
  return transfers.filter(transfer => transfer.transaction.recipientId === recipientId);
}
