CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  body text,
  external_id text,
  raw_payload jsonb,
  status text NOT NULL DEFAULT 'received',
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_phone ON public.whatsapp_messages(phone);
CREATE INDEX idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin le whatsapp_messages"
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (public.current_role() = 'admin');