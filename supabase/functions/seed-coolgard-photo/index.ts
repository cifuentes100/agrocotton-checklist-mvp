// Edge function de uso único: faz upload da foto de referência Cool Gard
// para todas as máquinas e cria as entradas em machine_reference_photos.
// Pode ser removida depois de executada.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Imagem cool-gard-referencia.jpg em base64 (será injetada abaixo)
const IMAGE_BASE64 = "__IMAGE_BASE64__";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const bytes = base64ToBytes(IMAGE_BASE64);
    const blob = new Blob([bytes], { type: "image/jpeg" });

    // Buscar todas as máquinas existentes
    const { data: machines, error: mErr } = await supabase
      .from("machines")
      .select("id");
    if (mErr) throw mErr;

    // Buscar o id do item Cool Gard (order_idx = 1 após a migration)
    const { data: items, error: iErr } = await supabase
      .from("checklist_items")
      .select("id, order_idx, name")
      .eq("order_idx", 1)
      .maybeSingle();
    if (iErr) throw iErr;
    if (!items) throw new Error("Item com order_idx=1 não encontrado. Rode a migration primeiro.");

    const itemId = items.id;
    const results: Array<{ machine: string; upload: number; db: string }> = [];

    for (const m of machines ?? []) {
      const path = `${m.id}/${itemId}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("reference-photos")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

      const { error: dbErr } = await supabase
        .from("machine_reference_photos")
        .upsert(
          { machine_id: m.id, item_id: itemId, path, updated_at: new Date().toISOString() },
          { onConflict: "machine_id,item_id" },
        );

      results.push({
        machine: m.id,
        upload: upErr ? 1 : 0,
        db: dbErr ? `db_err: ${dbErr.message}` : "ok",
      });
    }

    return new Response(
      JSON.stringify({ ok: true, item_id: itemId, item_name: items.name, results }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
