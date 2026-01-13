import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const tickers = await prisma.candle.groupBy({
      by: ['ticker'],
      _min: { date: true },
      _max: { date: true },
      _count: { _all: true },
    });

    return NextResponse.json(tickers.map(t => ({
      ticker: t.ticker,
      minDate: t._min.date,
      maxDate: t._max.date,
      count: t._count._all
    })));
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return NextResponse.json({ error: 'Failed to fetch tickers' }, { status: 500 });
  }
}
