import express from 'express';
import prisma from '../../src/lib/db.js';

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

router.get('/', (req, res) => {
  res.json(TICKER_INFO);
});

export default router;
