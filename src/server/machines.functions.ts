import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const REFERENCE_BUCKET = "reference-photos";

const cloneInputSchema = z.object({
  sourceMachineId: z.string().uuid(),
  newSerial: z
    .string()
    .trim()
    .min(1, "Serial é obrigatório")
    .max(64, "Serial muito longo")
    .regex(/^[A-Za-z0-9._\-/]+$/, "Serial contém caracteres inválidos"),
  newLocation: z.string().trim().max(255).optional().nullable(),
  newYear: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .nullable(),
  copyPhotos: z.boolean(),
});

export const cloneMachine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cloneInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const {
      sourceMachineId,
      newSerial,
      newLocation,
      newYear,
      copyPhotos,
    } = data;

    // 1. Verifica role (admin ou implantador)
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (userErr || !userRow) {
      throw new Error("Usuário não encontrado");
    }
    if (userRow.role !== "admin" && userRow.role !== "implantador") {
      throw new Error("Sem permissão para clonar máquinas");
    }

    // 2. Verifica serial único
    const { data: dup, error: dupErr } = await supabase
      .from("machines")
      .select("id")
      .eq("serial", newSerial)
      .maybeSingle();

    if (dupErr) {
      throw new Error("Erro ao validar serial: " + dupErr.message);
    }
    if (dup) {
      throw new Error("Serial já cadastrado. Use um serial único.");
    }

    // 3. Busca máquina origem
    const { data: source, error: sourceErr } = await supabase
      .from("machines")
      .select("id, serial, model, year, location, specs")
      .eq("id", sourceMachineId)
      .maybeSingle();

    if (sourceErr || !source) {
      throw new Error("Máquina de origem não encontrada");
    }

    // 4. Cria nova máquina
    const status = copyPhotos ? "ready" : "pending";
    const { data: newMachine, error: createErr } = await supabase
      .from("machines")
      .insert({
        serial: newSerial,
        model: source.model,
        year: newYear ?? source.year,
        location: newLocation ?? source.location,
        specs: source.specs ?? {},
        status,
      })
      .select("id, serial, model, year, location, status")
      .single();

    if (createErr || !newMachine) {
      throw new Error(
        "Erro ao criar máquina: " + (createErr?.message ?? "desconhecido"),
      );
    }

    let photosCopied = 0;

    if (copyPhotos) {
      // 5. Lê fotos da origem
      const { data: sourcePhotos, error: photosErr } = await supabase
        .from("machine_reference_photos")
        .select("item_id, path")
        .eq("machine_id", sourceMachineId);

      if (photosErr) {
        await rollback(newMachine.id, []);
        throw new Error("Erro ao ler fotos da origem: " + photosErr.message);
      }

      const copiedPaths: string[] = [];

      try {
        for (const photo of sourcePhotos ?? []) {
          const destPath = `${newMachine.id}/${photo.item_id}.jpg`;

          const { error: copyErr } = await supabaseAdmin.storage
            .from(REFERENCE_BUCKET)
            .copy(photo.path, destPath);

          if (copyErr) {
            throw new Error(
              `Falha ao copiar foto do item ${photo.item_id}: ${copyErr.message}`,
            );
          }
          copiedPaths.push(destPath);

          const { error: insertErr } = await supabaseAdmin
            .from("machine_reference_photos")
            .upsert(
              {
                machine_id: newMachine.id,
                item_id: photo.item_id,
                path: destPath,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "machine_id,item_id" },
            );

          if (insertErr) {
            throw new Error(
              `Falha ao registrar foto do item ${photo.item_id}: ${insertErr.message}`,
            );
          }

          photosCopied++;
        }
      } catch (err) {
        await rollback(newMachine.id, copiedPaths);
        throw err instanceof Error ? err : new Error(String(err));
      }
    }

    return {
      machine: newMachine,
      photosCopied,
    };
  });

async function rollback(newMachineId: string, copiedPaths: string[]) {
  try {
    if (copiedPaths.length > 0) {
      await supabaseAdmin.storage.from(REFERENCE_BUCKET).remove(copiedPaths);
    }
    await supabaseAdmin
      .from("machine_reference_photos")
      .delete()
      .eq("machine_id", newMachineId);
    await supabaseAdmin.from("machines").delete().eq("id", newMachineId);
  } catch (rollbackErr) {
    console.error("[cloneMachine] rollback failed:", rollbackErr);
  }
}
