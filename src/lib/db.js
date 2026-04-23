import { Pool } from "pg";

const normalizeConnectionString = (value) => {
  try {
    const parsed = new URL(value);
    const sslMode = parsed.searchParams.get("sslmode");
    if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
    return value;
  } catch {
    return value;
  }
};

const connectionString = normalizeConnectionString(process.env.DATABASE_URL || "");

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalForDb = globalThis;

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    database: process.env.PGDATABASE || undefined,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}
