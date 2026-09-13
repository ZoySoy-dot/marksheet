"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A palette for people who know the maths but not LaTeX.
 *
 * It types into whichever editor field you last touched, at the caret, and
 * leaves the cursor where you would want to keep typing. Two markers are used
 * inside a snippet: CARET is where the cursor lands, SEL is replaced by
 * whatever text was selected, so wrapping a selection in $ just works.
 */

type Key = { label: string; insert: string; title: string };

const CARET = "";
const SEL = "";

const GROUPS: { name: string; keys: Key[] }[] = [
  {
    name: "Maths mode",
    keys: [
      { label: "$x$", insert: `$${SEL}${CARET}$`, title: "Inline maths" },
      { label: "$$x$$", insert: `$$${SEL}${CARET}$$`, title: "Centred maths" },
    ],
  },
  {
    name: "Structure",
    keys: [
      { label: "a⁄b", insert: `\\frac{${CARET}}{}`, title: "Fraction" },
      { label: "xⁿ", insert: `^{${CARET}}`, title: "Power" },
      { label: "xₙ", insert: `_{${CARET}}`, title: "Subscript" },
      { label: "√", insert: `\\sqrt{${CARET}}`, title: "Square root" },
      { label: "ⁿ√", insert: `\\sqrt[${CARET}]{}`, title: "Nth root" },
      { label: "( )", insert: `\\left(${CARET}\\right)`, title: "Sized brackets" },
      { label: "|x|", insert: `\\left|${CARET}\\right|`, title: "Absolute value" },
    ],
  },
  {
    name: "Operators",
    keys: [
      { label: "×", insert: "\\times ", title: "Times" },
      { label: "÷", insert: "\\div ", title: "Divide" },
      { label: "±", insert: "\\pm ", title: "Plus or minus" },
      { label: "·", insert: "\\cdot ", title: "Dot product" },
      { label: "≤", insert: "\\leq ", title: "Less than or equal" },
      { label: "≥", insert: "\\geq ", title: "Greater than or equal" },
      { label: "≠", insert: "\\neq ", title: "Not equal" },
      { label: "≈", insert: "\\approx ", title: "Approximately" },
      { label: "∝", insert: "\\propto ", title: "Proportional to" },
    ],
  },
  {
    name: "Calculus",
    keys: [
      { label: "∫", insert: `\\int_{${CARET}}^{} `, title: "Integral" },
      { label: "∑", insert: `\\sum_{${CARET}}^{} `, title: "Sum" },
      { label: "∏", insert: `\\prod_{${CARET}}^{} `, title: "Product" },
      { label: "lim", insert: `\\lim_{${CARET}} `, title: "Limit" },
      { label: "∂", insert: "\\partial ", title: "Partial derivative" },
      { label: "∇", insert: "\\nabla ", title: "Nabla" },
      { label: "∞", insert: "\\infty ", title: "Infinity" },
      { label: "dx", insert: "\\,dx", title: "Differential" },
    ],
  },
  {
    name: "Greek",
    keys: [
      { label: "α", insert: "\\alpha ", title: "alpha" },
      { label: "β", insert: "\\beta ", title: "beta" },
      { label: "γ", insert: "\\gamma ", title: "gamma" },
      { label: "θ", insert: "\\theta ", title: "theta" },
      { label: "λ", insert: "\\lambda ", title: "lambda" },
      { label: "μ", insert: "\\mu ", title: "mu" },
      { label: "π", insert: "\\pi ", title: "pi" },
      { label: "ρ", insert: "\\rho ", title: "rho" },
      { label: "σ", insert: "\\sigma ", title: "sigma" },
      { label: "φ", insert: "\\phi ", title: "phi" },
      { label: "ω", insert: "\\omega ", title: "omega" },
      { label: "Δ", insert: "\\Delta ", title: "Delta" },
      { label: "Σ", insert: "\\Sigma ", title: "Sigma" },
      { label: "Ω", insert: "\\Omega ", title: "Omega" },
    ],
  },
  {
    name: "Relations",
    keys: [
      { label: "∈", insert: "\\in ", title: "Element of" },
      { label: "∉", insert: "\\notin ", title: "Not an element of" },
      { label: "⊂", insert: "\\subset ", title: "Subset" },
      { label: "∪", insert: "\\cup ", title: "Union" },
      { label: "∩", insert: "\\cap ", title: "Intersection" },
      { label: "∅", insert: "\\emptyset ", title: "Empty set" },
      { label: "→", insert: "\\rightarrow ", title: "Arrow" },
      { label: "⇒", insert: "\\Rightarrow ", title: "Implies" },
      { label: "∴", insert: "\\therefore ", title: "Therefore" },
    ],
  },
];

type Field = HTMLInputElement | HTMLTextAreaElement;

/** React tracks its own value, so a plain assignment is ignored. */
function setValue(field: Field, value: string) {
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function typeInto(field: Field, snippet: string) {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  const selected = field.value.slice(start, end);

  let text = snippet.split(SEL).join(selected);
  const caretAt = text.indexOf(CARET);
  text = text.split(CARET).join("");
  const offset = caretAt >= 0 ? caretAt : text.length;

  setValue(field, field.value.slice(0, start) + text + field.value.slice(end));

  const position = start + offset;
  field.focus();
  field.setSelectionRange(position, position);
}

export default function MathKeyboard() {
  const [open, setOpen] = useState(false);
  const lastField = useRef<Field | null>(null);

  // Remember the editor field you were last in, so the palette knows where to
  // type. Buttons do not steal it, because they are not editable fields.
  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (target instanceof HTMLInputElement && target.type !== "text") return;
      if (!target.closest("[data-math-target]")) return;
      lastField.current = target;
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  const press = (snippet: string) => {
    const field = lastField.current;
    if (!field || !field.isConnected) return;
    typeInto(field, snippet);
  };

  return (
    <>
      <button
        className={`math-toggle${open ? " is-open" : ""}`}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="math-keyboard"
      >
        <span className="math-toggle-glyph" aria-hidden="true">
          √x
        </span>
        {open ? "Hide maths" : "Maths keys"}
      </button>

      <div className="mathpad" id="math-keyboard" hidden={!open}>
        <div className="mathpad-in">
          <div className="mathpad-head">
            <p className="mathpad-title">Click a field, then a symbol</p>
            <button className="link-btn" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <div className="mathpad-groups">
            {GROUPS.map((group) => (
              <div key={group.name} className="mathpad-group">
                <p className="mathpad-name">{group.name}</p>
                <div className="mathpad-keys">
                  {group.keys.map((key) => (
                    <button
                      key={key.label + key.insert}
                      className="mathkey"
                      type="button"
                      title={key.title}
                      aria-label={key.title}
                      // Keep the editor's caret: never take focus from it.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => press(key.insert)}
                    >
                      {key.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
