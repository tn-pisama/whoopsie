// Regression tests for the install-prompt content. The 2026-05-10 cross-
// platform test found AI agents reliably misimplementing the install if
// the prompt drifted from the observe() pattern. These assertions guard
// against that drift in CI.

import { test } from "node:test";
import assert from "node:assert/strict";
import { platforms, getPlatform } from "../lib/install-prompts";

test("base instructions show observe() as the example, not wrapLanguageModel({...})", () => {
  const sample = getPlatform("v0")!.template("ws_test_12345");
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
  for (const slug of ["lovable", "replit", "bolt", "v0"]) {
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
  const sample = getPlatform("v0")!.template("ws_test_12345");
  assert.match(sample, /toUIMessageStreamResponse/);
  assert.match(sample, /convertToModelMessages/);
  assert.match(sample, /sendMessage/);
});

test("base instructions teach the async convertToModelMessages gotcha (ai@6.0.x makes it return Promise)", () => {
  // The 2026-05-12 Cursor end-to-end test scaffolded a fresh Next.js + ai@6
  // chat and the install failed to typecheck because the prompt taught the
  // pre-6.0.x synchronous signature: `messages: convertToModelMessages(messages)`.
  // Real signature in 6.0.180 is async — must be awaited. The prompt now
  // shows the awaited pattern; lock it so future drift doesn't regress.
  for (const slug of ["lovable", "replit", "bolt", "v0"]) {
    const prompt = getPlatform(slug)!.template("ws_test_12345");
    assert.match(
      prompt,
      /await convertToModelMessages/,
      `${slug}: prompt must teach await convertToModelMessages (ai@6.0.x is async)`,
    );
  }
});

test("base instructions teach the LanguageModelV2 → V3 upgrade for @ai-sdk/openai", () => {
  // The 2026-05-12 Cursor end-to-end test also surfaced that a fresh
  // `pnpm add @ai-sdk/openai` against an older lockfile pulled @ai-sdk/openai@^2
  // (LanguageModelV2), and @whoopsie/sdk >= 0.5 expects V3. The prompt has
  // to warn so AI agents upgrade the provider as part of the install.
  for (const slug of ["lovable", "replit", "bolt", "v0"]) {
    const prompt = getPlatform(slug)!.template("ws_test_12345");
    assert.match(
      prompt,
      /@ai-sdk\/openai@\^3/,
      `${slug}: prompt must instruct upgrading @ai-sdk/openai to ^3 (V3 spec) for SDK 0.5+`,
    );
    assert.match(
      prompt,
      /'"v2"' is not assignable to type '"v3"'/,
      `${slug}: prompt must show the actual V2/V3 typecheck error so the AI recognizes it`,
    );
  }
});

test("base instructions do not teach the deprecated SYNC convertToModelMessages call pattern", () => {
  // The pre-6.0.x sync form is the failure mode we want to prevent. The
  // canonical pattern is `await convertToModelMessages(messages)`. We accept
  // any whitespace between `messages:` and the call, but the immediate
  // bareword `convertToModelMessages` (without `await`) in the messages slot
  // of a streamText call is the regression we're guarding against.
  for (const slug of ["lovable", "replit", "bolt", "v0"]) {
    const prompt = getPlatform(slug)!.template("ws_test_12345");
    assert.doesNotMatch(
      prompt,
      /messages:\s*convertToModelMessages\(/,
      `${slug}: prompt must not teach the deprecated synchronous convertToModelMessages(messages) call pattern`,
    );
  }
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

test("every platform's prompt teaches WHOOPSIE_PLATFORM=<slug> (drift-monitoring foundation)", () => {
  // Layer 1 of the platform-compatibility drift detection plan
  // (2026-05-13): every install must set WHOOPSIE_PLATFORM so the SDK can
  // tag each trace with its install source. Without this tag, the daily
  // /api/internal/platform-health cron can't tell when a platform's installs
  // start silently breaking. Per-platform assertion catches a slug typo or
  // a missed call site in the platforms[] array.
  for (const slug of ["lovable", "replit", "bolt", "v0"]) {
    const prompt = getPlatform(slug)!.template("ws_test_drift");
    assert.match(
      prompt,
      new RegExp(`WHOOPSIE_PLATFORM=${slug}\\b`),
      `${slug}: prompt must teach WHOOPSIE_PLATFORM=${slug}`,
    );
  }
});

test("Cursor is no longer a supported platform (intentionally dropped 2026-05-12)", () => {
  // Cursor cloud Agents are paywalled and Cursor.app desktop is not
  // browser-drivable from our test fleet — so the install path could
  // never be verified end-to-end the way Lovable/Replit/Bolt/v0 are.
  // Dropping the platform avoids shipping a prompt we can't keep working.
  assert.equal(getPlatform("cursor"), undefined);
  for (const p of platforms) {
    assert.notEqual(p.slug, "cursor", `platforms[] still contains cursor entry`);
  }
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

test("base instructions recommend redact: 'standard' (not 'metadata-only')", () => {
  // SDK 0.5.0 + CLI 0.3.0 ship reasoning capture and flip the recommended
  // redact mode from metadata-only (which neutered 4 of 7 detectors) to
  // standard (full prompt/completion/tool args/reasoning with PII scrub).
  // The install prompts must teach the new posture; metadata-only stays
  // available as an opt-in but is no longer the headline recommendation.
  const sample = getPlatform("v0")!.template("ws_test_12345");
  assert.match(
    sample,
    /observe\(openai\("gpt-4o"\), \{ redact: "standard" \}\)/,
    "prompts must show the standard redact mode as the canonical example",
  );
  // It's OK (and desirable) to mention metadata-only as the opt-in for the
  // privacy-conservative — we just don't want it as the recommended pattern
  // in the code snippet itself.
  assert.doesNotMatch(
    sample,
    /observe\(openai\("gpt-4o"\), \{ redact: "metadata-only" \}\)/,
    "prompts must not show metadata-only as the recommended code example",
  );
});
