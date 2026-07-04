-- Supabase Migration Script for Gully Trader

-- ----------------------------------------------------
-- 1. Create Tables
-- ----------------------------------------------------

-- Profiles Table (Secured user profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- Strategies Table
create table if not exists public.strategies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- Strategy Rules Table
create table if not exists public.strategy_rules (
  id uuid default gen_random_uuid() primary key,
  strategy_id uuid references public.strategies on delete cascade not null,
  rule_text text not null,
  sort_order integer not null
);

-- Trades Table
create table if not exists public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  strategy_id uuid references public.strategies on delete set null,
  symbol text not null,
  direction text not null check (direction in ('BUY', 'SELL')),
  entry_price numeric not null,
  sl numeric not null,
  tp numeric not null,
  entry_datetime timestamptz not null default now(),
  exit_price numeric,
  exit_datetime timestamptz,
  pnl numeric,
  pnl_type text check (pnl_type in ('amount', 'percent', 'r_multiple')),
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  performed_as_expected boolean,
  followed_sl_tp_rules boolean,
  created_at timestamptz default now()
);

-- Trade Checklist Results Table
create table if not exists public.trade_checklist_results (
  id uuid default gen_random_uuid() primary key,
  trade_id uuid references public.trades on delete cascade not null,
  strategy_rule_id uuid references public.strategy_rules on delete cascade not null,
  checked boolean not null default false
);

-- Subscriptions Table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  plan text not null default 'trial' check (plan in ('trial', 'monthly', 'yearly', 'free')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  current_period_end timestamptz,
  payment_provider_id text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------
-- 2. Enable Row Level Security (RLS)
-- ----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.strategies enable row level security;
alter table public.strategy_rules enable row level security;
alter table public.trades enable row level security;
alter table public.trade_checklist_results enable row level security;
alter table public.subscriptions enable row level security;

-- ----------------------------------------------------
-- 3. RLS Policies
-- ----------------------------------------------------

-- Profiles Policies
create policy "Allow users to read their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Allow admins to read all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Allow admins to update profiles" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Strategies Policies
create policy "Allow users to manage their own strategies" on public.strategies
  for all using (auth.uid() = user_id);

-- Strategy Rules Policies (accessed through parent strategy ownership)
create policy "Allow users to manage rules for their strategies" on public.strategy_rules
  for all using (
    exists (
      select 1 from public.strategies
      where strategies.id = strategy_rules.strategy_id and strategies.user_id = auth.uid()
    )
  );

-- Trades Policies
create policy "Allow users to manage their own trades" on public.trades
  for all using (auth.uid() = user_id);

-- Trade Checklist Results Policies (accessed through parent trade ownership)
create policy "Allow users to manage checklist results" on public.trade_checklist_results
  for all using (
    exists (
      select 1 from public.trades
      where trades.id = trade_checklist_results.trade_id and trades.user_id = auth.uid()
    )
  );

-- Subscriptions Policies
create policy "Allow users to read their own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Allow admins to manage all subscriptions" on public.subscriptions
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------
-- 4. Triggers for Automatic Profile & Subscriptions
-- ----------------------------------------------------

-- Automated handler when a new user registers via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
  assigned_role text;
begin
  -- Check if this is the first user in profiles
  select not exists (select 1 from public.profiles) into is_first_user;
  
  if is_first_user then
    assigned_role := 'admin';
  else
    assigned_role := 'user';
  end if;

  -- Create profile row
  insert into public.profiles (id, email, role)
  values (new.id, new.email, assigned_role);

  -- Create default 14-day trial subscription
  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'trialing', now() + interval '14 days');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger wire up
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
