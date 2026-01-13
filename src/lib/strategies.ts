import { Candle } from '@prisma/client';
import { StrategyFunction, StrategyResult } from './types';

export const Strategies: Record<string, StrategyFunction> = {
  /**
   * Dollar Cost Averaging
   * Buy on the first available trading day of the month.
   */
  DCA: (candle, _, __, ___, isStartOfMonth) => {
    if (isStartOfMonth) {
      return { shouldBuy: true, price: candle.open, reason: 'Start of Month' };
    }
    return { shouldBuy: false };
  },

  /**
   * RSI Strategy
   * Buy when RSI is below threshold (default 40).
   * If month ends without signal, buy on last day? 
   * Python logic: "If month ends without signal, buy on last day".
   * This function runs daily. The simulation engine handles the "force buy at end of month" logic if needed,
   * OR we can just check if it's the last day. 
   * However, determining "last day" without looking ahead is tricky in a stream.
   * Simulation engine will likely handle the "monthly budget preservation".
   * 
   * Here we just return signal.
   */
  RSI: (candle, _, config) => {
    const threshold = config.rsiThreshold || 40;
    if (candle.rsi !== null && candle.rsi < threshold) {
      return { shouldBuy: true, price: candle.close, reason: `RSI ${candle.rsi.toFixed(2)} < ${threshold}` };
    }
    return { shouldBuy: false };
  },

  /**
   * EMA Strategy
   * Buy when Price < 20 EMA.
   */
  EMA: (candle) => {
    if (candle.ema20 !== null && candle.close < candle.ema20) {
       return { shouldBuy: true, price: candle.close, reason: `Price ${candle.close.toFixed(2)} < EMA ${candle.ema20.toFixed(2)}` };
    }
    return { shouldBuy: false };
  },

  /**
   * Fair Value Gap (FVG) Strategy
   * Assumption: Bullish FVG.
   * Pattern: 
   * Candle 1: High
   * Candle 2: Big impulse candle
   * Candle 3: Low
   * Gap exists if Low(3) > High(1).
   * 
   * Strategy: If we are in a "buy zone" (retracement into FVG), buy.
   * Note: This requires complex state tracking of active FVGs.
   * Simplified: Look back 3 candles. If FVG formed and current price is inside it, buy.
   */
  FVG: (candle, prevCandles) => {
    // Need at least 3 previous candles to detect FVG formation before today
    // Let's look at the last few days.
    // If we find an 'unfilled' FVG and price is in it.
    
    // Very basic implementation:
    // Check if yesterday or day before formed an FVG and we are dipping into it.
    if (prevCandles.length < 3) return { shouldBuy: false };

    const c1 = prevCandles[prevCandles.length - 3];
    const c2 = prevCandles[prevCandles.length - 2];
    const c3 = prevCandles[prevCandles.length - 1]; // Yesterday

    // Bullish FVG?
    // 1: Large green candle?
    // Gap: c1.high < c3.low
    
    // Actually FVG is formed by 1, 2, 3. The gap is between 1 and 3.
    // So 1 (first), 2 (big), 3 (third).
    // Gap is between 1.High and 3.Low.
    const gapLow = c1.high;
    const gapHigh = c3.low;
    
    if (gapHigh > gapLow) {
        // FVG exists from [gapLow, gapHigh]
        // If current candle low drops into this zone, buy.
        if (candle.low <= gapHigh && candle.low >= gapLow) {
            return { shouldBuy: true, price: Math.max(candle.low, gapLow), reason: 'Retrace into FVG' };
        }
    }

    return { shouldBuy: false };
  },

  /**
   * Daily Lows Strategy
   * Try to buy at the daily low.
   * In simulation, this is essentially setting purchase price = candle.low.
   * But when do we buy?
   * "Buying at Daily Lows" usually implies a limit order strategy.
   * We will assume we always buy on the FIRST day of the month but at the LOW of that day,
   * OR we split capital? 
   * Let's assume: Wait for a "significant" low or just buy at daily low of the first day?
   * The user said "Buying at daily lows". 
   * Let's interpret as: "DCA but magically executing at the Daily Low of the buying day".
   * This gives an edge over "Open" or "Close".
   */

};
