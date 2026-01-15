import express from 'express';
import { SyncService } from '../../src/lib/sync.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const { tickers, startYear } = body;

    if (!tickers || !Array.isArray(tickers) || !startYear) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const results = [];
    
    // Process sequentially
    for (const ticker of tickers) {
        try {
            const stats = await SyncService.syncTicker(ticker, Number(startYear));
            results.push({ 
                ticker, 
                status: 'success', 
                savedCount: stats?.savedCount || 0,
                message: stats?.message || 'Done'
            });
        } catch (e) {
            console.error(`Sync failed for ${ticker}:`, e);
            results.push({ ticker, status: 'error', error: String(e) });
        }
    }

    return res.json({ results });
  } catch (error) {
    console.error('Sync API Error:', error);
    return res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
