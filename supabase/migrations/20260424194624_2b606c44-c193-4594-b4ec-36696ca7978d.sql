-- Rename checklist item id=2 (order #5) from "Sistema hidraulico" to "Gracheiro Mancal"
UPDATE public.checklist_items
SET name = 'Gracheiro Mancal',
    description = 'Verificar pontos destacados'
WHERE id = 2;