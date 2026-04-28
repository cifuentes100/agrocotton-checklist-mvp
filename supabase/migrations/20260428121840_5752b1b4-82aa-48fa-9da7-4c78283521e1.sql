UPDATE auth.users
SET encrypted_password = crypt('Mecanico@2026', gen_salt('bf')),
    updated_at = now()
WHERE email = 'mecanico@agrocotton.com';