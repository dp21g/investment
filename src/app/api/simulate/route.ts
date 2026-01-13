import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SimulationEngine } from '@/lib/simulation';
import { StrategyConfig } from '@/lib/types';
import { SyncService } from '@/lib/sync';

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    const { 
        tickers, 
        monthlyAmount, 
        startYear,
        endYear,
        strategies 
    } = body;

    if (!tickers || !monthlyAmount || !startYear) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const results = [];

    for (const ticker of tickers) {
        // Fetch candles within range
        const start = new Date(`${startYear}-01-01`);
        const end = endYear ? new Date(`${endYear}-12-31`) : new Date();
        
        console.log(`[Simulate] Fetching ${ticker} from ${start.toISOString()} to ${end.toISOString()}`);

        const candles = await prisma.candle.findMany({
            where: {
                ticker: ticker,
                date: { 
                    gte: start,
                    lte: end
                }
            },
            orderBy: { date: 'asc' }
        });

        console.log(`[Simulate] Found ${candles.length} candles for ${ticker}`);

        if (candles.length === 0) {
            continue;
        }

        const config: StrategyConfig = {
            monthlyAmount: Number(monthlyAmount),
            rsiThreshold: 40, 
            dropPct: 1
        };

        const stratsToRun = strategies && strategies.length > 0 
            ? strategies 
            : ['DCA', 'RSI', 'EMA', 'FVG'];

        for (const strat of stratsToRun) {
            try {
                const result = SimulationEngine.run(ticker, candles, config, strat);
                results.push({
                    ticker,
                    ...result
                });
            } catch (e) {
                console.error(`Simulation failed for ${ticker} ${strat}:`, e);
            }
        }
    }

    // Sort by return % desc
    results.sort((a, b) => b.totalReturnPct - a.totalReturnPct);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error running simulation:', error);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
