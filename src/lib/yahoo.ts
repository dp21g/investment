import YF from 'yahoo-finance2';
const yahooFinance = new YF();

export interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class YahooFinance {
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
        volume: quote.volume
      }));
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
      throw error;
    }
  }
}
