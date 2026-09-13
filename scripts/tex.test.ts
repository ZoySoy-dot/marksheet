/**
 * Contract tests for LaTeX handling.
 * Run with: npm test
 */
import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml, findTexProblems, mathToHtml, splitMath } from "../src/lib/tex.ts";

test("splits inline math out of prose", () => {
  assert.deepEqual(splitMath("Solve $x^2$ now"), [
    { type: "text", value: "Solve " },
    { type: "math", value: "x^2", display: false },
    { type: "text", value: " now" },
  ]);
});

test("recognises display math", () => {
  assert.deepEqual(splitMath(String.raw`Find $$\int_0^1 x\,dx$$`), [
    { type: "text", value: "Find " },
    { type: "math", value: String.raw`\int_0^1 x\,dx`, display: true },
  ]);
});

test("leaves prices alone", () => {
  // A closing $ cannot follow a space, so this is all prose.
  assert.deepEqual(splitMath("it costs $5 and $10 total"), [
    { type: "text", value: "it costs $5 and $10 total" },
  ]);
});

test("still finds math next to a price", () => {
  const segments = splitMath("$5x$ costs $5");
  assert.equal(segments[0].type, "math");
  assert.equal(segments[0].type === "math" && segments[0].value, "5x");
  assert.deepEqual(segments[1], { type: "text", value: " costs $5" });
});

test("an unclosed dollar stays literal", () => {
  assert.deepEqual(splitMath("about $20 per head"), [
    { type: "text", value: "about $20 per head" },
  ]);
});

test("a backslash-escaped dollar becomes a plain dollar", () => {
  assert.deepEqual(splitMath(String.raw`costs \$5 exactly`), [
    { type: "text", value: "costs $5 exactly" },
  ]);
});

test("does not close on an escaped dollar inside math", () => {
  const segments = splitMath(String.raw`$a \$ b$ after`);
  assert.equal(segments[0].type, "math");
  assert.equal(segments[0].type === "math" && segments[0].value, String.raw`a \$ b`);
});

test("escapes HTML in author text", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});

test("markup in prose around math is escaped, not rendered", () => {
  const html = mathToHtml("<script>bad</script> and $x^2$");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("katex"));
});

test("renders math to KaTeX markup with MathML for screen readers", () => {
  const html = mathToHtml(String.raw`$\frac{1}{2}$`);
  assert.ok(html.includes("katex"));
  assert.ok(html.includes("<math"));
});

test("broken math renders as a flagged fragment instead of throwing", () => {
  const html = mathToHtml(String.raw`$\fraq{1}{2}$`);
  assert.ok(html.includes("tex-error"));
  assert.ok(html.includes(String.raw`$\fraq{1}{2}$`.replace(/[<>&]/g, "")));
});

test("text with no dollar sign is passed through escaped", () => {
  assert.equal(mathToHtml("plain <b>text</b>"), "plain &lt;b&gt;text&lt;/b&gt;");
});

test("reports broken LaTeX against its line number", () => {
  const source = ["Q: Fine?", "* $x^2$", String.raw`- $\fraq{1}{2}$`].join("\n");
  const problems = findTexProblems(source);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 3);
  assert.match(problems[0].message, /^LaTeX: /);
  assert.match(problems[0].message, /Undefined control sequence/);
});

test("valid LaTeX reports no problems", () => {
  const source = String.raw`Q: Evaluate $$\int_0^1 3x^2 \, dx$$
* $1$
- $\frac{1}{3}$`;
  assert.deepEqual(findTexProblems(source), []);
});

test("ignores LaTeX inside comment lines", () => {
  assert.deepEqual(findTexProblems(String.raw`# todo: fix $\fraq{1}{2}$ later`), []);
});
