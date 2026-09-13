"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const MAX_BYTES = 400_000;
const ACCEPT = ".txt,.text,.md,.markdown,text/plain,text/markdown";

// Built from char codes rather than written as escapes, so no control
// character ever ends up embedded in this file.
const NUL = String.fromCharCode(0);
const REPLACEMENT = String.fromCharCode(0xfffd);
const GARBLED = new RegExp(REPLACEMENT + "{3,}");

type Props = {
  /** Called with the file's contents once it reads cleanly. */
  onLoaded: (text: string, filename: string) => void;
};

export default function SourceUpload({ onLoaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const take = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (file.size > MAX_BYTES) {
      setError(
        `${file.name} is ${Math.round(file.size / 1024)} KB. The limit is ${MAX_BYTES / 1000} KB.`,
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

  return (
    <div className="upload">
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
        <p className="dropzone-lead">Drop a text file</p>
        <p className="dropzone-sub">.txt or .md, up to {MAX_BYTES / 1000} KB.</p>
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

      {error ? (
        <div className="banner" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <p className="upload-note">
        Got a PDF or photos? <Link href="/ai">Use AI</Link> instead.
      </p>
    </div>
  );
}
