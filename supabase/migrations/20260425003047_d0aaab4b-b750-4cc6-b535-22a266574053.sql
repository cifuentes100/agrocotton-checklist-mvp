-- Garantir geração automática de id em checklist_items
DO $$
DECLARE
  max_id int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'checklist_items_id_seq') THEN
    CREATE SEQUENCE public.checklist_items_id_seq;
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM public.checklist_items;
    PERFORM setval('public.checklist_items_id_seq', GREATEST(max_id, 1));
    ALTER TABLE public.checklist_items
      ALTER COLUMN id SET DEFAULT nextval('public.checklist_items_id_seq');
    ALTER SEQUENCE public.checklist_items_id_seq OWNED BY public.checklist_items.id;
  END IF;
END $$;

-- Policy de INSERT: somente admin
DROP POLICY IF EXISTS "admin insere checklist_items" ON public.checklist_items;
CREATE POLICY "admin insere checklist_items"
ON public.checklist_items
FOR INSERT
TO authenticated
WITH CHECK (public.current_role() = 'admin');

-- RPC para criar item de forma atômica
CREATE OR REPLACE FUNCTION public.add_checklist_item(_name text, _description text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_order int;
  new_id int;
  trimmed_name text;
  trimmed_desc text;
BEGIN
  IF public.current_role() <> 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode adicionar itens do checklist';
  END IF;

  trimmed_name := btrim(coalesce(_name, ''));
  IF trimmed_name = '' THEN
    RAISE EXCEPTION 'O nome do item não pode ficar vazio';
  END IF;

  trimmed_desc := btrim(coalesce(_description, ''));
  IF trimmed_desc = '' THEN
    trimmed_desc := NULL;
  END IF;

  SELECT COALESCE(MAX(order_idx), 0) + 1 INTO next_order FROM public.checklist_items;

  INSERT INTO public.checklist_items (name, description, order_idx)
  VALUES (trimmed_name, trimmed_desc, next_order)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;