"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TeX from "@/components/TeX";
import { readMine, type SavedSheet } from "@/lib/mine";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function MinePage() {
  const [sheets, setSheets] = useState<SavedSheet[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setSheets(readMine());
  }, []);

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

  return (
    <div className="screen screen-narrow">
      <p className="rubric">On this device</p>
      <h1 className="display display-md">My sheets</h1>
      <p className="deck">
        Sheets you published from this browser. The edit keys live here, so this list does not follow
        you to another device.
      </p>

      {sheets === null ? null : sheets.length === 0 ? (
        <div className="empty">
          <p>No sheets published from this browser yet.</p>
          <Link className="btn btn-primary" href="/">
            Make your first sheet
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
