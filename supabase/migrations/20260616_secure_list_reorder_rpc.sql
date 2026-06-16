-- update_list_items_order was SECURITY DEFINER with no ownership check,
-- and was granted to anon/authenticated — any caller could reorder any
-- user's list. Re-create it so it only ever touches items on lists the
-- caller owns.
create or replace function public.update_list_items_order(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item_record jsonb;
begin
  for item_record in select * from jsonb_array_elements(payload) loop
    update public.user_list_items uli
       set rank_order = (item_record->>'rank_order')::int
     where uli.id = (item_record->>'id')::uuid
       and exists (
         select 1 from public.user_lists ul
         where ul.id = uli.list_id
           and ul.user_id = auth.uid()
       );
  end loop;
end;
$$;
