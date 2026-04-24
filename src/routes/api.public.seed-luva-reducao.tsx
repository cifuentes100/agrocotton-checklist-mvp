import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import luvaReducaoUrl from "@/assets/luva-reducao-referencia.jpg?url";

export const Route = createFileRoute("/api/public/seed-luva-reducao")({
  component: SeedLuvaPage,
});

const ITEM_ID = 5;
const MACHINES = [
  { id: "5a61c9fb-52ea-4c2a-8b86-8a63c48811e7", serial: "AGR-2026-001" },
  { id: "711ed80e-95f4-4618-a1bc-6c202eb4e37d", serial: "AGR-2026-002" },
];

function SeedLuvaPage() {
  const [log, setLog] = React.useState<string[]>(["aguardando..."]);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: string[] = [];
      const push = (s: string) => {
        out.push(s);
        if (!cancelled) setLog([...out]);
      };

      const res = await fetch(luvaReducaoUrl);
      const blob = await res.blob();
      push(`asset carregado: ${blob.size} bytes`);

      let count = 0;
      for (const m of MACHINES) {
        const path = `${m.id}/${ITEM_ID}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("reference-photos")
          .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (upErr) {
          push(`✗ ${m.serial}: upload falhou - ${upErr.message}`);
          continue;
        }
        const { error: dbErr } = await supabase
          .from("machine_reference_photos")
          .upsert(
            {
              machine_id: m.id,
              item_id: ITEM_ID,
              path,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "machine_id,item_id" },
          );
        if (dbErr) {
          push(`✗ ${m.serial}: db upsert falhou - ${dbErr.message}`);
          continue;
        }
        push(`✓ ${m.serial}: ${path}`);
        count++;
      }
      push(`\nMáquinas que receberam a foto: ${count}`);
      if (!cancelled) setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>Seed Luva de Redução</h1>
      <pre>{log.join("\n")}</pre>
      {done && <p style={{ color: "lime" }}>FINALIZADO</p>}
    </div>
  );
}
