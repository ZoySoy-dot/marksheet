/**
 * The editor and the renderer are different libraries. These prove that
 * anything the editor can produce, the renderer can actually draw.
 */
import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { fieldToStored, normaliseForKatex } from "../src/lib/mathfield.ts";

const rendersInKatex = (latex: string) => {
  try {
    katex.renderToString(latex, { throwOnError: true, strict: false });
    return true;
  } catch {
    return false;
  }
};

test("an empty slot is dropped rather than left for KaTeX to choke on", () => {
  assert.equal(normaliseForKatex(String.raw`\frac{1}{\placeholder{}}`), String.raw`\frac{1}{}`);
});

test("MathLive's sized brackets become the standard ones", () => {
  assert.equal(normaliseForKatex(String.raw`\mleft(x\mright)`), String.raw`\left(x\right)`);
});

test("compute-engine spellings become ordinary letters", () => {
  assert.equal(normaliseForKatex(String.raw`\differentialD x`), "d x");
  assert.equal(normaliseForKatex(String.raw`\exponentialE^x`), "e^x");
  assert.equal(normaliseForKatex(String.raw`\imaginaryI`), "i");
});

test("a command that merely starts the same is left alone", () => {
  const safe = String.raw`\mleftarrow`;
  assert.equal(normaliseForKatex(safe), safe);
});

test("ordinary LaTeX passes through untouched", () => {
  for (const latex of [
    String.raw`\frac{1}{2}`,
    String.raw`\int_0^1 x\,dx`,
    String.raw`\text{Layer 3, network}`,
  ]) {
    assert.equal(normaliseForKatex(latex), latex);
  }
});

test("everything MathLive can emit renders in KaTeX after normalising", () => {
  const fromMathLive = [
    String.raw`\frac{1}{\placeholder{}}`,
    String.raw`\placeholder{}`,
    String.raw`\sqrt[\placeholder{}]{x}`,
    String.raw`\differentialD x`,
    String.raw`\mleft(x\mright)`,
    String.raw`\frac{\placeholder{}}{\placeholder{}}`,
  ];

  for (const latex of fromMathLive) {
    assert.equal(rendersInKatex(latex), false, `expected raw ${latex} to fail in KaTeX`);
    const fixed = normaliseForKatex(latex);
    assert.equal(rendersInKatex(fixed), true, `${latex} still fails after normalising: ${fixed}`);
  }
});

test("a half-built fraction stores as something publishable", () => {
  const stored = fieldToStored(String.raw`\frac{1}{\placeholder{}}`);
  assert.equal(stored, String.raw`$\frac{1}{}$`);
  assert.ok(rendersInKatex(stored.slice(1, -1)));
});

test("a field holding only an empty slot stores as nothing", () => {
  assert.equal(fieldToStored(String.raw`\placeholder{}`), "");
});
