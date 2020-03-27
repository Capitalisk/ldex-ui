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
