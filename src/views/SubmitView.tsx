import { useState } from "react";
import { PlusIcon } from "../components/Icons";
import { programByName, programs, saveUserProject, shortSchool, techByName, technologies } from "../lib/data";
import type { Effort, Project } from "../lib/types";

interface SubmitViewProps {
  prefill?: Partial<Project>;
  onOpenProject: (id: string) => void;
}

export function SubmitView({ prefill, onOpenProject }: SubmitViewProps) {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [summary, setSummary] = useState(prefill?.summary ?? "");
  const [programNames, setProgramNames] = useState<string[]>(prefill?.programs ?? []);
  const [techNames, setTechNames] = useState<string[]>(prefill?.tech ?? []);
  const [effort, setEffort] = useState<Effort>("term project");
  const [submittedBy, setSubmittedBy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const toggle = (list: string[], name: string, set: (v: string[]) => void) =>
    set(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]);

  const submit = () => {
    setError(null);
    if (!title.trim()) return setError("Give your idea a title.");
    if (!summary.trim()) return setError("Add a one-to-two sentence summary.");
    if (programNames.length < 2) return setError("Pick at least two programs — the interdisciplinary hook.");
    const discs: string[] = [];
    for (const n of programNames) {
      const p = programByName(n);
      if (p) for (const d of [...p.disciplines, ...p.tangential]) if (!discs.includes(d)) discs.push(d);
    }
    for (const n of techNames) {
      const t = techByName(n);
      if (t) for (const d of t.disciplines) if (!discs.includes(d)) discs.push(d);
    }
    const idea: Project = {
      id: `user-${Date.now().toString(36)}`,
      title: title.trim(),
      summary: summary.trim(),
      programs: programNames,
      tech: techNames,
      disciplines: discs,
      effort,
      status: "seed",
      submittedBy: submittedBy.trim() || "Anonymous",
      date: new Date().toISOString().slice(0, 10),
    };
    saveUserProject(idea);
    setSavedId(idea.id);
  };

  if (savedId) {
    return (
      <div className="page">
        <div className="form-ok">Idea saved — it's live in the project bank with status "seed".</div>
        <p style={{ marginTop: "1rem" }}>
          <button className="btn btn-primary" onClick={() => onOpenProject(savedId)}>
            View your idea
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-intro">
        <h2>Submit an idea</h2>
        <p>
          Add to the project bank. Your idea is saved in this browser and appears
          immediately with status <strong>seed</strong>.
        </p>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short and evocative" />
        </label>
        <label className="field">
          <span>Summary (1–2 sentences)</span>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What gets built, and why it's exciting" />
        </label>
        <div className="field">
          <span>Programs involved (pick 2+)</span>
          <div className="checkbox-grid" role="group" aria-label="Programs">
            {programs.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={programNames.includes(p.name)}
                  onChange={() => toggle(programNames, p.name, setProgramNames)}
                />
                <span>{p.name} <span className="reason">({shortSchool(p.school)})</span></span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Technologies used</span>
          <div className="checkbox-grid" role="group" aria-label="Technologies">
            {technologies.map((t) => (
              <label key={t.id}>
                <input
                  type="checkbox"
                  checked={techNames.includes(t.name)}
                  onChange={() => toggle(techNames, t.name, setTechNames)}
                />
                <span>{t.name} <span className="reason">(TRL {t.trl})</span></span>
              </label>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Effort</span>
          <select value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
            <option value="weekend">weekend</option>
            <option value="term project">term project</option>
            <option value="capstone">capstone</option>
          </select>
        </label>
        <label className="field">
          <span>Your name (optional)</span>
          <input type="text" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="Anonymous" />
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div>
          <button className="btn btn-go" onClick={submit}>
            <PlusIcon /> Submit idea
          </button>
        </div>
      </div>
    </div>
  );
}
