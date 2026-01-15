import { SyncService } from './lib/sync';
import prisma from './lib/db';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'sync') {
    const ticker = args[1] || 'SPY';
    const year = parseInt(args[2] || '2020');
    await SyncService.syncTicker(ticker, year);
  } else if (command === 'query') {
    const ticker = args[1] || 'SPY';
    const year = parseInt(args[2] || '2024');
    const candles = await SyncService.getCandles(ticker, year);
    console.log(`Found ${candles.length} candles for ${ticker} in ${year}`);
    if(candles.length > 0) {
        console.log("Sample candle:", candles[0]);
        console.log("Sample candle with indicators:", candles[candles.length-1]);
    }
  } else if (command === 'futures') {
      const { YahooFinance } = await import('./lib/yahoo.js'); // Dynamic import for CLI context
      
      const tickers = ['NQ=F', 'ES=F'];
      const now = new Date();
      // 30m data for past month (30 days)
      const startDate30m = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); 
      // 1m data limited to 7 days by Yahoo
      const startDate1m = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); 

      for (const ticker of tickers) {
          console.log(`\nProcessing ${ticker}...`);

          // --- 30m Data ---
          console.log(`Fetching 30m data (from ${startDate30m.toISOString()})...`);
          try {
            const candles30m = await YahooFinance.fetchCandles(ticker, startDate30m, '30m');
            console.log(`Got ${candles30m.length} 30m candles.`);
            
            let stored30m = 0;
            for (const c of candles30m) {
                try {
                await prisma.candle30m.upsert({
                    where: { ticker_date: { ticker, date: c.date } },
                    update: {
                        open: c.open,
                        high: c.high, 
                        low: c.low,
                        close: c.close,
                        volume: BigInt(c.volume || 0)
                    },
                    create: {
                        ticker,
                        date: c.date,
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close,
                        volume: BigInt(c.volume || 0)
                    }
                });
                stored30m++;
                } catch(e) {}
            }
            console.log(`Stored ${stored30m} 30m candles.`);
          } catch(e) {
              console.error(`Failed to fetch/store 30m data for ${ticker}`);
          }

          // --- 3m Data (via 1m) ---
          console.log(`Fetching 1m data to aggregate to 3m (from ${startDate1m.toISOString()})...`);
          try {
            // Fetch 1m
            const candles1m = await YahooFinance.fetchCandles(ticker, startDate1m, '1m');
            console.log(`Got ${candles1m.length} 1m candles.`);
            
            // Aggregate
            if (candles1m.length > 0) {
                const candles3m = YahooFinance.aggregate1mTo3m(candles1m);
                console.log(`Aggregated to ${candles3m.length} 3m candles.`);
                
                let stored3m = 0;
                for (const c of candles3m) {
                   try {
                    await prisma.candle3m.upsert({
                        where: { ticker_date: { ticker, date: c.date } },
                        update: {
                            open: c.open,
                            high: c.high, 
                            low: c.low,
                            close: c.close,
                            volume: BigInt(c.volume || 0)
                        },
                        create: {
                            ticker,
                            date: c.date,
                            open: c.open,
                            high: c.high,
                            low: c.low,
                            close: c.close,
                            volume: BigInt(c.volume || 0)
                        }
                    });
                    stored3m++;
                   } catch(e) {}
                }
                console.log(`Stored ${stored3m} 3m candles.`);
            }
          } catch(e) {
               console.error(`Failed to fetch/store 1m->3m data for ${ticker}:`, e);
          }
      }
      
  } else {
    console.log("Usage:");
    console.log("  npm start sync [ticker] [year]");
    console.log("  npm start query [ticker] [year]");
    console.log("  npm start futures");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
