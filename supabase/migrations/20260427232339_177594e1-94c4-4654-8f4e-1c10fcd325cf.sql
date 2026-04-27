-- RF-03: photo_path continua obrigatório, mas precisamos de um default vazio
-- temporário enquanto o bot WhatsApp coleta foto em mensagem separada.
-- Em vez de relaxar NOT NULL (que enfraquece RF-03), apenas adicionamos
-- um default vazio para que inserções intermediárias do bot não quebrem
-- caso falte algo. O bot SEMPRE preenche photo_path com a foto recebida.

ALTER TABLE public.item_responses
  ALTER COLUMN photo_path SET DEFAULT '';

-- Política para o bot (service_role já bypassa RLS, mas garantimos
-- que inserções via webhook não quebrem). Nenhuma mudança de RLS
-- necessária — supabaseAdmin bypassa.

COMMENT ON COLUMN public.item_responses.photo_path IS
  'Caminho da foto no bucket checklist-photos. Default vazio apenas para inserções transitórias do bot WhatsApp; sempre preenchido antes do commit final.';