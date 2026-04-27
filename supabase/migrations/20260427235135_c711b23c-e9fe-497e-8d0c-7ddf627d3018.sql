alter table public.item_responses drop constraint item_responses_status_check;
alter table public.item_responses add constraint item_responses_status_check
  check (status = any (array['ok','nok','observar']));

alter table public.item_responses drop constraint item_responses_validation_status_check;
alter table public.item_responses add constraint item_responses_validation_status_check
  check (validation_status is null or validation_status = any (array['approved','rejected','pending_photo']));