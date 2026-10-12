/* Core entity types — see blueprint §1. */

export interface Program {
  id: string;
  name: string;
  credential: string;
  school: string;
  campus: string | null;
  code: string | null;
  status: string;
  notes: string | null;
  disciplines: string[];
  tangential: string[];
}

export interface Technology {
  id: string;
  name: string;
  category: string;
  description: string | null;
  relevantDisciplines: string | null;
  seeItInAction: string | null;
  maturity: string | null;
  source: string | null;
  trl: number; // 1-9, NASA scale; see TRL_INFO
  disciplines: string[];
}

export type Effort = "weekend" | "term project" | "capstone";
export type ProjectStatus = "seed" | "pitched" | "in progress" | "built";

export interface Project {
  id: string;
  title: string;
  summary: string;
  programs: string[]; // program names
  tech: string[]; // technology names
  disciplines: string[];
  effort: Effort;
  status: ProjectStatus;
  submittedBy: string;
  date: string; // YYYY-MM-DD
}

/** TRL scale in plain creative-practice language — blueprint §3. */
export const TRL_INFO: Record<number, { name: string; description: string }> = {
  1: { name: "Basic principles observed", description: "Someone published a paper; nothing you can touch yet." },
  2: { name: "Concept formulated", description: "A lab demo or concept video exists." },
  3: { name: "Proof of concept", description: "Works in a lab, not outside it." },
  4: { name: "Validated in lab", description: "Prototype validated; artists are experimenting." },
  5: { name: "Validated in relevant environment", description: "Works in a studio-like setting." },
  6: { name: "Prototype demonstrated", description: "Working prototype demoed publicly." },
  7: { name: "Operational prototype", description: "Real product; early adopters are using it." },
  8: { name: "Complete & qualified", description: "Shipping product with documented workflows." },
  9: { name: "Proven in operations", description: "Industry standard — teach it as a core skill." },
};

export type View =
  | { name: "wheel" }
  | { name: "collisions" }
  | { name: "browse" }
  | { name: "radar" }
  | { name: "submit"; prefill?: Partial<Project> }
  | { name: "project"; id: string }
  | { name: "program"; id: string }
  | { name: "tech"; id: string };
