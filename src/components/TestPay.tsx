"use client";

import { useState } from "react";
import { TEST_PACK } from "@/lib/usage";

/**
 * The button. Goes through the same /api/checkout as a real pack, so what this
 * proves is the real path and not a parallel one built to pass.
 */
export default function TestPay() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: TEST_PACK.id }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Could not open checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checkout.");
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn btn-primary btn-lg" type="button" onClick={pay} disabled={busy}>
        {busy ? "Opening checkout…" : `Pay ₱${TEST_PACK.php} with Maya or QR Ph`}
      </button>
      {error ? <p className="note">{error}</p> : null}
    </>
  );
}
