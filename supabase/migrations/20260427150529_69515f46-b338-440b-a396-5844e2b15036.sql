-- Tabela de idempotência para o webhook do WhatsApp (whapi.cloud).
-- Whapi reenvia o mesmo callback em caso de falha de entrega; precisamos
-- garantir que cada message_id seja processado apenas uma vez.
CREATE TABLE public.wa_processed (
  message_id text PRIMARY KEY,
  processed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_processed_processed_at
  ON public.wa_processed(processed_at DESC);

ALTER TABLE public.wa_processed ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ler. INSERT é feito pelo service_role no servidor (bypass RLS).
CREATE POLICY "admin le wa_processed"
ON public.wa_processed
FOR SELECT
TO authenticated
USING (public.current_role() = 'admin');