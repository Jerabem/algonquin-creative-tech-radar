import { useEffect, useMemo, useRef, useState } from "react";
import { WheelSvg, type RelKind } from "../components/WheelSvg";
import { DisciplineChip } from "../components/Chips";
import { TrlBar } from "../components/TrlBar";
import { LockIcon, SpinIcon, UnlockIcon } from "../components/Icons";
import {
  SCIS_SCHOOL,
  collisionPrompts,
  programsInSchool,
  relatedPrograms,
  schools,
  sharedDisciplines,
  shortSchool,
  technologies,
} from "../lib/data";
import type { Program, Project, Technology } from "../lib/types";

interface CollisionsViewProps {
  onOpenProgram: (id: string) => void;
  onOpenTech: (id: string) => void;
  onDraftIdea: (prefill: Partial<Project>) => void;
}

type Phase = "idle" | "spinA" | "spinB" | "drawTech" | "result";

interface Result {
  a: Program;
  b: Program;
  tech: Technology;
}

const rand = (n: number) => Math.floor(Math.random() * n);

export function CollisionsView({ onOpenProgram, onOpenTech, onDraftIdea }: CollisionsViewProps) {
  const [school, setSchool] = useState<string>(SCIS_SCHOOL);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [locked, setLocked] = useState({ a: false, b: false, tech: false });
  const [cyclingTech, setCyclingTech] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const schoolList = useMemo(() => schools(), []);
  const ring = useMemo(() => programsInSchool(school), [school]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const iv = phase === "drawTech" ? window.setInterval(() => {
      setCyclingTech(technologies[rand(technologies.length)].name);
    }, 90) : undefined;
    return () => { if (iv) clearInterval(iv); };
  }, [phase]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** Rotate the wheel so slice `index` lands under the top pointer. */
  const spinTo = (index: number, done: () => void) => {
    const step = 360 / ring.length;
    const mid = (index + 0.5) * step;
    const norm = ((rotation + mid) % 360 + 360) % 360;
    const delta = (360 - norm) % 360;
    setSpinning(true);
    setRotation((r) => r + delta + 360 * 5);
    later(2500, () => {
      setSpinning(false);
      done();
    });
  };

  const pickTech = (): Technology => technologies[rand(technologies.length)];

  const collide = () => {
    if (phase === "spinA" || phase === "spinB" || phase === "drawTech") return;
    const keepA = locked.a && result ? result.a : null;
    const keepB = locked.b && result ? result.b : null;
    const keepT = locked.tech && result ? result.tech : null;

    const afterA = (a: Program) => {
      const afterB = (b: Program) => {
        setPhase("drawTech");
        later(1300, () => {
          const tech = keepT ?? pickTech();
          setCyclingTech(null);
          setResult({ a, b, tech });
          setPhase("result");
        });
      };
      if (keepB && keepB.id !== a.id) {
        afterB(keepB);
      } else {
        setPhase("spinB");
        let bi = rand(ring.length);
        if (ring[bi].id === a.id) bi = (bi + 1) % ring.length;
        spinTo(bi, () => afterB(ring[bi]));
      }
    };

    if (keepA) {
      afterA(keepA);
    } else {
      setPhase("spinA");
      setResult(null);
      const ai = rand(ring.length);
      spinTo(ai, () => afterA(ring[ai]));
    }
  };

  const toggleLock = (k: "a" | "b" | "tech") =>
    setLocked((l) => ({ ...l, [k]: !l[k] }));

  const related = useMemo(() => {
    const m = new Map<string, RelKind>();
    if (phase === "result" && result) {
      for (const r of relatedPrograms(result.a)) m.set(r.program.id, r.kind as RelKind);
    }
    return m;
  }, [phase, result]);

  const selectedId = phase === "result" && result ? result.a.id : null;
  const prompts =
    phase === "result" && result ? collisionPrompts(result.a, result.b, result.tech) : [];
  const shared =
    phase === "result" && result ? sharedDisciplines(result.a, result.b) : [];

  const busy = phase === "spinA" || phase === "spinB" || phase === "drawTech";

  return (
    <div className="page">
      <div className="page-intro">
        <h2>Creative Collisions</h2>
        <p>
          Spin the wheel for two different programs, draw a technology card, and see what
          collides. Lock any slice you like and spin the rest again. It should feel like
          play, not a form.
        </p>
      </div>

      <div className="school-chips" role="group" aria-label="Choose a school">
        {schoolList.map((s) => (
          <button
            key={s.name}
            className="school-chip"
            aria-pressed={school === s.name}
            disabled={busy}
            onClick={() => {
              setSchool(s.name);
              setResult(null);
              setPhase("idle");
              setLocked({ a: false, b: false, tech: false });
            }}
          >
            {shortSchool(s.name)} · {s.count}
          </button>
        ))}
      </div>

      <div className="wheel-layout">
        <div>
          <WheelSvg
            programs={ring}
            mode="school"
            selectedId={selectedId}
            related={related}
            onSelect={() => {}}
            rotationDeg={rotation}
            spinning={spinning}
            pointer
            hubLabel={shortSchool(school)}
          />
          <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
            <button className="btn btn-go" onClick={collide} disabled={busy}>
              <SpinIcon /> {busy ? "Spinning…" : result ? "Collide again" : "Collide"}
            </button>
          </div>
        </div>

        <div>
          {phase === "drawTech" && (
            <div className="card" aria-live="polite">
              <div className="card-kicker">Drawing a technology card…</div>
              <div className="card-title" style={{ minHeight: "2.5em" }}>
                {cyclingTech ?? "—"}
              </div>
            </div>
          )}
          {phase === "result" && result && (
            <div className="card" aria-live="polite">
              <div className="card-kicker">Collision result</div>
              <h3 style={{ marginTop: 0 }}>
                <button className="linklike" onClick={() => onOpenProgram(result.a.id)}>
                  {result.a.name}
                </button>
                {" × "}
                <button className="linklike" onClick={() => onOpenProgram(result.b.id)}>
                  {result.b.name}
                </button>
              </h3>
              <div className="chip-row">
                <button className="btn btn-ghost" onClick={() => toggleLock("a")} aria-pressed={locked.a}>
                  {locked.a ? <LockIcon size={15} /> : <UnlockIcon size={15} />}
                  {locked.a ? "A locked" : "Lock A"}
                </button>
                <button className="btn btn-ghost" onClick={() => toggleLock("b")} aria-pressed={locked.b}>
                  {locked.b ? <LockIcon size={15} /> : <UnlockIcon size={15} />}
                  {locked.b ? "B locked" : "Lock B"}
                </button>
              </div>

              <h4>Technology card</h4>
              <p>
                <button className="linklike" onClick={() => onOpenTech(result.tech.id)}>
                  {result.tech.name}
                </button>{" "}
                <span className="reason">({result.tech.category})</span>
              </p>
              <TrlBar trl={result.tech.trl} />
              <p className="reason">Combined readiness: TRL {result.tech.trl} — the weakest link sets the pace.</p>
              <div className="chip-row">
                <button className="btn btn-ghost" onClick={() => toggleLock("tech")} aria-pressed={locked.tech}>
                  {locked.tech ? <LockIcon size={15} /> : <UnlockIcon size={15} />}
                  {locked.tech ? "Tech locked" : "Lock tech"}
                </button>
              </div>

              {shared.length > 0 && (
                <>
                  <h4>Shared disciplines</h4>
                  <div className="chip-row">
                    {shared.map((d) => (
                      <DisciplineChip key={d} name={d} />
                    ))}
                  </div>
                </>
              )}
              {shared.length === 0 && (
                <p className="reason">
                  These two share no discipline — a genuinely wild collision.
                </p>
              )}

              <h4>Project prompts</h4>
              <ol className="prompt-list">
                {prompts.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>

              <button
                className="btn btn-primary"
                onClick={() =>
                  onDraftIdea({
                    title: `${result.a.name.replace(/\s*\(.*?\)\s*/g, "")} × ${result.b.name.replace(/\s*\(.*?\)\s*/g, "")}`,
                    programs: [result.a.name, result.b.name],
                    tech: [result.tech.name],
                    summary: prompts[0],
                  })
                }
              >
                Save as a draft idea
              </button>
              <p className="reason" style={{ marginTop: "0.5rem" }}>
                Locks keep your favourites while you re-spin the rest.
              </p>
            </div>
          )}
          {phase !== "result" && phase !== "drawTech" && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>How it works</h3>
              <p>
                Hit <strong>Collide</strong>: the wheel spins and the pointer lands on
                Program A, spins again for a different Program B, then a technology card
                is drawn. You get the pair, their shared disciplines, the combined TRL,
                and three auto-suggested prompts to get you started.
              </p>
              <p className="reason">
                Lock A, B, or the tech to keep it while you re-spin the rest — then save
                a promising collision as a draft idea for the project bank.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
