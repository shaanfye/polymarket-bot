import { DataApiClient } from '../api/DataApiClient.js';
import { Holder } from '../api/types.js';
import { TraderIntelligenceService } from './TraderIntelligenceService.js';

export interface HolderInfo {
  address: string;
  name: string;
  amount: number;
  pnl: number;              // Total P&L (realized + unrealized)
  realizedPnL: number;      // Locked in profits/losses
  unrealizedPnL: number;    // Current open position P&L
}

export interface HolderDistribution {
  yesHolders: HolderInfo[];
  noHolders: HolderInfo[];
  yesConcentration: number;
  noConcentration: number;
  totalYesAmount: number;
  totalNoAmount: number;
}

export interface SidePnLAnalysis {
  yesSidePnL: number;
  noSidePnL: number;
  yesSideAvgPnL: number;
  noSideAvgPnL: number;
  smarterSide: 'YES' | 'NO';
  distribution: HolderDistribution; // Include the updated distribution
}

export class SmartMoneyAnalyzer {
  private dataClient: DataApiClient;
  private traderIntel: TraderIntelligenceService;

  constructor() {
    this.dataClient = new DataApiClient();
    this.traderIntel = new TraderIntelligenceService();
  }

  async analyzeHolderDistribution(conditionId: string): Promise<HolderDistribution> {
    try {
      const holdersData = await this.dataClient.getMarketHolders(conditionId, 20);

      if (holdersData.length === 0) {
        return {
          yesHolders: [],
          noHolders: [],
          yesConcentration: 0,
          noConcentration: 0,
          totalYesAmount: 0,
          totalNoAmount: 0,
        };
      }

      // Holders come back as array of {token, holders[]}
      // We need to split by outcomeIndex (0 = Yes, 1 = No)
      const allHolders: Holder[] = [];
      for (const tokenData of holdersData) {
        allHolders.push(...tokenData.holders);
      }

      // Split by outcome
      const yesHolders = allHolders.filter((h) => h.outcomeIndex === 0);
      const noHolders = allHolders.filter((h) => h.outcomeIndex === 1);

      // Calculate totals
      const totalYesAmount = yesHolders.reduce((sum, h) => sum + h.amount, 0);
      const totalNoAmount = noHolders.reduce((sum, h) => sum + h.amount, 0);

      // Calculate concentration (% held by top 5)
      const top5Yes = yesHolders.slice(0, 5).reduce((sum, h) => sum + h.amount, 0);
      const top5No = noHolders.slice(0, 5).reduce((sum, h) => sum + h.amount, 0);

      const yesConcentration = totalYesAmount > 0 ? (top5Yes / totalYesAmount) * 100 : 0;
      const noConcentration = totalNoAmount > 0 ? (top5No / totalNoAmount) * 100 : 0;

      // Convert to HolderInfo format (without P&L for now)
      const yesHolderInfo: HolderInfo[] = yesHolders.map((h) => ({
        address: h.proxyWallet,
        name: h.pseudonym || h.name || `${h.proxyWallet.slice(0, 6)}...${h.proxyWallet.slice(-4)}`,
        amount: h.amount,
        pnl: 0, // Will be calculated separately in calculateSidePnL
        realizedPnL: 0,
        unrealizedPnL: 0,
      }));

      const noHolderInfo: HolderInfo[] = noHolders.map((h) => ({
        address: h.proxyWallet,
        name: h.pseudonym || h.name || `${h.proxyWallet.slice(0, 6)}...${h.proxyWallet.slice(-4)}`,
        amount: h.amount,
        pnl: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
      }));

      return {
        yesHolders: yesHolderInfo,
        noHolders: noHolderInfo,
        yesConcentration,
        noConcentration,
        totalYesAmount,
        totalNoAmount,
      };
    } catch (error) {
      console.error(`Error analyzing holder distribution for market ${conditionId}:`, error);
      return {
        yesHolders: [],
        noHolders: [],
        yesConcentration: 0,
        noConcentration: 0,
        totalYesAmount: 0,
        totalNoAmount: 0,
      };
    }
  }

  async calculateSidePnL(conditionId: string): Promise<SidePnLAnalysis> {
    try {
      // Get holder distribution first
      const distribution = await this.analyzeHolderDistribution(conditionId);

      // Fetch P&L for all Yes holders and UPDATE the holder objects
      const yesPnLs = await Promise.all(
        distribution.yesHolders.map(async (holder) => {
          try {
            const pnl = await this.traderIntel.getTraderLifetimePnL(holder.address);
            holder.pnl = pnl.totalPnl; // Total P&L
            holder.realizedPnL = pnl.totalRealizedPnl; // Locked in
            holder.unrealizedPnL = pnl.totalCashPnl; // At risk
            return pnl.totalPnl;
          } catch (error) {
            console.error(`Error fetching P&L for ${holder.address}:`, error);
            holder.pnl = 0;
            holder.realizedPnL = 0;
            holder.unrealizedPnL = 0;
            return 0;
          }
        })
      );

      // Fetch P&L for all No holders and UPDATE the holder objects
      const noPnLs = await Promise.all(
        distribution.noHolders.map(async (holder) => {
          try {
            const pnl = await this.traderIntel.getTraderLifetimePnL(holder.address);
            holder.pnl = pnl.totalPnl; // Total P&L
            holder.realizedPnL = pnl.totalRealizedPnl; // Locked in
            holder.unrealizedPnL = pnl.totalCashPnl; // At risk
            return pnl.totalPnl;
          } catch (error) {
            console.error(`Error fetching P&L for ${holder.address}:`, error);
            holder.pnl = 0;
            holder.realizedPnL = 0;
            holder.unrealizedPnL = 0;
            return 0;
          }
        })
      );

      // Calculate totals
      const yesSidePnL = yesPnLs.reduce((sum, pnl) => sum + pnl, 0);
      const noSidePnL = noPnLs.reduce((sum, pnl) => sum + pnl, 0);

      // Calculate averages
      const yesSideAvgPnL = yesPnLs.length > 0 ? yesSidePnL / yesPnLs.length : 0;
      const noSideAvgPnL = noPnLs.length > 0 ? noSidePnL / noPnLs.length : 0;

      // Determine smarter side
      const smarterSide = yesSideAvgPnL > noSideAvgPnL ? 'YES' : 'NO';

      return {
        yesSidePnL,
        noSidePnL,
        yesSideAvgPnL,
        noSideAvgPnL,
        smarterSide,
        distribution, // Return the updated distribution with P&L
      };
    } catch (error) {
      console.error(`Error calculating side P&L for market ${conditionId}:`, error);
      const emptyDist = await this.analyzeHolderDistribution(conditionId);
      return {
        yesSidePnL: 0,
        noSidePnL: 0,
        yesSideAvgPnL: 0,
        noSideAvgPnL: 0,
        smarterSide: 'YES',
        distribution: emptyDist,
      };
    }
  }
}
