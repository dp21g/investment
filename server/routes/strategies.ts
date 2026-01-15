import express from 'express';
import prisma from '../../src/lib/db.js';

const router = express.Router();

router.get('/ranges', async (req, res) => {
    try {
        const ranges: any[] = [];
        const tickers = ['NQ=F', 'ES=F'];
        // We know we only have Candle30m and Candle3m for futures for now
        // But let's build a more generic structure if needed. 
        // For now, hardcode checks for these tables and tickers as requested.

        for (const ticker of tickers) {
            // Check Candle30m
            const min30m = await prisma.candle30m.findFirst({
                where: { ticker },
                orderBy: { date: 'asc' },
                select: { date: true }
            });
            const max30m = await prisma.candle30m.findFirst({
                where: { ticker },
                orderBy: { date: 'desc' },
                select: { date: true }
            });

            if (min30m && max30m) {
                ranges.push({
                    ticker,
                    interval: '30m',
                    minDate: min30m.date,
                    maxDate: max30m.date,
                    count: await prisma.candle30m.count({ where: { ticker } })
                });
            } else {
                ranges.push({ ticker, interval: '30m', minDate: null, maxDate: null, count: 0 });
            }

            // Check Candle3m
            const min3m = await prisma.candle3m.findFirst({
                where: { ticker },
                orderBy: { date: 'asc' },
                select: { date: true }
            });
            const max3m = await prisma.candle3m.findFirst({
                where: { ticker },
                orderBy: { date: 'desc' },
                select: { date: true }
            });

             if (min3m && max3m) {
                ranges.push({
                    ticker,
                    interval: '3m',
                    minDate: min3m.date,
                    maxDate: max3m.date,
                    count: await prisma.candle3m.count({ where: { ticker } })
                });
            } else {
                ranges.push({ ticker, interval: '3m', minDate: null, maxDate: null, count: 0 });
            }
        }

        res.json({ results: ranges });

    } catch (error) {
        console.error("Error fetching ranges:", error);
        res.status(500).json({ error: "Failed to fetch data ranges" });
    }
});

export default router;
