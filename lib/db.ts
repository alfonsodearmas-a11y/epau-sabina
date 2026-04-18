import { PrismaClient } from '@prisma/client';

// Reuse a single Prisma client across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __epauPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__epauPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalThis.__epauPrisma = prisma;
