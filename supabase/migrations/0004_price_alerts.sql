-- Krypto Signal Dashboard: Preis-Alarme (einmalig auslösend).
-- Anwendung: einmalig im Supabase SQL-Editor des Projekts ausführen, nach
-- 0001_init.sql (referenziert public.profiles).

-- ============================================================
-- price_alerts: Nutzer legt eine Preisschwelle pro Coin fest, wird per
-- täglichem Cron (pages/api/cron/check-alerts.js) gegen das 24h-Hoch/Tief
-- geprüft. Kein "triggered"-Flag/Update-Policy nötig -- ein ausgelöster
-- Alarm wird vom Cron direkt gelöscht (einmalig auslösend per Nico's
-- Vorgabe, 16.08.2026).
-- ============================================================

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin_id text not null,
  direction text not null check (direction in ('above', 'below')),
  target_price numeric not null check (target_price > 0),
  created_at timestamptz not null default now()
);

alter table public.price_alerts enable row level security;

create policy "Nutzer sehen ihre eigenen Alarme"
  on public.price_alerts for select
  using (auth.uid() = user_id);

create policy "Nutzer legen eigene Alarme an"
  on public.price_alerts for insert
  with check (auth.uid() = user_id);

create policy "Nutzer löschen ihre eigenen Alarme"
  on public.price_alerts for delete
  using (auth.uid() = user_id);

create index if not exists price_alerts_user_id_idx on public.price_alerts(user_id);
create index if not exists price_alerts_coin_id_idx on public.price_alerts(coin_id);
