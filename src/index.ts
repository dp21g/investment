import { SyncService } from './lib/sync';
import prisma, { localPrisma } from './lib/db';

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
      // 5m data (use 58 days to be safe from Yahoo's strict 60d limit)
      const startDate5m = new Date(now.getTime() - 58 * 24 * 60 * 60 * 1000); 

      for (const ticker of tickers) {
          console.log(`\nProcessing ${ticker}...`);

          // --- 5m Data ---
          let fetchStart5m = startDate5m;
          const last5m = await localPrisma.candle5m.findFirst({
              where: { ticker },
              orderBy: { date: 'desc' }
          });
          if (last5m) {
              console.log(`Found existing 5m data for ${ticker} up to ${last5m.date.toISOString()}. Fetching new data only.`);
              fetchStart5m = last5m.date;
          } else {
              console.log(`Fetching 5m data (from ${startDate5m.toISOString()})...`);
          }

          try {
             // 5m limit is 60d
             const candles5m = await YahooFinance.fetchCandles(ticker, fetchStart5m, '5m');
             console.log(`Got ${candles5m.length} 5m candles.`);
             
             let stored5m = 0;
             for (const c of candles5m) {
                 try {
                     await localPrisma.candle5m.upsert({
                         where: { ticker_date: { ticker, date: c.date } },
                         update: { open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0) },
                         create: { ticker, date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0) }
                     });
                     stored5m++;
                 } catch(e) {}
             }
             console.log(`Stored ${stored5m} 5m candles.`);

             // --- Aggregate to 20m ---
             if (candles5m.length > 0) {
                 const candles20m = YahooFinance.aggregate5mTo20m(candles5m);
                 console.log(`Aggregated to ${candles20m.length} 20m candles.`);
                 
                 let stored20m = 0;
                 for (const c of candles20m) {
                     try {
                         await localPrisma.candle20m.upsert({
                             where: { ticker_date: { ticker, date: c.date } },
                             update: { open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0) },
                             create: { ticker, date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0) }
                         });
                         stored20m++;
                     } catch(e) {}
                 }
                 console.log(`Stored ${stored20m} 20m candles.`);
             }

          } catch(e) {
              console.error(`Failed to fetch/store 5m/20m data for ${ticker}`, e);
          }

          // --- 30m Data ---
          let fetchStart30m = startDate30m;
          const last30m = await localPrisma.candle30m.findFirst({
              where: { ticker },
              orderBy: { date: 'desc' }
          });
           if (last30m) {
              console.log(`Found existing 30m data for ${ticker} up to ${last30m.date.toISOString()}. Fetching new data only.`);
              fetchStart30m = last30m.date;
          } else {
              console.log(`Fetching 30m data (from ${startDate30m.toISOString()})...`);
          }

          try {
            const candles30m = await YahooFinance.fetchCandles(ticker, fetchStart30m, '30m');
            console.log(`Got ${candles30m.length} 30m candles.`);
            
            let stored30m = 0;
            for (const c of candles30m) {
                try {
                await localPrisma.candle30m.upsert({
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

          // --- 1m Data (for 3m and 2m aggregation) ---
          let fetchStart1m = startDate1m;
          
          const last3m = await localPrisma.candle3m.findFirst({
              where: { ticker },
              orderBy: { date: 'desc' }
          });
          const last2m = await localPrisma.candle2m.findFirst({
              where: { ticker },
              orderBy: { date: 'desc' }
          });

          // Determine start date based on the oldest missing data
          // If both exist, use the earlier of the two last dates to be safe
          if (last3m && last2m) {
             const t3 = last3m.date.getTime();
             const t2 = last2m.date.getTime();
             const minTime = Math.min(t3, t2);
             console.log(`Found existing 3m and 2m data. Fetching 1m from ${new Date(minTime).toISOString()}.`);
             fetchStart1m = new Date(minTime);
          } else if (last3m) {
              console.log(`Found existing 3m data, but missing 2m. Fetching 1m from ${startDate1m.toISOString()} (or default).`);
               // If missing 2m, we should probably fetch from default start date to fill backfill 2m
               // But respecting 1m limit (7 days)
               fetchStart1m = startDate1m; 
          } else if (last2m) {
              console.log(`Found existing 2m data, but missing 3m. Fetching 1m from ${startDate1m.toISOString()}.`);
              fetchStart1m = startDate1m;
          } else {
               console.log(`Fetching 1m data for 3m/2m aggregation (from ${startDate1m.toISOString()})...`);
          }
          
          try {
            // Fetch 1m
            const candles1m = await YahooFinance.fetchCandles(ticker, fetchStart1m, '1m');
            console.log(`Got ${candles1m.length} 1m candles.`);
            
            // --- Aggregate to 3m ---
            if (candles1m.length > 0) {
                const candles3m = YahooFinance.aggregate1mTo3m(candles1m);
                console.log(`Aggregated to ${candles3m.length} 3m candles.`);
                
                let stored3m = 0;
                for (const c of candles3m) {
                   try {
                    await localPrisma.candle3m.upsert({
                        where: { ticker_date: { ticker, date: c.date } },
                        update: {
                            open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0)
                        },
                        create: {
                            ticker, date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0)
                        }
                    });
                    stored3m++;
                   } catch(e) {}
                }
                console.log(`Stored ${stored3m} 3m candles.`);

                // --- Aggregate to 2m ---
                const candles2m = YahooFinance.aggregate1mTo2m(candles1m);
                console.log(`Aggregated to ${candles2m.length} 2m candles.`);
                
                let stored2m = 0;
                for (const c of candles2m) {
                   try {
                    await localPrisma.candle2m.upsert({
                        where: { ticker_date: { ticker, date: c.date } },
                        update: {
                            open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0)
                        },
                        create: {
                            ticker, date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: BigInt(c.volume || 0)
                        }
                    });
                    stored2m++;
                   } catch(e) {}
                }
                console.log(`Stored ${stored2m} 2m candles.`);
            }
          } catch(e) {
               console.error(`Failed to fetch/store 1m->3m/2m data for ${ticker}:`, e);
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
