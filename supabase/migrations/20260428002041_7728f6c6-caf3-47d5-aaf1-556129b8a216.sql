-- Limpa o run de teste anterior pra destravar novo teste imediato
UPDATE public.checklist_runs
SET status = 'cancelled'
WHERE id = '421015cb-f1ce-471c-af02-3da3aca9bd49';