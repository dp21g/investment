import express from 'express';
import { localPrisma } from '../../src/lib/db.js'; // Ensure .js extension and named import

const router = express.Router();

router.get('/data', async (req, res) => {
    const { ticker, startDate, endDate } = req.query;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: 'Ticker is required' });
    }

    try {
        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // Default 60 days
        const end = endDate ? new Date(endDate as string) : new Date();

        // 1. Fetch 20m Candles
        const candles20m = await localPrisma.candle20m.findMany({
            where: {
                ticker,
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { date: 'asc' }
        });

        // 2. Fetch 5m candles for breach detection
        const candles5m = await localPrisma.candle5m.findMany({
            where: {
                ticker,
                date: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { date: 'asc' }
        });



        const insideCandles = [];

        for (let i = 1; i < candles20m.length; i++) {
            const curr = candles20m[i];
            const prev = candles20m[i - 1];

            // Inside Candle Condition:
            // Current High < Prev High AND Current Low > Prev Low
            const isInside = curr.high < prev.high && curr.low > prev.low;

            if (isInside) {
                // Monitor for breaches of the Inside Candle's range
                const targetHigh = curr.high;
                const targetLow = curr.low;
                
                let breachHigh = null;
                let breachLow = null;
                
                // Search start: 20m candle's end time
                const searchStart = new Date(curr.date.getTime() + 20 * 60 * 1000);
                
                // --- 5m Breach Detection ---
                const subsequent5m = candles5m.filter(c => c.date >= searchStart);
                for (const c5 of subsequent5m) {
                    if (!breachHigh && c5.high > targetHigh) {
                        breachHigh = { type: 'HIGH', date: c5.date, price: c5.high, candle: c5 };
                    }
                    if (!breachLow && c5.low < targetLow) {
                        breachLow = { type: 'LOW', date: c5.date, price: c5.low, candle: c5 };
                    }
                    // Continue scanning to find first occurrences of both if needed, 
                    // but for Fib logic we need to know WHICH happened first.
                    if (breachHigh && breachLow) break;
                }

                // Fib Projection Logic
                let firstBreachType = null;
                let fibProjectionRatio = null;
                let excursionPrice = null;

                let timeToSecondBreach = null;
                // If we have a second breach, we limit our search for "Peak" to BEFORE that second breach
                // If we don't, we search until the end
                let searchLimitDate = Infinity;

                if (breachHigh && breachLow) {
                    if (breachHigh.date <= breachLow.date) {
                        firstBreachType = 'HIGH';
                        searchLimitDate = new Date(breachLow.date).getTime();
                    } else {
                        firstBreachType = 'LOW';
                        searchLimitDate = new Date(breachHigh.date).getTime();
                    }
                    
                    // Calculate time difference
                    const t1 = new Date(breachHigh.date).getTime();
                    const t2 = new Date(breachLow.date).getTime();
                    timeToSecondBreach = Math.abs(t1 - t2);

                } else if (breachHigh) {
                    firstBreachType = 'HIGH';
                } else if (breachLow) {
                    firstBreachType = 'LOW';
                }

                let peakTime = null;

                if (firstBreachType === 'HIGH') {
                    // It broke HIGH first. 
                    // Calculate "How High it projected": Max High of subsequent candles
                    // AND "When" it projected (Peak Time)
                    let maxHigh = -Infinity;
                    
                    for (const c of subsequent5m) {
                         const cTime = new Date(c.date).getTime();
                         // Only consider candles AFTER the first breach ? 
                         // Technically, subsequent5m starts after the inside candle.
                         // But we should probably look up to the second breach (if any).
                         if (searchLimitDate !== Infinity && cTime >= searchLimitDate) break;

                         if (c.high > maxHigh) {
                             maxHigh = c.high;
                             peakTime = c.date;
                         }
                    }
                    
                    if (maxHigh > -Infinity) {
                        excursionPrice = maxHigh;
                        const range = targetHigh - targetLow;
                        fibProjectionRatio = (maxHigh - targetLow) / range;
                    }

                } else if (firstBreachType === 'LOW') {
                    // It broke LOW first.
                    // Calculate "How Low it projected": Min Low of subsequent candles
                    let minLow = Infinity;
                     for (const c of subsequent5m) {
                         const cTime = new Date(c.date).getTime();
                         if (searchLimitDate !== Infinity && cTime >= searchLimitDate) break;

                         if (c.low < minLow) {
                             minLow = c.low;
                             peakTime = c.date;
                         }
                    }

                    if (minLow < Infinity) {
                        excursionPrice = minLow;
                        const range = targetHigh - targetLow;
                        fibProjectionRatio = (targetHigh - minLow) / range;
                    }
                }

                insideCandles.push({
                    candle: curr,
                    prevCandle: prev,
                    breachHigh,
                    breachLow,
                    firstBreachType,
                    timeToSecondBreach,
                    peakTime,
                    fibProjectionRatio,
                    excursionPrice
                });
            }
        }

        // Helper to serialize BigInt
        const serialize = (data: any) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value
        ));

        res.json(serialize({
            candles20m,
            insideCandles
        }));

    } catch (e) {
        console.error("Local API Error:", e);
        res.status(500).json({ 
            error: 'Failed to fetch local data', 
            details: e instanceof Error ? e.message : String(e) 
        });
    }
});

router.get('/context', async (req, res) => {
    const { ticker, date } = req.query;

    if (!ticker || typeof ticker !== 'string' || !date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Ticker and date are required' });
    }

    try {
        const targetDate = new Date(date);
        
        // Context: +/- 25 candles for 20m (approx 8 hours)
        const contextTime20m = 25 * 20 * 60 * 1000;
        const start20m = new Date(targetDate.getTime() - contextTime20m);
        const end20m = new Date(targetDate.getTime() + contextTime20m);

        const candles20m = await localPrisma.candle20m.findMany({
            where: {
                ticker,
                date: { gte: start20m, lte: end20m }
            },
            orderBy: { date: 'asc' }
        });

        // 5m candles covering the same time range
        const candles5m = await localPrisma.candle5m.findMany({
            where: {
                ticker,
                date: { gte: start20m, lte: end20m }
            },
            orderBy: { date: 'asc' }
        });



        // Helper to serialize BigInt
        const serialize = (data: any) => JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value
        ));

        res.json(serialize({
            candles20m,
            candles5m,
            targetDate: targetDate.toISOString()
        }));

    } catch (e) {
        console.error("Context API Error:", e);
        res.status(500).json({ 
            error: 'Failed to fetch context data', 
            details: e instanceof Error ? e.message : String(e) 
        });
    }
});

// --- Drawing Endpoints ---

router.get('/drawings', async (req, res) => {
    const { ticker, date } = req.query;

    if (!ticker || typeof ticker !== 'string' || !date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Ticker and date are required' });
    }

    try {
        const drawings = await localPrisma.chartDrawing.findMany({
            where: {
                ticker,
                contextDate: new Date(date)
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(drawings);
    } catch (e) {
        console.error("Fetch Drawings Error:", e);
        res.status(500).json({ error: 'Failed to fetch drawings' });
    }
});

router.post('/drawings', async (req, res) => {
    const { ticker, contextDate, type, points, properties } = req.body;

    if (!ticker || !contextDate || !type || !points) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const drawing = await localPrisma.chartDrawing.create({
            data: {
                ticker,
                contextDate: new Date(contextDate),
                type,
                points,
                properties: properties || {}
            }
        });
        res.json(drawing);
    } catch (e) {
        console.error("Save Drawing Error:", e);
        res.status(500).json({ error: 'Failed to save drawing' });
    }
});

router.delete('/drawings/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await localPrisma.chartDrawing.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Delete Drawing Error:", e);
        res.status(500).json({ error: 'Failed to delete drawing' });
    }
});

export default router;
