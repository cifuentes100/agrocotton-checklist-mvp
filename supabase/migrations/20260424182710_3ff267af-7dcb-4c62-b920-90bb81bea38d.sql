ALTER TABLE public.checklist_items DISABLE TRIGGER trg_checklist_items_immutable;

UPDATE public.checklist_items
SET name = 'Oleo do motor',
    description = 'Verificar nivel do oleo na vareta'
WHERE id = 1;

ALTER TABLE public.checklist_items ENABLE TRIGGER trg_checklist_items_immutable;