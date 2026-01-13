
import { PrismaClient } from '@prisma/client';
import { SimulationEngine } from './src/lib/simulation';
import { Strategies } from './src/lib/strategies';

const prisma = new PrismaClient();

async function main() {
    const candles = await prisma.candle.findMany({
        where: {
            ticker: 'QQQ',
            date: {
                gte: new Date('2020-01-01'),
                lte: new Date('2021-01-01')
            }
        },
        orderBy: { date: 'asc' }
    });

    console.log(`Loaded ${candles.length} candles.`);

    const config = {
        monthlyAmount: 1000,
        rsiThreshold: 40,
        dropPct: 1,
        startYear: 2020
    };

    console.log("Running DCA...");
    const result = SimulationEngine.run('QQQ', candles, config, 'DCA');
    
    console.log("Trades:", result.trades);
    console.log("Total Invested:", result.totalInvested);
    console.log("History:", result.history.map(h => ({ date: h.date, action: h.action })));
}

main();
