import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { triggerMorningNow } from "@/server/morning.functions";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsuariosPage,
  head: () => ({
    meta: [{ title: "Usuários — Admin AgroCotton" }],
  }),
});

type ManagedUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  morning_time: string; // "HH:MM:SS"
  morning_enabled: boolean;
  active: boolean;
  created_at: string;
};

type FormState = {
  name: string;
  phone: string;
  role: string;
  morning_time: string; // "HH:MM"
  morning_enabled: boolean;
  active: boolean;
};

const ROLES = [
  { value: "operador", label: "Operador" },
  { value: "mecanico", label: "Mecânico" },
  { value: "implantador", label: "Implantador" },
  { value: "admin", label: "Administrador" },
];

function emptyForm(): FormState {
  return {
    name: "",
    phone: "",
    role: "operador",
    morning_time: "05:30",
    morning_enabled: true,
    active: true,
  };
}

function timeToHHMM(t: string): string {
  // "HH:MM:SS" -> "HH:MM"
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function AdminUsuariosPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <Shell />
    </ProtectedRoute>
  );
}

function Shell() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ManagedUser | null>(null);
  const [triggering, setTriggering] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    setLoading(false);
    if (error) {
      toast.error(`Erro ao listar usuários: ${error.message}`);
      return;
    }
    setUsers((data as ManagedUser[]) ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    setForm({
      name: u.name,
      phone: u.phone,
      role: u.role,
      morning_time: timeToHHMM(u.morning_time),
      morning_enabled: u.morning_enabled,
      active: u.active,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }
    setSaving(true);
    const morningTimeWithSec = `${form.morning_time}:00`;
    if (editing) {
      const { error } = await supabase.rpc("admin_update_user", {
        _id: editing.id,
        _name: form.name,
        _phone: form.phone,
        _role: form.role,
        _morning_time: morningTimeWithSec,
        _morning_enabled: form.morning_enabled,
        _active: form.active,
      });
      setSaving(false);
      if (error) {
        toast.error(`Erro ao salvar: ${error.message}`);
        return;
      }
      toast.success("Usuário atualizado");
    } else {
      const { error } = await supabase.rpc("admin_create_user", {
        _name: form.name,
        _phone: form.phone,
        _role: form.role,
        _morning_time: morningTimeWithSec,
        _morning_enabled: form.morning_enabled,
        _active: form.active,
      });
      setSaving(false);
      if (error) {
        toast.error(`Erro ao criar: ${error.message}`);
        return;
      }
      toast.success("Usuário criado");
    }
    setDialogOpen(false);
    void load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.rpc("admin_delete_user", {
      _id: confirmDelete.id,
    });
    setConfirmDelete(null);
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return;
    }
    toast.success("Usuário excluído");
    void load();
  };

  const fireNow = async () => {
    setTriggering(true);
    try {
      const r = await triggerMorningNow();
      toast.success(
        `Bom-dia disparado: ${r.sent} enviado(s), ${r.skipped} pulado(s)${r.errors.length ? `, ${r.errors.length} erro(s)` : ""}`,
      );
      if (r.errors.length) {
        console.warn("Erros no disparo:", r.errors);
      }
    } catch (err) {
      toast.error(
        `Erro: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setTriggering(false);
    }
  };

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{ backgroundColor: "#0f172a" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              Usuários
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Gerencie operadores, mecânicos, implantadores e administradores.
              Configure o horário do disparo automático do bom-dia.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/admin" })}
              className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"
            >
              Voltar
            </Button>
            <Button
              onClick={fireNow}
              disabled={triggering}
              variant="outline"
              className="border-2 bg-transparent font-semibold hover:bg-emerald-500/10"
              style={{ borderColor: "#25D366", color: "#25D366" }}
            >
              {triggering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Disparar bom-dia agora
            </Button>
            <Button
              onClick={openNew}
              className="font-semibold"
              style={{ backgroundColor: "#a78bfa", color: "#0f172a" }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo usuário
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando…
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-300">Nome</TableHead>
                  <TableHead className="text-slate-300">Telefone</TableHead>
                  <TableHead className="text-slate-300">Papel</TableHead>
                  <TableHead className="text-slate-300">Bom-dia</TableHead>
                  <TableHead className="text-slate-300">Ativo</TableHead>
                  <TableHead className="text-right text-slate-300">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className={
                      u.active
                        ? "border-slate-800 hover:bg-slate-800/40"
                        : "border-slate-800 opacity-60 hover:bg-slate-800/40"
                    }
                  >
                    <TableCell className="font-medium text-slate-100">
                      {u.name}
                    </TableCell>
                    <TableCell className="text-slate-300">{u.phone}</TableCell>
                    <TableCell className="text-slate-300 capitalize">
                      {u.role}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <span
                        className={
                          u.morning_enabled
                            ? "text-slate-300"
                            : "text-slate-500 line-through"
                        }
                      >
                        {timeToHHMM(u.morning_time)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          u.active
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400"
                            : "rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-400"
                        }
                      >
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(u)}
                          className="text-slate-300 hover:bg-slate-700/40 hover:text-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(u)}
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar usuário" : "Novo usuário"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="border-slate-700 bg-slate-800 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Telefone (com DDI, ex: +5562999549759)
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+55..."
                className="border-slate-700 bg-slate-800 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="morning_time">Horário do bom-dia</Label>
                <Input
                  id="morning_time"
                  type="time"
                  value={form.morning_time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, morning_time: e.target.value }))
                  }
                  className="border-slate-700 bg-slate-800 text-slate-100"
                />
                <p className="text-xs text-slate-500">
                  Fuso de Brasília (America/Sao_Paulo)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Disparo ativo</Label>
                <div className="flex h-10 items-center">
                  <Switch
                    checked={form.morning_enabled}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, morning_enabled: v }))
                    }
                  />
                  <span className="ml-3 text-sm text-slate-400">
                    {form.morning_enabled ? "Recebe bom-dia" : "Pausado"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-800/40 p-3">
              <Label>Usuário ativo</Label>
              <div className="flex items-center">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, active: v }))
                  }
                />
                <span className="ml-3 text-sm text-slate-400">
                  {form.active
                    ? "Bot interage normalmente"
                    : "Bot ignora 100% (sem bom-dia, sem resposta a mensagens)"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              style={{ backgroundColor: "#a78bfa", color: "#0f172a" }}
              className="font-semibold"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {confirmDelete
                ? `Excluir definitivamente "${confirmDelete.name}"? Esta ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}


