import { SyncService } from '../src/lib/sync';
import prisma from '../src/lib/db';

const TICKERS = [
    'SPY', 'QQQ', 'VOO', 'VTI', 
    'VWRL.L', 'SGLN.L', 'SWDA.L' // UK/Global tickers often used
];

async function main() {
    console.log("Starting Data Restoration...");
    console.log("This will re-download candle data for common tickers.");

    const year = new Date().getFullYear();
    const startYear = 2020; // Reasonable history

    for (const ticker of TICKERS) {
        console.log(`\n--- Syncing ${ticker} ---`);
        try {
            // Check if we need to backfill multiple years
            for (let y = startYear; y <= year; y++) {
                process.stdout.write(`Syncing ${y}... `);
                await SyncService.syncTicker(ticker, y);
                console.log("Done.");
            }
        } catch (e) {
            console.error(`Failed to sync ${ticker}:`, e);
        }
    }
    
    console.log("\nRestoration Complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
