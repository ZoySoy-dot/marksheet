"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { forgetMany, readMine } from "@/lib/mine";

/**
 * Moves quizzes made in this browser onto the account, the moment there is an
 * account to move them to.
 *
 * Mounted in the layout rather than on one page, because people sign in from
 * wherever they happen to be. The edit token is the proof of authorship, and
 * the server only accepts it for a quiz that has no owner yet, so this can
 * never take someone else's work.
 */
export default function ClaimOnSignIn() {
  const { status } = useSession();
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || attempted.current) return;

    const pending = readMine();
    attempted.current = true;
    if (pending.length === 0) return;

    let cancelled = false;

    void (async () => {
      const settled: string[] = [];

      for (const sheet of pending) {
        try {
          const response = await fetch(`/api/quizzes/${sheet.slug}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ editToken: sheet.editToken }),
          });
          // Claimed, or gone entirely. Either way this browser can stop
          // holding a key to it. A 403 means someone else owns it, so the
          // local copy is useless too.
          if (response.ok || response.status === 404 || response.status === 403) {
            settled.push(sheet.slug);
          }
        } catch {
          /* network trouble: keep it and try again on the next load */
        }
      }

      if (cancelled || settled.length === 0) return;
      forgetMany(settled);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [status, router]);

  return null;
}
