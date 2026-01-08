import axios, { AxiosInstance } from 'axios';
import { ClobPriceSchema, ClobPrice } from './types.js';

export class ClobApiClient {
  private client: AxiosInstance;
  private baseUrl = 'https://clob.polymarket.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getPrice(tokenId: string, side: 'buy' | 'sell' = 'buy'): Promise<ClobPrice | null> {
    try {
      const response = await this.client.get('/price', {
        params: {
          token_id: tokenId,
          side,
        },
      });

      return ClobPriceSchema.parse(response.data);
    } catch (error) {
      console.error(`Error fetching price for token ${tokenId}:`, error);
      return null;
    }
  }

  async getOrderbook(tokenId: string): Promise<any> {
    try {
      const response = await this.client.get('/book', {
        params: {
          token_id: tokenId,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching orderbook for token ${tokenId}:`, error);
      return null;
    }
  }
}
