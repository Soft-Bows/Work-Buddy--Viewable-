import { useState } from "react";
import { Card } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { Send, Search } from "lucide-react";
import { pointsToast } from "@/lib/pointsToast";

function HeartSparkSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <path d="M20 34 C20 34 5 24 5 14 A7 7 0 0 1 20 12 A7 7 0 0 1 35 14 C35 24 20 34 20 34Z" fill="#F472B6"/>
      <circle cx="15" cy="18" r="1.5" fill="white"/>
      <circle cx="25" cy="18" r="1.5" fill="white"/>
      <path d="M14 23 Q20 27 26 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <ellipse cx="13" cy="15" rx="3" ry="2" fill="white" fillOpacity="0.35"/>
      <path d="M32 8 L33 5 L34 8 L37 9 L34 10 L33 13 L32 10 L29 9Z" fill="#FCD34D" opacity="0.95"/>
      <circle cx="5" cy="10" r="1.2" fill="#A5F3FC"/>
      <circle cx="37" cy="20" r="0.9" fill="#F472B6"/>
      <circle cx="34" cy="3" r="0.8" fill="#A78BFA"/>
    </svg>
  );
}

function CherrySVG() {
  return (
    <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
      <path d="M18 8 Q20 4 24 3 Q28 2 30 5" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M18 8 Q16 4 12 3 Q8 2 7 6" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="11" cy="22" r="7" fill="#F472B6"/>
      <circle cx="25" cy="22" r="7" fill="#EC4899"/>
      <circle cx="9" cy="19" r="2" fill="white" fillOpacity="0.4"/>
      <circle cx="23" cy="19" r="2" fill="white" fillOpacity="0.4"/>
    </svg>
  );
}
import { cn } from "@/lib/utils";

export function ComplimentsSection() {
  const { addPoints, colleagues, corporateValues, logCompliment } = useApp();
  const [recipient, setRecipient] = useState("");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [badge, setBadge] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const need = Math.max(0, 50 - words);
  const ok = recipient && badge && words >= 50;

  const send = () => {
    if (!ok) return;
    setConfetti(true);
    void logCompliment(recipient);
    pointsToast(`Compliment sent to ${recipient} · +25 pts`);
    setTimeout(() => setConfetti(false), 1800);
    setText(""); setRecipient(""); setBadge(null); setQuery("");
  };

  const matches = query ? colleagues.filter((c) => c.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <HeartSparkSVG />
          <h2 className="font-display text-2xl">Send Your Appreciation!</h2>
          <CherrySVG />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Recognise a colleague with a meaningful note + value badge.</p>
      </div>

      <Card className="space-y-5">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Recipient</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={recipient || query}
              onChange={(e) => { setQuery(e.target.value); setRecipient(""); }}
              placeholder="Search a colleague…"
              className="w-full pl-9 pr-3 py-2.5 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {matches.length > 0 && !recipient && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                {matches.map((c) => (
                  <button key={c} onClick={() => { setRecipient(c); setQuery(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Your note</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Tell them what they did and why it mattered…"
            className="w-full mt-1 px-3 py-2.5 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className={cn("text-xs mt-1", words < 50 ? "text-amber-foreground" : "text-rag-green")}>
            {need > 0 ? `Just ${need} more words — you're almost there! 💬` : `Looks great — ${words} words ✨`}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Value badge</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {corporateValues.map((v) => (
              <button
                key={v.id}
                onClick={() => setBadge(v.name)}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  badge === v.name ? "border-amber bg-amber/10 glow-amber" : "border-border hover:border-amber/40 bg-background"
                )}
              >
                <div className="text-2xl">{v.icon}</div>
                <div className="text-xs mt-1 font-medium">{v.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={send}
          disabled={!ok}
          className={cn(
            "w-full py-3 rounded-md font-medium flex items-center justify-center gap-2 transition-all",
            ok ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground"
          )}
        >
          <Send className="size-4" /> Send Compliment
        </button>
      </Card>

      {confetti && <Confetti />}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 60 });
  const colors = ["oklch(0.78 0.16 65)", "oklch(0.62 0.1 195)", "oklch(0.62 0.14 155)", "oklch(0.32 0.07 255)"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute top-1/3 size-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            background: colors[i % 4],
            animation: `confetti 1.6s ease-out forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`@keyframes confetti { to { transform: translateY(120vh) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
}
