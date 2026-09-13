"use client";

import SignInButton from "@/components/SignInButton";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TeX from "@/components/TeX";
import { readMine, timeLeftLabel, type SavedSheet } from "@/lib/mine";
import type { OwnedSheet, SavedSheetRow } from "@/lib/quizzes";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

type Props = { signedIn: boolean; sheets: OwnedSheet[]; saved: SavedSheetRow[] };

export default function MineList({ signedIn, sheets, saved }: Props) {
  const [local, setLocal] = useState<SavedSheet[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  const nothingAnywhere =
    local !== null && local.length === 0 && sheets.length === 0 && saved.length === 0;

  return (
    <div className="screen screen-narrow">
      <h1 className="display display-md">Quizzes</h1>
      <p className="deck">
        {signedIn
          ? "Quizzes you made, and ones you saved."
          : "Made in this browser. Sign in to keep them."}
      </p>

      {!signedIn && local !== null && local.length > 0 ? (
        <div className="banner banner-info">
          <p>
            These are only remembered by this browser, and only for a few hours. Sign in and they
            move to your account for good.
          </p>
          <p>
            <SignInButton className="link-btn">Sign in with Google</SignInButton>
          </p>
        </div>
      ) : null}

      {nothingAnywhere ? (
        <div className="empty">
          <p>No quizzes yet.</p>
          <Link className="btn btn-primary" href="/new">
            Make your first one
          </Link>
        </div>
      ) : null}

      {sheets.length > 0 ? (
        <>
          <p className="rubric section-head">My own quizzes</p>
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
        </>
      ) : null}

      {unclaimed.length > 0 ? (
        <>
          <p className="rubric section-head">Made in this browser</p>
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
                    {sheet.questionCount} question{sheet.questionCount === 1 ? "" : "s"} · editable
                    here for {timeLeftLabel(sheet)}
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

      <Link className="new-fab" href="/new" aria-label="Make a new quiz">
        <span className="new-fab-plus" aria-hidden="true">+</span>
        <span className="new-fab-label">New quiz</span>
      </Link>

      {saved.length > 0 ? (
        <>
          <p className="rubric section-head">From other people</p>
          <ul className="mine-list">
            {saved.map((sheet) => (
              <li key={sheet.slug} className="mine-item">
                <div>
                  <p className="mine-title">
                    <Link href={`/q/${sheet.slug}`}>
                      <TeX>{sheet.title}</TeX>
                    </Link>
                  </p>
                  <p className="mine-meta">
                    {sheet.questionCount} question{sheet.questionCount === 1 ? "" : "s"}
                    {sheet.savedAt ? ` · saved ${formatDate(sheet.savedAt)}` : ""}
                  </p>
                </div>
                <div className="mine-links">
                  <Link className="link-btn" href={`/q/${sheet.slug}`}>
                    Take it
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
