import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ReferenceItemCard } from "@/components/implantador/ReferenceItemCard";
import { EditChecklistItemDialog } from "@/components/implantador/EditChecklistItemDialog";
import { AddChecklistItemDialog } from "@/components/implantador/AddChecklistItemDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/implantador/referencias/$machineId")({
  component: ReferenciasPage,
});

type Machine = {
  id: string;
  serial: string;
  model: string;
  status: string;
};

type ChecklistItem = {
  id: number;
  name: string;
  description: string | null;
  order_idx: number;
};

type RefPhoto = {
  item_id: number;
  path: string;
};

function ReferenciasPage() {
  const { machineId } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [machine, setMachine] = React.useState<Machine | null>(null);
  const [items, setItems] = React.useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = React.useState<Map<number, RefPhoto>>(new Map());
  const [signedUrls, setSignedUrls] = React.useState<Map<number, string>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [uploadingItem, setUploadingItem] = React.useState<number | null>(null);
  const [finalizing, setFinalizing] = React.useState(false);
  const [movingItem, setMovingItem] = React.useState<number | null>(null);
  const [editingItem, setEditingItem] = React.useState<ChecklistItem | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    setLoading(true);

    const [machineRes, itemsRes, photosRes] = await Promise.all([
      supabase
        .from("machines")
        .select("id, serial, model, status")
        .eq("id", machineId)
        .maybeSingle(),
      supabase
        .from("checklist_items")
        .select("id, name, description, order_idx")
        .order("order_idx", { ascending: true }),
      supabase
        .from("machine_reference_photos")
        .select("item_id, path")
        .eq("machine_id", machineId),
    ]);

    if (machineRes.error || !machineRes.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setMachine(machineRes.data as Machine);
    setItems((itemsRes.data ?? []) as ChecklistItem[]);

    const photoMap = new Map<number, RefPhoto>();
    (photosRes.data ?? []).forEach((p) => {
      photoMap.set(p.item_id, p as RefPhoto);
    });
    setPhotos(photoMap);

    // Signed URLs
    const urls = new Map<number, string>();
    await Promise.all(
      Array.from(photoMap.values()).map(async (p) => {
        const { data } = await supabase.storage
          .from("reference-photos")
          .createSignedUrl(p.path, 3600);
        if (data?.signedUrl) urls.set(p.item_id, data.signedUrl);
      }),
    );
    setSignedUrls(urls);
    setLoading(false);
  }, [machineId]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleUpload = async (itemId: number, file: File) => {
    setUploadingItem(itemId);
    const path = `${machineId}/${itemId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("reference-photos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploadingItem(null);
      toast.error("Erro ao enviar foto: " + uploadError.message);
      return;
    }

    const { error: dbError } = await supabase
      .from("machine_reference_photos")
      .upsert(
        {
          machine_id: machineId,
          item_id: itemId,
          path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "machine_id,item_id" },
      );

    if (dbError) {
      setUploadingItem(null);
      toast.error("Erro ao salvar referência: " + dbError.message);
      return;
    }

    // Atualiza signed URL
    const { data: signed } = await supabase.storage
      .from("reference-photos")
      .createSignedUrl(path, 3600);

    setPhotos((prev) => {
      const next = new Map(prev);
      next.set(itemId, { item_id: itemId, path });
      return next;
    });
    if (signed?.signedUrl) {
      // Cache-bust appending timestamp
      const url = `${signed.signedUrl}&t=${Date.now()}`;
      setSignedUrls((prev) => {
        const next = new Map(prev);
        next.set(itemId, url);
        return next;
      });
    }
    setUploadingItem(null);
    toast.success("Foto de referência salva.");
  };

  const reloadItems = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("id, name, description, order_idx")
      .order("order_idx", { ascending: true });
    if (error) {
      toast.error("Erro ao recarregar itens: " + error.message);
      return;
    }
    setItems((data ?? []) as ChecklistItem[]);
  }, []);

  const handleMove = async (itemId: number, direction: "up" | "down") => {
    setMovingItem(itemId);
    const { error } = await supabase.rpc("move_checklist_item", {
      _item_id: itemId,
      _direction: direction,
    });
    setMovingItem(null);
    if (error) {
      toast.error("Erro ao mover: " + error.message);
      return;
    }
    await reloadItems();
  };

  const handleEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setEditOpen(true);
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    const { error } = await supabase
      .from("machines")
      .update({ status: "ready" })
      .eq("id", machineId);
    setFinalizing(false);
    if (error) {
      toast.error("Erro ao finalizar: " + error.message);
      return;
    }
    toast.success("Máquina marcada como pronta.");
    navigate({ to: "/implantador/maquinas" });
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-bold text-slate-100">Máquina não encontrada</h1>
        <p className="mt-2 text-sm text-slate-400">
          Verifique se o link está correto.
        </p>
        <Link
          to="/implantador/maquinas"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: "#a78bfa" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para máquinas
        </Link>
      </div>
    );
  }

  if (loading || !machine) {
    return (
      <div className="flex justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700"
          style={{ borderTopColor: "#a78bfa" }}
        />
      </div>
    );
  }

  const configuredCount = photos.size;
  const totalItems = items.length;
  const allConfigured = totalItems > 0 && configuredCount === totalItems;
  const progressPct = totalItems > 0 ? (configuredCount / totalItems) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/implantador/maquinas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">
          Configurar referências —{" "}
          <span className="font-mono" style={{ color: "#a78bfa" }}>
            {machine.serial}
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">{machine.model}</p>
      </div>

      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            {configuredCount} de {totalItems} itens configurados
          </span>
          <span className="text-xs text-slate-400">{Math.round(progressPct)}%</span>
        </div>
        <Progress
          value={progressPct}
          className="h-2 bg-slate-800"
          style={{ ["--progress-color" as string]: "#a78bfa" }}
        />
        <style>{`.bg-primary{background-color:#a78bfa !important}`}</style>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <ReferenceItemCard
            key={item.id}
            orderIdx={item.order_idx}
            name={item.name}
            description={item.description}
            photoUrl={signedUrls.get(item.id) ?? null}
            uploading={uploadingItem === item.id}
            onPickFile={(file) => handleUpload(item.id, file)}
            canEdit={isAdmin}
            canMoveUp={isAdmin && idx > 0}
            canMoveDown={isAdmin && idx < items.length - 1}
            moving={movingItem === item.id}
            onEdit={() => handleEdit(item)}
            onMoveUp={() => handleMove(item.id, "up")}
            onMoveDown={() => handleMove(item.id, "down")}
          />
        ))}
      </div>

      {allConfigured && (
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleFinalize}
            disabled={finalizing}
            className="font-semibold text-slate-900 hover:opacity-90"
            style={{ backgroundColor: "#a78bfa" }}
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {finalizing ? "Finalizando..." : "Finalizar configuração"}
          </Button>
        </div>
      )}

      <EditChecklistItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editingItem}
        onSaved={reloadItems}
      />
    </div>
  );
}
