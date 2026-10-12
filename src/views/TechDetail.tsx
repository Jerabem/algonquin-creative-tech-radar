import { BackIcon } from "../components/Icons";
import { DisciplineChip } from "../components/Chips";
import { TrlBar, TrlExplainer } from "../components/TrlBar";
import { programsForTech, projectsForTech, techById } from "../lib/data";

interface DetailProps {
  id: string;
  onBack: () => void;
  onOpenProgram: (id: string) => void;
  onOpenTech: (id: string) => void;
  onOpenProject: (id: string) => void;
}

export function TechDetail({ id, onBack, onOpenProgram, onOpenProject }: DetailProps) {
  const t = techById(id);
  if (!t) return <div className="page"><p>Technology not found.</p></div>;
  const progs = programsForTech(t);
  const projects = projectsForTech(t.name);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: "1rem" }}>
        <BackIcon size={16} /> Back
      </button>
      <div className="card-kicker">{t.category}</div>
      <h2>{t.name}</h2>
      <TrlBar trl={t.trl} />
      <TrlExplainer trl={t.trl} />
      {t.description && <p>{t.description}</p>}
      {t.maturity && <p className="reason">Source maturity label: {t.maturity} (mapped to TRL {t.trl} — v1 approximation).</p>}

      <h3>Disciplines it touches</h3>
      <div className="chip-row">
        {t.disciplines.map((d) => <DisciplineChip key={d} name={d} />)}
      </div>

      {t.seeItInAction && (
        <>
          <h3>See it in action</h3>
          <p className="reason">{t.seeItInAction}</p>
        </>
      )}
      {t.source && (
        <p className="reason">
          Source:{" "}
          <a href={t.source} target="_blank" rel="noreferrer">
            {t.source}
          </a>
        </p>
      )}

      <h3>Programs that could use this ({progs.length})</h3>
      <ul className="detail-list">
        {progs.slice(0, 15).map((p) => (
          <li key={p.id}>
            <button className="linklike" onClick={() => onOpenProgram(p.id)}>{p.name}</button>
          </li>
        ))}
      </ul>
      {progs.length > 15 && <p className="reason">…and {progs.length - 15} more.</p>}

      {projects.length > 0 && (
        <>
          <h3>Project ideas using this tech</h3>
          <ul className="detail-list">
            {projects.map((pr) => (
              <li key={pr.id}>
                <button className="linklike" onClick={() => onOpenProject(pr.id)}>{pr.title}</button>
                <div className="reason">{pr.summary}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
