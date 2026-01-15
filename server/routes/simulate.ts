import express from 'express';
import prisma from '../../src/lib/db.js';
import { SimulationEngine } from '../../src/lib/simulation.js';
import { StrategyConfig } from '../../src/lib/types.js';

const router = express.Router();

const TICKER_INFO: Record<string, { name: string, description: string }> = {
    'QQQ': { name: 'QQQ - Nasdaq-100', description: 'Large-cap tech-focused US stocks' },
    'VOO': { name: 'VOO - S&P 500', description: '500 large-cap US stocks' },
    'VWRL': { name: 'VWRL - All-World', description: 'Global developed & emerging markets' },
    'VWRL.L': { name: 'VWRL - All-World', description: 'Global developed & emerging markets' },
    'SGLN': { name: 'SGLN - Gold', description: 'Physical gold holdings' },
    'SGLN.L': { name: 'SGLN - Gold', description: 'Physical gold holdings' },
    'SWDA': { name: 'SWDA - MSCI World', description: 'Developed markets worldwide' },
    'SWDA.L': { name: 'SWDA - MSCI World', description: 'Developed markets worldwide' },
    'SPY': { name: 'SPY - S&P 500', description: 'Standard & Poors 500' },
    'VTI': { name: 'VTI - Total Stock Market', description: 'US Total Stock Market' }
};

router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const { 
        tickers, 
        monthlyAmount, 
        startYear,
        endYear
    } = body;

    if (!tickers || !monthlyAmount || !startYear) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const results = [];

    for (const ticker of tickers) {
        // Fetch candles within range
        const start = new Date(`${startYear}-01-01`);
        const end = endYear ? new Date(`${endYear}-12-31`) : new Date();
        
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

        if (candles.length === 0) {
            continue;
        }

        // 1. Run DCA Component (Monthly Investment)
        const dcaConfig: StrategyConfig = {
            monthlyAmount: Number(monthlyAmount),
            fundingFrequency: 'MONTHLY'
        };

        // 2. Run Lump Sum Component (Annual Investment in Jan)
        const lumpConfig: StrategyConfig = {
            monthlyAmount: Number(monthlyAmount) * 12, // Annual Amount
            fundingFrequency: 'ANNUALLY'
        };

        try {
            const dcaResult = SimulationEngine.run(candles, dcaConfig, 'DCA');
            const lumpResult = SimulationEngine.run(candles, lumpConfig, 'DCA'); // Use DCA strategy (buy when cash available)

            results.push({
                ticker,
                name: TICKER_INFO[ticker]?.name || ticker,
                description: TICKER_INFO[ticker]?.description || 'Historical Analysis',
                dca: dcaResult,
                lump: lumpResult
            });
        } catch (e) {
            console.error(`Simulation failed for ${ticker}:`, e);
        }
    }

    return res.json(results);
  } catch (error) {
    console.error('Error running simulation:', error);
    return res.status(500).json({ error: 'Simulation failed' });
  }
});

export default router;
