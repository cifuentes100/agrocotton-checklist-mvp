
-- Tabela mínima para configurações internas (chave/valor), só admin lê
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads app_config" ON public.app_config;
CREATE POLICY "admin reads app_config" ON public.app_config
  FOR SELECT TO authenticated USING (public.current_role() = 'admin');

-- Reagendar o cron lendo o token de app_config (subquery direta)
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'morning-checklist-trigger';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END
$$;

SELECT cron.schedule(
  'morning-checklist-trigger',
  '* * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://agrocheck-hub.lovable.app/api/public/morning-trigger?token=' ||
           (SELECT value FROM public.app_config WHERE key = 'webhook_secret'),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.app_config WHERE key = 'webhook_secret');
  $cmd$
);
