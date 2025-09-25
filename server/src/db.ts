import { PrismaClient } from "@prisma/client";

// Export a single Prisma client for the entire server process.
export const prisma = new PrismaClient();


