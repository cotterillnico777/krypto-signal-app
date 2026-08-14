-- Referral-Programm (Pull-Faktor #4): Trial-Verlängerung für Werber UND
-- Geworbene. Einmalig im Supabase SQL-Editor ausführen (kein CLI-Setup in
-- diesem Repo, siehe Kommentar in 0001_init.sql). Erweitert das bestehende
-- profiles-Schema statt eine eigene referrals-Tabelle einzuführen -- die
-- Beziehung ist 1:1 pro Nutzer (wer hat mich geworben), kein n:m-Fall.

alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
-- Zählt bereits gewährte Bonus-Grants als Werber, begrenzt Missbrauch: nur
-- die ersten 5 erfolgreichen Empfehlungen bringen dem Werber einen
-- Trial-Bonus, danach funktioniert der Link weiter, aber ohne weiteren
-- Bonus für den Werber (der Geworbene bekommt seinen Bonus trotzdem immer).
alter table public.profiles add column if not exists referral_bonus_days integer not null default 0;

-- Bestehende Zeilen (aktuell nur der Betreiber-Account) nachträglich mit
-- einem Code versehen, da die Spalte NOT NULL werden soll.
update public.profiles set referral_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  where referral_code is null;

alter table public.profiles alter column referral_code set not null;

-- handle_new_user() erweitert: (1) jedes neue Profil bekommt einen eigenen
-- Referral-Code, (2) falls beim Signup ein gültiger Code mitgegeben wurde
-- (raw_user_meta_data->>'ref_code', gesetzt in pages/signup.js über
-- supabase.auth.signUp(...options.data)), wird die Beziehung gespeichert,
-- der NEUE Nutzer bekommt +7 Tage Trial (21 statt 14), und der WERBENDE
-- Nutzer bekommt ebenfalls +7 Tage -- nur falls er noch im Trial ist (ein
-- bereits zahlender Nutzer hat kein trial_ends_at, das sinnvoll verlängert
-- werden könnte) und nur bis zum Bonus-Cap.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_code text;
  referrer_id uuid;
  referrer_status text;
  referrer_bonus_days integer;
  bonus_days constant integer := 7;
  bonus_cap constant integer := 5;
  ref_code_input text;
  trial_days integer := 14;
begin
  new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  ref_code_input := new.raw_user_meta_data->>'ref_code';

  if ref_code_input is not null then
    select id, subscription_status, referral_bonus_days
      into referrer_id, referrer_status, referrer_bonus_days
      from public.profiles
      where referral_code = ref_code_input;

    if referrer_id is not null then
      trial_days := 21; -- +7 Bonus-Tage für den neu geworbenen Nutzer

      if referrer_status = 'trialing' and referrer_bonus_days < bonus_cap then
        update public.profiles
          set trial_ends_at = trial_ends_at + (bonus_days || ' days')::interval,
              referral_bonus_days = referral_bonus_days + 1
          where id = referrer_id;
      end if;
    else
      referrer_id := null; -- ungültiger/veralteter Code, still ignorieren statt Signup zu blockieren
    end if;
  end if;

  insert into public.profiles (id, email, trial_started_at, trial_ends_at, referral_code, referred_by)
  values (new.id, new.email, now(), now() + (trial_days || ' days')::interval, new_code, referrer_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Bestehender Trigger on_auth_user_created zeigt schon auf handle_new_user()
-- (siehe 0001_init.sql) -- create or replace function reicht, der Trigger
-- selbst muss nicht neu angelegt werden.
