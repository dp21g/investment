import { NextResponse } from 'next/server';
import { SyncService } from '@/lib/sync';

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    const { tickers, startYear } = body;

    if (!tickers || !Array.isArray(tickers) || !startYear) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
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

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sync API Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
