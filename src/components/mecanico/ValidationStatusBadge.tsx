import { Badge } from "@/components/ui/badge";

export function ValidationStatusBadge({ status }: { status: string | null }) {
  if (status === "approved") {
    return (
      <Badge className="border-0 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
        Aprovado
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="border-0 bg-red-500/20 text-red-400 hover:bg-red-500/30">
        Reprovado
      </Badge>
    );
  }
  return (
    <Badge className="border-0 bg-slate-700/40 text-slate-300 hover:bg-slate-700/60">
      Pendente
    </Badge>
  );
}
