
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tickers = await prisma.candle.findMany({
    select: { ticker: true },
    distinct: ['ticker']
  });
  console.log('Tickers in DB:', tickers.map(t => t.ticker));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
