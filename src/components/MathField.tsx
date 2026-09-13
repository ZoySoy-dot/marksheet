"use client";

import { useEffect, useRef, useState } from "react";
import { fieldToStored, storedToField } from "@/lib/mathfield";

type Props = {
  value: string;
  onChange: (stored: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

/**
 * An answer box that shows the equation instead of the LaTeX behind it.
 *
 * Plain words render in the interface font and stay plain words: smartMode
 * keeps the field in text mode until you type something that is actually
 * maths, and --text-font-family means that text is set in Inter rather than
 * in a maths face. The equation font only appears where there is an equation.
 *
 * The keyboard is opened from one floating button for the whole page, not from
 * a button on every answer.
 */
export default function MathField({ value, onChange, placeholder, ariaLabel }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const field = useRef<(HTMLElement & { value: string; smartMode: boolean }) | null>(null);
  const notify = useRef(onChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    notify.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { MathfieldElement } = await import("mathlive");
      if (cancelled || !host.current) return;

      // Served from public/ rather than guessed relative to the bundle.
      MathfieldElement.fontsDirectory = "/mathlive/fonts";
      MathfieldElement.soundsDirectory = null;

      const element = new MathfieldElement();
      element.smartMode = true;
      // Never springs open on its own; the √x button is the only way in.
      element.mathVirtualKeyboardPolicy = "manual";
      element.setAttribute("class", "mathfield");
      if (ariaLabel) element.setAttribute("aria-label", ariaLabel);
      element.value = storedToField(value);

      element.addEventListener("input", () => {
        notify.current(fieldToStored(element.value));
      });

      host.current.replaceChildren(element);
      field.current = element as unknown as typeof field.current;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // Built once. Later value changes are pushed in by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the field in step when the value changes from somewhere else, such as
  // loading a sample, without stamping on what is being typed.
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    if (fieldToStored(element.value) !== value) element.value = storedToField(value);
  }, [value, ready]);

  const showPlaceholder = ready && !value.trim() && Boolean(placeholder);

  return (
    <span className="mathfield-wrap">
      <span className="mathfield-host" ref={host}>
        {showPlaceholder ? (
          // Ours, not MathLive's: theirs is typeset as maths inside a shadow
          // root, so it arrives italic and unstyleable.
          <span className="mathfield-placeholder" aria-hidden="true">
            {placeholder}
          </span>
        ) : null}
      </span>
    </span>
  );
}
