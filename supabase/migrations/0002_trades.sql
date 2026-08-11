-- Krypto Signal Dashboard: manuelles Trade Tracking + Trading Journal.
-- Anwendung: einmalig im Supabase SQL-Editor des Projekts ausführen, nach
-- 0001_init.sql (referenziert public.profiles + public.set_updated_at()).

-- ============================================================
-- trades: manuell erfasste Trades pro Nutzer, inkl. Journal-Notizfeld.
-- Kein Exchange-API-Zugang -- Nutzer tragen ihre Trades selbst ein.
-- ============================================================

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  direction text not null check (direction in ('long', 'short')),
  entry_price numeric not null,
  -- exit_price = null -> Trade läuft noch (Status wird daraus abgeleitet,
  -- nicht separat gespeichert -- siehe lib/trades.js computeTradeMetrics).
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  -- Positionsgröße in USD (Notional), nicht Stückzahl -- konsistent mit der
  -- Cash-basierten Backtest-Engine (lib/backtest.js STARTING_CASH) und
  -- einfacher als Nutzer selbst Stückzahl x Preis ausrechnen zu lassen.
  size numeric not null,
  entry_at timestamptz not null default now(),
  exit_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trades enable row level security;

create policy "Nutzer sehen ihre eigenen Trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Nutzer legen eigene Trades an"
  on public.trades for insert
  with check (auth.uid() = user_id);

create policy "Nutzer aktualisieren ihre eigenen Trades"
  on public.trades for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Nutzer löschen ihre eigenen Trades"
  on public.trades for delete
  using (auth.uid() = user_id);

-- public.set_updated_at() existiert bereits aus 0001_init.sql.
create trigger trades_set_updated_at
  before update on public.trades
  for each row
  execute function public.set_updated_at();

create index if not exists trades_user_id_idx on public.trades(user_id);
