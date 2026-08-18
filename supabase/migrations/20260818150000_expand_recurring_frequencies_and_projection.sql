alter type public.recurring_transaction_frequency add value if not exists 'weekly';
alter type public.recurring_transaction_frequency add value if not exists 'yearly';

create or replace function public.recurring_period_floor(
  p_date date,
  p_frequency public.recurring_transaction_frequency
)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when p_frequency = 'weekly' then date_trunc('week', p_date)::date
    when p_frequency = 'yearly' then make_date(extract(year from p_date)::integer, 1, 1)
    else date_trunc('month', p_date)::date
  end;
$$;

create or replace function public.advance_recurring_period(
  p_reference_period date,
  p_frequency public.recurring_transaction_frequency,
  p_step integer default 1
)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when p_frequency = 'weekly' then (p_reference_period + (p_step || ' week')::interval)::date
    when p_frequency = 'yearly' then (p_reference_period + (p_step || ' year')::interval)::date
    else (p_reference_period + (p_step || ' month')::interval)::date
  end;
$$;

create or replace function public.compute_recurring_scheduled_date(
  p_reference_period date,
  p_frequency public.recurring_transaction_frequency,
  p_day_of_month smallint,
  p_start_date date
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_reference_period date := public.recurring_period_floor(p_reference_period, p_frequency);
  v_iso_weekday integer := extract(isodow from p_start_date)::integer;
begin
  if p_frequency = 'weekly' then
    return (v_reference_period + (v_iso_weekday - 1))::date;
  end if;

  if p_frequency = 'yearly' then
    return public.make_safe_date(
      extract(year from v_reference_period)::integer,
      extract(month from p_start_date)::integer,
      p_day_of_month
    );
  end if;

  return public.make_safe_date(
    extract(year from v_reference_period)::integer,
    extract(month from v_reference_period)::integer,
    p_day_of_month
  );
end;
$$;

create or replace function public.list_recurring_commitment_window(
  p_from_date date,
  p_to_date date
)
returns table (
  recurring_transaction_id uuid,
  due_date date,
  type public.financial_entry_type,
  description text,
  amount numeric,
  frequency public.recurring_transaction_frequency,
  account_name text,
  category_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
  v_reference_period date;
  v_last_reference_period date;
  v_window_end_period date;
  v_scheduled_date date;
  v_safety_counter integer;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_to_date < p_from_date then
    return;
  end if;

  for v_recurring in
    select rt.*
    from public.recurring_transactions rt
    where rt.user_id = v_user_id
      and rt.status = 'active'
      and rt.deleted_at is null
    order by rt.created_at asc
  loop
    v_reference_period := public.recurring_period_floor(greatest(p_from_date, v_recurring.start_date), v_recurring.frequency);
    v_last_reference_period := public.recurring_period_floor(coalesce(v_recurring.end_date, p_to_date), v_recurring.frequency);
    v_window_end_period := public.recurring_period_floor(p_to_date, v_recurring.frequency);
    v_safety_counter := 0;

    while v_reference_period <= least(v_last_reference_period, v_window_end_period) loop
      v_scheduled_date := public.compute_recurring_scheduled_date(
        v_reference_period,
        v_recurring.frequency,
        v_recurring.day_of_month,
        v_recurring.start_date
      );

      if v_scheduled_date >= p_from_date
        and v_scheduled_date <= p_to_date
        and v_scheduled_date >= v_recurring.start_date
        and (v_recurring.end_date is null or v_scheduled_date <= v_recurring.end_date) then
        recurring_transaction_id := v_recurring.id;
        due_date := v_scheduled_date;
        type := v_recurring.type;
        description := v_recurring.description;
        amount := v_recurring.amount;
        frequency := v_recurring.frequency;
        account_name := null;
        category_name := null;

        select a.name
        into account_name
        from public.accounts a
        where a.id = v_recurring.account_id
          and a.user_id = v_user_id;

        select c.name
        into category_name
        from public.categories c
        where c.id = v_recurring.category_id
          and c.user_id = v_user_id;

        return next;
      end if;

      v_reference_period := public.advance_recurring_period(v_reference_period, v_recurring.frequency, 1);
      v_safety_counter := v_safety_counter + 1;

      if v_safety_counter > 400 then
        raise exception 'recurring schedule expansion exceeded safety limit' using errcode = '54001';
      end if;
    end loop;
  end loop;
end;
$$;

drop function if exists public.create_recurring_transaction(
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  smallint,
  date,
  date,
  text
);

create or replace function public.create_recurring_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_type public.financial_entry_type,
  p_description text,
  p_amount numeric,
  p_frequency public.recurring_transaction_frequency,
  p_day_of_month smallint,
  p_start_date date,
  p_end_date date,
  p_notes text
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_day_of_month < 1 or p_day_of_month > 31 then
    raise exception 'day of month must be between 1 and 31' using errcode = '23514';
  end if;

  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'end date must be equal or after start date' using errcode = '23514';
  end if;

  if not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, p_type) then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  insert into public.recurring_transactions (
    user_id,
    account_id,
    category_id,
    type,
    description,
    amount,
    frequency,
    day_of_month,
    start_date,
    end_date,
    notes
  )
  values (
    v_user_id,
    p_account_id,
    p_category_id,
    p_type,
    trim(p_description),
    p_amount,
    p_frequency,
    p_day_of_month,
    p_start_date,
    p_end_date,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning *
  into v_recurring;

  return v_recurring;
end;
$$;

drop function if exists public.update_recurring_transaction(
  uuid,
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  smallint,
  date,
  date,
  text
);

create or replace function public.update_recurring_transaction(
  p_recurring_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_type public.financial_entry_type,
  p_description text,
  p_amount numeric,
  p_frequency public.recurring_transaction_frequency,
  p_day_of_month smallint,
  p_start_date date,
  p_end_date date,
  p_notes text
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
  v_frequency_reset_floor date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_day_of_month < 1 or p_day_of_month > 31 then
    raise exception 'day of month must be between 1 and 31' using errcode = '23514';
  end if;

  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'end date must be equal or after start date' using errcode = '23514';
  end if;

  select *
  into v_recurring
  from public.recurring_transactions
  where id = p_recurring_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'recurring transaction not found for current user' using errcode = '42501';
  end if;

  if v_recurring.status = 'cancelled' then
    raise exception 'cancelled recurring transaction cannot be updated' using errcode = '23514';
  end if;

  if not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, p_type) then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  v_frequency_reset_floor := public.advance_recurring_period(
    public.recurring_period_floor(current_date, p_frequency),
    p_frequency,
    -1
  );

  update public.recurring_transactions
  set
    account_id = p_account_id,
    category_id = p_category_id,
    type = p_type,
    description = trim(p_description),
    amount = p_amount,
    frequency = p_frequency,
    day_of_month = p_day_of_month,
    start_date = p_start_date,
    end_date = p_end_date,
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    last_generated_period =
      case
        when p_frequency <> v_recurring.frequency then v_frequency_reset_floor
        else last_generated_period
      end
  where id = p_recurring_transaction_id
  returning *
  into v_recurring;

  return v_recurring;
end;
$$;

create or replace function public.resume_recurring_transaction(
  p_recurring_transaction_id uuid
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
  v_current_period date;
  v_resume_floor date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_recurring
  from public.recurring_transactions
  where id = p_recurring_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'recurring transaction not found for current user' using errcode = '42501';
  end if;

  if v_recurring.status = 'cancelled' then
    raise exception 'cancelled recurring transaction cannot be resumed' using errcode = '23514';
  end if;

  v_current_period := public.recurring_period_floor(current_date, v_recurring.frequency);
  v_resume_floor :=
    case
      when public.compute_recurring_scheduled_date(
        v_current_period,
        v_recurring.frequency,
        v_recurring.day_of_month,
        v_recurring.start_date
      ) <= current_date
        then v_current_period
      else public.advance_recurring_period(v_current_period, v_recurring.frequency, -1)
    end;

  update public.recurring_transactions
  set
    status = 'active',
    last_generated_period =
      greatest(
        coalesce(
          last_generated_period,
          public.advance_recurring_period(
            public.recurring_period_floor(start_date, frequency),
            frequency,
            -1
          )
        ),
        v_resume_floor
      )
  where id = p_recurring_transaction_id
  returning *
  into v_recurring;

  return v_recurring;
end;
$$;

create or replace function public.generate_due_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
  v_reference_period date;
  v_last_generated_period date;
  v_current_period date;
  v_scheduled_date date;
  v_transaction public.transactions;
  v_occurrence_id uuid;
  v_generated_count integer := 0;
  v_safety_counter integer;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  for v_recurring in
    select *
    from public.recurring_transactions
    where user_id = v_user_id
      and status = 'active'
      and deleted_at is null
    order by created_at asc
  loop
    v_current_period := public.recurring_period_floor(current_date, v_recurring.frequency);
    v_last_generated_period :=
      coalesce(
        v_recurring.last_generated_period,
        public.advance_recurring_period(
          public.recurring_period_floor(v_recurring.start_date, v_recurring.frequency),
          v_recurring.frequency,
          -1
        )
      );
    v_reference_period := public.advance_recurring_period(
      v_last_generated_period,
      v_recurring.frequency,
      1
    );
    v_safety_counter := 0;

    while v_reference_period <= v_current_period loop
      v_scheduled_date := public.compute_recurring_scheduled_date(
        v_reference_period,
        v_recurring.frequency,
        v_recurring.day_of_month,
        v_recurring.start_date
      );

      if v_scheduled_date < v_recurring.start_date then
        v_reference_period := public.advance_recurring_period(v_reference_period, v_recurring.frequency, 1);
        continue;
      end if;

      if v_recurring.end_date is not null and v_scheduled_date > v_recurring.end_date then
        exit;
      end if;

      if v_scheduled_date > current_date then
        exit;
      end if;

      v_transaction := public.create_recurring_generated_transaction(
        v_user_id,
        v_recurring.id,
        v_reference_period,
        v_recurring.account_id,
        v_recurring.category_id,
        v_recurring.type,
        v_recurring.description,
        v_recurring.amount,
        v_scheduled_date,
        v_recurring.notes
      );

      insert into public.recurring_transaction_occurrences (
        user_id,
        recurring_transaction_id,
        transaction_id,
        reference_period,
        scheduled_date
      )
      values (
        v_user_id,
        v_recurring.id,
        v_transaction.id,
        v_reference_period,
        v_scheduled_date
      )
      on conflict (recurring_transaction_id, reference_period) do nothing
      returning id
      into v_occurrence_id;

      if v_occurrence_id is not null then
        v_generated_count := v_generated_count + 1;
      end if;

      update public.recurring_transactions
      set last_generated_period = v_reference_period
      where id = v_recurring.id
        and (last_generated_period is null or last_generated_period < v_reference_period);

      v_reference_period := public.advance_recurring_period(v_reference_period, v_recurring.frequency, 1);
      v_occurrence_id := null;
      v_safety_counter := v_safety_counter + 1;

      if v_safety_counter > 400 then
        raise exception 'recurring generation exceeded safety limit' using errcode = '54001';
      end if;
    end loop;
  end loop;

  return v_generated_count;
end;
$$;

create or replace function public.get_financial_projection(
  p_horizon_months integer default 3
)
returns table (
  reference_month date,
  opening_balance numeric,
  projected_income numeric,
  projected_expense numeric,
  projected_invoice_payment numeric,
  closing_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_current_balance numeric(14, 2);
  v_horizon integer := greatest(1, least(coalesce(p_horizon_months, 3), 6));
  v_current_month date := date_trunc('month', current_date)::date;
  v_projection_end date :=
    (public.add_months_to_period(v_current_month, v_horizon) + interval '1 month - 1 day')::date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select coalesce(sum(a.current_balance), 0)::numeric(14, 2)
  into v_current_balance
  from public.accounts a
  where a.user_id = v_user_id
    and a.is_active = true
    and a.deleted_at is null;

  return query
  with months as (
    select
      public.add_months_to_period(v_current_month, month_index) as reference_month,
      month_index
    from generate_series(0, v_horizon - 1) as month_offsets(month_index)
  ),
  recurring_projection as (
    select
      date_trunc('month', rcw.due_date)::date as reference_month,
      coalesce(sum(case when rcw.type = 'income' then rcw.amount else 0 end), 0)::numeric(14, 2) as projected_income,
      coalesce(sum(case when rcw.type = 'expense' then rcw.amount else 0 end), 0)::numeric(14, 2) as projected_expense
    from public.list_recurring_commitment_window((current_date + 1), v_projection_end) rcw
    group by date_trunc('month', rcw.due_date)::date
  ),
  invoice_projection as (
    select
      date_trunc('month', i.due_date)::date as reference_month,
      coalesce(sum(greatest(i.total_amount - i.paid_amount, 0)), 0)::numeric(14, 2) as projected_invoice_payment
    from public.credit_card_invoices i
    where i.user_id = v_user_id
      and i.due_date > current_date
      and i.due_date <= v_projection_end
      and greatest(i.total_amount - i.paid_amount, 0) > 0
    group by date_trunc('month', i.due_date)::date
  ),
  monthly_net as (
    select
      m.reference_month,
      coalesce(rp.projected_income, 0)::numeric(14, 2) as projected_income,
      coalesce(rp.projected_expense, 0)::numeric(14, 2) as projected_expense,
      coalesce(ip.projected_invoice_payment, 0)::numeric(14, 2) as projected_invoice_payment,
      (
        coalesce(rp.projected_income, 0)
        - coalesce(rp.projected_expense, 0)
        - coalesce(ip.projected_invoice_payment, 0)
      )::numeric(14, 2) as net_change
    from months m
    left join recurring_projection rp on rp.reference_month = m.reference_month
    left join invoice_projection ip on ip.reference_month = m.reference_month
  )
  select
    mn.reference_month,
    (
      v_current_balance
      + coalesce(
        sum(mn.net_change) over (
          order by mn.reference_month
          rows between unbounded preceding and 1 preceding
        ),
        0
      )
    )::numeric(14, 2) as opening_balance,
    mn.projected_income,
    mn.projected_expense,
    mn.projected_invoice_payment,
    (
      v_current_balance
      + sum(mn.net_change) over (
        order by mn.reference_month
        rows between unbounded preceding and current row
      )
    )::numeric(14, 2) as closing_balance
  from monthly_net mn
  order by mn.reference_month asc;
end;
$$;

create or replace function public.get_upcoming_commitments(
  p_horizon_days integer default 45
)
returns table (
  kind text,
  source_id uuid,
  due_date date,
  title text,
  amount numeric,
  detail text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_horizon_days integer := greatest(1, least(coalesce(p_horizon_days, 45), 120));
  v_horizon_end date := current_date + v_horizon_days;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  return query
  with recurring_commitments as (
    select
      'recurring'::text as kind,
      rcw.recurring_transaction_id as source_id,
      rcw.due_date,
      rcw.description as title,
      rcw.amount::numeric(14, 2) as amount,
      (
        case
          when rcw.type = 'income' then 'Previsto • Receita recorrente'
          else 'Previsto • Despesa recorrente'
        end
        || ' • '
        || case
          when rcw.frequency = 'weekly' then 'Semanal'
          when rcw.frequency = 'yearly' then 'Anual'
          else 'Mensal'
        end
        || coalesce(' • Conta ' || rcw.account_name, '')
        || coalesce(' • Categoria ' || rcw.category_name, '')
      )::text as detail
    from public.list_recurring_commitment_window((current_date + 1), v_horizon_end) rcw
  ),
  invoice_commitments as (
    select
      'invoice'::text as kind,
      i.id as source_id,
      i.due_date,
      cc.name as title,
      greatest(i.total_amount - i.paid_amount, 0)::numeric(14, 2) as amount,
      'Previsto • Fatura de cartao'::text as detail
    from public.credit_card_invoices i
    join public.credit_cards cc on cc.id = i.credit_card_id
    where i.user_id = v_user_id
      and i.due_date > current_date
      and i.due_date <= v_horizon_end
      and greatest(i.total_amount - i.paid_amount, 0) > 0
  ),
  installment_commitments as (
    select
      'installment'::text as kind,
      ct.id as source_id,
      ct.purchase_date as due_date,
      ct.description as title,
      ct.amount::numeric(14, 2) as amount,
      ('Previsto • Parcela ' || ct.installment_number::text || '/' || ct.installment_count::text)::text as detail
    from public.credit_card_transactions ct
    where ct.user_id = v_user_id
      and ct.installment_plan_id is not null
      and ct.deleted_at is null
      and ct.purchase_date > current_date
      and ct.purchase_date <= v_horizon_end
  ),
  goal_commitments as (
    select
      'goal'::text as kind,
      fg.id as source_id,
      fg.target_date as due_date,
      fg.name as title,
      greatest(fg.target_amount - fg.current_amount, 0)::numeric(14, 2) as amount,
      'Previsto • Meta financeira'::text as detail
    from public.financial_goals fg
    where fg.user_id = v_user_id
      and fg.deleted_at is null
      and fg.status = 'active'
      and fg.target_date is not null
      and fg.target_date > current_date
      and fg.target_date <= v_horizon_end
  )
  select *
  from (
    select * from recurring_commitments
    union all
    select * from invoice_commitments
    union all
    select * from installment_commitments
    union all
    select * from goal_commitments
  ) commitments
  order by due_date asc, title asc
  limit 20;
end;
$$;

grant execute on function public.create_recurring_transaction(
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  public.recurring_transaction_frequency,
  smallint,
  date,
  date,
  text
) to authenticated;

grant execute on function public.update_recurring_transaction(
  uuid,
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  public.recurring_transaction_frequency,
  smallint,
  date,
  date,
  text
) to authenticated;

revoke execute on function public.recurring_period_floor(date, public.recurring_transaction_frequency) from public, anon, authenticated;
revoke execute on function public.advance_recurring_period(date, public.recurring_transaction_frequency, integer) from public, anon, authenticated;
revoke execute on function public.compute_recurring_scheduled_date(date, public.recurring_transaction_frequency, smallint, date) from public, anon, authenticated;
revoke execute on function public.list_recurring_commitment_window(date, date) from public, anon, authenticated;
