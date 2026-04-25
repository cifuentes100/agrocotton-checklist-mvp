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
  item: { id: number; name: string; description: string | null } | null;
  onSaved: () => void;
};

export function EditChecklistItemDialog({ open, onOpenChange, item, onSaved }: Props) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description ?? "");
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("checklist_items")
      .update({
        name: trimmedName,
        description: description.trim() || null,
      })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Item atualizado.");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>Editar item do checklist</DialogTitle>
          <DialogDescription className="text-slate-400">
            Atualiza o nome e a descrição. Aplica-se a todas as máquinas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="item-name" className="text-slate-300">
              Nome
            </Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-desc" className="text-slate-300">
              Descrição
            </Label>
            <Textarea
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="border-slate-700 bg-slate-950 text-slate-100"
              placeholder="Ex.: Verificar lubrificação"
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
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
