import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Inline reference image (base64). Replaced at deploy time by build pipeline if needed.
// We'll fetch from the published preview URL to avoid embedding a huge string.
const IMAGE_URL = "https://id-preview--adc72325-bc73-43b2-bdbc-45035eda4981.lovable.app/src/assets/desfribador-a-referencia.jpg";
const ITEM_ID = 3;

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch image bytes
    const imgRes = await fetch(IMAGE_URL);
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

    // Get all machines
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
