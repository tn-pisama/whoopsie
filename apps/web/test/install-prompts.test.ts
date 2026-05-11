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

test("all v1-supported platforms are verified end-to-end (no `untested` flag)", () => {
  // Bolt was the last platform marked untested. Verified end-to-end on
  // 2026-05-11 with a clean trace (Ug0bt4bfSnHD8WMIaOBml, no error). All five
  // v1 platforms now ship without the untested badge.
  for (const slug of ["lovable", "replit", "bolt", "cursor", "v0"]) {
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

test("base instructions teach the ai@6 migration gotchas (convertToModelMessages + toUIMessageStreamResponse + sendMessage)", () => {
  // The 2026-05-11 Replit re-test surfaced three ai@5 → ai@6 mistakes that
  // every install will hit if the route or client is still on ai@5. The
  // install prompt has to call these out or AI agents reconstruct the v5
  // pattern and the chat 500s. See CHANGELOG.md SDK 0.4.x section for
  // the rationale.
  const sample = getPlatform("cursor")!.template("ws_test_12345");
  assert.match(sample, /toUIMessageStreamResponse/);
  assert.match(sample, /convertToModelMessages/);
  assert.match(sample, /sendMessage/);
});

test("Replit platform includes the Replit framework note (proxy + deployment secrets)", () => {
  const replit = getPlatform("replit")!;
  const prompt = replit.template("ws_test_12345");
  assert.match(
    prompt,
    /Cannot POST \/api\/chat/,
    "Replit prompt must call out the Express-proxy 404 failure mode",
  );
  assert.match(
    prompt,
    /Manage tab/,
    "Replit prompt must instruct adding secrets to the deployment Manage tab, not just the dev Workspace Secrets",
  );
});

test("no platform's template teaches the deprecated toDataStreamResponse() pattern", () => {
  for (const p of platforms) {
    const out = p.template("ws_test_12345");
    // The prompt MAY mention toDataStreamResponse in "if you see this,
    // migrate it" lines, but must not show it as the target pattern.
    assert.doesNotMatch(
      out,
      /return .*\.toDataStreamResponse\(\)/,
      `${p.slug} template must not teach the removed ai@5 toDataStreamResponse() pattern`,
    );
  }
});
