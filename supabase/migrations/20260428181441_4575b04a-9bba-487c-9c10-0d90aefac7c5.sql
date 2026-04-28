-- 1. Adiciona coluna active na tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 2. Desativa Esposa e desliga bom-dia dela
UPDATE public.users
   SET active = false, morning_enabled = false
 WHERE id = '803d40a8-e0b8-4ace-a3ac-8b41ea41c7d4';

-- 3. Cancela qualquer run em andamento da Esposa (segurança)
UPDATE public.checklist_runs
   SET status = 'cancelled', finished_at = now()
 WHERE operator_id = '803d40a8-e0b8-4ace-a3ac-8b41ea41c7d4'
   AND status = 'in_progress';

-- 4. Redefine admin_list_users para incluir `active`
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, name text, phone text, role text, morning_time time without time zone, morning_enabled boolean, active boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public._validate_admin();
  RETURN QUERY
    SELECT u.id, u.name, u.phone, u.role, u.morning_time, u.morning_enabled, u.active, u.created_at
    FROM public.users u
    ORDER BY u.active DESC, u.role, u.name;
END;
$function$;

-- 5. Redefine admin_create_user para aceitar _active
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, time without time zone, boolean);
CREATE OR REPLACE FUNCTION public.admin_create_user(
  _name text,
  _phone text,
  _role text,
  _morning_time time without time zone DEFAULT '05:30:00'::time without time zone,
  _morning_enabled boolean DEFAULT true,
  _active boolean DEFAULT true
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.users (name, phone, role, morning_time, morning_enabled, active)
  VALUES (trimmed_name, norm_phone, _role, _morning_time, _morning_enabled, _active)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

-- 6. Redefine admin_update_user para aceitar _active
DROP FUNCTION IF EXISTS public.admin_update_user(uuid, text, text, text, time without time zone, boolean);
CREATE OR REPLACE FUNCTION public.admin_update_user(
  _id uuid,
  _name text,
  _phone text,
  _role text,
  _morning_time time without time zone,
  _morning_enabled boolean,
  _active boolean
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         morning_enabled = _morning_enabled,
         active = _active
   WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário % não encontrado', _id;
  END IF;
END;
$function$;