type Status = "pending" | "setup" | "ready" | "maintenance" | string;

const STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "rgba(148, 163, 184, 0.2)", color: "#cbd5e1", label: "Pendente" },
  setup: { bg: "rgba(234, 179, 8, 0.2)", color: "#fde047", label: "Configurando" },
  ready: { bg: "rgba(34, 197, 94, 0.2)", color: "#86efac", label: "Pronta" },
  maintenance: { bg: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", label: "Manutenção" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STYLES[status] ?? STYLES.pending;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
