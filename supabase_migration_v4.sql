-- Migration Update v4: Add Notes Column to Trades

-- 1. Add notes column to public.trades table
alter table public.trades add column if not exists notes text;
