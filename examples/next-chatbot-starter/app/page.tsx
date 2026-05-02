"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PROJECT_ID = process.env.NEXT_PUBLIC_WHOOPSIE_PROJECT_ID ?? "";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });
    const reader = res.body?.getReader();
    if (!reader) {
      setStreaming(false);
      return;
    }
    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      setMessages((m) => {
        const out = [...m];
        out[out.length - 1] = { role: "assistant", content: acc };
        return out;
      });
    }
    setStreaming(false);
  };

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Chatbot starter</h1>
        <p style={{ color: "#6b6c66", marginTop: 8, fontSize: 14 }}>
          Instrumented with{" "}
          <a
            href="https://whoopsie.dev"
            style={{ color: "#ff5a4e", textDecoration: "underline" }}
          >
            whoopsie
          </a>
          . Failures stream to{" "}
          {PROJECT_ID ? (
            <a
              href={`https://whoopsie.dev/live/${PROJECT_ID}`}
              style={{ color: "#ff5a4e", textDecoration: "underline" }}
            >
              your dashboard
            </a>
          ) : (
            <code>your dashboard at whoopsie.dev/live/&lt;id&gt;</code>
          )}
          .
        </p>
      </header>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e3dc",
          borderRadius: 8,
          padding: 16,
          minHeight: 240,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#6b6c66", margin: 0 }}>
            Type a message below to get started.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#6b6c66",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {m.role}
            </div>
            <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
              {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          placeholder="say something…"
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #e5e3dc",
            borderRadius: 6,
            fontSize: 14,
            fontFamily: "ui-monospace, monospace",
            background: "#fff",
          }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          style={{
            background: "#0e0f0d",
            color: "#fafaf8",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 14,
            fontFamily: "ui-monospace, monospace",
            cursor: streaming ? "not-allowed" : "pointer",
            opacity: streaming || !input.trim() ? 0.5 : 1,
          }}
        >
          {streaming ? "…" : "send"}
        </button>
      </form>
    </main>
  );
}
