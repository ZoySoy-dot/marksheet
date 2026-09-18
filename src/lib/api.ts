import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError } from "@/lib/db";

export function apiError(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(
      { error: "This copy of Sagot is not connected to a database yet." },
      { status: 503 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong on our side." }, { status: 500 });
}

/** Compares edit tokens without leaking their contents through timing. */
export function tokensMatch(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
