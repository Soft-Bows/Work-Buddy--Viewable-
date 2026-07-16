import { cn } from "@/lib/utils";
import type { RAG } from "@/lib/mockData";

export function RagDot({ rag, pulse }: { rag: RAG; pulse?: boolean }) {
  const map = { red: "bg-rag-red", amber: "bg-rag-amber", green: "bg-rag-green" };
  return <span className={cn("inline-block size-2.5 rounded-full", map[rag], pulse && rag === "red" && "pulse-red")} />;
}

export function RagPill({ rag, label }: { rag: RAG; label?: string }) {
  const map = {
    red: "bg-rag-red/10 text-rag-red border-rag-red/30",
    amber: "bg-rag-amber/15 text-amber-foreground border-rag-amber/40",
    green: "bg-rag-green/10 text-rag-green border-rag-green/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border", map[rag])}>
      <RagDot rag={rag} pulse />
      {label ?? rag.toUpperCase()}
    </span>
  );
}

export function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div className={cn("bg-card border border-border rounded-xl p-5 shadow-sm", className)} onClick={onClick}>{children}</div>;
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl">{children}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
