import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ValidationStatusBadge } from "@/components/mecanico/ValidationStatusBadge";
import { formatDateTime } from "@/components/mecanico/relativeTime";
import { toast } from "sonner";

export const Route = createFileRoute("/mecanico/historico")({
  component: HistoricoPage,
});

interface HistoryRow {
  id: string;
  validated_at: string | null;
  validation_status: string | null;
  validation_note: string | null;
  operator_name: string;
  serial: string;
  item_name: string;
  order_idx: number;
}

interface RawRow {
  id: string;
  validated_at: string | null;
  validation_status: string | null;
  validation_note: string | null;
  checklist_runs: {
    machines: { serial: string } | null;
    user_public_info: { name: string } | null;
  } | null;
  checklist_items: { name: string; order_idx: number } | null;
}

function HistoricoPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("item_responses")
        .select(
          `id, validated_at, validation_status, validation_note,
           checklist_runs!inner(
             machines!inner(serial),
             user_public_info!inner(name)
           ),
           checklist_items!inner(name, order_idx)`,
        )
        .eq("validated_by", user.id)
        .order("validated_at", { ascending: false })
        .limit(200);

      if (error) {
        toast.error("Erro ao carregar histórico", { description: error.message });
        setLoading(false);
        return;
      }

      const mapped: HistoryRow[] = ((data ?? []) as unknown as RawRow[])
        .filter((r) => r.checklist_runs && r.checklist_items)
        .map((r) => ({
          id: r.id,
          validated_at: r.validated_at,
          validation_status: r.validation_status,
          validation_note: r.validation_note,
          operator_name: r.checklist_runs!.user_public_info?.name ?? "—",
          serial: r.checklist_runs!.machines?.serial ?? "—",
          item_name: r.checklist_items!.name,
          order_idx: r.checklist_items!.order_idx,
        }));

      setRows(mapped);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Histórico</h1>
        <p className="text-sm text-slate-400">
          Suas últimas {rows.length > 0 ? rows.length : ""} validações
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full bg-slate-900/60" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-12 text-center">
          <p className="text-slate-300">Você ainda não validou nenhuma resposta.</p>
        </div>
      ) : (
        <div className="rounded-md border border-slate-800 bg-slate-900/40">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Data</TableHead>
                <TableHead className="text-slate-400">Operador</TableHead>
                <TableHead className="text-slate-400">Máquina</TableHead>
                <TableHead className="text-slate-400">Item</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-slate-800">
                  <TableCell className="text-slate-300">
                    {formatDateTime(r.validated_at)}
                  </TableCell>
                  <TableCell className="text-slate-300">{r.operator_name}</TableCell>
                  <TableCell className="text-slate-300">{r.serial}</TableCell>
                  <TableCell className="text-slate-300">
                    #{r.order_idx} {r.item_name}
                  </TableCell>
                  <TableCell>
                    <ValidationStatusBadge status={r.validation_status} />
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-slate-400">
                    {r.validation_note || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
