import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { getUserProfileFn } from "@/lib/api/data.functions";
import { clearPortalSession } from "@/lib/portalSession";
import type { Tier } from "@/lib/mockData";

interface Profile {
  userId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  grade: number;
  avatar: string;
  pointsYTD: number;
  isWiredPersona: boolean;
  tier?: string;
}

// Users are no longer required to reset their password on first login — no nagging banner, no
// 7-working-day deadline, no point penalty for not resetting. (Voluntary password changes, if
// wanted later, would need their own entry point — e.g. an account-settings menu — since the
// forced first-login prompt that used to open PasswordResetForm has been removed here.)
export function PortalDashboard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  const logout = () => {
    clearPortalSession();
    navigate({ to: "/login" });
  };

  const refresh = async () => {
    const p = await getUserProfileFn({ data: { userId } });
    if (!p.ok || !p.userId) { logout(); return; }
    setProfile(p as Profile);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!profile) {
    return <div className="min-h-screen w-full grid place-items-center text-muted-foreground">Loading your account…</div>;
  }

  return profile.isWiredPersona ? (
    <DashboardShell restricted initialTier={profile.tier as Tier} onLogout={logout} />
  ) : (
    <SimpleProfileView profile={profile} onLogout={logout} />
  );
}

function SimpleProfileView({ profile, onLogout }: { profile: Profile; onLogout: () => void }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 text-center">
        <div className="size-16 mx-auto rounded-full bg-amber text-amber-foreground grid place-items-center font-display font-bold text-xl">
          {profile.avatar}
        </div>
        <h1 className="font-display text-2xl mt-4">{profile.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">{profile.designation}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-left">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Department</div>
            <div className="mt-0.5 truncate">{profile.department}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Grade</div>
            <div className="mt-0.5">{profile.grade}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 col-span-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Points YTD</div>
            <div className="mt-0.5 font-display text-lg">{profile.pointsYTD}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          A full Work Buddy dashboard isn't set up for this account yet.
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={onLogout}>Log out</Button>
      </div>
    </div>
  );
}
