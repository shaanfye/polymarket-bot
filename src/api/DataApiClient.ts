import axios, { AxiosInstance } from 'axios';
import {
  DataApiActivityResponseSchema,
  DataApiActivity,
  UserPositionSchema,
  UserPosition,
  ClosedPositionSchema,
  ClosedPosition,
  MarketHoldersSchema,
  MarketHolders,
  OpenInterestSchema,
  OpenInterestData,
  LiveVolumeSchema,
  LiveVolumeData,
} from './types.js';

export interface ActivityQueryParams {
  user: string;
  limit?: number;
  offset?: number;
  market?: string[];
  eventId?: number[];
  type?: 'TRADE' | 'SPLIT' | 'MERGE' | 'REDEEM' | 'REWARD' | 'CONVERSION';
  start?: number;
  end?: number;
  sortBy?: 'TIMESTAMP' | 'TOKENS' | 'CASH';
  sortDirection?: 'ASC' | 'DESC';
  side?: 'BUY' | 'SELL';
}

export class DataApiClient {
  private client: AxiosInstance;
  private baseUrl = 'https://data-api.polymarket.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getUserActivity(params: ActivityQueryParams): Promise<DataApiActivity[]> {
    try {
      const queryParams: Record<string, unknown> = {
        user: params.user,
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
      };

      if (params.market) {
        queryParams.market = params.market.join(',');
      }

      if (params.eventId) {
        queryParams.eventId = params.eventId.join(',');
      }

      if (params.type) {
        queryParams.type = params.type;
      }

      if (params.start) {
        queryParams.start = params.start;
      }

      if (params.end) {
        queryParams.end = params.end;
      }

      if (params.sortBy) {
        queryParams.sortBy = params.sortBy;
      }

      if (params.sortDirection) {
        queryParams.sortDirection = params.sortDirection;
      }

      if (params.side) {
        queryParams.side = params.side;
      }

      const response = await this.client.get('/activity', {
        params: queryParams,
      });

      const activities = DataApiActivityResponseSchema.parse(response.data);
      return activities;
    } catch (error) {
      console.error(`Error fetching activity for user ${params.user}:`, error);
      throw error;
    }
  }

  async getRecentTrades(
    limit: number = 100,
    startTimestamp?: number,
    endTimestamp?: number
  ): Promise<DataApiActivity[]> {
    try {
      const response = await this.client.get('/trades', {
        params: {
          limit,
          start: startTimestamp,
          end: endTimestamp,
          sortBy: 'TIMESTAMP',
          sortDirection: 'DESC',
        },
      });

      const trades = DataApiActivityResponseSchema.parse(response.data);
      return trades;
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      return [];
    }
  }

  async getMarketTrades(
    conditionId: string,
    limit: number = 100,
    startTimestamp?: number
  ): Promise<DataApiActivity[]> {
    try {
      const response = await this.client.get('/trades', {
        params: {
          market: conditionId,
          limit,
          start: startTimestamp,
          sortBy: 'TIMESTAMP',
          sortDirection: 'DESC',
        },
      });

      const trades = DataApiActivityResponseSchema.parse(response.data);
      return trades;
    } catch (error) {
      console.error(`Error fetching trades for market ${conditionId}:`, error);
      return [];
    }
  }

  async getMarketTradesRaw(
    conditionId: string,
    limit: number = 100,
    startTimestamp?: number
  ): Promise<any[]> {
    try {
      const response = await this.client.get('/trades', {
        params: {
          market: conditionId,
          limit,
          start: startTimestamp,
        },
      });

      return response.data || [];
    } catch (error) {
      console.error(`Error fetching trades for market ${conditionId}:`, error);
      return [];
    }
  }

  // New API Methods for Smart Money Analysis

  async getUserPositions(
    user: string,
    options?: {
      market?: string;
      limit?: number;
      sortBy?: 'CASHPNL' | 'PERCENTPNL' | 'TOKENS';
    }
  ): Promise<UserPosition[]> {
    try {
      const queryParams: Record<string, unknown> = {
        user,
        limit: options?.limit ?? 100,
      };

      if (options?.market) {
        queryParams.market = options.market;
      }

      if (options?.sortBy) {
        queryParams.sortBy = options.sortBy;
      }

      const response = await this.client.get('/positions', {
        params: queryParams,
      });

      const positions = UserPositionSchema.array().parse(response.data);
      return positions;
    } catch (error) {
      console.error(`Error fetching positions for user ${user}:`, error);
      return [];
    }
  }

  async getUserClosedPositions(
    user: string,
    options?: {
      market?: string;
      limit?: number;
      sortBy?: 'REALIZEDPNL' | 'TIMESTAMP';
    }
  ): Promise<ClosedPosition[]> {
    try {
      const queryParams: Record<string, unknown> = {
        user,
        limit: options?.limit ?? 50,
      };

      if (options?.market) {
        queryParams.market = options.market;
      }

      if (options?.sortBy) {
        queryParams.sortBy = options.sortBy;
      }

      const response = await this.client.get('/v1/closed-positions', {
        params: queryParams,
      });

      const closedPositions = ClosedPositionSchema.array().parse(response.data);
      return closedPositions;
    } catch (error) {
      console.error(`Error fetching closed positions for user ${user}:`, error);
      return [];
    }
  }

  async getMarketHolders(
    conditionId: string,
    limit: number = 20
  ): Promise<MarketHolders[]> {
    try {
      const response = await this.client.get('/holders', {
        params: {
          market: conditionId,
          limit: Math.min(limit, 20), // Cap at 20 per API limit
        },
      });

      const holders = MarketHoldersSchema.array().parse(response.data);
      return holders;
    } catch (error) {
      console.error(`Error fetching holders for market ${conditionId}:`, error);
      return [];
    }
  }

  async getOpenInterest(markets: string[]): Promise<OpenInterestData[]> {
    try {
      const response = await this.client.get('/oi', {
        params: {
          market: markets.join(','),
        },
      });

      const openInterest = OpenInterestSchema.array().parse(response.data);
      return openInterest;
    } catch (error) {
      console.error(`Error fetching open interest for markets:`, error);
      return [];
    }
  }

  async getLiveVolume(eventId: number): Promise<LiveVolumeData | null> {
    try {
      const response = await this.client.get('/live-volume', {
        params: {
          id: eventId,
        },
      });

      const volumeData = LiveVolumeSchema.array().parse(response.data);
      return volumeData[0] || null;
    } catch (error) {
      console.error(`Error fetching live volume for event ${eventId}:`, error);
      return null;
    }
  }
}
