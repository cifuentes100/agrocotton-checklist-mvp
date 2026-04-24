import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";

const schema = z.object({
  serial: z.string().trim().min(1, "Serial é obrigatório"),
  model: z.string().trim().min(1, "Modelo é obrigatório"),
  year: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), "Ano deve ter 4 dígitos"),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (machineId: string) => void;
};

export function MachineFormDialog({ open, onOpenChange, onCreated }: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const { data, error } = await supabase
      .from("machines")
      .insert({
        serial: values.serial,
        model: values.model,
        year: values.year ? Number(values.year) : null,
        location: values.location?.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Serial já cadastrado. Use um serial único.");
      } else {
        toast.error("Erro ao criar máquina: " + error.message);
      }
      return;
    }

    toast.success("Máquina criada. Configure as fotos de referência.");
    onOpenChange(false);
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-slate-800 text-slate-100"
        style={{ backgroundColor: "#0b1222" }}
      >
        <DialogHeader>
          <DialogTitle>Nova máquina</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="serial" className="text-slate-300">
              Serial *
            </Label>
            <Input
              id="serial"
              {...register("serial")}
              className="mt-1 border-slate-700 bg-slate-900 text-slate-100"
              placeholder="Ex: CT-2024-001"
            />
            {errors.serial && (
              <p className="mt-1 text-xs text-red-400">{errors.serial.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="model" className="text-slate-300">
              Modelo *
            </Label>
            <Input
              id="model"
              {...register("model")}
              className="mt-1 border-slate-700 bg-slate-900 text-slate-100"
              placeholder="Ex: John Deere CP690"
            />
            {errors.model && (
              <p className="mt-1 text-xs text-red-400">{errors.model.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="year" className="text-slate-300">
              Ano
            </Label>
            <Input
              id="year"
              {...register("year")}
              className="mt-1 border-slate-700 bg-slate-900 text-slate-100"
              placeholder="2023"
              inputMode="numeric"
            />
            {errors.year && (
              <p className="mt-1 text-xs text-red-400">{errors.year.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="location" className="text-slate-300">
              Localização / Fazenda
            </Label>
            <Input
              id="location"
              {...register("location")}
              className="mt-1 border-slate-700 bg-slate-900 text-slate-100"
              placeholder="Ex: Fazenda Boa Vista"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="font-semibold text-slate-900 hover:opacity-90"
              style={{ backgroundColor: "#a78bfa" }}
            >
              {submitting ? "Criando..." : "Criar máquina"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
