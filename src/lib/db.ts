import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. Add your Neon connection string to .env.local.");
    this.name = "DatabaseNotConfiguredError";
  }
}

let cached: NeonQueryFunction<false, false> | null = null;

/** Lazy so a missing DATABASE_URL fails at request time, not at build time. */
export function getSql(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();
  cached = neon(url);
  return cached;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
