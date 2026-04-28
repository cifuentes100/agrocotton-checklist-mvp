
-- Schema changes em users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS morning_time time NOT NULL DEFAULT '05:30',
  ADD COLUMN IF NOT EXISTS morning_enabled boolean NOT NULL DEFAULT true;

-- Tabela de anti-duplicata
CREATE TABLE IF NOT EXISTS public.morning_dispatches (
  user_id uuid NOT NULL,
  dispatched_on date NOT NULL,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dispatched_on)
);

ALTER TABLE public.morning_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin le morning_dispatches" ON public.morning_dispatches;
CREATE POLICY "admin le morning_dispatches" ON public.morning_dispatches
  FOR SELECT TO authenticated
  USING (public.current_role() = 'admin');

-- Helper de validação
CREATE OR REPLACE FUNCTION public._validate_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_role() <> 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode executar esta operação';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._normalize_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  IF digits = '' THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;
  RETURN '+' || digits;
END;
$$;

-- LIST
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  role text,
  morning_time time,
  morning_enabled boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._validate_admin();
  RETURN QUERY
    SELECT u.id, u.name, u.phone, u.role, u.morning_time, u.morning_enabled, u.created_at
    FROM public.users u
    ORDER BY u.role, u.name;
END;
$$;

-- CREATE
CREATE OR REPLACE FUNCTION public.admin_create_user(
  _name text,
  _phone text,
  _role text,
  _morning_time time DEFAULT '05:30',
  _morning_enabled boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  trimmed_name text;
  norm_phone text;
BEGIN
  PERFORM public._validate_admin();

  trimmed_name := btrim(coalesce(_name, ''));
  IF trimmed_name = '' THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF _role NOT IN ('operador', 'mecanico', 'implantador', 'admin') THEN
    RAISE EXCEPTION 'Papel inválido: %', _role;
  END IF;

  norm_phone := public._normalize_phone(_phone);

  INSERT INTO public.users (name, phone, role, morning_time, morning_enabled)
  VALUES (trimmed_name, norm_phone, _role, _morning_time, _morning_enabled)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- UPDATE
CREATE OR REPLACE FUNCTION public.admin_update_user(
  _id uuid,
  _name text,
  _phone text,
  _role text,
  _morning_time time,
  _morning_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trimmed_name text;
  norm_phone text;
BEGIN
  PERFORM public._validate_admin();

  trimmed_name := btrim(coalesce(_name, ''));
  IF trimmed_name = '' THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF _role NOT IN ('operador', 'mecanico', 'implantador', 'admin') THEN
    RAISE EXCEPTION 'Papel inválido: %', _role;
  END IF;

  norm_phone := public._normalize_phone(_phone);

  UPDATE public.users
     SET name = trimmed_name,
         phone = norm_phone,
         role = _role,
         morning_time = _morning_time,
         morning_enabled = _morning_enabled
   WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário % não encontrado', _id;
  END IF;
END;
$$;

-- DELETE
CREATE OR REPLACE FUNCTION public.admin_delete_user(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._validate_admin();

  IF _id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir seu próprio usuário';
  END IF;

  DELETE FROM public.users WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário % não encontrado', _id;
  END IF;
END;
$$;
