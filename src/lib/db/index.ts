// Cliente de base de datos usando Prisma
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Helpers para tipos de datos JSON
export const parseJsonField = (field: string | null): any[] => {
  if (!field) return [];
  try {
    return JSON.parse(field);
  } catch {
    return [];
  }
};

export const stringifyJsonField = (data: any[]): string => {
  return JSON.stringify(data || []);
};