import { BackIcon, BulbIcon } from "../components/Icons";
import { DisciplineChip, EffortChip, StatusChip } from "../components/Chips";
import { TrlBar } from "../components/TrlBar";
import { getProject, programByName, projectTrl, relatedProjects, techByName, wilderTwist } from "../lib/data";

interface DetailProps {
  id: string;
  onBack: () => void;
  onOpenProgram: (id: string) => void;
  onOpenTech: (id: string) => void;
  onOpenProject: (id: string) => void;
}

export function ProjectDetail({ id, onBack, onOpenProgram, onOpenTech, onOpenProject }: DetailProps) {
  const p = getProject(id);
  if (!p) return <div className="page"><p>Idea not found.</p></div>;
  const trl = projectTrl(p);
  const related = relatedProjects(p);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: "1rem" }}>
        <BackIcon size={16} /> Back
      </button>
      <h2>{p.title}</h2>
      <p>{p.summary}</p>
      <div className="chip-row">
        <StatusChip status={p.status} />
        <EffortChip effort={p.effort} />
      </div>
      <h3>Readiness</h3>
      <TrlBar trl={trl} />
      <p className="reason">
        Project TRL {trl} — set by the least-ready technology involved (a chain is only
        as strong as its weakest link). {trl <= 5 ? "A research gamble: great for exploration." : trl <= 7 ? "Buildable with some prototyping risk." : "Shippable with proven tools."}
      </p>

      <h3>Programs involved</h3>
      <ul className="detail-list">
        {p.programs.map((name) => {
          const prog = programByName(name);
          return (
            <li key={name}>
              {prog ? (
                <button className="linklike" onClick={() => onOpenProgram(prog.id)}>{name}</button>
              ) : (
                name
              )}
            </li>
          );
        })}
      </ul>

      <h3>Technologies used</h3>
      <ul className="detail-list">
        {p.tech.map((name) => {
          const t = techByName(name);
          return (
            <li key={name}>
              {t ? (
                <>
                  <button className="linklike" onClick={() => onOpenTech(t.id)}>{name}</button>{" "}
                  <TrlBar trl={t.trl} showLabel={false} /> <span className="reason">TRL {t.trl}</span>
                </>
              ) : (
                name
              )}
            </li>
          );
        })}
      </ul>

      <h3>Disciplines</h3>
      <div className="chip-row">
        {p.disciplines.map((d) => <DisciplineChip key={d} name={d} />)}
      </div>

      <div className="card" style={{ marginTop: "1.25rem" }}>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BulbIcon /> A wilder version
        </h3>
        <p>{wilderTwist(p)}</p>
      </div>

      {related.length > 0 && (
        <>
          <h3>People who explored this also explored…</h3>
          <ul className="detail-list">
            {related.slice(0, 6).map((r) => (
              <li key={r.id}>
                <button className="linklike" onClick={() => onOpenProject(r.id)}>{r.title}</button>
                <div className="reason">{r.summary}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="reason" style={{ marginTop: "1.5rem" }}>
        Submitted by {p.submittedBy} · {p.date}
      </p>
    </div>
  );
}
