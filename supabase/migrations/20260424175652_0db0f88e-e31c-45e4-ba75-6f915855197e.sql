-- Inserir Cool Gard como novo item #1 do checklist
-- Estratégia: mover existentes para valores negativos temporários (sem colidir com UNIQUE),
-- depois remapear para os valores definitivos +1, e por fim inserir o novo item.

alter table public.checklist_items disable trigger trg_checklist_items_immutable;

-- Etapa 1: deslocar para -1..-10 (espaço seguro)
update public.checklist_items
set order_idx = -order_idx
where order_idx between 1 and 10;

-- Etapa 2: remapear de -X para (X+1) (assim 1→2, 2→3, ..., 10→11)
update public.checklist_items
set order_idx = (-order_idx) + 1
where order_idx between -10 and -1;

-- Etapa 3: inserir o novo item Cool Gard como #1
insert into public.checklist_items (id, order_idx, name, description, reference_correct_path)
values (
  11,
  1,
  'Cool Gard (Agua do motor tratada)',
  'Verificar nivel do Cool Gard no reservatorio do motor',
  null
);

alter table public.checklist_items enable trigger trg_checklist_items_immutable;