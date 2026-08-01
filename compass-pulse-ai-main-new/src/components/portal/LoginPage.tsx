import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/PasswordInput";
import { loginFn } from "@/lib/api/data.functions";
import { setPortalSession } from "@/lib/portalSession";
import { AlertCircle } from "lucide-react";

// A calm workspace-through-a-glass-window scene — sky, hills, a sun glow and drifting clouds,
// framed by window mullions with a soft glass-reflection streak, plus a desk/plant silhouette to
// keep the "workspace" half of the brief legible. Hand-illustrated (matching every other mascot/
// section SVG in this app) rather than a stock photo, so it never depends on an external asset URL.
function ScenicWindowBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #BEE3F8 0%, #DCEFFB 30%, #FCE8C8 62%, #FBD2AE 100%)" }} />
      <div className="absolute -top-16 right-10 size-72 rounded-full blur-3xl opacity-80" style={{ background: "radial-gradient(circle, #FFF3C0 0%, rgba(255,243,192,0) 70%)" }} />
      {/* Drifting clouds */}
      <div className="absolute top-[14%] left-[8%] flex items-center gap-2 opacity-70">
        <div className="size-10 rounded-full bg-white/70 blur-[1px]" />
        <div className="size-14 rounded-full bg-white/70 blur-[1px] -ml-6" />
        <div className="size-8 rounded-full bg-white/70 blur-[1px] -ml-5" />
      </div>
      <div className="absolute top-[26%] right-[14%] flex items-center gap-1.5 opacity-60">
        <div className="size-7 rounded-full bg-white/60 blur-[1px]" />
        <div className="size-9 rounded-full bg-white/60 blur-[1px] -ml-4" />
      </div>
      {/* Rolling hills */}
      <svg className="absolute bottom-0 left-0 w-full h-[42%]" viewBox="0 0 400 140" preserveAspectRatio="none">
        <path d="M0 90 Q100 45 200 75 T400 65 V140 H0 Z" fill="#B7E4C7" opacity="0.9" />
        <path d="M0 115 Q120 80 240 105 T400 95 V140 H0 Z" fill="#8FCFAF" />
      </svg>
      {/* Window frame: mullions + sill */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
        <div className="border-r-[14px] border-b-[14px] border-white/50" />
        <div className="border-b-[14px] border-white/50" />
        <div className="border-r-[14px] border-white/50" />
        <div />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-3 bg-white/50" />
      {/* Glass reflection streak */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.22) 47%, transparent 58%)" }} />
      {/* Workspace hint: a small potted plant silhouette on the sill, bottom-left */}
      <svg className="absolute bottom-2 left-6 opacity-80" width="46" height="54" viewBox="0 0 46 54" fill="none">
        <path d="M12 40 L34 40 L30 54 L16 54 Z" fill="#B45309" />
        <path d="M23 40 C10 40 8 18 20 10 C18 24 22 34 23 40Z" fill="#4D8C63" />
        <path d="M23 40 C36 40 38 20 27 12 C30 24 25 34 23 40Z" fill="#5FA378" />
        <path d="M23 40 C16 40 15 26 23 20 C22 28 22 35 23 40Z" fill="#79B98C" />
      </svg>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginFn({ data: { email, password } });
      if (!result.ok || !result.userId) {
        setError(result.error ?? "Invalid email or password.");
        return;
      }
      setPortalSession({ userId: result.userId });
      navigate({ to: "/portal" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-6 overflow-hidden">
      <ScenicWindowBackdrop />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src="/mascot/winking-stars.png" alt="Work Buddy" draggable={false} className="h-24 w-auto select-none drop-shadow-lg" />
          <div className="text-center">
            <div className="font-display text-3xl text-foreground drop-shadow-sm">Work Buddy</div>
            <div className="text-foreground/70 text-sm mt-1">Sign in to your account</div>
          </div>
        </div>

        <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@phillip.com.sg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={setPassword}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-xs text-muted-foreground leading-relaxed">
            You'll be asked to set a new password within 7 working days of your first login.
          </div>
        </div>
      </div>
    </div>
  );
}
