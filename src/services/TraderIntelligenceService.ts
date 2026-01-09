import { DataApiClient } from '../api/DataApiClient.js';
import { UserPosition } from '../api/types.js';

export interface TraderPnLSummary {
  totalRealizedPnl: number;
  totalCashPnl: number;
  totalPnl: number;
  openPositionsCount: number;
  closedPositionsCount: number;
}

export class TraderIntelligenceService {
  private dataClient: DataApiClient;
  private cache: Map<string, { data: TraderPnLSummary; timestamp: number }>;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.dataClient = new DataApiClient();
    this.cache = new Map();
  }

  async getTraderLifetimePnL(userAddress: string): Promise<TraderPnLSummary> {
    // Check cache first
    const cached = this.cache.get(userAddress);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Fetch all open positions
      const openPositions = await this.dataClient.getUserPositions(userAddress, {
        limit: 500,
      });

      // Fetch all closed positions
      const closedPositions = await this.dataClient.getUserClosedPositions(userAddress, {
        limit: 50,
      });

      // Calculate total realized P&L from both sources
      const totalRealizedPnl =
        openPositions.reduce((sum, pos) => sum + pos.realizedPnl, 0) +
        closedPositions.reduce((sum, pos) => sum + pos.realizedPnl, 0);

      // Calculate total unrealized P&L from open positions
      const totalCashPnl = openPositions.reduce((sum, pos) => sum + pos.cashPnl, 0);

      // Total P&L = realized + unrealized
      const totalPnl = totalRealizedPnl + totalCashPnl;

      const summary: TraderPnLSummary = {
        totalRealizedPnl,
        totalCashPnl,
        totalPnl,
        openPositionsCount: openPositions.length,
        closedPositionsCount: closedPositions.length,
      };

      // Cache the result
      this.cache.set(userAddress, {
        data: summary,
        timestamp: Date.now(),
      });

      return summary;
    } catch (error) {
      console.error(`Error calculating P&L for trader ${userAddress}:`, error);
      return {
        totalRealizedPnl: 0,
        totalCashPnl: 0,
        totalPnl: 0,
        openPositionsCount: 0,
        closedPositionsCount: 0,
      };
    }
  }

  async getTraderPosition(
    userAddress: string,
    conditionId: string
  ): Promise<UserPosition | null> {
    try {
      const positions = await this.dataClient.getUserPositions(userAddress, {
        market: conditionId,
        limit: 1,
      });

      return positions.length > 0 ? positions[0] : null;
    } catch (error) {
      console.error(`Error fetching position for trader ${userAddress} in market ${conditionId}:`, error);
      return null;
    }
  }

  async getTraderName(userAddress: string): Promise<string> {
    try {
      // Try to get name from any open position
      const positions = await this.dataClient.getUserPositions(userAddress, {
        limit: 1,
      });

      if (positions.length > 0 && positions[0].proxyWallet) {
        // For now, return truncated address (could enhance with user profile API)
        return `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      }

      return `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    } catch (error) {
      return `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
