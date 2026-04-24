import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { IMAGE_B64 } from "./image.ts";

const ITEM_ID = 3;

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const imgBytes = b64ToBytes(IMAGE_B64);

    const { data: machines, error: mErr } = await supabase
      .from("machines")
      .select("id");
    if (mErr) throw mErr;

    const results: any[] = [];
    for (const m of machines ?? []) {
      const path = `${m.id}/${ITEM_ID}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("reference-photos")
        .upload(path, imgBytes, { upsert: true, contentType: "image/jpeg" });
      if (upErr) {
        results.push({ machine: m.id, error: upErr.message });
        continue;
      }
      const { error: dbErr } = await supabase
        .from("machine_reference_photos")
        .upsert(
          { machine_id: m.id, item_id: ITEM_ID, path, updated_at: new Date().toISOString() },
          { onConflict: "machine_id,item_id" },
        );
      if (dbErr) {
        results.push({ machine: m.id, error: dbErr.message });
        continue;
      }
      results.push({ machine: m.id, ok: true });
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
