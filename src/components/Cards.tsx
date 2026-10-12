import { Chip, DisciplineChip, EffortChip, StatusChip } from "./Chips";
import { TrlBar } from "./TrlBar";
import { credentialBucket, projectTrl, shortSchool } from "../lib/data";
import type { Program, Project, Technology } from "../lib/types";

export function ProgramCard({ program, onOpen }: { program: Program; onOpen: (id: string) => void }) {
  return (
    <button className="card clickable-card" onClick={() => onOpen(program.id)}>
      <div className="card-kicker">{shortSchool(program.school)}</div>
      <div className="card-title">{program.name}</div>
      <div className="chip-row">
        <Chip kind="credential">{credentialBucket(program.credential)}</Chip>
      </div>
      <div className="chip-row">
        {program.disciplines.map((d) => (
          <DisciplineChip key={d} name={d} />
        ))}
      </div>
    </button>
  );
}

export function TechCard({ tech, onOpen }: { tech: Technology; onOpen: (id: string) => void }) {
  return (
    <button className="card clickable-card" onClick={() => onOpen(tech.id)}>
      <div className="card-kicker">{tech.category}</div>
      <div className="card-title">{tech.name}</div>
      <TrlBar trl={tech.trl} />
      <div className="chip-row">
        {tech.disciplines.slice(0, 4).map((d) => (
          <DisciplineChip key={d} name={d} />
        ))}
      </div>
    </button>
  );
}

export function ProjectCard({ project, onOpen }: { project: Project; onOpen: (id: string) => void }) {
  return (
    <button className="card clickable-card" onClick={() => onOpen(project.id)}>
      <div className="card-kicker">
        {project.programs.length} programs · {project.tech.length} tech
      </div>
      <div className="card-title">{project.title}</div>
      <p className="card-sub">{project.summary}</p>
      <div className="chip-row">
        <StatusChip status={project.status} />
        <EffortChip effort={project.effort} />
      </div>
      <TrlBar trl={projectTrl(project)} />
    </button>
  );
}
