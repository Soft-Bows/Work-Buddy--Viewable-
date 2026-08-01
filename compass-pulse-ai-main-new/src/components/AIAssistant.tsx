import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "ai"; text: string }

const SEED: Msg[] = [
  { role: "ai", text: "Hi Sarah — I'm Pulse AI. I can draft responses, summarise team patterns, recommend learning, and answer questions about our Human Capital policies. What's on your mind?" },
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
    await new Promise((r) => setTimeout(r, 1200));
    const reply = mockReply(text);
    setThinking(false);
    setMsgs((m) => [...m, { role: "ai", text: reply }]);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-30 size-14 rounded-full bg-amber text-amber-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform glow-amber",
          open && "hidden"
        )}
      >
        <Sparkles className="size-6" />
      </button>

      {open && (
        <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-30 sm:w-[420px] h-[min(70vh,600px)] sm:h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-amber text-amber-foreground grid place-items-center"><Sparkles className="size-4" /></div>
              <div>
                <div className="font-medium text-sm">Pulse AI</div>
                <div className="text-[10px] opacity-70">Claude Sonnet · always-on</div>
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
            className="border-t border-border p-3 flex items-center gap-2"
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
      )}
    </>
  );
}

function mockReply(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("marcus")) return "Marcus is currently RED on senior engineering hires (2 of 8) and time-to-hire (38 days vs 30 target). His diversity slate work is healthy. Suggested next step: a 30-min coaching session focused on pipeline triage and re-prioritising the 3 most critical roles. I can draft talking points.";
  if (t.includes("james") || t.includes("coaching plan")) return "Here's a 4-week coaching plan for James:\n\n• Week 1 — Shadow your Q3 manager training, identify 2 facilitation patterns to adopt.\n• Week 2 — Co-lead one module; structured debrief with you.\n• Week 3 — Solo cohort delivery; you observe.\n• Week 4 — Reflective journal + 360 feedback from 3 participants.\n\nWant me to schedule the touchpoints?";
  if (t.includes("parental")) return "Our 2026 parental leave policy: 20 weeks fully paid for primary caregivers, 8 weeks for secondary caregivers (regardless of gender or family structure). Can be taken in up to 3 blocks within the first 18 months. Full policy PDF lives in the Human Capital knowledge base — want me to share the link?";
  if (t.includes("survey") || t.includes("benchmark")) return "You're tracking above benchmark on 5 of 6 competencies. Mentoring & Coaching is the one gap (68 vs 81). I've curated a 4-item action plan on your Survey Insights page — completing it before Dec 31 unlocks +100 bonus pts.";
  return "Great question. Based on your team's current data and our Human Capital policies, here are three things I'd suggest: (1) prioritise a 1:1 with Marcus this week on hiring pipeline, (2) wrap up your Mentoring action plan before Q3 close, and (3) consider linking James's coaching cert to your team's L&D budget request. Want me to expand on any of these?";
}
