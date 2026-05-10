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

export function observe<M extends LanguageModelV3>(
  model: M,
  options: WhoopsieMiddlewareOptions = {},
): M {
  return wrapLanguageModel({
    model,
    middleware: whoopsieMiddleware(options),
  }) as unknown as M;
}
