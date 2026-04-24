import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/implantador/StatusBadge";
import { MachineFormDialog } from "@/components/implantador/MachineFormDialog";
import { Plus, Camera } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/implantador/maquinas")({
  component: MaquinasPage,
});

type Machine = {
  id: string;
  serial: string;
  model: string;
  year: number | null;
  location: string | null;
  status: string;
  created_at: string | null;
};

function MaquinasPage() {
  const navigate = useNavigate();
  const [machines, setMachines] = React.useState<Machine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("machines")
      .select("id, serial, model, year, location, status, created_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar máquinas: " + error.message);
      return;
    }
    setMachines((data ?? []) as Machine[]);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleCreated = (machineId: string) => {
    navigate({
      to: "/implantador/referencias/$machineId",
      params: { machineId },
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Máquinas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cadastre colheitadeiras e configure as 10 fotos de referência.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="font-semibold text-slate-900 hover:opacity-90"
          style={{ backgroundColor: "#a78bfa" }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nova máquina
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Serial</TableHead>
              <TableHead className="text-slate-400">Modelo</TableHead>
              <TableHead className="text-slate-400">Ano</TableHead>
              <TableHead className="text-slate-400">Local</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-right text-slate-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : machines.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhuma máquina cadastrada. Clique em "Nova máquina" para começar.
                </TableCell>
              </TableRow>
            ) : (
              machines.map((m) => (
                <TableRow
                  key={m.id}
                  className="border-slate-800 hover:bg-slate-800/40"
                >
                  <TableCell className="font-mono text-slate-100">{m.serial}</TableCell>
                  <TableCell className="text-slate-200">{m.model}</TableCell>
                  <TableCell className="text-slate-300">{m.year ?? "—"}</TableCell>
                  <TableCell className="text-slate-300">{m.location ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate({
                          to: "/implantador/referencias/$machineId",
                          params: { machineId: m.id },
                        })
                      }
                      className="text-slate-300 hover:bg-violet-500/10 hover:text-violet-300"
                    >
                      <Camera className="mr-1 h-4 w-4" />
                      Configurar fotos
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MachineFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(id) => {
          load();
          handleCreated(id);
        }}
      />
    </div>
  );
}
