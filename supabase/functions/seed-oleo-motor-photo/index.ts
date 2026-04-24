// Edge function temporária para propagar a foto de referência do item #2 (Oleo do motor)
// para todas as máquinas existentes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Imagem em base64 será passada via body
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ITEM_ID = 1; // Oleo do motor (order_idx = 2)

    // Decodifica base64 -> Uint8Array
    const binary = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    // Lista todas as máquinas
    const { data: machines, error: machinesErr } = await supabase
      .from("machines")
      .select("id");
    if (machinesErr) throw machinesErr;

    const results: Array<{ machine_id: string; ok: boolean; error?: string }> = [];

    for (const m of machines ?? []) {
      const path = `${m.id}/${ITEM_ID}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("reference-photos")
        .upload(path, binary, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadErr) {
        results.push({ machine_id: m.id, ok: false, error: uploadErr.message });
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

      results.push({
        machine_id: m.id,
        ok: !dbErr,
        error: dbErr?.message,
      });
    }

    return new Response(
      JSON.stringify({
        total: machines?.length ?? 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
