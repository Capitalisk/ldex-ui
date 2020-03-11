import axios from 'axios';
export const API_URL = 'http://54.174.172.179:7011';

const instance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'X-LiskDexUI-Version': '0.2' }
});

export async function getOrderbook() {
  const orders = await instance.get('/orders?sort=price:asc');
  console.log("HIT API");
  return orders;
}
