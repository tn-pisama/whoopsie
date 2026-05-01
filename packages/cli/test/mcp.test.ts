import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const binPath = resolve(here, "..", "dist", "bin.js");

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

async function rpcCall(
  request: { id: number; method: string; params?: unknown },
  timeoutMs = 4000,
): Promise<JsonRpcResponse> {
  const child = spawn(
    process.execPath,
    [binPath, "mcp", "--project-id", "ws_mcp_test"],
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, WHOOPSIE_PROJECT_ID: "ws_mcp_test" },
    },
  );

  const initMessage = {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    },
  };
  const initialized = {
    jsonrpc: "2.0",
    method: "notifications/initialized",
  };
  const call = { jsonrpc: "2.0", ...request };

  child.stdin.write(JSON.stringify(initMessage) + "\n");
  child.stdin.write(JSON.stringify(initialized) + "\n");
  child.stdin.write(JSON.stringify(call) + "\n");

  return await new Promise<JsonRpcResponse>((resolveP, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`mcp rpc timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    let buffer = "";
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let parsed: JsonRpcResponse;
        try {
          parsed = JSON.parse(line) as JsonRpcResponse;
        } catch {
          continue;
        }
        if (parsed.id === request.id) {
          clearTimeout(timer);
          child.kill();
          resolveP(parsed);
          return;
        }
      }
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`spawn failed: ${e.message}\nstderr: ${stderr}`));
    });
    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        reject(new Error(`child exited ${code}\nstderr: ${stderr}`));
      }
    });
  });
}

test("mcp: tools/list returns 3 whoopsie tools", async () => {
  const res = await rpcCall({ id: 1, method: "tools/list" });
  assert.equal(res.error, undefined, JSON.stringify(res));
  const tools = (res.result as { tools: { name: string }[] }).tools;
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "get_recent_failures",
    "get_recent_traces",
    "get_trace",
  ]);
});

test("mcp: tool call propagates errors when base url is unreachable", async () => {
  // Override base-url to a non-routable address; fetch should fail and the
  // tool call should return isError:true with a text payload.
  const child = spawn(
    process.execPath,
    [
      binPath,
      "mcp",
      "--project-id",
      "ws_mcp_test",
      "--base-url",
      "http://127.0.0.1:1",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  const init = {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    },
  };
  child.stdin.write(JSON.stringify(init) + "\n");
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n",
  );
  child.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: "get_recent_failures", arguments: { limit: 5 } },
    }) + "\n",
  );

  const result = await new Promise<JsonRpcResponse>((resolveP, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("timeout"));
    }, 5000);
    let buf = "";
    child.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      for (const line of buf.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as JsonRpcResponse;
          if (parsed.id === 9) {
            clearTimeout(timer);
            child.kill();
            resolveP(parsed);
            return;
          }
        } catch {
          /* ignore */
        }
      }
    });
    child.on("error", reject);
  });

  // The MCP server may either:
  //   (a) return a result with isError true and a textual error, OR
  //   (b) return a JSON-RPC error.
  // Both are valid; assert one of them.
  if (result.error) {
    assert.ok(typeof result.error.message === "string");
  } else {
    const r = result.result as { isError?: boolean; content: unknown[] };
    assert.equal(r.isError, true);
    assert.ok(r.content.length > 0);
  }
});
