-- Migration Update v3: Soft Delete Support for Trades

-- 1. Add deleted_at column to public.trades
alter table public.trades add column if not exists deleted_at timestamptz default null;
