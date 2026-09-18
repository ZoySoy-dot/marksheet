"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type Usage = {
  signedIn?: boolean;
  credits?: number;
  importsLeft?: number;
  exhausted?: boolean;
};

/**
 * One request for the balance, however many things on the page want it.
 *
 * The masthead chip and the account menu both show credits, and without this
 * they would each fetch the same thing on every page load. The promise is
 * cached rather than the value, so two components mounting in the same tick
 * share one request rather than racing.
 */
let inFlight: Promise<Usage | null> | null = null;

const load = (): Promise<Usage | null> => {
  inFlight ??= fetch("/api/usage")
    .then((response) => (response.ok ? (response.json() as Promise<Usage>) : null))
    .catch(() => null);
  return inFlight;
};

/**
 * Throws the cached balance away, so the next read goes to the server.
 *
 * Call after anything that spends or buys credits. Nothing here polls: a number
 * that is a few seconds stale costs nobody anything, and the route is what
 * actually enforces the limit.
 */
export const refreshUsage = (): void => {
  inFlight = null;
};

export function useUsage(): Usage | null {
  const { status } = useSession();
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setUsage(null);
      return;
    }
    let cancelled = false;
    void load().then((data) => {
      if (!cancelled && data?.signedIn) setUsage(data);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return usage;
}
