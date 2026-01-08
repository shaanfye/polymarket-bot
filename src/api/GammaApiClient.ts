import axios, { AxiosInstance } from 'axios';
import { GammaMarketSchema, GammaEventSchema, GammaMarket, GammaEvent } from './types.js';
import { z } from 'zod';

export class GammaApiClient {
  private client: AxiosInstance;
  private baseUrl = 'https://gamma-api.polymarket.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getActiveMarkets(limit: number = 100, offset: number = 0): Promise<GammaMarket[]> {
    try {
      const response = await this.client.get('/markets', {
        params: {
          active: true,
          closed: false,
          archived: false,
          limit,
          offset,
        },
      });

      const marketsArray = z.array(GammaMarketSchema).parse(response.data);
      return marketsArray;
    } catch (error) {
      console.error('Error fetching active markets:', error);
      throw error;
    }
  }

  async getMarketBySlug(slug: string): Promise<GammaMarket | null> {
    try {
      const response = await this.client.get('/markets', {
        params: { slug },
      });

      if (!response.data || response.data.length === 0) {
        return null;
      }

      return GammaMarketSchema.parse(response.data[0]);
    } catch (error) {
      console.error(`Error fetching market ${slug}:`, error);
      throw error;
    }
  }

  async getMarketByConditionId(conditionId: string): Promise<GammaMarket | null> {
    try {
      // First try to search in events (more efficient for tracked markets)
      const eventsResponse = await this.client.get('/events', {
        params: {
          active: true,
          limit: 200,
        },
      });

      if (eventsResponse.data && eventsResponse.data.length > 0) {
        for (const event of eventsResponse.data) {
          if (event.markets && Array.isArray(event.markets)) {
            for (const market of event.markets) {
              if (market.conditionId === conditionId) {
                return GammaMarketSchema.parse(market);
              }
            }
          }
        }
      }

      // Fallback: Search all active markets
      let offset = 0;
      const limit = 100;
      const maxPages = 50; // Search up to 5000 markets

      for (let page = 0; page < maxPages; page++) {
        const response = await this.client.get('/markets', {
          params: {
            active: true,
            limit,
            offset,
          },
        });

        if (!response.data || response.data.length === 0) {
          break;
        }

        const markets = z.array(GammaMarketSchema).parse(response.data);
        const match = markets.find((m) => m.conditionId === conditionId);

        if (match) {
          return match;
        }

        offset += limit;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching market with condition ID ${conditionId}:`, error);
      throw error;
    }
  }

  async getActiveEvents(limit: number = 50, offset: number = 0): Promise<GammaEvent[]> {
    try {
      const response = await this.client.get('/events', {
        params: {
          active: true,
          closed: false,
          archived: false,
          limit,
          offset,
        },
      });

      const eventsArray = z.array(GammaEventSchema).parse(response.data);
      return eventsArray;
    } catch (error) {
      console.error('Error fetching active events:', error);
      throw error;
    }
  }

  async getEventBySlug(slug: string): Promise<GammaEvent | null> {
    try {
      const response = await this.client.get('/events', {
        params: { slug },
      });

      if (!response.data || response.data.length === 0) {
        return null;
      }

      return GammaEventSchema.parse(response.data[0]);
    } catch (error) {
      console.error(`Error fetching event ${slug}:`, error);
      throw error;
    }
  }
}
