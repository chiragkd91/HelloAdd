"use client";

import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED !== "false";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AIChatPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const clientOrgId =
    pathname?.startsWith("/agency/clients/") ? pathname.split("/")[3] || undefined : undefined;

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextUser: ChatMessage = { role: "user", content: text };
    setInput("");
    setMessages((m) => [...m, nextUser]);
    setSending(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          messages: [...messages, nextUser],
          clientOrgId,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { reply?: string; error?: string };
      const reply =
        typeof j.reply === "string"
          ? j.reply
          : typeof j.error === "string"
            ? j.error
            : "Could not get a reply.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error — try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }, [clientOrgId, input, messages, sending]);

  if (!AI_ENABLED) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 md:bottom-6 md:right-6">
      {open && (
        <div className="pointer-events-auto flex max-h-[min(70vh,520px)] w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-100 bg-primary/5 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-neutral-900">Hello Add AI</p>
              <p className="text-xs text-neutral-600">
                {clientOrgId
                  ? "Ask about this client workspace campaigns and alerts."
                  : "Ask about your workspace campaigns and alerts."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-neutral-600">
                Try: “Which campaigns have the best CTR?” or “What should I fix first?”
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-6 bg-primary/10 text-neutral-900"
                    : "mr-6 border border-neutral-100 bg-neutral-50 text-neutral-800"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {sending && (
              <p className="text-xs text-neutral-600">Thinking…</p>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-neutral-100 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask about performance…"
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                disabled={sending}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className={`${buttonVariantStyles.primary} shrink-0 px-3 py-2 disabled:opacity-50`}
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <MessageCircle className="h-7 w-7" />
      </button>
    </div>
  );
}
