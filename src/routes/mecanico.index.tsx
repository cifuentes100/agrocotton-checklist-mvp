import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { ValidationQueueCard } from "@/components/mecanico/ValidationQueueCard";
import { ValidationDrawer } from "@/components/mecanico/ValidationDrawer";
import { toast } from "sonner";

export const Route = createFileRoute("/mecanico/")({
  component: FilaValidacoes,
});

export interface PendingResponse {
  id: string;
  run_id: string;
  item_id: number;
  observation: string | null;
  photo_path: string;
  geo_lat: number | null;
  geo_lng: number | null;
  answered_at: string | null;
  machine_id: string;
  serial: string;
  operator_name: string;
  item_name: string;
  order_idx: number;
}

interface RawRow {
  id: string;
  run_id: string;
  item_id: number;
  observation: string | null;
  photo_path: string;
  geo_lat: number | null;
  geo_lng: number | null;
  answered_at: string | null;
  checklist_runs: {
    machine_id: string;
    operator_id: string;
    machines: { serial: string } | null;
    user_public_info: { name: string } | null;
  } | null;
  checklist_items: { name: string; order_idx: number } | null;
}

function FilaValidacoes() {
  const [items, setItems] = useState<PendingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PendingResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const { data, error } = await supabase
      .from("item_responses")
      .select(
        `id, run_id, item_id, observation, photo_path, geo_lat, geo_lng, answered_at,
         checklist_runs!inner(
           machine_id, operator_id,
           machines!inner(serial),
           user_public_info!inner(name)
         ),
         checklist_items!inner(name, order_idx)`,
      )
      .eq("status", "nok")
      .is("validation_status", null)
      .order("answered_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar fila", { description: error.message });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const mapped: PendingResponse[] = ((data ?? []) as unknown as RawRow[])
      .filter((r) => r.checklist_runs && r.checklist_items)
      .map((r) => ({
        id: r.id,
        run_id: r.run_id,
        item_id: r.item_id,
        observation: r.observation,
        photo_path: r.photo_path,
        geo_lat: r.geo_lat,
        geo_lng: r.geo_lng,
        answered_at: r.answered_at,
        machine_id: r.checklist_runs!.machine_id,
        serial: r.checklist_runs!.machines?.serial ?? "—",
        operator_name: r.checklist_runs!.user_public_info?.name ?? "—",
        item_name: r.checklist_items!.name,
        order_idx: r.checklist_items!.order_idx,
      }));

    setItems(mapped);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleCardClick = (resp: PendingResponse) => {
    setSelected(resp);
    setDrawerOpen(true);
  };

  const handleValidated = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fila de Validações</h1>
          <p className="text-sm text-slate-400">
            {loading ? "Carregando..." : `${items.length} pendente(s)`}
          </p>
        </div>
        <Button
          onClick={() => load()}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full bg-slate-900/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-12 text-center">
          <p className="text-lg text-slate-300">Nenhuma validação pendente. 🤠</p>
          <p className="mt-1 text-sm text-slate-500">
            Quando o operador marcar um item como NOK, ele aparece aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((resp) => (
            <ValidationQueueCard
              key={resp.id}
              response={resp}
              onClick={() => handleCardClick(resp)}
            />
          ))}
        </div>
      )}

      <ValidationDrawer
        response={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onValidated={handleValidated}
      />
    </div>
  );
}
