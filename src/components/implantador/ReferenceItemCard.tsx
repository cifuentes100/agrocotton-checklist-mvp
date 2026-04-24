import * as React from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

type Props = {
  orderIdx: number;
  name: string;
  description: string | null;
  photoUrl: string | null;
  uploading: boolean;
  onPickFile: (file: File) => void;
};

export function ReferenceItemCard({
  orderIdx,
  name,
  description,
  photoUrl,
  uploading,
  onPickFile,
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
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-bold"
            style={{ color: "#a78bfa" }}
          >
            #{orderIdx}
          </span>
          <h3 className="font-semibold text-slate-100">{name}</h3>
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
