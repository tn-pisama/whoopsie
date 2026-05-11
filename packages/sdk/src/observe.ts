// One-call helper that wraps a model with the whoopsie middleware.
// The two-step pattern (wrapLanguageModel + whoopsieMiddleware) is ambiguous
// enough that AI agents on multiple platforms (v0, Lovable, Replit) have been
// observed writing it incorrectly — e.g. calling whoopsieMiddleware(opts) as
// if it returned a wrapper function. observe() collapses the pattern into
// one obvious call so there's nothing to misinterpret.

import { wrapLanguageModel } from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { whoopsieMiddleware } from "./middleware.js";
import type { WhoopsieMiddlewareOptions } from "./middleware.js";

// Peer-dep version guard. The SDK uses the LanguageModelV3 middleware contract
// which lives in `ai@^6` + `@ai-sdk/provider@^3`. Older `ai` / provider versions
// (4.x, 5.x) export `wrapLanguageModel` but consume a different middleware
// contract — our middleware will silently no-op. Replit's AI flagged this in
// the 2026-05-10 cross-platform test ("the peer dependency expects ai@^6 but
// the installed version is 4.x"); the silent-no-op we saw on Lovable is the
// same failure class.
//
// We detect the mismatch by inspecting `model.specificationVersion` at the
// first observe() call. If it's not "v3", the model came from an older
// `@ai-sdk/openai` / similar provider that's incompatible with the v3
// middleware contract. We log a directional warning so the user can fix
// instead of staring at an empty dashboard.
const _warnedProviders = new Set<string>();
function checkModelContract(model: LanguageModelV3): void {
  if (typeof process !== "undefined" && process.env.WHOOPSIE_SILENT === "1") {
    return;
  }
  const v = (model as { specificationVersion?: unknown }).specificationVersion;
  const providerKey = String(
    (model as { provider?: unknown; modelId?: unknown }).provider ?? "?",
  );
  if (v !== "v3" && !_warnedProviders.has(providerKey)) {
    _warnedProviders.add(providerKey);
    console.warn(
      `[whoopsie] Model has specificationVersion=${JSON.stringify(v)} but ` +
        `@whoopsie/sdk requires v3. Your AI SDK or provider package is older ` +
        `than the version whoopsie targets — observe() will silently no-op. ` +
        `Run: npm install ai@^6 @ai-sdk/openai@^2 @ai-sdk/provider@^3 ` +
        `(adjust provider package as appropriate). ` +
        `See https://whoopsie.dev/install`,
    );
  }
}

export function observe<M extends LanguageModelV3>(
  model: M,
  options: WhoopsieMiddlewareOptions = {},
): M {
  checkModelContract(model);
  return wrapLanguageModel({
    model,
    middleware: whoopsieMiddleware(options),
  }) as unknown as M;
}
