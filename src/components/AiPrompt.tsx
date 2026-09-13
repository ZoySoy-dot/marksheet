"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { buildPrompt } from "@/lib/aiPrompt";

const COUNTS = [10, 15, 20, 30, 0];

const CHATBOTS = [
  { name: "Claude", href: "https://claude.ai/new" },
  { name: "Gemini", href: "https://gemini.google.com/app" },
  { name: "ChatGPT", href: "https://chatgpt.com/" },
];

export default function AiPrompt() {
  const [count, setCount] = useState(20);
  const [copied, setCopied] = useState(false);
  const promptBox = useRef<HTMLTextAreaElement>(null);

  const prompt = useMemo(() => buildPrompt({ count }), [count]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      promptBox.current?.select();
    }
  };

  return (
    <div className="screen screen-narrow">
      <p className="rubric">Write it with a chatbot</p>
      <h1 className="display display-md">Reviewer in, sheet out</h1>
      <p className="deck">
        Claude, Gemini and ChatGPT already read PDFs, slides and photos of your notes. Hand one of
        them this brief along with your reviewer, and it writes the sheet in the format Marksheet
        reads.
      </p>

      <ol className="steps">
        <li>
          <p className="step-name">Copy the brief</p>
          <p className="step-note">It carries the whole format, including the maths rules.</p>
        </li>
        <li>
          <p className="step-name">Paste it into the chatbot with your reviewer</p>
          <p className="step-note">
            Attach the PDF or photos in the same message. No need to retype anything.
          </p>
        </li>
        <li>
          <p className="step-name">Paste the reply into the editor</p>
          <p className="step-note">
            The readout checks every line as you paste. Fix anything it flags, then publish.
          </p>
        </li>
      </ol>

      <div className="field-head">
        <p className="rubric">How many questions</p>
      </div>
      <div className="count-row">
        {COUNTS.map((option) => (
          <button
            key={option}
            type="button"
            className={`count-btn${count === option ? " is-picked" : ""}`}
            onClick={() => setCount(option)}
          >
            {option === 0 ? "As many as it can" : option}
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-primary" type="button" onClick={copy}>
          {copied ? "Copied" : "Copy the brief"}
        </button>
        {CHATBOTS.map((bot) => (
          <a
            key={bot.name}
            className="btn btn-quiet"
            href={bot.href}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open {bot.name}
          </a>
        ))}
      </div>

      <p className="rubric review-head">The brief</p>
      <textarea
        ref={promptBox}
        className="source prompt-box"
        readOnly
        value={prompt}
        spellCheck={false}
        onFocus={(event) => event.target.select()}
      />

      <div className="banner banner-info">
        <p>
          Read what comes back before you publish it. A chatbot will occasionally be confidently
          wrong about your material, and a sheet that drills the wrong answer is worse than no sheet.
        </p>
      </div>

      <div className="actions">
        <Link className="btn btn-primary" href="/">
          Open the editor
        </Link>
      </div>
    </div>
  );
}
