import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageOff, MapPin, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { relativeTime } from "./relativeTime";
import type { PendingResponse } from "@/routes/mecanico.index";

interface Props {
  response: PendingResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValidated: (id: string) => void;
}

type Mode = "approve" | "reject";

export function ValidationDrawer({ response, open, onOpenChange, onValidated }: Props) {
  const { user } = useAuth();
  const [operatorPhotoUrl, setOperatorPhotoUrl] = useState<string | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [referenceMissing, setReferenceMissing] = useState(false);
  const [operatorPhotoError, setOperatorPhotoError] = useState(false);
  const [mode, setMode] = useState<Mode>("approve");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset ao abrir/trocar resposta
  useEffect(() => {
    if (!response || !open) return;
    setMode("approve");
    setNote("");
    setOperatorPhotoUrl(null);
    setReferenceUrl(null);
    setReferenceMissing(false);
    setOperatorPhotoError(false);

    // Foto do operador
    (async () => {
      if (!response.photo_path) {
        setOperatorPhotoError(true);
        return;
      }
      const { data, error } = await supabase.storage
        .from("checklist-photos")
        .createSignedUrl(response.photo_path, 3600);
      if (error || !data?.signedUrl) {
        setOperatorPhotoError(true);
      } else {
        setOperatorPhotoUrl(data.signedUrl);
      }
    })();

    // Foto de referência (machine_reference_photos)
    (async () => {
      const { data: refRow } = await supabase
        .from("machine_reference_photos")
        .select("path")
        .eq("machine_id", response.machine_id)
        .eq("item_id", response.item_id)
        .maybeSingle();

      if (!refRow?.path) {
        setReferenceMissing(true);
        return;
      }
      const { data, error } = await supabase.storage
        .from("reference-photos")
        .createSignedUrl(refRow.path, 3600);
      if (error || !data?.signedUrl) {
        setReferenceMissing(true);
      } else {
        setReferenceUrl(data.signedUrl);
      }
    })();
  }, [response, open]);

  if (!response) return null;

  const trimmedNote = note.trim();
  const canSubmit =
    !submitting && (mode === "approve" || trimmedNote.length >= 30);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("item_responses")
      .update({
        validation_status: mode === "approve" ? "approved" : "rejected",
        validation_note: trimmedNote || null,
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", response.id);

    setSubmitting(false);

    if (error) {
      toast.error("Erro ao salvar validação", { description: error.message });
      return;
    }

    toast.success(
      mode === "approve" ? "Resposta aprovada" : "Resposta reprovada",
    );
    onValidated(response.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-slate-800 sm:max-w-3xl"
        style={{ backgroundColor: "#0b1222" }}
      >
        <SheetHeader>
          <SheetTitle className="text-slate-100">
            Validar item #{response.order_idx} — {response.item_name}
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            {response.operator_name} • {response.serial} •{" "}
            {relativeTime(response.answered_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Geo */}
          {response.geo_lat != null && response.geo_lng != null && (
            <a
              href={`https://www.google.com/maps?q=${response.geo_lat},${response.geo_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm hover:underline"
              style={{ color: "#f5a623" }}
            >
              <MapPin className="h-3.5 w-3.5" />
              Ver no mapa
            </a>
          )}

          {/* Comparação de fotos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PhotoBlock
              label="Foto do operador"
              url={operatorPhotoUrl}
              error={operatorPhotoError}
              fallback="Foto do operador não disponível"
            />
            <PhotoBlock
              label="Padrão correto (referência)"
              url={referenceUrl}
              error={referenceMissing}
              fallback="Referência não configurada para esta máquina"
            />
          </div>

          {/* Observação do operador */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              <MessageSquare className="h-3.5 w-3.5" />
              Observação do operador
            </div>
            <p className="text-sm text-slate-200">
              {response.observation || (
                <span className="italic text-slate-500">Sem observação</span>
              )}
            </p>
          </div>

          {/* Ações */}
          <div>
            <div className="mb-3 flex gap-2">
              <Button
                type="button"
                onClick={() => setMode("approve")}
                className={
                  mode === "approve"
                    ? "border-0 bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                }
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Aprovar
              </Button>
              <Button
                type="button"
                onClick={() => setMode("reject")}
                className={
                  mode === "reject"
                    ? "border-0 bg-red-500 text-white hover:bg-red-600"
                    : "border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                }
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Reprovar
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-slate-300">
                {mode === "approve"
                  ? "Nota do mecânico (opcional)"
                  : "Diagnóstico (mín. 30 caracteres)"}
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="border-slate-700 bg-slate-950 text-slate-100"
                placeholder={
                  mode === "approve"
                    ? "Algum comentário?"
                    : "Descreva o problema com detalhes..."
                }
              />
              {mode === "reject" && (
                <p
                  className={`text-right text-xs ${
                    trimmedNote.length >= 30 ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {trimmedNote.length}/30
                </p>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-4 w-full border-0 font-semibold text-slate-950 disabled:opacity-50"
              style={{ backgroundColor: "#f5a623" }}
            >
              {submitting ? "Salvando..." : "Confirmar validação"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PhotoBlock({
  label,
  url,
  error,
  fallback,
}: {
  label: string;
  url: string | null;
  error: boolean;
  fallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="aspect-square overflow-hidden rounded-md border border-slate-800 bg-slate-950">
        {url && !error ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-slate-500">
            <ImageOff className="h-8 w-8" />
            <span>{fallback}</span>
          </div>
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-900" />
        )}
      </div>
    </div>
  );
}
