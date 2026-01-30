import prisma from '../src/lib/db';

async function main() {
    console.log("Testing connection...");
    try {
        const count = await prisma.candle20m.count();
        console.log(`Success! Candle20m count: ${count}`);
    } catch (e) {
        console.error("Error accessing Candle20m:", e);
    } // Testing Candle5m
    try {
        const count5 = await prisma.candle5m.count();
        console.log(`Success! Candle5m count: ${count5}`);
    } catch (e) {
        console.error("Error accessing Candle5m:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
