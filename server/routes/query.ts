import express from 'express';
import prisma from '../../src/lib/db.js';

const router = express.Router();

const TICKER_NAMES: Record<string, string> = {
    'QQQ': 'QQQ - Nasdaq-100',
    'VOO': 'VOO - S&P 500', 
    'VWRL.L': 'VWRL - All-World',
    'SGLN.L': 'SGLN - Gold',
    'SWDA.L': 'SWDA - MSCI World',
    'SPY': 'SPY - S&P 500',
    'VTI': 'VTI - Total Stock Market'
};

router.post('/dip', async (req, res) => {
    try {
        const body = req.body;
        const { tickers } = body;

        if (!tickers || !Array.isArray(tickers)) {
            return res.status(400).json({ error: 'Missing tickers array' });
        }

        const results = [];

        for (const ticker of tickers) {
            // Fetch all candles sorted by date
            const candles = await prisma.candle.findMany({
                where: { ticker },
                orderBy: { date: 'asc' }
            });

            if (candles.length === 0) continue;

            // Group by year
            const yearsMap = new Map<number, any[]>();
            candles.forEach(c => {
                const y = new Date(c.date).getFullYear();
                if (!yearsMap.has(y)) yearsMap.set(y, []);
                yearsMap.get(y)!.push(c);
            });

            const yearlyStats = [];
            let minDrawdownPct = -Infinity; // Initialize with a very low number (conceptually)
            // Actually, we want to find the "Highest Low" in terms of drawdown. 
            // e.g. Year 1: -5%, Year 2: -10%, Year 3: -20%. 
            // The dip that ALWAYS happened is -5%. So we want the MAXIMUM of the MinDrawdowns.

            let globalSafeDrawdownPct = -100; // Start at worst possible
            let globalSafeDrawdownVal = -999999;

            // Analyze each year
            const years = Array.from(yearsMap.keys()).sort((a,b) => a-b);
            
            // We need to find the "worst case" year that limits our claim.
            // Wait, logic check:
            // "Value it has always dipped below".
            // Year 1 Open: 100, Low: 90. Dip: -10.
            // Year 2 Open: 100, Low: 95. Dip: -5.
            // Year 3 Open: 100, Low: 80. Dip: -20.
            // Has it always dipped -10? No, in Year 2 it only dipped -5.
            // Has it always dipped -5? Yes. Year 1 (-10 < -5), Year 2 (-5 <= -5), Year 3 (-20 < -5).
            // So we are looking for the MINIMUM absolute drawdown (closest to zero) across all years.
            // Or mathematically: MAX of the (Low - Open) values. (Since they are negative).

            let alwaysReachedDipVal = -Infinity; // We want the max (closest to zero)
            let alwaysReachedDipPct = -Infinity;

            const yearDetails = [];

            for (const year of years) {
                const yearCandles = yearsMap.get(year);
                if (!yearCandles || yearCandles.length === 0) continue;

                // Year Open is the OPEN of the first candle
                const yearOpen = yearCandles[0].open;
                
                // Year Low is the lowest LOW of any candle
                let yearLow = Infinity;
                yearCandles.forEach((c: any) => {
                    if (c.low < yearLow) yearLow = c.low;
                });

                const diffVal = yearLow - yearOpen;
                const diffPct = (diffVal / yearOpen) * 100;

                yearDetails.push({
                    year,
                    open: yearOpen,
                    low: yearLow,
                    diffVal,
                    diffPct
                });

                // Update "Always Reached" logic
                // We want the 'least steep' drop being the bottleneck.
                // e.g. -5 is 'greater' than -10. 
                // We want the Max of these negative numbers.
                if (diffPct > alwaysReachedDipPct) {
                    alwaysReachedDipPct = diffPct;
                    alwaysReachedDipVal = diffVal;
                }

                // Calculate Days Below Open
                let daysBelowOpen = 0;
                yearCandles.forEach((c: any) => {
                    if (c.low < yearOpen) {
                        daysBelowOpen++;
                    }
                });

                yearDetails.push({
                    year,
                    open: yearOpen,
                    low: yearLow,
                    diffVal,
                    diffPct,
                    daysBelowOpen
                });
            }

            // Let's refine: Initialize with first year's stats
            if (yearDetails.length > 0) {
                 // Calculate strictly based on the set
                 const weakestDipPct = Math.max(...yearDetails.map(y => y.diffPct));
                 
                 results.push({
                     ticker,
                     name: TICKER_NAMES[ticker] || ticker,
                     yearsAnalyzed: yearDetails.length,
                     safeDipPct: weakestDipPct,
                     details: yearDetails
                 });
            }
        }

        return res.json(results);

    } catch (e) {
        console.error('Dip analysis failed:', e);
        return res.status(500).json({ error: 'Analysis failed' });
    }
});

// New Endpoint: Get raw candles for a specific year
router.post('/candles', async (req, res) => {
    try {
        const { ticker, year } = req.body;
        
        if (!ticker || !year) {
             return res.status(400).json({ error: 'Missing parameters' });
        }

        const start = new Date(`${year}-01-01`);
        const end = new Date(`${year}-12-31`);

        const candles = await prisma.candle.findMany({
            where: {
                ticker,
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { date: 'asc' }
        });

        // Map to Lightweight Charts format
        const chartData = candles.map(c => ({
            time: c.date.toISOString().split('T')[0],
            value: c.close,
            open: c.open // We might want open for reference
        }));

        return res.json({ year, ticker, data: chartData });

    } catch (e) {
        console.error('Candle fetch error:', e);
        return res.status(500).json({ error: 'Failed to fetch candles' });
    }
});

export default router;
