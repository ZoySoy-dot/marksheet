"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Legend from "@/components/Legend";
import QuizRunner from "@/components/QuizRunner";
import { parseSheet, suggestTitle } from "@/lib/parse";
import { findTexProblems } from "@/lib/tex";
import { SAMPLE_SOURCE, SAMPLE_TITLE } from "@/lib/sample";
import { forgetSheet, rememberSheet } from "@/lib/mine";

const DRAFT_KEY = "marksheet.draft";
const PROBLEMS_SHOWN = 8;

type Props = {
  mode: "create" | "edit";
  slug?: string;
  editToken?: string;
  initialTitle?: string;
  initialSource?: string;
};

type Published = { slug: string; url: string };

export default function Composer({ mode, slug, editToken, initialTitle, initialSource }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [source, setSource] = useState(initialSource ?? "");
  const [practising, setPractising] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState<Published | null>(null);
  const urlField = useRef<HTMLInputElement>(null);

  // Broken LaTeX is reported the same way a malformed line is: by line number,
  // and it blocks publishing.
  const { questions, problems, multiCount } = useMemo(() => {
    const parsed = parseSheet(source);
    const merged = [...parsed.problems, ...findTexProblems(source)].sort((a, b) => a.line - b.line);
    return { ...parsed, problems: merged };
  }, [source]);
  const ready = questions.length > 0 && problems.length === 0;
  const effectiveTitle = title.trim() || suggestTitle(questions);

  // Keep a draft so a closed tab at 1am does not cost you the whole sheet.
  useEffect(() => {
    if (mode !== "create") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title?: string; source?: string };
      if (draft.source) setSource(draft.source);
      if (draft.title) setTitle(draft.title);
    } catch {
      /* no draft to restore */
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "create") return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, source }));
      } catch {
        /* nothing to do */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [mode, title, source]);

  useEffect(() => {
    setSaved(false);
  }, [title, source]);

  const loadSample = () => {
    setSource(SAMPLE_SOURCE);
    setTitle(SAMPLE_TITLE);
    setPublished(null);
    setError(null);
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: effectiveTitle, source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not publish this sheet.");

      rememberSheet({
        slug: data.slug,
        title: data.title,
        editToken: data.editToken,
        questionCount: data.questionCount,
        createdAt: new Date().toISOString(),
      });
      setPublished({ slug: data.slug, url: `${window.location.origin}/q/${data.slug}` });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing to do */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish this sheet.");
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    if (!slug || !editToken) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/quizzes/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editToken, title: effectiveTitle, source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save your changes.");
      rememberSheet({
        slug,
        title: data.title,
        editToken,
        questionCount: data.questionCount,
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your changes.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!slug || !editToken) return;
    if (!window.confirm("Delete this sheet? The share link stops working for everyone.")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/quizzes/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editToken }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Could not delete this sheet.");
      }
      forgetSheet(slug);
      router.push("/mine");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this sheet.");
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(published.url);
    } catch {
      urlField.current?.select();
    }
  };

  if (practising) {
    return (
      <div className="screen">
        <QuizRunner
          title={effectiveTitle}
          questions={questions}
          onLeave={() => setPractising(false)}
          leaveLabel="Back to the editor"
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="sheet">
        <div>
          <h1 className="display">
            {mode === "edit" ? (
              <>
                Edit
                <br />
                Sheet
              </>
            ) : (
              <>
                Answer
                <br />
                Sheet
              </>
            )}
          </h1>
          <p className="deck">
            {mode === "edit"
              ? "Change the questions below. Everyone with the link sees the new version."
              : "Paste your questions in the format below. Marksheet reads the marks and runs the quiz."}
          </p>
          <Legend />
        </div>

        <div>
          <div className="field-block">
            <label className="rubric" htmlFor="title">
              Sheet title
            </label>
            <input
              id="title"
              className="title-input"
              type="text"
              value={title}
              maxLength={140}
              placeholder="Systems midterm"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field-head">
            <label className="rubric" htmlFor="source">
              Your questions
            </label>
            <button className="link-btn" type="button" onClick={loadSample}>
              Load a sample
            </button>
          </div>

          <textarea
            id="source"
            className="source"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            value={source}
            aria-describedby="readout"
            onChange={(e) => setSource(e.target.value)}
            placeholder={
              "Q: What is the capital of France?\n- London\n- Berlin\n* Paris\n\nQ: Solve $x^2 - 5x + 6 = 0$\n* $x = 2$ or $x = 3$\n- $x = 1$ or $x = 6$\n- No real solutions\n> Factor it: $(x - 2)(x - 3) = 0$."
            }
          />

          <div className="readout" id="readout" role="status" aria-live="polite">
            <div className="readout-figures">
              <p className="figure">
                <span className="figure-num">{questions.length}</span>
                <span className="figure-label">questions</span>
              </p>
              <p className="figure">
                <span className="figure-num">{multiCount}</span>
                <span className="figure-label">pick all</span>
              </p>
              <p className={`figure${problems.length ? " is-flagged" : ""}`}>
                <span className="figure-num">{problems.length}</span>
                <span className="figure-label">problems</span>
              </p>
            </div>

            {source.trim().length === 0 ? (
              <p className="readout-empty">Nothing marked yet.</p>
            ) : null}

            {problems.length ? (
              <ul className="problems">
                {problems.slice(0, PROBLEMS_SHOWN).map((problem) => (
                  <li key={`${problem.line}-${problem.message}`}>
                    Line {problem.line}: {problem.message}
                  </li>
                ))}
                {problems.length > PROBLEMS_SHOWN ? (
                  <li>And {problems.length - PROBLEMS_SHOWN} more.</li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className="actions">
            {mode === "create" ? (
              <button className="btn btn-primary" type="button" onClick={publish} disabled={!ready || busy}>
                {busy ? "Publishing…" : "Publish and get a link"}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={saveChanges} disabled={!ready || busy}>
                {busy ? "Saving…" : saved ? "Saved" : "Save changes"}
              </button>
            )}

            <button className="btn btn-quiet" type="button" onClick={() => setPractising(true)} disabled={!ready}>
              Practise without saving
            </button>

            {mode === "edit" ? (
              <button className="btn btn-danger" type="button" onClick={remove} disabled={busy}>
                Delete sheet
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="banner" role="alert">
              <p>{error}</p>
            </div>
          ) : null}

          {mode === "edit" && saved ? (
            <div className="banner banner-info">
              <p>
                Saved. <a href={`/q/${slug}`}>Open the sheet</a> to see it the way everyone else does.
              </p>
            </div>
          ) : null}

          {published ? (
            <div className="share">
              <p className="rubric">Your share link</p>
              <div className="share-url">
                <input ref={urlField} type="text" readOnly value={published.url} onFocus={(e) => e.target.select()} />
                <button className="btn btn-primary" type="button" onClick={copyLink}>
                  Copy link
                </button>
                <a className="btn btn-quiet" href={`/q/${published.slug}`}>
                  Open it
                </a>
              </div>
              <p className="share-note">
                Anyone with this link can take the sheet. Keep editing it from{" "}
                <a href="/mine">My sheets</a> on this device.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
