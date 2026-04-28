
-- Garantir search_path em _normalize_phone (estava como IMMUTABLE sem search_path)
CREATE OR REPLACE FUNCTION public._normalize_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

-- Revogar EXECUTE do público/anon nas funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public._validate_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, time, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text, time, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, time, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text, time, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
