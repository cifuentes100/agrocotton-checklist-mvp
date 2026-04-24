-- Inserir novo item #4 "Limpeza e regulagem desfribador B" e empurrar os existentes para baixo
ALTER TABLE public.checklist_items DISABLE TRIGGER trg_checklist_items_immutable;

-- Move temporariamente os itens 4..11 para indices negativos para evitar conflito de unique
UPDATE public.checklist_items SET order_idx = -order_idx WHERE order_idx BETWEEN 4 AND 11;

-- Reaplica deslocados +1 (de 4..11 vira 5..12)
UPDATE public.checklist_items SET order_idx = (-order_idx) + 1 WHERE order_idx BETWEEN -11 AND -4;

-- Insere novo item no slot 4
INSERT INTO public.checklist_items (id, order_idx, name, description)
VALUES (12, 4, 'Limpeza e regulagem desfribador B', 'Garantir alinhamento com vinco');

ALTER TABLE public.checklist_items ENABLE TRIGGER trg_checklist_items_immutable;