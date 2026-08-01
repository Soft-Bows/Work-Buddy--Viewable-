import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAiProvider } from "@/lib/aiService";

interface Msg { role: "user" | "ai"; text: string }

const SEED: Msg[] = [
  { role: "ai", text: "Hi Sarah — I'm Work Buddy AI. I can draft responses, summarise team patterns, recommend learning, and answer questions about our Human Capital policies. What's on your mind?" },
];

const SUGGESTIONS = [
  "Summarise Marcus's quarter",
  "Draft a coaching plan for James",
  "What is our parental leave policy?",
];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    const reply = await getAiProvider().answerQuery(text);
    setThinking(false);
    setMsgs((m) => [...m, { role: "ai", text: reply }]);
  };

  return (
    <>
      {/* Same mascot used on the login page, given a little more personality here than a generic
          sparkle icon — headphones (default, "I'm listening") crossfades to a wink on hover, purely
          via opacity so there's no layout jump or JS state needed for the swap. */}
      <button
        onClick={() => setOpen(true)}
        title="Work Buddy AI"
        className={cn(
          "group fixed bottom-6 right-6 z-30 size-16 rounded-full bg-amber shadow-xl flex items-center justify-center hover:scale-105 transition-transform glow-amber overflow-hidden",
          open && "hidden"
        )}
      >
        <img src="/mascot/headphones.png" alt="" draggable={false} className="absolute inset-0 size-full object-contain p-1 select-none opacity-100 group-hover:opacity-0 transition-opacity duration-200" />
        <img src="/mascot/winking-stars.png" alt="Work Buddy AI" draggable={false} className="absolute inset-0 size-full object-contain p-1 select-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </button>

      {open && (
        // A transparent full-screen backdrop, click-to-close — same pattern the Home page's own
        // popups already use. Clicking anywhere outside the panel (including the rest of the
        // dashboard behind it) closes the assistant instead of requiring the X button specifically.
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className={cn(
              "fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300",
              // Height is viewport-relative at every breakpoint, not just below sm — a fixed 600px
              // panel anchored 24px off the bottom needs ~624px of vertical space, which a shorter
              // laptop screen (browser chrome + taskbar eating into it) often doesn't have, pushing
              // the header/close button off the top of the visible area entirely. Capping to 80% of
              // whatever viewport height is actually available (up to 600px) keeps the whole panel,
              // header included, on-screen on any device.
              "h-[min(80vh,600px)] max-h-[calc(100vh-2rem)]",
            )}
          >
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-amber grid place-items-center overflow-hidden shrink-0">
                <img src="/mascot/headphones.png" alt="" draggable={false} className="size-full object-contain p-0.5 select-none" />
              </div>
              <div>
                <div className="font-medium text-sm">Work Buddy AI</div>
                {/* No live LLM call — same rule-based pattern as every other "AI" feature in this
                    app (see workBuddyAiReply.ts's own header comment). "Claude Sonnet" here used to
                    claim a real model connection that doesn't exist; this is the honest label until
                    this is actually wired to the company's LLM/chatbot system. */}
                <div className="text-[10px] opacity-70">Rule-based assistant · always-on</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="size-7 rounded-full hover:bg-primary-foreground/10 grid place-items-center">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background/40">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"
                )}>{m.text}</div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {msgs.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1 rounded-full border border-border bg-card hover:border-amber/40 hover:bg-amber/5">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 flex items-center gap-2 shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 text-sm px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center hover:opacity-90">
              <Send className="size-4" />
            </button>
          </form>
          </div>
        </div>
      )}
    </>
  );
}
