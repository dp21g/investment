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
  } else {
    console.log("Usage:");
    console.log("  npm start sync [ticker] [year]");
    console.log("  npm start query [ticker] [year]");
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
