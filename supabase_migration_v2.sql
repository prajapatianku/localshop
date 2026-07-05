-- Migration Update v2: Multi-Leg Trade Model

-- 1. Create Trade Legs table
create table if not exists public.trade_legs (
  id uuid default gen_random_uuid() primary key,
  trade_id uuid references public.trades on delete cascade not null,
  action text not null check (action in ('BUY', 'SELL')),
  option_type text not null check (option_type in ('CALL', 'PUT', 'NONE')), -- NONE covers spot Stock/Crypto/Forex
  entry_price numeric not null,
  lot_size numeric not null,
  exit_price numeric,
  exit_datetime timestamptz,
  pnl numeric,
  created_at timestamptz default now()
);

-- 2. Enable Row-Level Security (RLS) on Trade Legs
alter table public.trade_legs enable row level security;

-- 3. Create RLS Policies for Trade Legs (Inherits permissions from parent trade ownership)
create policy "Allow users to manage trade legs for their own trades" on public.trade_legs
  for all using (
    exists (
      select 1 from public.trades
      where trades.id = trade_legs.trade_id and trades.user_id = auth.uid()
    )
  );

-- 4. Clean up deprecated single-asset columns from the trades table
alter table public.trades drop column if exists direction;
alter table public.trades drop column if exists entry_price;
alter table public.trades drop column if exists exit_price;
alter table public.trades drop column if exists pnl_type;
