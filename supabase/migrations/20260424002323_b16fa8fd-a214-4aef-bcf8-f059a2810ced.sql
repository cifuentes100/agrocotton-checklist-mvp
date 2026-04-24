-- 1. Nova tabela machine_reference_photos
create table public.machine_reference_photos (
  machine_id uuid not null references public.machines(id) on delete cascade,
  item_id    int  not null references public.checklist_items(id),
  path       text not null,
  updated_at timestamptz not null default now(),
  primary key (machine_id, item_id)
);

alter table public.machine_reference_photos enable row level security;

create policy "autenticados leem fotos referencia"
  on public.machine_reference_photos
  for select
  using (auth.uid() is not null);

create policy "implantador admin inserem fotos referencia"
  on public.machine_reference_photos
  for insert
  with check (public.current_role() = any (array['implantador','admin']));

create policy "implantador admin atualizam fotos referencia"
  on public.machine_reference_photos
  for update
  using (public.current_role() = any (array['implantador','admin']));

create policy "implantador admin deletam fotos referencia"
  on public.machine_reference_photos
  for delete
  using (public.current_role() = any (array['implantador','admin']));

-- 2. Depreciar coluna antiga
comment on column public.checklist_items.reference_correct_path
  is 'DEPRECATED - use machine_reference_photos';

-- 3. Policy faltante: machines UPDATE para implantador/admin
create policy "implantador admin atualizam machines"
  on public.machines
  for update
  using (public.current_role() = any (array['implantador','admin']));

-- 4. Policy faltante: checklist_items SELECT para autenticados
alter table public.checklist_items enable row level security;

create policy "autenticados leem checklist_items"
  on public.checklist_items
  for select
  using (auth.uid() is not null);

-- 5. Storage policies para bucket reference-photos
create policy "implantador admin inserem reference-photos"
  on storage.objects
  for insert
  with check (
    bucket_id = 'reference-photos'
    and public.current_role() = any (array['implantador','admin'])
  );

create policy "implantador admin atualizam reference-photos"
  on storage.objects
  for update
  using (
    bucket_id = 'reference-photos'
    and public.current_role() = any (array['implantador','admin'])
  );

create policy "implantador admin deletam reference-photos"
  on storage.objects
  for delete
  using (
    bucket_id = 'reference-photos'
    and public.current_role() = any (array['implantador','admin'])
  );

create policy "implantador admin mecanico leem reference-photos"
  on storage.objects
  for select
  using (
    bucket_id = 'reference-photos'
    and public.current_role() = any (array['implantador','admin','mecanico'])
  );