import { BackIcon } from "../components/Icons";
import { Chip, DisciplineChip } from "../components/Chips";
import { TrlBar } from "../components/TrlBar";
import {
  adoptableTech,
  credentialBucket,
  programById,
  projectsForProgram,
  relatedPrograms,
  shortSchool,
} from "../lib/data";

interface DetailProps {
  id: string;
  onBack: () => void;
  onOpenProgram: (id: string) => void;
  onOpenTech: (id: string) => void;
  onOpenProject: (id: string) => void;
}

export function ProgramDetail({ id, onBack, onOpenProgram, onOpenTech, onOpenProject }: DetailProps) {
  const p = programById(id);
  if (!p) return <div className="page"><p>Program not found.</p></div>;
  const tech = adoptableTech(p).slice(0, 10);
  const related = relatedPrograms(p).slice(0, 10);
  const projects = projectsForProgram(p.name);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: "1rem" }}>
        <BackIcon size={16} /> Back
      </button>
      <div className="card-kicker">{shortSchool(p.school)}</div>
      <h2>{p.name}</h2>
      <div className="chip-row">
        <Chip kind="credential">{credentialBucket(p.credential)}</Chip>
        {p.campus && <Chip kind="outline">{p.campus}</Chip>}
        {p.code && <Chip kind="outline">{p.code}</Chip>}
        <Chip kind="outline">{p.status.split(" - ")[0]}</Chip>
      </div>
      {p.notes && <p className="reason">{p.notes}</p>}

      <h3>Disciplines</h3>
      <div className="chip-row">
        {p.disciplines.map((d) => <DisciplineChip key={d} name={d} />)}
      </div>
      {p.tangential.length > 0 && (
        <>
          <h3>Tangential disciplines</h3>
          <div className="chip-row">
            {p.tangential.map((d) => <Chip key={d} kind="outline">{d}</Chip>)}
          </div>
        </>
      )}

      <h3>Tech this program could adopt</h3>
      <ul className="detail-list">
        {tech.map((t) => (
          <li key={t.id}>
            <button className="linklike" onClick={() => onOpenTech(t.id)}>{t.name}</button>{" "}
            <TrlBar trl={t.trl} showLabel={false} /> <span className="reason">TRL {t.trl} · {t.category}</span>
          </li>
        ))}
      </ul>

      <h3>Related programs</h3>
      <ul className="detail-list">
        {related.map((r) => (
          <li key={r.program.id}>
            <button className="linklike" onClick={() => onOpenProgram(r.program.id)}>{r.program.name}</button>
            <div className="reason">{r.reasons.join(" · ")}</div>
          </li>
        ))}
      </ul>

      {projects.length > 0 && (
        <>
          <h3>Project ideas involving this program</h3>
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
