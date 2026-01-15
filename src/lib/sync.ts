import prisma from './db';
import { YahooFinance } from './yahoo';
import { Indicators } from './indicators';

export class SyncService {
  static async syncTicker(ticker: string, sinceYear: number = 2020) {
    console.log(`Starting sync for ${ticker} from ${sinceYear}...`);
    
    // 1. Fetch data
    // 1. Determine start date
    let startDate = new Date(`${sinceYear}-01-01`);
    
    // Check existing data range
    const minPoint = await prisma.candle.findFirst({
        where: { ticker },
        orderBy: { date: 'asc' }
    });

    const maxPoint = await prisma.candle.findFirst({
        where: { ticker },
        orderBy: { date: 'desc' }
    });

    if (maxPoint && minPoint) {
        console.log(`Existing data for ${ticker}: ${minPoint.date.toISOString().split('T')[0]} to ${maxPoint.date.toISOString().split('T')[0]}`);
        
        // Scenario 1: Backfill (requested date is earlier than min date)
        if (startDate < minPoint.date) {
             console.log(`Backfilling mode: Fetching from ${startDate.toISOString()} (earlier than known min).`);
             // We allow fetching from startDate. Yahoo finance fetch will likely return data up to 'now'.
             // Upsert will handle existing data naturally.
        } 
        // Scenario 2: Incremental (requested date is after max date, or we just want to update latest)
        else {
             // If the requested start date is "covered" by existing data, we might want to just fetch from the END of existing data
             // to get new candles, UNLESS the user explicitly wants to refresh history.
             // But for efficiency, let's assume if startDate > minPoint, we switch to incremental mode 
             // from the maxPoint to capture new days.
             const nextDay = new Date(maxPoint.date);
             nextDay.setDate(nextDay.getDate() + 1);
             
             if (nextDay > startDate) {
                 startDate = nextDay;
                 console.log(`Incremental mode: Moving start date to ${startDate.toISOString()} (after known max).`);
             }
        }
    }
    
    // Safety check: if startDate is in future, stop
    if (startDate > new Date()) {
        console.log(`Data for ${ticker} is up to date.`);
        return { ticker, savedCount: 0, message: 'Already up to date' };
    }

    console.log(`Fetching ${ticker} starting from ${startDate.toISOString()}...`);
    const rawCandles = await YahooFinance.fetchDailyCandles(ticker, startDate);
    console.log(`Fetched ${rawCandles.length} candles for ${ticker}`);

    if (rawCandles.length === 0) {
        console.log("No data found.");
        return { ticker, savedCount: 0, message: 'No data found' };
    }

    // 2. Prepare data arrays for indicator calculation
    const prices = rawCandles.map(c => c.close);
    
    // 3. Calculate indicators
    // Note: These arrays correspond 1-to-1 with rawCandles indices
    const ema20 = Indicators.calculateEMA20(prices);
    const macdData = Indicators.calculateMACD(prices);
    const rsi = Indicators.calculateRSI(prices);

    // Padding checking:
    // EMA20 array length should match prices length?
    // My EMA implementation in indicators.ts keeps length same as input?
    // Let's verify: EMA pushes for each price starting from index 0. Yes.
    // MACD pushes for each price. Yes.
    // RSI pushes for each price (some null). Yes.

    console.log("Calculated indicators.");

    // 4. Upsert into DB
    let savedCount = 0;
    
    for (let i = 0; i < rawCandles.length; i++) {
        const c = rawCandles[i];
        
        // Ensure BigInt for volume
        const volume = BigInt(c.volume || 0);

        try {
            await prisma.candle.upsert({
                where: {
                    ticker_date: {
                        ticker: ticker,
                        date: c.date
                    }
                },
                update: {
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    adjClose: c.adjClose,
                    volume: volume,
                    ema20: ema20[i] || null,
                    macd: macdData.macd[i] || null,
                    macdSignal: macdData.signal[i] || null,
                    macdHistogram: macdData.histogram[i] || null,
                    rsi: rsi[i] || null
                },
                create: {
                    ticker: ticker,
                    date: c.date,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    adjClose: c.adjClose,
                    volume: volume,
                    ema20: ema20[i] || null,
                    macd: macdData.macd[i] || null,
                    macdSignal: macdData.signal[i] || null,
                    macdHistogram: macdData.histogram[i] || null,
                    rsi: rsi[i] || null
                }
            });
            savedCount++;
        } catch (e) {
            console.error(`Error saving candle ${c.date}:`, e);
        }
    }

    console.log(`Sync complete for ${ticker}. Saved/Updated ${savedCount} candles.`);
    return {
        ticker,
        savedCount,
        message: `Synced ${savedCount} records.`
    };
  }

  static async getCandles(ticker: string, year: number) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      
      return prisma.candle.findMany({
          where: {
              ticker: ticker,
              date: {
                  gte: start,
                  lte: end
              }
          },
          orderBy: {
              date: 'asc'
          }
      });
  }
}
