import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const localPrisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.LOCAL_DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/investment_local"
        }
    }
});

export default prisma;
