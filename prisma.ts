import {PrismaClient} from "./generated/prisma/client.ts";
import {PrismaPg} from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

console.debug("Initializing Prisma Client with connection string:", process.env.DATABASE_URL);
const prisma = new PrismaClient({adapter});
export {prisma}
