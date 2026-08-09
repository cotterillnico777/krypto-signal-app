-- Krypto Signal Dashboard: Accounts/Trial-Grundgerüst (Phase 1 des Public-Launch).
-- Anwendung: einmalig im Supabase SQL-Editor des Projekts ausführen.
-- (Kein Supabase-CLI-Setup in diesem Repo -- diese Datei ist die Quelle der
-- Wahrheit fürs Schema, nicht Teil einer automatisierten Migrationspipeline.)

-- ============================================================
-- profiles: ein App-Profil pro auth.users-Eintrag, inkl. Trial-Tracking.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  trial_started_at timestamptz not null default now(),
  -- Explizit gesetzt statt "generated column": now() ist nicht immutable,
  -- daher kein `generated always as (trial_started_at + interval '14 days')`
  -- möglich. Wird einmalig vom Trigger unten befüllt -> direkt abfragbar
  -- ohne Laufzeit-Arithmetik bei jedem Request.
  trial_ends_at timestamptz not null,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'none')),
  -- Phase-2-Nahtstelle (Stripe-Billing) -- in Phase 1 ungenutzt, aber schon
  -- angelegt, damit Phase 2 ohne destruktive Migration andockt.
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Nutzer sehen ihr eigenes Profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Nutzer aktualisieren ihr eigenes Profil"
  on public.profiles for update
  using (auth.uid() = id);

-- updated_at automatisch nachziehen.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Profil automatisch bei Signup anlegen (verhindert eine Race Condition, bei
-- der ein frisch registrierter Nutzer die App erreicht, bevor eine
-- App-seitige "Profil anlegen"-Anfrage durchgelaufen wäre).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, trial_started_at, trial_ends_at)
  values (new.id, new.email, now(), now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- push_subscriptions: Web-Push-Abos, jetzt an echte Nutzer gebunden
-- (ersetzt die bisherige globale Redis-Hash "push:subscriptions").
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Nutzer sehen ihre eigenen Push-Abos"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Nutzer legen eigene Push-Abos an"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

-- Nötig für upsert() in pages/api/push/subscribe.js (ON CONFLICT (endpoint)
-- DO UPDATE, falls sich dasselbe Browser-Abo erneut anmeldet).
create policy "Nutzer aktualisieren ihre eigenen Push-Abos"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Nutzer löschen ihre eigenen Push-Abos"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- Hinweis: der Cron-Job (pages/api/cron/check-signals.js) liest über den
-- Service-Role-Client (lib/supabase/admin.js), der RLS umgeht -- er hat
-- keine eigene Nutzer-Session, gegen die die obigen Policies greifen könnten.
