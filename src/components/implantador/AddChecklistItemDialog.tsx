import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
};

export function AddChecklistItemDialog({ open, onOpenChange, onAdded }: Props) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("add_checklist_item", {
      _name: trimmedName,
      _description: description.trim() || "",
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
      return;
    }
    toast.success("Item adicionado.");
    onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>Adicionar item ao checklist</DialogTitle>
          <DialogDescription className="text-slate-400">
            O novo item será incluído no fim da lista e ficará disponível para todas as máquinas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-item-name" className="text-slate-300">
              Nome
            </Label>
            <Input
              id="new-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Filtro de ar"
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-item-desc" className="text-slate-300">
              Descrição (opcional)
            </Label>
            <Textarea
              id="new-item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex.: Verificar limpeza e fixação"
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="font-semibold text-slate-900 hover:opacity-90"
            style={{ backgroundColor: "#a78bfa" }}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              "Adicionar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
