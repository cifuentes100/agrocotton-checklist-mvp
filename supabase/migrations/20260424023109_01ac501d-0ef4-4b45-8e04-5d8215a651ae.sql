-- ADR-010: View pública de usuários (sem telefone) para proteger PII
CREATE OR REPLACE VIEW public.user_public_info AS
  SELECT id, name, role FROM public.users;

ALTER VIEW public.user_public_info SET (security_invoker = false);

GRANT SELECT ON public.user_public_info TO authenticated, anon;

-- SELECT em item_responses para mecânico e admin (fila de validação)
CREATE POLICY "mecanico admin leem respostas"
  ON public.item_responses FOR SELECT
  USING (public.current_role() IN ('mecanico','admin'));

-- SELECT em checklist-photos para mecânico e admin (visualizar foto do operador)
CREATE POLICY "mecanico admin leem checklist-photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'checklist-photos'
    AND public.current_role() IN ('mecanico','admin')
  );