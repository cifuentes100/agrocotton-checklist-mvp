ALTER TABLE public.checklist_items DISABLE TRIGGER trg_checklist_items_immutable;

-- Move temporariamente para evitar conflito de unique
UPDATE public.checklist_items SET order_idx = -3 WHERE id = 2; -- Sistema hidraulico (era 3)
UPDATE public.checklist_items SET order_idx = -4 WHERE id = 3; -- Limpeza (era 4)

-- Aplica nova ordem
UPDATE public.checklist_items
  SET order_idx = 3,
      name = 'Limpeza e regulagem desfribador A',
      description = 'Inspecionar limpeza geral e regulagem desfribador'
  WHERE id = 3;

UPDATE public.checklist_items
  SET order_idx = 4
  WHERE id = 2;

ALTER TABLE public.checklist_items ENABLE TRIGGER trg_checklist_items_immutable;