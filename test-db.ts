
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing DB connection...');
  try {
    const count = await prisma.candle.count();
    console.log(`Current candle count: ${count}`);

    console.log('Attempting to upsert a test candle...');
    const result = await prisma.candle.upsert({
        where: {
            ticker_date: {
                ticker: 'TEST',
                date: new Date('2023-01-01')
            }
        },
        update: {},
        create: {
            ticker: 'TEST',
            date: new Date('2023-01-01'),
            open: 100,
            high: 110,
            low: 90,
            close: 105,
            adjClose: 105,
            volume: BigInt(1000)
        }
    });
    console.log('Upsert successful:', result);
    
    // Clean up
    await prisma.candle.delete({
        where: {
             ticker_date: {
                ticker: 'TEST',
                date: new Date('2023-01-01')
            }
        }
    });
    console.log('Cleanup successful.');

  } catch (e) {
    console.error('DB Operation failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
