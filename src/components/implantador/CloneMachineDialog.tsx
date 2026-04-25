import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { cloneMachine } from "@/server/machines.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export type CloneSourceMachine = {
  id: string;
  serial: string;
  model: string;
  year: number | null;
  location: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceMachine: CloneSourceMachine | null;
  totalItemsCount: number;
  onCloned: (newMachineId: string) => void;
};

const SERIAL_RE = /^[A-Za-z0-9._\-/]+$/;

export function CloneMachineDialog({
  open,
  onOpenChange,
  sourceMachine,
  totalItemsCount,
  onCloned,
}: Props) {
  const cloneFn = useServerFn(cloneMachine);

  const [serial, setSerial] = React.useState("");
  const [year, setYear] = React.useState<string>("");
  const [location, setLocation] = React.useState("");
  const [copyPhotos, setCopyPhotos] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [serialChecking, setSerialChecking] = React.useState(false);
  const [serialError, setSerialError] = React.useState<string | null>(null);

  // Reset ao abrir / trocar de origem
  React.useEffect(() => {
    if (open && sourceMachine) {
      setSerial("");
      setYear(sourceMachine.year ? String(sourceMachine.year) : "");
      setLocation(sourceMachine.location ?? "");
      setCopyPhotos(true);
      setSerialError(null);
    }
  }, [open, sourceMachine]);

  // Validação serial (debounced)
  React.useEffect(() => {
    const trimmed = serial.trim();
    if (!trimmed) {
      setSerialError(null);
      setSerialChecking(false);
      return;
    }
    if (!SERIAL_RE.test(trimmed)) {
      setSerialError("Use apenas letras, números, ponto, traço, barra ou _");
      return;
    }

    setSerialChecking(true);
    const handle = setTimeout(async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("id")
        .eq("serial", trimmed)
        .maybeSingle();
      setSerialChecking(false);
      if (error) {
        setSerialError("Não foi possível validar o serial agora");
        return;
      }
      if (data) {
        setSerialError("Serial já cadastrado");
        return;
      }
      setSerialError(null);
    }, 350);

    return () => clearTimeout(handle);
  }, [serial]);

  if (!sourceMachine) return null;

  const yearError =
    year && !/^\d{4}$/.test(year.trim())
      ? "Ano deve ter 4 dígitos"
      : null;

  const canSubmit =
    !submitting &&
    !serialChecking &&
    !serialError &&
    !yearError &&
    serial.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await cloneFn({
        data: {
          sourceMachineId: sourceMachine.id,
          newSerial: serial.trim(),
          newLocation: location.trim() || null,
          newYear: year.trim() ? Number(year.trim()) : null,
          copyPhotos,
        },
      });

      toast.success(
        copyPhotos
          ? `Máquina clonada (${result.photosCopied} fotos copiadas).`
          : "Máquina clonada. Configure as fotos para finalizar.",
      );
      onOpenChange(false);
      onCloned(result.machine.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao clonar máquina";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-slate-800 text-slate-100"
        style={{ backgroundColor: "#0b1222" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" style={{ color: "#a78bfa" }} />
            Clonar máquina
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm">
            <span className="text-slate-400">Clonando de: </span>
            <span
              className="font-mono font-semibold"
              style={{ color: "#a78bfa" }}
            >
              {sourceMachine.serial}
            </span>
          </div>

          <div>
            <Label className="text-slate-300">Modelo</Label>
            <Input
              value={sourceMachine.model}
              readOnly
              disabled
              className="mt-1 border-slate-700 bg-slate-950 text-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="clone-year" className="text-slate-300">
              Ano
            </Label>
            <Input
              id="clone-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              className="mt-1 border-slate-700 bg-slate-900 text-slate-100"
              placeholder="2023"
            />
            {yearError && (
              <p className="mt-1 text-xs text-red-400">{yearError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="clone-serial" className="text-slate-300">
              Novo serial *
            </Label>
            <Input
              id="clone-serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              autoFocus
              autoComplete="off"
              className="mt-1 border-slate-700 bg-slate-900 text-slate-100"
              placeholder="Ex: CT-2024-002"
            />
            {serialChecking ? (
              <p className="mt-1 text-xs text-slate-400">Verificando…</p>
            ) : serialError ? (
              <p className="mt-1 text-xs text-red-400">{serialError}</p>
            ) : serial.trim() ? (
              <p className="mt-1 text-xs text-emerald-400">Serial disponível</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="clone-location" className="text-slate-300">
              Localização / Fazenda
            </Label>
            <Input
              id="clone-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 border-slate-700 bg-slate-900 text-slate-100"
              placeholder="Ex: Fazenda Boa Vista"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-800 bg-slate-900/40 p-3">
            <Checkbox
              checked={copyPhotos}
              onCheckedChange={(v) => setCopyPhotos(v === true)}
              className="mt-0.5"
            />
            <div className="text-sm">
              <span className="font-medium text-slate-200">
                Copiar fotos de referência
                {totalItemsCount > 0 ? ` (${totalItemsCount} itens)` : ""}
              </span>
              <p className="mt-0.5 text-xs text-slate-400">
                Specs técnicas também são copiadas. A nova máquina já nasce
                pronta para uso.
              </p>
            </div>
          </label>

          {!copyPhotos && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                A nova máquina ficará com status <strong>pendente</strong>. Você
                precisará configurar todas as fotos manualmente.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="font-semibold text-slate-900 hover:opacity-90"
              style={{ backgroundColor: "#a78bfa" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clonando… (pode levar alguns segundos)
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Clonar agora
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
