import { useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/PasswordInput";
import { PASSWORD_RULES, isPasswordStrong } from "@/lib/passwordPolicy";
import { setNewPasswordFn } from "@/lib/api/data.functions";
import { cn } from "@/lib/utils";

export function PasswordResetForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strong = isPasswordStrong(newPassword);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!strong) { setError("Your new password doesn't meet the strength policy below."); return; }
    if (!matches) { setError("New password and confirmation don't match."); return; }

    setSubmitting(true);
    try {
      const result = await setNewPasswordFn({ data: { userId, currentPassword, newPassword } });
      if (!result.ok) { setError(result.error ?? "Could not update password."); return; }
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      <ul className="space-y-1 text-xs">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(newPassword);
          return (
            <li key={rule.label} className={cn("flex items-center gap-1.5", met ? "text-rag-green" : "text-muted-foreground")}>
              {met ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0" />}
              {rule.label}
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
