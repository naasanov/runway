-- Runway: initial schema

create table businesses (
  id text primary key,
  name text not null,
  type text not null,
  owner_phone text not null,
  stripe_connected boolean default false,
  banking_connected boolean default false,
  current_balance numeric(12,2) default 0,
  runway_days integer,
  runway_severity text check (runway_severity in ('red', 'amber', 'green')),
  created_at timestamptz default now()
);

create table transactions (
  id text primary key,
  business_id text not null references businesses(id),
  source text not null check (source in ('stripe', 'banking', 'manual')),
  transaction_type text not null check (transaction_type in ('invoice', 'debit', 'credit')),
  invoice_status text check (invoice_status in ('paid', 'unpaid')),
  invoice_date date,
  customer_id text,
  amount numeric(12,2) not null,
  description text,
  category text check (category in (
    'revenue', 'payroll', 'rent', 'supplies', 'subscriptions',
    'insurance', 'taxes', 'one-time', 'unknown'
  )),
  date date not null,
  is_recurring boolean default false,
  recurrence_pattern text check (recurrence_pattern in ('weekly', 'biweekly', 'monthly', 'quarterly')),
  tags text[] default '{}',
  created_at timestamptz default now()
);

create table alerts (
  id text primary key,
  business_id text not null references businesses(id),
  scenario text not null check (scenario in (
    'runway', 'overdue_invoice', 'subscription_waste', 'revenue_concentration'
  )),
  severity text not null check (severity in ('red', 'amber', 'green')),
  headline text not null,
  detail text,
  recommended_actions jsonb default '[]',
  sms_sent boolean default false,
  sms_sent_at timestamptz,
  created_at timestamptz default now()
);

create table scenarios (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id),
  type text not null check (type in ('new_hire', 'price_increase', 'cut_expense', 'delay_payment')),
  params jsonb not null,
  result jsonb,
  created_at timestamptz default now()
);

-- indexes for common queries
create index idx_transactions_business on transactions(business_id);
create index idx_transactions_date on transactions(business_id, date);
create index idx_alerts_business on alerts(business_id);
create index idx_alerts_severity on alerts(business_id, severity);
