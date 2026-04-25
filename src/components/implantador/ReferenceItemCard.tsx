import * as React from "react";
import { Button } from "@/components/ui/button";
import { Camera, ChevronDown, ChevronUp, Loader2, Pencil } from "lucide-react";

type Props = {
  orderIdx: number;
  name: string;
  description: string | null;
  photoUrl: string | null;
  uploading: boolean;
  onPickFile: (file: File) => void;
  canEdit?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  moving?: boolean;
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export function ReferenceItemCard({
  orderIdx,
  name,
  description,
  photoUrl,
  uploading,
  onPickFile,
  canEdit = false,
  canMoveUp = false,
  canMoveDown = false,
  moving = false,
  onEdit,
  onMoveUp,
  onMoveDown,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPickFile(file);
    e.target.value = "";
  };

  return (
    <div className="flex gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      {/* Thumbnail */}
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-slate-950">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Referência ${name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Camera className="h-8 w-8 text-slate-600" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>
              #{orderIdx}
            </span>
            <h3 className="font-semibold text-slate-100">{name}</h3>
          </div>
          {canEdit && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onEdit}
                disabled={moving}
                title="Editar nome e descrição"
                className="h-7 w-7 text-slate-400 hover:bg-violet-500/10 hover:text-violet-300"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onMoveUp}
                disabled={!canMoveUp || moving}
                title="Mover para cima"
                className="h-7 w-7 text-slate-400 hover:bg-violet-500/10 hover:text-violet-300 disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onMoveDown}
                disabled={!canMoveDown || moving}
                title="Mover para baixo"
                className="h-7 w-7 text-slate-400 hover:bg-violet-500/10 hover:text-violet-300 disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        )}

        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic"
            capture="environment"
            className="hidden"
            onChange={handleChange}
          />
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            variant={photoUrl ? "outline" : "default"}
            className={
              photoUrl
                ? "border-2 bg-transparent font-medium hover:bg-violet-500/10"
                : "font-semibold text-slate-900 hover:opacity-90"
            }
            style={
              photoUrl
                ? { borderColor: "#a78bfa", color: "#a78bfa" }
                : { backgroundColor: "#a78bfa" }
            }
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : photoUrl ? (
              "Substituir foto"
            ) : (
              <>
                <Camera className="mr-1 h-4 w-4" />
                Adicionar foto do padrão correto
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
