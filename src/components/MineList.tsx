"use client";

import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TeX from "@/components/TeX";
import { readMine, type SavedSheet } from "@/lib/mine";
import type { OwnedSheet } from "@/lib/quizzes";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

type Props = { signedIn: boolean; sheets: OwnedSheet[] };

export default function MineList({ signedIn, sheets }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<SavedSheet[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    setLocal(readMine());
  }, []);

  // Sheets this browser published that are not on the account yet.
  const unclaimed = useMemo(() => {
    if (local === null) return [];
    const owned = new Set(sheets.map((sheet) => sheet.slug));
    return local.filter((sheet) => !owned.has(sheet.slug));
  }, [local, sheets]);

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/q/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const claimAll = async () => {
    setClaiming(true);
    setClaimError(null);
    let failed = 0;

    for (const sheet of unclaimed) {
      try {
        const response = await fetch(`/api/quizzes/${sheet.slug}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editToken: sheet.editToken }),
        });
        if (!response.ok) failed += 1;
      } catch {
        failed += 1;
      }
    }

    if (failed > 0) {
      const plural = failed === 1 ? "sheet" : "sheets";
      setClaimError(`${failed} ${plural} could not be moved. They may already belong to another account.`);
    }

    setClaiming(false);
    router.refresh();
  };

  const nothingAnywhere = local !== null && local.length === 0 && sheets.length === 0;

  return (
    <div className="screen screen-narrow">
      <p className="rubric">{signedIn ? "In your account" : "On this device"}</p>
      <h1 className="display display-md">My sheets</h1>
      <p className="deck">
        {signedIn
          ? "Sheets you published while signed in. They follow you to any browser you sign in from."
          : "Sheets published from this browser. Sign in to keep them on your account and reach them from anywhere."}
      </p>

      {!signedIn && local !== null && local.length > 0 ? (
        <div className="banner banner-info">
          <p>
            These sheets live in this browser only. Clear its storage and you lose the ability to
            edit them, though the share links keep working.
          </p>
          <p>
            <SignInButton mode="modal">
              <button className="link-btn" type="button">
                Sign in to keep them
              </button>
            </SignInButton>
          </p>
        </div>
      ) : null}

      {signedIn && unclaimed.length > 0 ? (
        <div className="banner banner-info">
          <p>
            {unclaimed.length} sheet{unclaimed.length === 1 ? "" : "s"} published from this browser
            {unclaimed.length === 1 ? " is" : " are"} not on your account yet.
          </p>
          <p>
            <button className="link-btn" type="button" onClick={claimAll} disabled={claiming}>
              {claiming ? "Moving…" : "Move them to my account"}
            </button>
          </p>
        </div>
      ) : null}

      {claimError ? (
        <div className="banner" role="alert">
          <p>{claimError}</p>
        </div>
      ) : null}

      {nothingAnywhere ? (
        <div className="empty">
          <p>No sheets yet.</p>
          <Link className="btn btn-primary" href="/">
            Make your first sheet
          </Link>
        </div>
      ) : null}

      {sheets.length > 0 ? (
        <ul className="mine-list">
          {sheets.map((sheet) => (
            <li key={sheet.slug} className="mine-item">
              <div>
                <p className="mine-title">
                  <Link href={`/q/${sheet.slug}`}>
                    <TeX>{sheet.title}</TeX>
                  </Link>
                </p>
                <p className="mine-meta">
                  {sheet.questionCount} question{sheet.questionCount === 1 ? "" : "s"}
                  {sheet.attempts > 0
                    ? ` · taken ${sheet.attempts} time${sheet.attempts === 1 ? "" : "s"}`
                    : ""}
                  {sheet.createdAt ? ` · ${formatDate(sheet.createdAt)}` : ""}
                </p>
              </div>
              <div className="mine-links">
                <Link className="link-btn" href={`/q/${sheet.slug}`}>
                  Take it
                </Link>
                <Link className="link-btn" href={`/q/${sheet.slug}/edit`}>
                  Edit
                </Link>
                <button className="link-btn" type="button" onClick={() => copyLink(sheet.slug)}>
                  {copied === sheet.slug ? "Copied" : "Copy link"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {unclaimed.length > 0 ? (
        <>
          {sheets.length > 0 ? <p className="rubric review-head">On this device only</p> : null}
          <ul className="mine-list">
            {unclaimed.map((sheet) => (
              <li key={sheet.slug} className="mine-item">
                <div>
                  <p className="mine-title">
                    <Link href={`/q/${sheet.slug}`}>
                      <TeX>{sheet.title}</TeX>
                    </Link>
                  </p>
                  <p className="mine-meta">
                    {sheet.questionCount} question{sheet.questionCount === 1 ? "" : "s"}
                    {sheet.createdAt ? ` · ${formatDate(sheet.createdAt)}` : ""}
                  </p>
                </div>
                <div className="mine-links">
                  <Link className="link-btn" href={`/q/${sheet.slug}`}>
                    Take it
                  </Link>
                  <Link className="link-btn" href={`/q/${sheet.slug}/edit?t=${sheet.editToken}`}>
                    Edit
                  </Link>
                  <button className="link-btn" type="button" onClick={() => copyLink(sheet.slug)}>
                    {copied === sheet.slug ? "Copied" : "Copy link"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
