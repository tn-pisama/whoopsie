"use client";

import { useState, useRef, useEffect } from "react";
import { GeistMono } from "geist/font/mono";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function DemoChat() {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, streaming]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setStreaming(true);
    setHistory((h) => [...h, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history: newHistory.slice(0, -1) }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(j.message ?? j.error ?? `error ${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("no response body");
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setHistory((h) => {
          const next = [...h];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (err) {
      setError((err as Error).message);
      setHistory((h) => h.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-2 text-xs text-ink-muted">
        <span className={GeistMono.className}>claude-haiku-4-5</span>
        {" via "}
        <span className={GeistMono.className}>@whoopsie/sdk</span>
        {" → "}
        <a
          href="/live/ws_demo_public"
          className="hover:text-coral underline decoration-coral/40 underline-offset-2"
        >
          ws_demo_public dashboard
        </a>
      </div>

      <div ref={scrollRef} className="max-h-[360px] min-h-[200px] overflow-y-auto px-4 py-4">
        {history.length === 0 && (
          <div className="text-sm text-ink-muted">
            Ask anything. Your prompt and the model&apos;s response are
            redacted to metadata-only — only token counts, finish reasons,
            and detector verdicts hit the dashboard below. The text never
            leaves your browser session.
          </div>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={`mb-4 last:mb-0 ${
              m.role === "user" ? "text-ink" : "text-ink-soft"
            }`}
          >
            <div className="font-mono text-[10px] uppercase text-ink-muted">
              {m.role}
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm">
              {m.content || (streaming && i === history.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="border-t border-coral/40 bg-coral-soft/40 px-4 py-2 text-xs text-coral">
          {error}
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          type="text"
          required
          maxLength={1000}
          placeholder="say something…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          className={`${GeistMono.className} flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-coral focus:outline-none disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={streaming || input.length === 0}
          className={`${GeistMono.className} rounded-md bg-ink px-4 py-2 text-sm text-paper transition hover:bg-coral disabled:opacity-50`}
        >
          {streaming ? "…" : "send"}
        </button>
      </form>
    </div>
  );
}
