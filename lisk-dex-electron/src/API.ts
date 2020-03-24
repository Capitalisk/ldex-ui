import axios, { AxiosInstance } from 'axios';

export function getClient(api_base_url: string) {
  return axios.create({
    baseURL: api_base_url,
    timeout: 10000,
    headers: { 'X-LiskDexUI-Version': '0.2' }
  });
}

export async function getOrderbook(instance: AxiosInstance) {
  const orders = await instance.get('/orders?sort=price:asc');
  //console.log("HIT API");
  return orders;
}
