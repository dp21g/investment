import YF from 'yahoo-finance2';
const yahooFinance = new YF();

export interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export class YahooFinance {
  static async fetchCandles(ticker: string, startDate: Date, interval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo'): Promise<CandleData[]> {
    // queryOptions removed

    try {
        // Use chart() for intraday data as historical() is deprecated/limited for it
        const result = await yahooFinance.chart(ticker, {
            period1: startDate,
            interval: interval as any, // Cast to any to bypass strict type check if needed, or use proper type
        });
        
        if (!result || !result.quotes) return [];

        return result.quotes.map((quote: any) => ({
            date: quote.date,
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            adjClose: quote.adjclose || quote.close, // Note: chart returns adjclose (lowercase)
            volume: quote.volume
        }));
    } catch (error) {
        // Yahoo finance is weird sometimes
        console.warn(`Error fetching ${interval} data for ${ticker}, retrying...`);
         try {
             // small delay
             await new Promise(r => setTimeout(r, 2000));
            const result = await yahooFinance.chart(ticker, {
                period1: startDate,
                interval: interval as any
            });
        
            if (!result || !result.quotes) return [];

            return result.quotes.map((quote: any) => ({
                date: quote.date,
                open: quote.open,
                high: quote.high,
                low: quote.low,
                close: quote.close,
                adjClose: quote.adjclose || quote.close,
                volume: quote.volume
            }));
         } catch(e) {
             console.error(`Error fetching data for ${ticker}:`, e);
             return [];
         }
    }
  }

  static aggregate1mTo3m(candles: CandleData[]): CandleData[] {
      const result: CandleData[] = [];
      
      // Sort by date just in case
      candles.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      let currentBucketStart: Date | null = null;
      let bucketCandles: CandleData[] = [];

      for (const candle of candles) {
          // Determine the bucket start time (round down to nearest 3 minutes)
          const time = candle.date.getTime();
          const msPer3Min = 3 * 60 * 1000;
          const bucketTime = Math.floor(time / msPer3Min) * msPer3Min;
          const bucketDate = new Date(bucketTime);

          if (!currentBucketStart || bucketTime !== currentBucketStart.getTime()) {
              // Process previous bucket
              if (bucketCandles.length > 0) {
                  result.push(YahooFinance.aggregateCandles(bucketCandles));
              }
              // Start new bucket
              currentBucketStart = bucketDate;
              bucketCandles = [candle];
          } else {
              bucketCandles.push(candle);
          }
      }
      
      // Process last bucket
      if (bucketCandles.length > 0) {
          result.push(YahooFinance.aggregateCandles(bucketCandles));
      }

      return result;
  }

  private static aggregateCandles(candles: CandleData[]): CandleData {
      const first = candles[0];
      const last = candles[candles.length - 1];
      
      let high = -Infinity;
      let low = Infinity;
      let volume = 0;

      for (const c of candles) {
          if (c.high > high) high = c.high;
          if (c.low < low) low = c.low;
          volume += c.volume;
      }

      return {
          date: first.date, // Use start time of the bucket
          open: first.open,
          high,
          low,
          close: last.close,
          adjClose: last.adjClose, 
          volume: volume
      };
  }
  static async fetchDailyCandles(ticker: string, startDate: Date): Promise<CandleData[]> {
    const queryOptions = {
      period1: startDate, // Start date
      period2: new Date(), // End date (now)
      interval: '1d' as const, // Daily interval
    };

    try {
      const result = await yahooFinance.historical(ticker, queryOptions) as any[];
      
      return result.map((quote: any) => ({
        date: quote.date,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        adjClose: quote.adjClose || quote.close, // Fallback to close if adjClose missing
        volume: quote.volume
      }));
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
      throw error;
    }
  }
}
