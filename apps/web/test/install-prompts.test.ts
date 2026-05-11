// Regression tests for the install-prompt content. The 2026-05-10 cross-
// platform test found AI agents reliably misimplementing the install if
// the prompt drifted from the observe() pattern. These assertions guard
// against that drift in CI.

import { test } from "node:test";
import assert from "node:assert/strict";
import { platforms, getPlatform } from "../lib/install-prompts";

test("base instructions show observe() as the example, not wrapLanguageModel({...})", () => {
  const sample = getPlatform("cursor")!.template("ws_test_12345");
  assert.match(sample, /observe\(openai\(/);
  assert.match(sample, /@whoopsie\/sdk/);
  // The prompt MAY mention wrapLanguageModel in "do not" lines, but must
  // not use it as a code example (i.e. as an actual function call).
  assert.doesNotMatch(
    sample,
    /wrapLanguageModel\(\s*\{/,
    "prompts must not show wrapLanguageModel({...}) as an example — observe() is the canonical install path",
  );
});

test("base instructions include the do-not lines that block the v0 typo", () => {
  const sample = getPlatform("v0")!.template("ws_test_12345");
  // The "do not" lines are the load-bearing part — they prevent the
  // whoopsieMiddleware(opts)(model) misuse v0's AI made.
  assert.match(sample, /do not write your own/i);
  assert.match(sample, /Do not call .*whoopsieMiddleware.* directly/);
});

test("base instructions include the verify-after-install step", () => {
  const sample = getPlatform("replit")!.template("ws_test_12345");
  assert.match(sample, /npx @whoopsie\/cli verify/);
});

test("Lovable platform includes the TanStack Start framework note", () => {
  const lovable = getPlatform("lovable")!;
  const prompt = lovable.template("ws_test_12345");
  assert.match(prompt, /TanStack Start/);
  assert.match(prompt, /src\/routes\/api\/chat\.ts/);
  assert.match(prompt, /React 19 \+ Vite/);
});

test("Bolt platform is marked untested (cross-platform test paywalled mid-build)", () => {
  const bolt = getPlatform("bolt")!;
  assert.equal(
    bolt.untested,
    true,
    "Bolt has not been verified end-to-end with the current SDK+prompt",
  );
});

test("non-Bolt platforms are not marked untested", () => {
  for (const slug of ["lovable", "replit", "cursor", "v0"]) {
    const p = getPlatform(slug)!;
    assert.notEqual(
      p.untested,
      true,
      `${slug} should not be marked untested`,
    );
  }
});

test("every platform's template embeds the projectId verbatim", () => {
  const pid = "ws_unique_abc987";
  for (const p of platforms) {
    const out = p.template(pid);
    assert.ok(
      out.includes(pid),
      `${p.slug} template did not embed projectId ${pid}`,
    );
  }
});

test("every platform's template mentions the privacy page", () => {
  for (const p of platforms) {
    const out = p.template("ws_test_12345");
    assert.match(
      out,
      /whoopsie\.dev\/privacy/,
      `${p.slug} template missing privacy link`,
    );
  }
});
