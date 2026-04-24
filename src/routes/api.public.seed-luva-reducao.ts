import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
// Importa o asset como URL servida pelo Vite/Worker
import luvaReducaoUrl from "@/assets/luva-reducao-referencia.jpg?url";

const ITEM_ID = 5;
const MACHINES = [
  { id: "5a61c9fb-52ea-4c2a-8b86-8a63c48811e7", serial: "AGR-2026-001" },
  { id: "711ed80e-95f4-4618-a1bc-6c202eb4e37d", serial: "AGR-2026-002" },
];

export const Route = createFileRoute("/api/public/seed-luva-reducao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const assetUrl = new URL(luvaReducaoUrl, url.origin).toString();
          const assetRes = await fetch(assetUrl);
          if (!assetRes.ok) {
            return Response.json(
              { error: `Falha ao buscar asset (${assetRes.status}) em ${assetUrl}` },
              { status: 500 },
            );
          }
          const buffer = new Uint8Array(await assetRes.arrayBuffer());

          const results: Array<{ serial: string; ok: boolean; error?: string }> = [];
          let count = 0;

          for (const m of MACHINES) {
            const path = `${m.id}/${ITEM_ID}.jpg`;
            const { error: upErr } = await supabaseAdmin.storage
              .from("reference-photos")
              .upload(path, buffer, { upsert: true, contentType: "image/jpeg" });
            if (upErr) {
              results.push({ serial: m.serial, ok: false, error: `upload: ${upErr.message}` });
              continue;
            }
            const { error: dbErr } = await supabaseAdmin
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
              results.push({ serial: m.serial, ok: false, error: `db: ${dbErr.message}` });
              continue;
            }
            results.push({ serial: m.serial, ok: true });
            count++;
          }

          return Response.json({ count, results, assetUrl, assetSize: buffer.length });
        } catch (e: any) {
          return Response.json(
            { error: "Exception", message: e?.message ?? String(e), stack: e?.stack },
            { status: 500 },
          );
        }
      },
    },
  },
});
