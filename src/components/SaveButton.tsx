"use client";

import SignInButton from "@/components/SignInButton";
import { useState } from "react";

type Props = {
  slug: string;
  signedIn: boolean;
  initialSaved: boolean;
};

/** Keeps a sheet in your library. Works on sheets you did not write. */
export default function SaveButton({ slug, signedIn, initialSaved }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <SignInButton className="btn btn-quiet">Save it</SignInButton>
    );
  }

  const toggle = async () => {
    const next = !saved;
    setBusy(true);
    setSaved(next); // optimistic: this is a bookmark, not a payment
    try {
      const response = await fetch(`/api/quizzes/${slug}/save`, {
        method: next ? "POST" : "DELETE",
      });
      if (!response.ok) setSaved(!next);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="btn btn-quiet"
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
    >
      {saved ? "Saved" : "Save it"}
    </button>
  );
}
