import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/lib/appContext";
import { Sidebar, TopBar } from "@/components/Sidebar";
import { HomeSection } from "@/components/sections/HomeSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { SurveySection } from "@/components/sections/SurveySection";
import { RewardsSection } from "@/components/sections/RewardsSection";
import { ComplimentsSection } from "@/components/sections/ComplimentsSection";
import { MyGoalsSection } from "@/components/sections/MyGoalsSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { AdminSection } from "@/components/sections/AdminSection";
import { AIAssistant } from "@/components/AIAssistant";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — Unified Manager Intelligence" },
      { name: "description", content: "Pulse: warm, modern manager intelligence dashboard. Goals, team progress, survey insights, rewards, and AI-curated action plans." },
      { property: "og:title", content: "Pulse — Unified Manager Intelligence" },
      { property: "og:description", content: "Goals, team progress, survey insights, rewards, and AI-curated action plans." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 px-10 py-8 max-w-[1400px]">
          <TopBar />
          <Content />
        </main>
        <AIAssistant />
        <Toaster position="bottom-left" />
      </div>
    </AppProvider>
  );
}

function Content() {
  const { section } = useApp();
  switch (section) {
    case "home": return <HomeSection />;
    case "team": return <TeamSection />;
    case "survey": return <SurveySection />;
    case "rewards": return <RewardsSection />;
    case "compliments": return <ComplimentsSection />;
    case "mygoals": return <MyGoalsSection />;
    case "skills": return <SkillsSection />;
    case "admin": return <AdminSection />;
    default: return <HomeSection />;
  }
}
