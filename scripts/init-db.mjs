import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set.");
  console.error("Create .env.local with your Neon connection string, then run this again:");
  console.error("");
  console.error('  DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"');
  console.error("");
  process.exit(1);
}

const sql = neon(url);
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.split("\n").every((line) => line.trim().startsWith("--")));

for (const statement of statements) {
  const label = statement.replace(/\s+/g, " ").slice(0, 70);
  process.stdout.write(`  ${label}… `);
  await sql.query(statement);
  console.log("ok");
}

const [{ count }] = await sql`select count(*)::int as count from quizzes`;
console.log(`\nSchema is ready. ${count} quiz${count === 1 ? "" : "zes"} stored.`);
