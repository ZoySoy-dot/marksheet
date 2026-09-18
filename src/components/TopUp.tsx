"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Pack } from "@/lib/usage";

type Usage = {
  credits: number;
  importsLeft: number;
  exhausted: boolean;
};

type Props = {
  packs: Pack[];
  /** True when PayMongo keys are set. Without them nothing can be bought. */
  live: boolean;
  paid: boolean;
  cancelled: boolean;
};

/** A token count is not a sentence. A number of credits is. */
const credits = (tokens: number, perCredit: number) => Math.floor(tokens / perCredit);

export default function TopUp({ packs, live, paid, cancelled }: Props) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // After a payment the balance lands by webhook rather than on the redirect,
  // so the number here can lag the payment by a moment. Read it on arrival and
  // once more shortly after, which covers the usual case without polling.
  useEffect(() => {
    let cancelledEffect = false;
    const read = async () => {
      try {
        const response = await fetch("/api/usage");
        if (!response.ok) return;
        const data = (await response.json()) as Usage & { signedIn?: boolean };
        if (!cancelledEffect && data.signedIn !== false) setUsage(data);
      } catch {
        /* the balance is a readout; the route is what enforces anything */
      }
    };
    void read();
    const again = paid ? setTimeout(read, 4000) : undefined;
    return () => {
      cancelledEffect = true;
      if (again) clearTimeout(again);
    };
  }, [paid]);

  const buy = async (pack: Pack) => {
    setBusy(pack.id);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: pack.id }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not open checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checkout.");
      setBusy(null);
    }
  };

  return (
    <div className="screen screen-narrow">
      <h1 className="display display-md">Top up</h1>
      <p className="deck">
        One credit has AI make a quiz from one document. That is the only thing here that costs
        anything: writing a sheet by hand, sharing it, and anyone taking it are free and always
        will be.
      </p>

      {paid ? (
        <div className="banner banner-info">
          <p>
            Payment received. Your credits are being added now; if the number below has not
            moved, give it a moment and refresh.
          </p>
        </div>
      ) : null}

      {cancelled ? (
        <div className="banner banner-info">
          <p>Checkout closed, and nothing was charged.</p>
        </div>
      ) : null}

      {usage ? (
        <div className="balance">
          <p className="figure">
            <span className="figure-num">{usage.importsLeft}</span>
            <span className="figure-label">credits left</span>
          </p>
          <p className="balance-note">
            {usage.credits > 0
              ? "Credits never expire, so there is nothing to use up before a deadline."
              : "You have none left. Pick a pack below to carry on."}
          </p>
        </div>
      ) : null}

      <p className="rubric">Packs</p>
      <ul className="packs">
        {packs.map((pack) => (
          <li key={pack.id}>
            <div>
              <p className="pack-price">₱{pack.php}</p>
              <p className="pack-reads">about {credits(pack.tokens, 3458)} credits</p>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!live || busy !== null}
              onClick={() => buy(pack)}
            >
              {busy === pack.id ? "Opening…" : "Buy"}
            </button>
          </li>
        ))}
      </ul>

      {!live ? (
        <div className="banner banner-info">
          <p>Top-ups are not switched on yet. Nothing here can be bought.</p>
        </div>
      ) : null}

      {error ? (
        <div className="banner" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <p className="fine-note">
        Credits never expire, so nothing is lost by buying a bigger pack than you need this
        week. Paid by GCash or Maya through PayMongo.
      </p>

      <div className="actions">
        <Link className="btn btn-quiet" href="/new">
          Back to the editor
        </Link>
      </div>
    </div>
  );
}
