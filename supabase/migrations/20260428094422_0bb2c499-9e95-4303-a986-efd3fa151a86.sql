
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
    url := 'https://agrocheck-hub.lovable.app/api/public/morning-trigger?token=' || current_setting('app.webhook_secret', true),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $cmd$
);
