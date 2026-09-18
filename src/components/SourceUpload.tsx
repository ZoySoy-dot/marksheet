"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SignInButton from "@/components/SignInButton";
import { COUNTS, type ImportMode } from "@/lib/importModes";

/** Plain text is read here in the browser, so it can be generous and instant. */
const MAX_TEXT_BYTES = 400_000;
/** A document has to cross the wire and be read by a model, so it cannot be. */
const MAX_DOC_BYTES = 20_000_000;

const ACCEPT =
  ".txt,.text,.md,.markdown,.pdf,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,image/png,image/jpeg,image/webp";

const TEXT_NAME = /\.(txt|text|md|markdown)$/i;

// Built from char codes rather than written as escapes, so no control
// character ever ends up embedded in this file.
const NUL = String.fromCharCode(0);
const REPLACEMENT = String.fromCharCode(0xfffd);
const GARBLED = new RegExp(REPLACEMENT + "{3,}");

const MODE_LABEL: Record<ImportMode, string> = {
  read: "Read its questions",
  write: "Write questions from it",
};

const MODE_HINT: Record<ImportMode, string> = {
  read: "A paper that already has questions.",
  write: "Notes, slides or a chapter.",
};

type Props = {
  /** Called with the sheet's source once the file reads cleanly. */
  onLoaded: (text: string, filename: string, title?: string) => void;
};

/**
 * Three ways in, decided by the file and by what is being asked of it.
 *
 * A .txt or .md that already holds the format is read locally and costs
 * nothing. Everything else goes to /api/import, either to have its questions
 * transcribed or to have new ones written about it. The local path is offered
 * for reading only, because the same .txt is study material rather than a
 * sheet the moment the job is to write questions from it.
 */
export default function SourceUpload({ onLoaded }: Props) {
  const [mode, setMode] = useState<ImportMode>("read");
  const [count, setCount] = useState(20);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAccount, setNeedsAccount] = useState(false);
  /** Reads left this period. Null until the meter has answered, or signed out. */
  const [left, setLeft] = useState<number | null>(null);
  const [spent, setSpent] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  // The allowance is worth knowing before a 20 MB upload, not after it.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/usage");
        if (!response.ok) return;
        const data = (await response.json()) as {
          signedIn?: boolean;
          importsLeft?: number;
          exhausted?: boolean;
        };
        if (cancelled || !data.signedIn) return;
        setLeft(data.importsLeft ?? 0);
        setSpent(Boolean(data.exhausted));
      } catch {
        /* the meter is a courtesy: the route enforces the real limit */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const readLocally = async (file: File) => {
    if (file.size > MAX_TEXT_BYTES) {
      setError(
        `${file.name} is ${Math.round(file.size / 1024)} KB. The limit is ${MAX_TEXT_BYTES / 1000} KB.`,
      );
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setError(`${file.name} could not be read.`);
      return;
    }

    // A PDF or image read as text arrives full of null bytes and replacement
    // characters. Catch it here rather than dumping binary into the editor.
    if (text.includes(NUL) || GARBLED.test(text)) {
      setError(`${file.name} is not a text file. Plain text and Markdown only.`);
      return;
    }
    if (!text.trim()) {
      setError(`${file.name} is empty.`);
      return;
    }

    onLoaded(text, file.name);
  };

  const readWithAi = async (file: File) => {
    if (file.size > MAX_DOC_BYTES) {
      setError(
        `${file.name} is ${Math.round(file.size / 1_000_000)} MB. The limit is ${MAX_DOC_BYTES / 1_000_000} MB.`,
      );
      return;
    }

    setReading(file.name);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("mode", mode);
      if (mode === "write") body.append("count", String(count));

      const response = await fetch("/api/import", { method: "POST", body });
      const payload = (await response.json()) as {
        source?: string;
        title?: string;
        error?: string;
        balance?: { importsLeft?: number };
      };

      if (response.status === 401) {
        setNeedsAccount(true);
        return;
      }
      if (response.status === 402) {
        setSpent(true);
        setLeft(0);
        setError(payload.error ?? "You are out of credits.");
        return;
      }
      if (payload.balance?.importsLeft !== undefined) {
        setLeft(payload.balance.importsLeft);
        setSpent(payload.balance.importsLeft <= 0);
      }
      if (!response.ok || !payload.source) {
        setError(payload.error ?? "That document could not be read.");
        return;
      }

      onLoaded(payload.source, file.name, payload.title);
    } catch {
      setError("That document could not be read. Check your connection and try again.");
    } finally {
      setReading(null);
    }
  };

  const take = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNeedsAccount(false);

    // Trust the name over the browser's guess at the type: Windows serves .md
    // as application/octet-stream often enough to matter.
    const isText = TEXT_NAME.test(file.name) || file.type.startsWith("text/");
    await (mode === "read" && isText ? readLocally(file) : readWithAi(file));
  };

  if (reading) {
    return (
      <div className="upload">
        <div className="dropzone" aria-busy="true">
          <p className="dropzone-lead">Reading {reading}</p>
          <p className="dropzone-sub">
            {mode === "write" ? "Writing questions about it." : "Finding the questions and the key."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload">
      <div className="seg seg-kind" role="group" aria-label="What to do with the file">
        {(Object.keys(MODE_LABEL) as ImportMode[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`seg-btn${mode === option ? " is-picked" : ""}`}
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
          >
            {MODE_LABEL[option]}
          </button>
        ))}
      </div>

      <div
        className={`dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void take(event.dataTransfer.files[0]);
        }}
      >
        <p className="dropzone-lead">Drop a file</p>
        <p className="dropzone-sub">{MODE_HINT[mode]} PDF, photo or text.</p>
        <button className="btn btn-quiet" type="button" onClick={() => picker.current?.click()}>
          Choose a file
        </button>
        <input
          ref={picker}
          className="sr-only"
          type="file"
          accept={ACCEPT}
          onChange={(event) => {
            void take(event.target.files?.[0]);
            // Let the same file be picked again after a failed read.
            event.target.value = "";
          }}
        />
      </div>

      {mode === "write" ? (
        <div className="count-row">
          {COUNTS.map((option) => (
            <button
              key={option}
              type="button"
              className={`count-btn${count === option ? " is-picked" : ""}`}
              aria-pressed={count === option}
              onClick={() => setCount(option)}
            >
              {option === 0 ? "As many as it supports" : option}
            </button>
          ))}
        </div>
      ) : null}

      {spent ? (
        <div className="banner banner-info">
          <p>
            You are out of credits. Top up to have AI read another document.
          </p>
          <p>
            Typing a sheet out, or pasting one in, stays unlimited and always will be. So does
            anyone taking a sheet you share.
          </p>
          <Link className="btn btn-primary" href="/topup">
            Top up
          </Link>
        </div>
      ) : left !== null ? (
        <p className="meter-note">
          About {left} credit{left === 1 ? "" : "s"} left. Reading this document uses one.
        </p>
      ) : null}

      {needsAccount ? (
        <div className="banner banner-info" role="alert">
          <p>Making a quiz with AI needs an account.</p>
          <SignInButton />
        </div>
      ) : null}

      {error ? (
        <div className="banner" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <p className="upload-note">
        {mode === "write" ? (
          "Read what comes back before publishing. A model can be confidently wrong."
        ) : (
          <>
            Include the answer key pages. Writing from scratch instead?{" "}
            <Link href="/ai">Use a chatbot</Link>.
          </>
        )}
      </p>
    </div>
  );
}
