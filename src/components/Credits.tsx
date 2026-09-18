"use client";

import Link from "next/link";
import { useUsage } from "@/lib/useUsage";

/**
 * Credits left, in the masthead, on every page.
 *
 * One credit is one quiz made by AI. Counted that way rather than in tokens,
 * because tokens are the unit that costs money and a quiz is the unit a person
 * can act on.
 *
 * There is no free allowance, so this is simply what is left of what was
 * bought. An account with no purchases shows "Top up", which is where everybody
 * starts.
 */
export default function Credits({ compact = false }: { compact?: boolean }) {
  const usage = useUsage();

  if (!usage) return null;

  const left = usage.importsLeft ?? 0;
  const out = usage.exhausted || left <= 0;

  return (
    <Link
      className={`credits${out ? " is-out" : ""}`}
      href="/topup"
      title={
        out
          ? "No credits left. Top up to have AI read another document."
          : `${left} credit${left === 1 ? "" : "s"} left. One has AI make a quiz from a document.`
      }
    >
      {out ? (
        "Top up"
      ) : (
        <>
          <span className="credits-num">{left}</span>
          {compact ? null : (
            <span className="credits-label">{left === 1 ? "credit" : "credits"}</span>
          )}
        </>
      )}
    </Link>
  );
}
