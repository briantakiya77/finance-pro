create or replace function public.refresh_credit_card_invoice_status(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invoice public.credit_card_invoices;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_invoice
  from public.credit_card_invoices
  where id = p_invoice_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'invoice not found for current user' using errcode = '42501';
  end if;

  update public.credit_card_invoices
  set
    status = public.compute_credit_card_invoice_status(
      v_invoice.total_amount,
      v_invoice.paid_amount,
      v_invoice.closing_date
    ),
    paid_at =
      case
        when v_invoice.paid_amount >= v_invoice.total_amount and v_invoice.total_amount > 0
          then coalesce(v_invoice.paid_at, timezone('utc', now()))
        else null
      end
  where id = p_invoice_id
    and user_id = v_user_id;
end;
$$;

create or replace function public.ensure_credit_card_invoice(
  p_user_id uuid,
  p_credit_card_id uuid,
  p_reference_month date,
  p_closing_day smallint,
  p_due_day smallint
)
returns public.credit_card_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_card public.credit_cards;
  v_invoice public.credit_card_invoices;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_user_id is distinct from v_user_id then
    raise exception 'cannot create invoice for another user' using errcode = '42501';
  end if;

  select *
  into v_card
  from public.credit_cards
  where id = p_credit_card_id
    and user_id = v_user_id
    and is_active = true
    and deleted_at is null
  for update;

  if not found then
    raise exception 'credit card not found for current user' using errcode = '42501';
  end if;

  insert into public.credit_card_invoices (
    user_id,
    credit_card_id,
    reference_month,
    closing_date,
    due_date,
    status
  )
  values (
    v_user_id,
    v_card.id,
    p_reference_month,
    public.compute_credit_card_closing_date(p_reference_month, v_card.closing_day),
    public.compute_credit_card_due_date(p_reference_month, v_card.closing_day, v_card.due_day),
    public.compute_credit_card_invoice_status(
      0,
      0,
      public.compute_credit_card_closing_date(p_reference_month, v_card.closing_day)
    )
  )
  on conflict (credit_card_id, reference_month) do update
  set updated_at = timezone('utc', now())
  returning *
  into v_invoice;

  return v_invoice;
end;
$$;

create or replace function public.credit_card_utilized_amount(p_credit_card_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if not public.assert_credit_card_matches_user(v_user_id, p_credit_card_id) then
    raise exception 'credit card not found for current user' using errcode = '42501';
  end if;

  return (
    select coalesce(sum(greatest(i.total_amount - i.paid_amount, 0)), 0)
    from public.credit_card_invoices i
    where i.credit_card_id = p_credit_card_id
      and i.user_id = v_user_id
      and i.status <> 'paid'
  );
end;
$$;

revoke execute on function public.days_in_month(date) from public, anon, authenticated;
revoke execute on function public.make_safe_date(integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.compute_credit_card_reference_month(date, smallint) from public, anon, authenticated;
revoke execute on function public.compute_credit_card_closing_date(date, smallint) from public, anon, authenticated;
revoke execute on function public.compute_credit_card_due_date(date, smallint, smallint) from public, anon, authenticated;
revoke execute on function public.compute_credit_card_invoice_status(numeric, numeric, date) from public, anon, authenticated;
revoke execute on function public.refresh_credit_card_invoice_status(uuid) from public, anon, authenticated;
revoke execute on function public.ensure_credit_card_invoice(uuid, uuid, date, smallint, smallint) from public, anon, authenticated;
revoke execute on function public.credit_card_utilized_amount(uuid) from public, anon, authenticated;
revoke execute on function public.assert_credit_card_matches_user(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.assert_credit_card_invoice_matches_user(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.assert_credit_card_invoice_matches_card(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.create_credit_card_purchase(uuid, uuid, text, numeric, date, text, uuid) from public, anon;
revoke execute on function public.update_credit_card_purchase(uuid, uuid, uuid, text, numeric, date, text) from public, anon;
revoke execute on function public.soft_delete_credit_card_purchase(uuid) from public, anon;
revoke execute on function public.pay_credit_card_invoice(uuid, uuid, numeric, uuid) from public, anon;

grant execute on function public.create_credit_card_purchase(uuid, uuid, text, numeric, date, text, uuid) to authenticated;
grant execute on function public.update_credit_card_purchase(uuid, uuid, uuid, text, numeric, date, text) to authenticated;
grant execute on function public.soft_delete_credit_card_purchase(uuid) to authenticated;
grant execute on function public.pay_credit_card_invoice(uuid, uuid, numeric, uuid) to authenticated;
