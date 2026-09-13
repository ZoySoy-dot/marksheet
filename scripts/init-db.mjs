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

/**
 * Splits on statement boundaries only. A naive split on ";" breaks the moment a
 * comment or a string literal contains one, which is exactly what happened.
 */
function splitStatements(sql) {
  const statements = [];
  let buffer = "";
  let inLineComment = false;
  let inString = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (inLineComment) {
      buffer += char;
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inString) {
      buffer += char;
      if (char === "'") inString = false;
      continue;
    }
    if (char === "-" && nextChar === "-") {
      inLineComment = true;
      buffer += char;
      continue;
    }
    if (char === "'") {
      inString = true;
      buffer += char;
      continue;
    }
    if (char === ";") {
      statements.push(buffer);
      buffer = "";
      continue;
    }
    buffer += char;
  }

  if (buffer.trim()) statements.push(buffer);
  return statements;
}

const sql = neon(url);
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

const statements = splitStatements(schema)
  .map((statement) => statement.trim())
  .filter(
    (statement) =>
      statement.length > 0 &&
      !statement.split("\n").every((line) => line.trim().startsWith("--")),
  );

for (const statement of statements) {
  const label = statement.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim().slice(0, 66);
  process.stdout.write(`  ${label}... `);
  await sql.query(statement);
  console.log("ok");
}

const [{ count }] = await sql`select count(*)::int as count from quizzes`;
console.log(`\nSchema is ready. ${count} quiz${count === 1 ? "" : "zes"} stored.`);
