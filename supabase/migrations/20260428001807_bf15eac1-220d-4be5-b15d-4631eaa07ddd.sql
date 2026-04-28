-- Aceitar 'cancelled' como status válido em checklist_runs
ALTER TABLE public.checklist_runs DROP CONSTRAINT IF EXISTS checklist_runs_status_check;
ALTER TABLE public.checklist_runs ADD CONSTRAINT checklist_runs_status_check
  CHECK (status = ANY (ARRAY['in_progress','completed','cancelled']));