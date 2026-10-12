import { useState } from "react";
import { ThemeProvider, useTheme } from "./lib/theme";
import { MoonIcon, SunIcon } from "./components/Icons";
import { WheelView } from "./views/WheelView";
import { CollisionsView } from "./views/CollisionsView";
import { BrowseView } from "./views/BrowseView";
import { RadarView } from "./views/RadarView";
import { SubmitView } from "./views/SubmitView";
import { ProjectDetail } from "./views/ProjectDetail";
import { ProgramDetail } from "./views/ProgramDetail";
import { TechDetail } from "./views/TechDetail";
import { disciplines, programs, technologies, allProjects } from "./lib/data";
import type { Project, View } from "./lib/types";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
      {theme === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}

const NAV: { key: View["name"]; label: string }[] = [
  { key: "wheel", label: "Wheel" },
  { key: "collisions", label: "Collisions" },
  { key: "browse", label: "Browse" },
  { key: "radar", label: "Tech Radar" },
  { key: "submit", label: "Submit Idea" },
];

function Shell() {
  const [view, setView] = useState<View>({ name: "wheel" });
  const [history, setHistory] = useState<View[]>([]);

  const go = (v: View) => {
    setHistory((h) => [...h, view]);
    setView(v);
    window.scrollTo(0, 0);
  };
  const goTop = (name: View["name"]) => {
    setHistory([]);
    setView({ name } as View);
    window.scrollTo(0, 0);
  };
  const back = () => {
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    if (prev) {
      setView(prev);
      window.scrollTo(0, 0);
    }
  };

  const navKey = (v: View): View["name"] =>
    v.name === "project" || v.name === "program" || v.name === "tech" ? "browse" : v.name;

  const detailProps = {
    onBack: back,
    onOpenProgram: (id: string) => go({ name: "program", id }),
    onOpenTech: (id: string) => go({ name: "tech", id }),
    onOpenProject: (id: string) => go({ name: "project", id }),
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-name">Project Discovery</span>
            <span className="brand-sub">Algonquin College</span>
          </div>
          <nav className="main-nav" aria-label="Main">
            {NAV.map((n) => (
              <button
                key={n.key}
                className="nav-btn"
                aria-current={navKey(view) === n.key ? "page" : undefined}
                onClick={() => goTop(n.key)}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main>
        {view.name === "wheel" && <WheelView {...detailProps} />}
        {view.name === "collisions" && (
          <CollisionsView
            {...detailProps}
            onDraftIdea={(prefill: Partial<Project>) => go({ name: "submit", prefill })}
          />
        )}
        {view.name === "browse" && <BrowseView {...detailProps} />}
        {view.name === "radar" && <RadarView onOpenTech={detailProps.onOpenTech} />}
        {view.name === "submit" && (
          <SubmitView prefill={view.prefill} onOpenProject={detailProps.onOpenProject} />
        )}
        {view.name === "project" && <ProjectDetail id={view.id} {...detailProps} />}
        {view.name === "program" && <ProgramDetail id={view.id} {...detailProps} />}
        {view.name === "tech" && <TechDetail id={view.id} {...detailProps} />}
      </main>

      <footer className="app-footer">
        {programs.length} programs · {technologies.length} technologies · {disciplines.length} disciplines ·{" "}
        {allProjects().length} project ideas. TRL ratings and discipline tags are v1
        approximations — see the README. Built for exploration, not as an official
        college catalogue.
      </footer>
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
