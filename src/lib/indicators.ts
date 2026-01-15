export class Indicators {
  /**
   * Calculate 20-day EMA
   * Python: df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
   * Formula: price * alpha + prev_ema * (1 - alpha)
   * alpha = 2 / (span + 1) = 2 / 21
   */
  static calculateEMA20(prices: number[]): number[] {
    const span = 20;
    const alpha = 2 / (span + 1);
    const ema: number[] = [];

    // Initialize with first price or SMA? Pandas ewm(adjust=False) starts with the first value.
    // "When adjust=False is used, the weighted average is calculated recursively..."
    // y0 = x0
    // yt = (1-a)*y(t-1) + a*xt
    
    if (prices.length === 0) return [];

    let currentEma = prices[0];
    ema.push(currentEma);

    for (let i = 1; i < prices.length; i++) {
        currentEma = prices[i] * alpha + currentEma * (1 - alpha);
        ema.push(currentEma);
    }

    return ema;
  }

  /**
   * Calculate MACD (12, 26, 9)
   * Python: ewm(span=12), ewm(span=26)
   */
  static calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
    if (prices.length === 0) return { macd: [], signal: [], histogram: [] };

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    const macdLine: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }

    // Signal line is EMA(9) of MACD line
    const signalLine = this.calculateEMA(macdLine, 9);

    const histogram: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }

    return { macd: macdLine, signal: signalLine, histogram };
  }

  private static calculateEMA(values: number[], span: number): number[] {
    if (values.length === 0) return [];
    const alpha = 2 / (span + 1);
    const ema: number[] = [];
    let current = values[0];
    ema.push(current);

    for (let i = 1; i < values.length; i++) {
      current = values[i] * alpha + current * (1 - alpha);
      ema.push(current);
    }
    return ema;
  }

  /**
   * Calculate RSI (14)
   * Python: rolling(window=14).mean() of gains/losses
   * This is SMA-based RSI, not Wilder's RSI.
   */
  static calculateRSI(prices: number[]): (number | null)[] {
    if (prices.length < 15) { // Need 1 line for diff, 14 for window
        return new Array(prices.length).fill(null);
    }

    const rsi: (number | null)[] = [];
    const window = 14;

    // First calculated RSI value will be at index 14 (using prices 1..14 diffs)
    // Python code logic: 
    // delta = close.diff() (index 0 is NaN)
    // gain = delta > 0 ? delta : 0
    // loss = delta < 0 ? -delta : 0
    // avg_gain = gain.rolling(14).mean()
    // avg_loss = loss.rolling(14).mean()
 
    // Pandas diff(): index 0 is NaN. gain/loss at index 0 is NaN.
    // rolling(14).mean(): result at index 13 uses 0..13, but index 0 is NaN.
    // However, pandas rolling usually ignores NaN or propagates. 
    // Let's assume strict window of 14 valid deltas?
    // Actually, pandas rolling window includes current. 
    // Let's do a sliding window sum/avg.

    // Calculate deltas first
    const deltas: number[] = [0]; // 0 idx
    for (let i = 1; i < prices.length; i++) {
        deltas.push(prices[i] - prices[i - 1]);
    }

    const gainSeries = deltas.map(d => d > 0 ? d : 0);
    const lossSeries = deltas.map(d => d < 0 ? -d : 0);

    for (let i = 0; i < prices.length; i++) {
        if (i < window) { // 0 .. 13 (rolling needs 14 items, 0..13 is 14 items but idx 0 is usually ignored/NaN diff)
            // Wait, Python: rolling(14).mean()
            // At index 14 (15th item), it looks at indices 1..14?
            // Actually, let's just implement simple sliding window Avg
            rsi.push(null);
        } else {
            // Window is [i-13, i] (14 items)
            let sumGain = 0;
            let sumLoss = 0;
            for (let j = 0; j < window; j++) {
                sumGain += gainSeries[i - j];
                sumLoss += lossSeries[i - j];
            }
            const avgGain = sumGain / window;
            const avgLoss = sumLoss / window;

            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }
    }

    return rsi;
  }
}
