-- Remover trigger de imutabilidade do order_idx (descoberto: nome real é trg_checklist_items_immutable)
DROP TRIGGER IF EXISTS trg_checklist_items_immutable ON public.checklist_items;
DROP FUNCTION IF EXISTS public.prevent_order_idx_change() CASCADE;

-- Policy de UPDATE só para admin
DROP POLICY IF EXISTS "admin atualiza checklist_items" ON public.checklist_items;
CREATE POLICY "admin atualiza checklist_items"
  ON public.checklist_items
  FOR UPDATE
  TO authenticated
  USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

-- RPC atômica para mover item para cima/baixo
CREATE OR REPLACE FUNCTION public.move_checklist_item(_item_id integer, _direction text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_order int;
  neighbor_id int;
  neighbor_order int;
BEGIN
  IF public.current_role() <> 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode reordenar itens do checklist';
  END IF;

  IF _direction NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'direction deve ser up ou down';
  END IF;

  SELECT order_idx INTO current_order
    FROM public.checklist_items
   WHERE id = _item_id;

  IF current_order IS NULL THEN
    RAISE EXCEPTION 'Item % não encontrado', _item_id;
  END IF;

  IF _direction = 'up' THEN
    SELECT id, order_idx INTO neighbor_id, neighbor_order
      FROM public.checklist_items
     WHERE order_idx < current_order
     ORDER BY order_idx DESC
     LIMIT 1;
  ELSE
    SELECT id, order_idx INTO neighbor_id, neighbor_order
      FROM public.checklist_items
     WHERE order_idx > current_order
     ORDER BY order_idx ASC
     LIMIT 1;
  END IF;

  IF neighbor_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.checklist_items SET order_idx = -1 WHERE id = _item_id;
  UPDATE public.checklist_items SET order_idx = current_order WHERE id = neighbor_id;
  UPDATE public.checklist_items SET order_idx = neighbor_order WHERE id = _item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_checklist_item(integer, text) TO authenticated;