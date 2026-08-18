create or replace function public.pay_credit_card_invoice(
  p_invoice_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_paid_at date,
  p_client_mutation_id uuid
)
returns public.credit_card_invoice_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invoice public.credit_card_invoices;
  v_payment public.credit_card_invoice_payments;
  v_outstanding_amount numeric(14, 2);
  v_plan_id uuid;
  v_paid_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  v_paid_at := timezone('utc', p_paid_at::timestamp);

  select *
  into v_invoice
  from public.credit_card_invoices
  where id = p_invoice_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'invoice not found for current user' using errcode = '42501';
  end if;

  if not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  v_outstanding_amount := v_invoice.total_amount - v_invoice.paid_amount;
  if p_amount > v_outstanding_amount then
    raise exception 'invoice payment exceeds outstanding amount' using errcode = '23514';
  end if;

  insert into public.credit_card_invoice_payments (
    user_id,
    invoice_id,
    account_id,
    amount,
    paid_at,
    client_mutation_id
  )
  values (
    v_user_id,
    p_invoice_id,
    p_account_id,
    p_amount,
    v_paid_at,
    p_client_mutation_id
  )
  on conflict (user_id, client_mutation_id) do nothing
  returning *
  into v_payment;

  if v_payment.id is null then
    select *
    into v_payment
    from public.credit_card_invoice_payments
    where user_id = v_user_id
      and client_mutation_id = p_client_mutation_id;

    return v_payment;
  end if;

  perform set_config('app.finance_allow_balance_update', 'on', true);

  update public.accounts
  set current_balance = current_balance - p_amount
  where id = p_account_id
    and user_id = v_user_id;

  update public.credit_card_invoices
  set
    paid_amount = paid_amount + p_amount,
    paid_at =
      case
        when paid_amount + p_amount >= total_amount then v_paid_at
        else null
      end
  where id = p_invoice_id;

  perform public.refresh_credit_card_invoice_status(p_invoice_id);

  for v_plan_id in
    select distinct installment_plan_id
    from public.credit_card_transactions
    where invoice_id = p_invoice_id
      and installment_plan_id is not null
      and deleted_at is null
  loop
    perform public.refresh_credit_card_installment_plan_status(v_plan_id);
  end loop;

  return v_payment;
end;
$$;

revoke execute on function public.pay_credit_card_invoice(uuid, uuid, numeric, uuid) from authenticated;
grant execute on function public.pay_credit_card_invoice(uuid, uuid, numeric, date, uuid) to authenticated;
