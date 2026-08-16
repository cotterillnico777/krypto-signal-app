-- Krypto Signal Dashboard: manuelles Portfolio-Tracking (echte Bestände).
-- Anwendung: einmalig im Supabase SQL-Editor des Projekts ausführen, nach
-- 0001_init.sql (referenziert public.profiles + public.set_updated_at()).

-- ============================================================
-- holdings: manuell erfasste Coin-Bestände pro Nutzer. Kein Exchange-API-
-- Zugang (bewusste Scope-Entscheidung, 16.08.2026) -- Nutzer tragen Menge
-- und Einstandspreis selbst ein, die App zeigt daraus die reale Rendite
-- (aktueller Kurs kommt live aus fetchCryptoData, wird nicht gespeichert).
-- ============================================================

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin_id text not null,
  quantity numeric not null check (quantity > 0),
  cost_basis numeric not null check (cost_basis >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.holdings enable row level security;

create policy "Nutzer sehen ihre eigenen Bestaende"
  on public.holdings for select
  using (auth.uid() = user_id);

create policy "Nutzer legen eigene Bestaende an"
  on public.holdings for insert
  with check (auth.uid() = user_id);

create policy "Nutzer aktualisieren ihre eigenen Bestaende"
  on public.holdings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Nutzer loeschen ihre eigenen Bestaende"
  on public.holdings for delete
  using (auth.uid() = user_id);

create trigger holdings_set_updated_at
  before update on public.holdings
  for each row
  execute function public.set_updated_at();

create index if not exists holdings_user_id_idx on public.holdings(user_id);
