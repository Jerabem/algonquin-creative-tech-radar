import { useMemo, useState } from "react";
import { WheelSvg, type RelKind } from "../components/WheelSvg";
import { Chip, DisciplineChip } from "../components/Chips";
import { TrlBar } from "../components/TrlBar";
import {
  SCIS_SCHOOL,
  abbrProgram,
  adoptableTech,
  credentialBucket,
  programById,
  programsInSchool,
  relatedPrograms,
  schools,
  shortSchool,
} from "../lib/data";

interface WheelViewProps {
  onOpenProgram: (id: string) => void;
  onOpenTech: (id: string) => void;
}

export function WheelView({ onOpenProgram, onOpenTech }: WheelViewProps) {
  const [school, setSchool] = useState<string>(SCIS_SCHOOL);
  const [allMode, setAllMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const schoolList = useMemo(() => schools(), []);
  const ringPrograms = useMemo(
    () => (allMode ? [] : programsInSchool(school)),
    [school, allMode],
  );
  const schoolRings = useMemo(
    () =>
      allMode
        ? schoolList.map((s) => ({ name: s.name, programs: programsInSchool(s.name) }))
        : undefined,
    [allMode, schoolList],
  );

  const related = useMemo(() => {
    const m = new Map<string, RelKind>();
    if (!selectedId) return m;
    const p = programById(selectedId);
    if (!p) return m;
    for (const r of relatedPrograms(p)) m.set(r.program.id, r.kind as RelKind);
    return m;
  }, [selectedId]);

  const selected = selectedId ? programById(selectedId) : undefined;
  const selectedRelated = useMemo(
    () => (selected ? relatedPrograms(selected).slice(0, 12) : []),
    [selected],
  );
  const selectedTech = useMemo(() => (selected ? adoptableTech(selected).slice(0, 8) : []), [selected]);

  const pickSchool = (name: string) => {
    setSchool(name);
    setAllMode(false);
    setSelectedId(null);
  };

  return (
    <div className="page">
      <div className="page-intro">
        <h2>The Wheel</h2>
        <p>
          Every slice is a program. Tap one to light up everything one step away in the
          relationship map — programs that share a discipline glow strong, programs linked
          only through a shared technology glow softer. Tap again (or the hub) to reset.
        </p>
      </div>

      <div className="school-chips" role="group" aria-label="Choose a school">
        <button
          className="school-chip"
          aria-pressed={allMode}
          onClick={() => {
            setAllMode(true);
            setSelectedId(null);
          }}
        >
          All schools
        </button>
        {schoolList.map((s) => (
          <button
            key={s.name}
            className="school-chip"
            aria-pressed={!allMode && school === s.name}
            onClick={() => pickSchool(s.name)}
          >
            {shortSchool(s.name)} · {s.count}
          </button>
        ))}
      </div>

      <div className="wheel-layout">
        <div>
          <WheelSvg
            programs={ringPrograms}
            schoolRings={schoolRings}
            mode={allMode ? "all" : "school"}
            selectedId={selectedId}
            related={related}
            onSelect={setSelectedId}
            onSchoolClick={pickSchool}
            hubLabel={allMode ? "All" : shortSchool(school)}
            hubSub={allMode ? "schools" : undefined}
            hubCountLabel={allMode ? "234 programs" : undefined}
          />
          <div className="legend-row" aria-hidden="true">
            <span>
              <span className="legend-swatch" style={{ background: "var(--wheel-selected)" }} />
              selected
            </span>
            <span>
              <span className="legend-swatch" style={{ background: "var(--wheel-related)" }} />
              shares a discipline
            </span>
            <span>
              <span className="legend-swatch" style={{ background: "var(--wheel-related-soft)" }} />
              shares tech only
            </span>
            <span>
              <span className="legend-swatch" style={{ background: "var(--wheel-dim)" }} />
              no link
            </span>
          </div>
          <details className="list-fallback">
            <summary>List view (accessible alternative to the wheel)</summary>
            <ul>
              {(allMode
                ? schoolList.flatMap((s) => programsInSchool(s.name))
                : ringPrograms
              ).map((p) => (
                <li key={p.id}>
                  <button className="linklike" onClick={() => setSelectedId(p.id)}>
                    {p.name}
                  </button>{" "}
                  <span className="reason">({abbrProgram(p.name)})</span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div>
          {selected ? (
            <div className="card">
              <div className="card-kicker">{shortSchool(selected.school)}</div>
              <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
              <div className="chip-row">
                <Chip kind="credential">{credentialBucket(selected.credential)}</Chip>
                {selected.campus && <Chip kind="outline">{selected.campus}</Chip>}
                {selected.status !== "Active" && <Chip kind="outline">{selected.status.split(" - ")[0]}</Chip>}
              </div>
              <h4>Disciplines</h4>
              <div className="chip-row">
                {selected.disciplines.map((d) => (
                  <DisciplineChip key={d} name={d} />
                ))}
              </div>
              {selected.tangential.length > 0 && (
                <>
                  <h4>Tangential</h4>
                  <div className="chip-row">
                    {selected.tangential.map((d) => (
                      <Chip key={d} kind="outline">
                        {d}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
              <h4>Tech this program could adopt</h4>
              <ul className="detail-list">
                {selectedTech.map((t) => (
                  <li key={t.id}>
                    <button className="linklike" onClick={() => onOpenTech(t.id)}>
                      {t.name}
                    </button>{" "}
                    <TrlBar trl={t.trl} showLabel={false} />{" "}
                    <span className="reason">TRL {t.trl}</span>
                  </li>
                ))}
              </ul>
              <h4>One step away ({selectedRelated.length})</h4>
              <ul className="detail-list">
                {selectedRelated.map((r) => (
                  <li key={r.program.id}>
                    <button className="linklike" onClick={() => onOpenProgram(r.program.id)}>
                      {r.program.name}
                    </button>
                    <div className="reason">{r.reasons.join(" · ")}</div>
                  </li>
                ))}
              </ul>
              <button className="btn btn-ghost" onClick={() => onOpenProgram(selected.id)}>
                Open full program page
              </button>
            </div>
          ) : (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>How to read the wheel</h3>
              <p>
                Tap any slice to select a program. Programs that share at least one
                discipline light up strong; programs connected only through a shared
                technology light up softer. Everything else dims.
              </p>
              <p className="reason">
                The detail panel appears here with the program's disciplines, the tech it
                could adopt, and the reason each related program is highlighted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
