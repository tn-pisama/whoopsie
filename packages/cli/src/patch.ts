import {
  Project,
  SyntaxKind,
  type CallExpression,
  type ObjectLiteralElementLike,
  type SourceFile,
} from "ts-morph";
import { existsSync } from "node:fs";
import { join } from "node:path";

const TARGET_NAMES = new Set(["streamText", "generateText"]);
const ROUTE_GLOBS = [
  "app/**/route.ts",
  "src/app/**/route.ts",
  "app/api/**/route.ts",
  "src/app/api/**/route.ts",
];

export async function patchStreamTextCallSite(
  root: string,
  dryRun: boolean,
): Promise<string | null> {
  const project = new Project({
    tsConfigFilePath: tryResolveTsConfig(root),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });

  for (const glob of ROUTE_GLOBS) {
    project.addSourceFilesAtPaths(join(root, glob));
  }

  for (const file of project.getSourceFiles()) {
    const call = findFirstAiCall(file);
    if (!call) continue;
    if (alreadyPatched(file)) return file.getBaseName();

    const modelArg = findModelArg(call);
    if (!modelArg) continue;

    addImports(file);
    wrapModelArg(call, modelArg);

    if (!dryRun) {
      await file.save();
    }
    return file.getFilePath().replace(`${root}/`, "");
  }

  return null;
}

function tryResolveTsConfig(root: string): string | undefined {
  const path = join(root, "tsconfig.json");
  return existsSync(path) ? path : undefined;
}

function findFirstAiCall(file: SourceFile): CallExpression | undefined {
  return file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((call) => {
      const expr = call.getExpression();
      const name = expr.getText().split(".").pop();
      return name ? TARGET_NAMES.has(name) : false;
    });
}

function findModelArg(call: CallExpression): ObjectLiteralElementLike | undefined {
  const arg = call.getArguments()[0];
  if (!arg) return undefined;
  if (arg.getKind() !== SyntaxKind.ObjectLiteralExpression) return undefined;
  const obj = arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  return obj.getProperty("model");
}

function alreadyPatched(file: SourceFile): boolean {
  return file.getImportDeclarations().some((d) =>
    d.getModuleSpecifierValue() === "@whoops/sdk",
  );
}

function addImports(file: SourceFile): void {
  const hasWrap = file.getImportDeclarations().some((d) => {
    if (d.getModuleSpecifierValue() !== "ai") return false;
    return d.getNamedImports().some((n) => n.getName() === "wrapLanguageModel");
  });

  if (!hasWrap) {
    const aiImport = file
      .getImportDeclarations()
      .find((d) => d.getModuleSpecifierValue() === "ai");
    if (aiImport) {
      aiImport.addNamedImport("wrapLanguageModel");
    } else {
      file.addImportDeclaration({
        moduleSpecifier: "ai",
        namedImports: ["wrapLanguageModel"],
      });
    }
  }

  file.addImportDeclaration({
    moduleSpecifier: "@whoops/sdk",
    namedImports: ["whoopsMiddleware"],
  });
}

function wrapModelArg(_call: CallExpression, modelProp: ObjectLiteralElementLike): void {
  const initializer = modelProp.asKind(SyntaxKind.PropertyAssignment)?.getInitializer();
  if (!initializer) return;
  const original = initializer.getText();
  initializer.replaceWithText(
    `wrapLanguageModel({ model: ${original}, middleware: whoopsMiddleware() })`,
  );
}
