import { useMemo, useState } from "react";
import { ProgramCard, ProjectCard, TechCard } from "../components/Cards";
import { SearchIcon } from "../components/Icons";
import {
  allProjects,
  categories,
  credentialBucket,
  credentialBuckets,
  disciplines,
  programDisciplines,
  programs,
  schools,
  shortSchool,
  technologies,
} from "../lib/data";
import type { Effort, ProjectStatus } from "../lib/types";

interface BrowseViewProps {
  onOpenProgram: (id: string) => void;
  onOpenTech: (id: string) => void;
  onOpenProject: (id: string) => void;
}

type Tab = "programs" | "tech" | "projects";

export function BrowseView({ onOpenProgram, onOpenTech, onOpenProject }: BrowseViewProps) {
  const [tab, setTab] = useState<Tab>("programs");
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState("");
  const [credential, setCredential] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [category, setCategory] = useState("");
  const [trlMin, setTrlMin] = useState("1");
  const [trlMax, setTrlMax] = useState("9");
  const [effort, setEffort] = useState("");
  const [status, setStatus] = useState("");

  const schoolList = useMemo(() => schools(), []);
  const categoryList = useMemo(() => categories(), []);
  const projectList = useMemo(() => allProjects(), [tab]);

  const q = query.trim().toLowerCase();

  const filteredPrograms = useMemo(
    () =>
      programs.filter((p) => {
        if (q && !(p.name.toLowerCase().includes(q) || (p.notes ?? "").toLowerCase().includes(q))) return false;
        if (school && p.school !== school) return false;
        if (credential && credentialBucket(p.credential) !== credential) return false;
        if (discipline && !programDisciplines(p).includes(discipline)) return false;
        return true;
      }),
    [q, school, credential, discipline],
  );

  const filteredTech = useMemo(
    () =>
      technologies.filter((t) => {
        if (q && !(t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))) return false;
        if (category && t.category !== category) return false;
        if (discipline && !t.disciplines.includes(discipline)) return false;
        if (t.trl < Number(trlMin) || t.trl > Number(trlMax)) return false;
        return true;
      }),
    [q, category, discipline, trlMin, trlMax],
  );

  const filteredProjects = useMemo(
    () =>
      projectList.filter((p) => {
        if (q && !(p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q))) return false;
        if (discipline && !p.disciplines.includes(discipline)) return false;
        if (effort && p.effort !== (effort as Effort)) return false;
        if (status && p.status !== (status as ProjectStatus)) return false;
        return true;
      }),
    [q, discipline, effort, status, projectList],
  );

  const resetFilters = () => {
    setQuery("");
    setSchool("");
    setCredential("");
    setDiscipline("");
    setCategory("");
    setTrlMin("1");
    setTrlMax("9");
    setEffort("");
    setStatus("");
  };

  const selectField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[],
  ) => (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="page">
      <div className="page-intro">
        <h2>Browse &amp; filter</h2>
        <p>The index behind the wheel: every program, technology, and project idea, searchable and filterable.</p>
      </div>

      <div className="school-chips" role="tablist" aria-label="Browse categories">
        {(
          [
            ["programs", `Programs (${programs.length})`],
            ["tech", `Technologies (${technologies.length})`],
            ["projects", `Project ideas (${projectList.length})`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className="school-chip"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <label className="field" style={{ minWidth: 220 }}>
          <span>Search</span>
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <SearchIcon size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "programs" ? "Search programs…" : tab === "tech" ? "Search technologies…" : "Search ideas…"}
              style={{ marginLeft: 6, flex: 1 }}
              aria-label="Search"
            />
          </span>
        </label>
        {selectField("Discipline", discipline, setDiscipline, disciplines.map((d) => ({ value: d, label: d })))}
        {tab === "programs" && (
          <>
            {selectField("School", school, setSchool, schoolList.map((s) => ({ value: s.name, label: `${shortSchool(s.name)} (${s.count})` })))}
            {selectField("Credential", credential, setCredential, credentialBuckets().map((c) => ({ value: c, label: c })))}
          </>
        )}
        {tab === "tech" && (
          <>
            {selectField("Category", category, setCategory, categoryList.map((c) => ({ value: c.name, label: `${c.name} (${c.count})` })))}
            {selectField("Min TRL", trlMin, setTrlMin, ["1","2","3","4","5","6","7","8","9"].map((n) => ({ value: n, label: `TRL ${n}` })))}
            {selectField("Max TRL", trlMax, setTrlMax, ["1","2","3","4","5","6","7","8","9"].map((n) => ({ value: n, label: `TRL ${n}` })))}
          </>
        )}
        {tab === "projects" && (
          <>
            {selectField("Effort", effort, setEffort, (["weekend","term project","capstone"] as Effort[]).map((e) => ({ value: e, label: e })))}
            {selectField("Status", status, setStatus, (["seed","pitched","in progress","built"] as ProjectStatus[]).map((s) => ({ value: s, label: s })))}
          </>
        )}
        <button className="btn btn-ghost" onClick={resetFilters} style={{ alignSelf: "flex-end" }}>
          Clear
        </button>
      </div>

      {tab === "programs" && (
        <>
          <p className="reason">{filteredPrograms.length} of {programs.length} programs</p>
          <div className="card-grid">
            {filteredPrograms.map((p) => (
              <ProgramCard key={p.id} program={p} onOpen={onOpenProgram} />
            ))}
          </div>
          {filteredPrograms.length === 0 && <div className="empty-state">No programs match those filters.</div>}
        </>
      )}
      {tab === "tech" && (
        <>
          <p className="reason">{filteredTech.length} of {technologies.length} technologies</p>
          <div className="card-grid">
            {filteredTech.map((t) => (
              <TechCard key={t.id} tech={t} onOpen={onOpenTech} />
            ))}
          </div>
          {filteredTech.length === 0 && <div className="empty-state">No technologies match those filters.</div>}
        </>
      )}
      {tab === "projects" && (
        <>
          <p className="reason">{filteredProjects.length} of {projectList.length} ideas</p>
          <div className="card-grid">
            {filteredProjects.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={onOpenProject} />
            ))}
          </div>
          {filteredProjects.length === 0 && <div className="empty-state">No ideas match those filters — submit one!</div>}
        </>
      )}
    </div>
  );
}
