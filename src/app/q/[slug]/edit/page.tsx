"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Composer from "@/components/Composer";
import { findSheet } from "@/lib/mine";

type Status = "loading" | "ready" | "missing" | "no-token" | "error";

export default function EditPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [status, setStatus] = useState<Status>("loading");
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState<{ title: string; source: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!slug) return;

    const fromUrl = new URLSearchParams(window.location.search).get("t") ?? "";
    const editToken = fromUrl || findSheet(slug)?.editToken || "";
    if (!editToken) {
      setStatus("no-token");
      return;
    }
    setToken(editToken);

    let cancelled = false;
    fetch(`/api/quizzes/${slug}`)
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (response.status === 404) {
          setStatus("missing");
          return;
        }
        if (!response.ok) throw new Error(data.error ?? "Could not load this sheet.");
        setLoaded({ title: data.title, source: data.source });
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "Could not load this sheet.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "ready" && loaded) {
    return (
      <Composer
        mode="edit"
        slug={slug}
        editToken={token}
        initialTitle={loaded.title}
        initialSource={loaded.source}
      />
    );
  }

  if (status === "loading") {
    return (
      <div className="screen screen-narrow">
        <p className="rubric">Opening the sheet</p>
      </div>
    );
  }

  if (status === "no-token") {
    return (
      <div className="screen screen-narrow">
        <p className="rubric">Cannot edit here</p>
        <h1 className="display display-md">No edit key</h1>
        <p className="deck">
          Marksheet has no accounts. A sheet can only be edited from the browser that published it,
          or through an edit link that carries the key.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" href="/mine">
            My sheets
          </Link>
          <Link className="btn btn-quiet" href={`/q/${slug}`}>
            Take this sheet instead
          </Link>
        </div>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="screen screen-narrow">
        <p className="rubric">Nothing here</p>
        <h1 className="display display-md">Blank sheet</h1>
        <p className="deck">That link does not match any sheet. It may already have been deleted.</p>
        <div className="actions">
          <Link className="btn btn-primary" href="/">
            Make a new sheet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-narrow">
      <p className="rubric">Could not open</p>
      <h1 className="display display-md">Sheet stuck</h1>
      <div className="banner" role="alert">
        <p>{message}</p>
      </div>
      <div className="actions">
        <Link className="btn btn-quiet" href="/mine">
          My sheets
        </Link>
      </div>
    </div>
  );
}
