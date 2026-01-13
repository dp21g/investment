import { Candle } from '@prisma/client';

export interface StrategyResult {
  shouldBuy: boolean;
  price?: number;
  reason?: string;
}

export interface SimulationResult {
  strategyName: string;
  totalInvested: number;
  finalValue: number;
  totalReturnPct: number;
  trades: number;
  history: {
    date: Date;
    action: 'BUY' | 'HOLD';
    price: number;
    shares: number;
    investedAmount: number;
    portfolioValue: number;
  }[];
  yearlyStats: {
    year: number;
    value: number;
    profit: number;
    yearReturn: number; // Strategy return for this specific year
    marketReturn: number; // Buy & Hold return for this specific year
  }[];
  priceHistory: {
    date: Date;
    close: number;
  }[];
}

export interface StrategyConfig {
  monthlyAmount: number;
  rsiThreshold?: number; // For RSI strategy
  emaPeriod?: number; // For EMA strategy
  dropPct?: number; // For 'After Drop' strategy
}

export type StrategyFunction = (
  candle: Candle,
  prevCandles: Candle[],
  config: StrategyConfig,
  currentDate: Date,
  isStartOfMonth: boolean
) => StrategyResult;
