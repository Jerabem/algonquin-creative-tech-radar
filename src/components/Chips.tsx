import type { ReactNode } from "react";

export function Chip({ children, kind = "default" }: { children: ReactNode; kind?: "default" | "outline" | "go" | "credential" }) {
  const cls = kind === "default" ? "chip" : `chip chip-${kind}`;
  return <span className={cls}>{children}</span>;
}

export function DisciplineChip({ name }: { name: string }) {
  return <Chip>{name}</Chip>;
}

export function StatusChip({ status }: { status: string }) {
  return <Chip kind={status === "seed" ? "go" : "outline"}>{status}</Chip>;
}

export function EffortChip({ effort }: { effort: string }) {
  return <Chip kind="outline">{effort}</Chip>;
}
