# Krypto Signal Dashboard

Live-Krypto-Signale (BTC, ETH, SOL, XRP, TAO) kombiniert mit echten Makrodaten (M2-Geldmenge, US-Leitzins), Fear & Greed Index und KI-Analyse. Als installierbare PWA mit Push-Benachrichtigungen bei Kaufsignalen.

**Account nötig:** Dashboard und alle Analyse-Tools sind nur nach Login erreichbar – 14 Tage kostenlos testen, keine Kreditkarte nötig (siehe Abschnitt "Accounts & Login").

---

## Einrichtung (einmalig, ~10 Minuten)

### 1. Node.js installieren
Falls noch nicht vorhanden: https://nodejs.org → "LTS"-Version herunterladen und installieren.

### 2. Kostenlosen FRED API-Key holen
1. Gehe zu https://fred.stlouisfed.org
2. Klicke oben rechts auf "My Account" → "Create an Account"
3. Nach der Registrierung: "My Account" → "API Keys" → "Request API Key"
4. Den Key kopieren (sieht aus wie: `abc123def456...`)

### 3. Projekt einrichten
1. Diesen Ordner irgendwo auf deinem Computer ablegen (z.B. Desktop)
2. Terminal/Eingabeaufforderung öffnen (Mac: Spotlight → "Terminal"; Windows: Startmenü → "cmd")
3. In den Projektordner navigieren:
   ```
   cd Desktop/krypto-signal-app
   ```
4. Abhängigkeiten installieren:
   ```
   npm install
   ```
5. `.env.local.example` kopieren und umbenennen zu `.env.local`:
   - Mac/Linux: `cp .env.local.example .env.local`
   - Windows: `copy .env.local.example .env.local`
6. `.env.local` mit einem Texteditor öffnen und deinen FRED-Key eintragen:
   ```
   FRED_API_KEY=abc123def456...
   ```

### 4. Lokal starten (zum Testen)
```
npm run dev
```
Dann im Browser öffnen: http://localhost:3000

Push-Benachrichtigungen funktionieren lokal erst, sobald du Schritt "Push-Benachrichtigungen einrichten" unten erledigt hast (Upstash-Account).

---

## PWA – als App installieren

Die App ist eine installierbare Progressive Web App:
- **Android / Desktop Chrome:** Beim Besuch erscheint automatisch ein Banner "Als App installieren", oder über das Menü → "App installieren".
- **iOS Safari:** Teilen-Symbol antippen → "Zum Home-Bildschirm".

Nach der Installation startet die App im eigenen Fenster (ohne Browser-Leiste) und hat ein eigenes App-Icon.

---

## Backtest

Unter „📊 Backtest" (Link im Dashboard-Header, Route `/backtest`) simuliert die App die exakt gleiche Signal-Strategie (SMA + RSI + MACD + Volumen + Makro + Fear & Greed) Tag für Tag auf historischen Kursdaten – ohne Lookahead, es fließen an jedem simulierten Tag nur Daten bis einschließlich diesem Tag ein.

- Coin, Zeitraum (90 Tage bis 4 Jahre) und optional einen Stop-Loss (10/15/20%) wählen, dann "Backtest starten" klicken.
- Angezeigt werden: Strategie-Rendite vs. Buy & Hold, Max Drawdown, Anzahl Trades, Trefferquote, eine Equity-Kurve und die einzelnen Trades (mit "(Stop)"-Markierung bei Stop-Loss-Ausstiegen).
- Start-Kapital ist ein hypothetisches $10.000, ohne Gebühren/Slippage. Bis zu 4 Jahre zurück deckt frühere Markt-Regime ab (z.B. den Bärenmarkt 2022), damit die Strategie nicht nur an einem einzelnen, zufälligen Marktumfeld gemessen wird.
- Der Stop-Loss prüft pro simuliertem Tag das Tagestief/-hoch gegen den Einstiegspreis und schließt die Position zum Stop-Kurs – realistischer als ein reiner Schlusskurs-Check, aber immer noch ohne Slippage.
- **Trendfilter (ADX)**: optionaler Regler (Kein Filter/15/20/25), schwächt Kaufen/Verkaufen-Crossover-Signale zu Halten ab, wenn der Trend laut ADX zu schwach ist – gedacht gegen Whipsaws (mehrere Stop-Losses in Folge in einer Seitwärtsphase). Multi-Coin-Test (5 Coins über 365/730/850 Tage) zeigt keinen robusten Effekt für alle Coins: half BTC/ETH/XRP teils deutlich, schadete Solana/Bittensor teils deutlich (bis -73%). Deshalb kein Standard, aber als Regler verfügbar zum coin-/setup-spezifischen Ausprobieren.
- **Take-Profit** (`takeProfitPct` in `runBacktest`, `takeProfit=`-Query-Param bei `/api/backtest` und `/api/walkforward`, kein UI-Regler): spiegelbildlich zum Stop-Loss, schließt die Position beim Erreichen eines Gewinnziels. Empirisch geprüft (Multi-Coin Walk-Forward, mehrere %-Stufen solo und im Bracket mit Stop-Loss) und dabei in den beiden längeren/verlässlicheren Zeitfenstern durchgängig **schlechter** als ganz ohne Gewinnziel abgeschnitten – die Strategie lässt Gewinner sonst per Signal-Exit laufen, ein festes Ziel kappt das vorzeitig. Bleibt deshalb bewusst ohne UI-Regler, nur für eigene Experimente per API nutzbar.

**Long + Short, Hebel:**
- **Nur Long** (Standard): bei "Verkaufen"-Signal wird die Position glattgestellt (zurück in Cash), kein Short.
- **Long + Short**: bei "Verkaufen"-Signal wird stattdessen eine Short-Position eröffnet (gespiegelte Long-Logik). Ein Short kann theoretisch unbegrenzt verlieren, wenn der Kurs stark steigt – die Simulation bildet das ab (siehe Liquidation unten).
- **Hebel** (1x/2x/3x/5x/10x): verstärkt Kursbewegungen proportional. Bei Hebel >1x wird pro Position eine Liquidationsschwelle berechnet (Kursbewegung von 100%/Hebel gegen die Position → Margin komplett aufgebraucht). Stop-Loss und Liquidation werden unabhängig geprüft, der zuerst erreichte Preis gewinnt. Ein leergeräumtes Konto handelt nicht weiter.
- **Funding-Kosten**: Sobald Short oder Hebel >1x aktiv ist, bezieht die Simulation echte historische Funding-Rates der Binance-USDT-Perpetuals ein (alle 8h abgerechnet, long zahlt bei positiver Rate an short und umgekehrt) – kein grober Schätzwert, sondern reale Marktdaten für den jeweiligen Zeitraum.
- Reine historische Simulation, keine Garantie für zukünftige Ergebnisse, kein Ersatz für eigenes Risikomanagement und keine Anlageberatung. Echter Hebelhandel ist riskanter als hier vereinfacht abgebildet (z.B. keine Slippage bei Liquidation, keine Wartungsmargin-Stufen).

**Handelskosten:** Standardmäßig aktiv, nicht optional versteckt – ein kostenloser Backtest überschätzt die Realität systematisch. Presets: 0% (unrealistisch, nur zum Vergleich), 0,15% je Seite (Standard ≈ Binance-Taker-Fee 0,1% + vorsichtige Slippage-Annahme 0,05%), 0,3% (konservativ). Wird symmetrisch angewendet – Kaufen (Long-Einstieg/Short-Eindeckung) kostet mehr, Verkaufen (Long-Ausstieg/Short-Einstieg) bringt weniger, auch bei Stop-Loss-/Liquidations-Exits. Der Buy&Hold-Vergleich bekommt dieselben Kosten (1× Kauf, 1× Verkauf), sonst wäre der Vergleich unfair zugunsten der passiven Strategie. Gilt auch im Optimizer.
- Zusätzlich zu Rendite/Drawdown zeigt der Backtest jetzt auch **Sharpe** und **Sortino Ratio** (Rendite pro Risikoeinheit, annualisiert, ohne risikofreien Zins) – wichtig, um Kombinationen nicht nur nach roher Rendite zu bewerten, sondern danach, wie viel Risiko dafür nötig war.

---

## Parameter-Optimierung

Unter "🔬 Optimierung" (Route `/optimize`) wird automatisch ein Raster aus 80 Kombinationen (5 SMA-Perioden-Paare × 4 RSI-Schwellen-Paare × 4 ADX-Trendfilter-Stufen, inkl. "aus") getestet, um zu prüfen, ob andere Parameter als die Dashboard-Standardwerte robust besser abschneiden.

**Warum nicht einfach die Kombination mit der höchsten Rendite nehmen?** Weil man dann fast garantiert eine Kombination findet, die zufällig gut zur getesteten Historie passt (Overfitting) – nicht eine mit echter Kante. Deshalb:

1. Die ersten 70% des gewählten Zeitraums sind das **Trainings-Fenster**: alle 80 Kombinationen laufen hier, sortiert nach Sharpe Ratio (nicht roher Rendite, sonst gewinnt oft die riskanteste Kombination).
2. Nur die Top 5 werden zusätzlich auf den letzten 30% (**Test-Fenster**, hat der Scan nie gesehen) noch einmal durchgerechnet.
3. Kombinationen, die im Training stark aussehen, aber im Test einbrechen, werden als "schwach im Test" markiert – klassisches Overfitting-Warnsignal. Nur was in **beiden** Fenstern solide abschneidet, ist ein ernsthafter Kandidat.

**ADX-Trendfilter:** Der Average Directional Index misst Trendstärke unabhängig von der Richtung. Ist der ADX unter der gewählten Schwelle (Markt ohne klaren Trend, "Seitwärts"), werden Kaufen/Verkaufen-Crossover-Signale zu "Halten" abgeschwächt – soll verhindern, dass die Strategie in ausgeprägten Seitwärtsphasen unnötig oft ein- und aussteigt (Whipsaws).

Die Optimierung testet aktuell nur SMA/RSI/ADX – Stop-Loss, Short und Hebel bleiben auf den Standardwerten (aus/1x), um das Raster nicht explodieren zu lassen. Eine vielversprechende Kombination lässt sich danach manuell im normalen Backtest mit diesen zusätzlichen Optionen nachtesten.

**Größere Datenbasis für verlässlichere Rückschlüsse:**
- **Zeiträume bis zu 8 Jahre** (Backtest und Optimierung) – Binance führt BTCUSDT/ETHUSDT seit 2017, das deckt mehrere komplette Marktzyklen ab (2018er Bärenmarkt, 2020 COVID-Crash, 2021er Bullenmarkt, 2022er Bärenmarkt) statt nur einen einzelnen Zyklus.
- **Multi-Coin-Modus** ("Alle 5 Coins" statt "1 Coin"): testet jede der 80 Kombinationen über BTC, ETH, SOL, XRP und TAO gleichzeitig und rankt nach durchschnittlichem Sharpe. Eine "Konsistenz"-Spalte zeigt, bei wie vielen der 5 Coins die Kombination positiv war – eine Kombination, die nur bei einem einzelnen Coin (oft nur ein dominanter Trade) gut aussieht, aber bei den anderen vier durchfällt, ist statistisch nicht überzeugend.

Beide Erweiterungen haben in Tests wiederholt bestätigt, was das ursprüngliche Problem war: Mit wenig Daten (kurzer Zeitraum, ein Coin) sah die beste Trainings-Kombination oft beeindruckend aus (teils über +2000% Rendite über 8 Jahre), brach aber im Out-of-Sample-Test bzw. bei anderen Coins deutlich ein – der Sample-Size-Effekt lässt sich nicht wegoptimieren, aber die Out-of-Sample- und Multi-Coin-Checks machen ihn sichtbar, statt ihn zu verstecken.

---

## Walk-Forward-Validierung

Unter "📈 Walk-Forward" (Route `/walkforward`) wird der gewählte Zeitraum statt in einen einzigen 70/30-Split in **5 aufeinanderfolgende Segmente** geteilt, daraus ergeben sich **4 Folds**:

1. Fold 1 trainiert auf Segment 1, testet auf Segment 2.
2. Fold 2 trainiert auf Segment 1+2 (wachsendes Fenster), testet auf Segment 3.
3. Fold 3 trainiert auf Segment 1-3, testet auf Segment 4.
4. Fold 4 trainiert auf Segment 1-4, testet auf Segment 5.

Jeder Fold sucht unabhängig die (nach Sharpe) beste der 80 SMA/RSI/ADX-Kombinationen im jeweiligen Trainingsfenster und wendet genau diese sofort auf das nächste, nie gesehene Test-Segment an – das simuliert, wie ein Trader, der die Strategie periodisch neu optimiert, in der Praxis abgeschnitten hätte.

**Warum das strenger ist als der einfache Train/Test-Split des Optimizers:** Ein einzelner Split hängt davon ab, ob genau diese eine Testphase zufällig zur trainierten Kombination passt. Walk-Forward mittelt über mehrere, zeitlich verschobene Testphasen – eine Kombination, die nur in einer bestimmten Marktphase (z.B. einem Bullenlauf) funktioniert, fällt in den anderen Folds durch, statt das Gesamtbild zu verzerren. Zusätzlich zeigt die Fold-Tabelle, wie stark die "beste" Parameter-Kombination von Fold zu Fold wechselt – ein starker Wechsel ist selbst ein Warnsignal (kein stabiler Vorteil, sondern regimeabhängiges Rauschen).

Ergebnis wird als **Ø Out-of-Sample-Rendite/Sharpe** über alle 4 Folds sowie "X/4 profitable Folds" zusammengefasst. Wie beim Optimizer bleiben Stop-Loss/Short/Hebel auf Standardwerten, um die Rechenzeit (4× 80 Kombinationen) im Rahmen zu halten; getestet mit BTC/ETH über 2-8 Jahre inkl. Short+Hebel, läuft lokal in 2-5s, deutlich innerhalb des 60s-Limits von Vercel.

**Multi-Coin-Modus** ("Alle 5 Coins" statt "1 Coin"): kombiniert Walk-Forward mit dem Multi-Coin-Ansatz des Optimizers – pro Fold wird die Kombination nicht nur auf einem Coin gesucht, sondern über alle 5 Coins gleichzeitig gerankt (nach Ø-Sharpe), und dann auf dem nächsten Test-Segment über alle 5 Coins geprüft. Kombiniert damit die beiden strengsten Overfitting-Checks der App: robuste Parameterwahl (nicht nur ein Coin) und robuste Zeitachse (nicht nur ein Split). Zeigt zusätzlich pro Fold die "Konsistenz" (wie viele der 5 Coins im Test positiv waren) und eine Pro-Coin-Aufschlüsselung. Wie beim Portfolio-Backtest richtet sich der gemeinsame Zeitraum nach dem kürzesten gelisteten Coin (TAO). Trotz 4× mehr Rechenaufwand als der Multi-Coin-Optimizer (4 Folds statt 1 Split) läuft der Worst Case (8 Jahre, alle 5 Coins, Short+Hebel) lokal in unter 10s – die O(n)-Performance-Fixes im Backtest-Engine tragen auch hier.

---

## Portfolio-Backtest

Unter "💼 Portfolio" (Route `/portfolio`) wird das Start-Kapital ($10.000) **gleichmäßig auf alle 5 Coins verteilt** ($2.000 je Coin) – im Unterschied zum Multi-Coin-Optimizer, der nur die gemittelten Einzelergebnisse zeigt, wird hier die **tatsächliche Summen-Equity-Kurve** über alle 5 Coins Tag für Tag berechnet. Jeder Coin handelt dabei unabhängig nach der gleichen Dashboard-Signal-Strategie, ohne Rebalancing zwischen den Coins über die Zeit.

Das macht einen echten **Diversifikationseffekt** sichtbar: Portfolio-Max-Drawdown und -Sharpe werden direkt gegen den Durchschnitt der Einzelcoins verglichen. Da alle 5 Coins über dieselbe Signal-Logik handeln und Krypto-Assets tendenziell stark miteinander korrelieren (anders als z.B. Aktien/Anleihen/Rohstoffe), ist der Effekt meist kleiner als bei klassischen Multi-Asset-Portfolios, aber messbar – in Tests reduzierte die Streuung über 5 Coins den Max-Drawdown regelmäßig gegenüber dem Durchschnitt der Einzelcoins.

**Gemeinsamer Betrachtungszeitraum:** Da TAO (Bittensor) erst 2023 auf Binance gelistet wurde, richtet sich der tatsächlich nutzbare Zeitraum nach dem am kürzesten gelisteten Coin – bei "8 Jahre" gewählt, aber TAO nur ~850 Tage Historie hat, verkürzt sich der Portfolio-Backtest automatisch auf diese 850 Tage (mit Hinweis in der UI), statt falsch ausgerichtete Datenreihen zu vermischen.

Coin-Auswahl ist fest auf alle 5 Coins gesetzt (kein Einzel-Coin-Toggle), Stop-Loss/Richtung/Hebel/Handelskosten sind wie beim normalen Backtest wählbar.

---

## Trades & R:R-Rechner

Zwei Tools fürs eigene (manuelle) Trading, unabhängig von den Dashboard-Signalen:

**"⚖️ R:R-Rechner"** (Route `/risk-reward`): reiner Rechner, keine Datenbank – Entry-Preis, Stop-Loss, Take-Profit, Kontogröße und Risiko% pro Trade eingeben, live berechnet werden Risiko/Rendite-Verhältnis, empfohlene Positionsgröße und Risiko-/Gewinn-Betrag in USD.

**"📓 Trades"** (Route `/trades`): manuelles Trade-Tracking + Trading-Journal in einem (kein Exchange-Zugang, keine automatische Trade-Erkennung – du trägst deine Trades selbst ein). Pro Trade: Symbol, Richtung, Entry-/Stop-/Target-Preis, Positionsgröße (USD-Notional), Notizfeld. PnL/R-Multiple/Status werden aus den eingegebenen Werten berechnet, nicht separat gespeichert. Offene Trades lassen sich direkt in der Tabelle mit einem Exit-Preis schließen.

Der **"🤖 KI-Analyse"**-Button lässt Claude Muster im Journal suchen (Trefferquote, Risikomanagement, wiederkehrende Fehler in den Notizen) – auf max. 5 Analysen pro Tag pro Nutzer begrenzt (Redis-Zähler, `lib/redis.js`), da ein Journal-Prompt mehr Anthropic-Kosten verursacht als die Einzel-Coin-Analyse im Dashboard.

Braucht die `trades`-Tabelle aus `supabase/migrations/0002_trades.sql` (siehe Abschnitt "Accounts & Login" oben).

---

## Validierungs-Historie (öffentliche Seite)

Route `/validation` – die einzige inhaltliche Seite der App, die **ohne Login** erreichbar ist (kein `getServerSideProps = requireActiveAccess`, folgt stattdessen dem eigenen schlanken Header-Layout von `pages/login.js`). Gedacht als Vertrauensanker für Interessenten vor der Anmeldung: listet **jeden** je getesteten Signal-Faktor auf, mit Datum, Hypothese, Test-Methode (i.d.R. Multi-Coin Walk-Forward über 365/730/850 Tage) und Ergebnis – auch die Fälle, in denen ein Faktor NICHT geholfen oder sogar geschadet hat. Datenquelle ist `lib/validationHistory.js` (ein einfaches Array, kein DB/API-Call) – beim nächsten empirisch getesteten Faktor dort einen neuen Eintrag ergänzen. Verlinkt von `/login`, `/signup` und im `AppHeader`-Nav für eingeloggte Nutzer.

---

## Glossar (öffentliche Seite)

Route `/glossar` – zweite öffentliche Seite (gleiches Muster wie `/validation`: kein Login nötig, eigenes schlankes Header-Layout). Erklärt alle Fachbegriffe aus dem Dashboard (RSI, MACD, SMA, Makro-Regime, Fear & Greed, Long/Short, Hebel, Liquidation, Stop-Loss, Backtest, Walk-Forward, Sharpe-Ratio, Max Drawdown, ...) ausführlicher, als es die einzeiligen Dashboard-Tooltips erlauben – Pull-Faktor für Retail-/Neuling-Investoren. Datenquelle `lib/glossary.js` (statisches, nach Kategorie gruppiertes Array). Verlinkt von `/login`, `/signup`, `/validation` und im `AppHeader`-Nav.

---

## Push-Benachrichtigungen einrichten

Die App schickt eine Push-Benachrichtigung, sobald ein Coin **neu** auf "Kaufen" wechselt. Dafür braucht es zwei Dinge: VAPID-Keys (bereits erledigt) und einen Cloud-Speicher für die Abo-Daten.

### 1. Kostenlosen Upstash-Redis-Account anlegen
1. Gehe zu https://upstash.com und registriere dich kostenlos
2. "Create Database" → Name frei wählbar, Region z.B. `eu-west-1`
3. Im Dashboard der Datenbank unter "REST API" findest du:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Beide Werte in deine `.env.local` eintragen (lokal) bzw. bei Vercel als Environment Variables hinzufügen (Live-Betrieb)

### 2. VAPID-Keys
Wurden bereits für dich generiert und stehen in `.env.local` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Falls du eigene brauchst:
```
npx web-push generate-vapid-keys
```

### 3. In der App aktivieren
Auf "🔔 Push aktivieren" oben rechts klicken und die Browser-Berechtigung erteilen. Funktioniert nur über HTTPS oder `localhost` – nicht über eine `http://`-IP-Adresse.

**iOS-Sonderfall:** Safari auf iPhone/iPad liefert echte Push-Zustellung nur, wenn die App zuvor **zum Home-Bildschirm hinzugefügt** wurde (siehe Installation oben) – im normalen Browser-Tab meldet iOS zwar technisch Unterstützung, ein Abo würde aber mit einem für Nutzer nicht nachvollziehbaren Fehler scheitern. Die App erkennt diesen Fall selbst (`lib/deviceMode.js`, `isIos()` + `isStandalone()`) und zeigt auf iOS-Browser-Tabs statt des Buttons einen deaktivierten Hinweis-Button mit Installationsanleitung, statt den Fehler überhaupt erst zu provozieren.

### 4. Automatische Prüfung (Cron-Job)
`vercel.json` enthält bereits einen Cron-Job, der `/api/cron/check-signals` täglich um 07:00 UTC aufruft (im kostenlosen Vercel-Hobby-Plan ist 1×/Tag das Maximum). Uhrzeit anpassbar über das `schedule`-Feld (Cron-Syntax).

Damit der Cron-Endpunkt nicht von außen missbraucht werden kann, ist er über `CRON_SECRET` geschützt. Vercel setzt bei aktiviertem Cron automatisch den passenden `Authorization`-Header. Trage `CRON_SECRET` (siehe `.env.local`) zusätzlich als Environment Variable bei Vercel ein.

Manuell testen (lokal):
```
curl "http://localhost:3000/api/cron/check-signals?secret=DEIN_CRON_SECRET"
```

### 5. Wöchentlicher Trades-Journal-Digest
Zweiter, eigener Cron-Eintrag (`/api/cron/weekly-digest`, montags 08:00 UTC) – Vercel Hobby erlaubt bis zu 100 Cron-Jobs/Projekt, nur jeder einzelne maximal 1×/Tag, ein zweiter täglicher-oder-seltener Job ist also problemlos möglich. Schickt Push-Abonnenten mit mindestens einem geloggten Trade eine kurze Wochenstatistik ihres Journals ("📊 Dein Wochen-Rückblick: 12 Trades · 58% Trefferquote · Gesamt-PnL +$340", Tap öffnet `/trades`). Rein deterministisch berechnet (`lib/trades.js` `summarizeTrades`) – keine automatische Anthropic-Nutzung, die KI-Analyse bleibt nutzerinitiiert. Ein Redis-Idempotenz-Key (`digest:sent:{userId}:{isoWoche}`) verhindert Doppel-Versand pro Woche. Nutzer ohne Trades werden übersprungen.

Manuell testen (lokal):
```
curl "http://localhost:3000/api/cron/weekly-digest?secret=DEIN_CRON_SECRET"
```

---

## Accounts & Login (Betreiber-Setup)

Seit dem Public-Launch-Umbau ist die komplette App (Dashboard + alle vier Analyse-Tools) nur noch mit Account erreichbar: 14 Tage kostenlose Testphase, keine Kreditkarte nötig. Accounts/Login/Nutzerdaten laufen über **Supabase** (Auth + Postgres in einem Projekt).

### 1. Supabase-Projekt anlegen
1. Kostenlosen Account anlegen: https://supabase.com
2. "New Project" → Name frei wählbar, Region z.B. `Central EU (Frankfurt)` (passt zur `fra1`-Vercel-Region)
3. Unter Project Settings → API Keys → Tab "Legacy anon, service_role API keys":
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `anon`/`public`-Key (darf öffentlich sein)
   - `SUPABASE_SERVICE_ROLE_KEY` = `service_role`-Key (**geheim**, umgeht Row Level Security, niemals im Client-Bundle oder `NEXT_PUBLIC_`-Prefix)
4. Alle drei Werte in `.env.local` eintragen (lokal) bzw. bei Vercel als Environment Variables (Live-Betrieb)

### 2. Datenbank-Schema anlegen
Im Supabase-Dashboard → SQL Editor → neue Query → Inhalt von `supabase/migrations/0001_init.sql` einfügen und ausführen. Legt zwei Tabellen an:
- `profiles` – ein Profil pro Nutzer, trackt Trial-Start/-Ende und Abo-Status (inkl. Row Level Security)
- `push_subscriptions` – Web-Push-Abos, jetzt an echte Nutzer gebunden statt global geteilt

Danach genauso `supabase/migrations/0002_trades.sql` ausführen (additiv, unabhängig von 0001) – legt die `trades`-Tabelle fürs Trade-Tracking/Journal an (siehe Abschnitt "Trades & R:R-Rechner" unten).

Danach `supabase/migrations/0003_referrals.sql` ausführen (additiv) – erweitert `profiles` um `referral_code`/`referred_by`/`referral_bonus_days` und den bestehenden Signup-Trigger, siehe Abschnitt "Referral-Programm" unten. **Ohne diese Migration bleibt `/api/referral` einfach inaktiv** (gibt einen Fehler zurück, den `components/ReferralCard.js` still abfängt – die "🎁 Freunde einladen"-Karte zeigt sich dann einfach nicht, keine sichtbaren Fehler im Dashboard).

### 3. Auth-Provider konfigurieren
Unter Authentication → Providers:
- E-Mail/Passwort ist standardmäßig aktiv
- Magic Link nutzt denselben E-Mail-Versand, kein Zusatzaufwand
- Google OAuth optional: eigener Google-Cloud-Console-Client nötig

Unter Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (lokal) bzw. deine Produktions-URL
- Redirect URLs: `http://localhost:3000/**` und `https://deine-domain.vercel.app/**` hinzufügen

**Hinweis:** Supabases Standard-E-Mail-Versand hat niedrige Rate-Limits – für echten Betrieb einen eigenen SMTP-Provider (z.B. Resend) unter Authentication → Settings → SMTP Settings hinterlegen.

### Wie der Trial funktioniert
Bei Signup legt ein Datenbank-Trigger automatisch ein Profil mit `trial_ends_at = jetzt + 14 Tage` an. Jede geschützte Seite/API-Route prüft serverseitig (`lib/auth/requireActiveAccess.js` bzw. `requireActiveAccessApi.js`), ob der Zugang aktiv ist (`subscription_status = 'active'` ODER Trial noch nicht abgelaufen) – läuft der Trial ab, landet man auf `/upgrade`. Die eigentliche Zahlungsabwicklung (Stripe) ist noch nicht gebaut; `profiles.subscription_status`/`stripe_customer_id` sind aber schon als Anknüpfungspunkt angelegt.

### Referral-Programm (Pull-Faktor #4)

Jeder Nutzer hat einen persönlichen Empfehlungslink (`/signup?ref=CODE`), sichtbar im Dashboard über die "🎁 Freunde einladen"-Karte (`components/ReferralCard.js`, holt Code + Anzahl der Empfehlungen über `/api/referral.js`). Meldet sich jemand über diesen Link an:
- Der **neue** Nutzer bekommt automatisch 21 statt 14 Tage Trial (+7 Tage Bonus).
- Der **werbende** Nutzer bekommt ebenfalls +7 Tage auf sein eigenes `trial_ends_at` – aber nur, solange er selbst noch im Trial ist (ein bereits zahlender Account hat kein sinnvoll verlängerbares Trial-Enddatum) und nur bis zu einem Cap von 5 belohnten Empfehlungen (`profiles.referral_bonus_days`, verhindert Missbrauch).

Die gesamte Logik steckt in einer einzigen erweiterten Datenbank-Funktion (`handle_new_user()` in `supabase/migrations/0003_referrals.sql`, derselbe Trigger, der auch das Trial-Datum setzt) – kein Cron-Job, keine separate `referrals`-Tabelle nötig, da die Beziehung "wer hat mich geworben" 1:1 pro Nutzer ist. `pages/signup.js` liest den `?ref=`-Query-Parameter und gibt ihn als `ref_code` in `options.data` an `supabase.auth.signUp()` mit, wo ihn der Trigger aus `raw_user_meta_data` ausliest.

---

## Online deployen (kostenlos, mit Vercel)

1. Kostenlosen Account anlegen: https://vercel.com
2. Dein Projekt bei GitHub hochladen (oder Vercel CLI nutzen):
   - Einfachste Variante: https://vercel.com/new → "Import from GitHub"
3. Beim Einrichten unter "Environment Variables" alle Werte aus `.env.local` eintragen:
   - `FRED_API_KEY`, `ANTHROPIC_API_KEY`
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy klicken → fertig. Du bekommst eine öffentliche URL wie `https://krypto-signal-xyz.vercel.app`. Der Cron-Job wird automatisch aus `vercel.json` übernommen (sichtbar unter Project → Settings → Cron Jobs).
5. In Supabase unter Authentication → URL Configuration die Produktions-URL zu den Redirect URLs hinzufügen (siehe oben) – sonst schlägt Login/Signup live fehl.

---

## Wie die Signale funktionieren

**Technisches Signal (SMA-Crossover):**
- SMA10 = gleitender Durchschnitt der letzten 10 Tage
- SMA30 = gleitender Durchschnitt der letzten 30 Tage
- Kreuzt SMA10 den SMA30 von unten → **Kaufen**
- Kreuzt SMA10 den SMA30 von oben → **Verkaufen**
- Sonst → **Halten**

**Makro-Regime:**
Fünf Faktoren fließen in einen Score ein, jeder einzeln auf ungefähr -1 bis +1 normalisiert (statt Rohwerte unterschiedlicher Einheiten direkt zu addieren):
- **M2-Geldmengenwachstum** (YoY): mehr Liquidität im System → risk-on
- **Leitzins-Trend** (3 Monate): Zinssenkungen → risk-on, Erhöhungen → risk-off
- **Dollar-Index-Trend** (3 Monate): schwächerer Dollar → typischerweise risk-on für Krypto
- **10-jährige US-Staatsanleihe-Rendite** (3-Monats-Trend): fallende Renditen → risk-on
- **VIX** (aktueller Stand): erhöhte Angst (≥25) → risk-off, Sorglosigkeit (≤15) → leicht risk-on

Gesamt-Score ≥ 1,5 → **Risk-on**, ≤ -1,5 → **Risk-off**, sonst **Neutral**.

**Nasdaq/S&P 500 (nur Info, siehe unten):** 90-Tage- bzw. 3-Monats-Trend werden berechnet und im Dashboard angezeigt, fließen aber standardmäßig NICHT in den Makro-Score ein (siehe Begründung unten bei "Kombiniertes Signal").

**Bollinger Bänder, Stochastic RSI, On-Balance-Volume (nur Info, siehe unten):**
- **Bollinger:** Mittelband = SMA(20), oberes/unteres Band = Mittelband ± 2 Standardabweichungen. %B misst die Position des Kurses im Band (0 = am unteren Band, 1 = am oberen Band): %B ≤ 0 → überverkauft, %B ≥ 1 → überkauft.
- **Stochastic RSI:** normiert die RSI-Reihe selbst auf ihr eigenes 14-Tage-Hoch/Tief (0-100) – empfindlicher/schneller als reines RSI. ≤20 → überverkauft, ≥80 → überkauft.
- **On-Balance-Volume (OBV):** kumuliertes Volumen (addiert bei steigendem, subtrahiert bei fallendem Tagesschluss). Signal per Crossover gegen die eigene SMA(20): darüber → Akkumulation, darunter → Distribution.
- **Starke Kerze:** ein Tag mit ungewöhnlich großer Handelsspanne (High-Low > 1,8× der zuletzt üblichen Spanne, gemessen per Average True Range) UND eindeutigem Schluss nahe Hoch oder Tief statt mittig in der Spanne – eine Annäherung an ein Marubozu-artiges "starke Kerze"-Muster ohne Eröffnungskurs. Schluss im oberen 30%-Bereich der Spanne → Kaufen, unteres 30% → Verkaufen, sonst Neutral.
- **Marubozu:** das echte Muster (nutzt den Eröffnungskurs, den Binance liefert). Kerzenkörper (|Close-Open|) macht mindestens 90% der Tagesspanne aus, kaum Dochte auf beiden Seiten. Close > Open → Kaufen, Close < Open → Verkaufen, sonst Neutral.

**Whale-Signal (Top-Trader-Positionierung):**
- Nutzt Binances Long/Short-Positionsratio der "Top-Trader" (Accounts mit den größten Positionen nach Volumen auf den USDT-Perpetuals) – kostenlos, kein API-Key nötig, die näheste frei zugängliche Kennzahl zu echtem "Whale-Sentiment" ohne kostenpflichtige On-Chain-Dienste (Whale Alert, Nansen, Arkham).
- Top-Trader liegen auf Binance strukturell fast immer netto-long (z.B. TAO meist >2.0, BTC eher ~1.5) – ein fester Schwellenwert würde das für jeden Coin unterschiedlich interpretieren. Deshalb vergleicht das Signal die heutige Ratio gegen den 7-Tage-Durchschnitt derselben Coin: eine deutliche Abweichung vom coin-eigenen Normalniveau (≥8% in beide Richtungen) zählt als bullish/bearish, sonst neutral.
- **Nur live verfügbar** (Dashboard + Push-Cron): Binance hält diese Daten nur ~30 Tage zurück, deshalb ist das Signal in Backtest/Optimierung/Walk-Forward/Portfolio nicht eingebunden – dort würde es für 99%+ der Historie fehlen.

**Liquidität (Orderbuch-Kontext, nur Info):**
- Geld-Brief-Spanne (Spread) und kumulierte Orderbuch-Tiefe innerhalb ±1% vom Mittelkurs, direkt aus Binances Spot-Orderbuch – kostenlos, kein API-Key nötig.
- Zeigt, wie teuer/riskant ein sofortiger Handel gerade wäre bzw. wie viel Volumen sich handeln lässt, ohne den Kurs spürbar zu bewegen – reiner Marktkontext, **kein Kaufen/Verkaufen-Signal**.
- **Nur live verfügbar**, wie das Whale-Signal: Binance liefert Orderbuch-Daten nur als aktuelle Momentaufnahme, keine Historie über die REST-API – daher nicht in Backtest/Optimierung/Walk-Forward/Portfolio eingebunden.

**Parameter-Tipp pro Coin (nur Info, Backtest-Empfehlung):**
- Jede Coin-Karte zeigt einen "💡 Tipp" auf Basis eines Multi-Fold Walk-Forward-Tests über Hebel (1x/2x/3x), Richtung (Nur Long/Long+Short) und Stop-Loss (kein/-10%/-15%/-20%) je Coin, siehe `lib/paramTips.js`.
- Eine Kombination gilt nur dann als eigenständiger (grün markierter) Tipp, wenn sie in **zwei unabhängigen Zeitfenstern** (730 und 850 Tage) sowohl die Ø-Out-of-Sample-Rendite als auch den Sharpe der Standardeinstellung (1x, Nur Long, kein Stop) schlägt und dabei selbst profitabel bleibt – "nur in einem Fenster besser" reicht nicht. Ergebnis (13.08.2026): Ethereum (1x Long+Short, -10% Stop-Loss) und XRP (2x Long+Short, kein Stop-Loss) bestehen diesen Test robust; für Bitcoin, Solana und Bittensor wurde keine robuste Verbesserung gefunden. Jeder Coin zeigt trotzdem immer eine konkrete Empfehlung (grau markiert = Standardeinstellung bleibt beste bekannte Wahl, statt eines vagen "kein Tipp"-Hinweises).
- Reine Info-Anzeige aus historischen Backtest-Daten, **keine Anlageberatung und kein automatischer Bestandteil des Kaufen/Verkaufen-Signals**. Auch auf der Backtest-Seite sichtbar: der Tipp für den gerade gewählten Coin wird dort direkt über den Reglern angezeigt, inklusive "Tipp übernehmen"-Button, der Stop-Loss/Richtung/Hebel automatisch auf die empfohlenen Werte setzt.

**Kombiniertes Signal:**
- Technisches Signal + Makro-Regime + Fear & Greed + Whale-Positionierung werden zusammengeführt
- Widersprüche werden als "Vorsicht"-Hinweis angezeigt
- **Klartext-Begründung statt Blackbox:** unter jedem Kaufen/Verkaufen/Halten-Badge steht ein kurzer, laienverständlicher Satz ("Vor allem, weil der kurzfristige Kurstrend über dem langfristigen liegt..."), erzeugt von `explainSignal()` in `lib/signals.js` aus denselben Teilsignalen, die auch in `combineSignal()` einfließen -- reine Anzeige-Funktion, verändert den Score selbst nicht. Zusätzlich haben RSI/MACD/SMA/Volumen/Whale im Dashboard jetzt Tooltips mit einer laienverständlichen Erklärung des Begriffs. Explizit als Pull-Faktor für Retail-/Neuling-Investoren gedacht, die nicht wissen, was RSI oder MACD bedeuten, aber trotzdem nachvollziehen wollen, warum die App eine bestimmte Einschätzung zeigt.
- **Onboarding-Tour beim ersten Besuch:** `components/OnboardingTour.js`, ein kurzer 4-Schritte-Walkthrough (Was macht die App / wie liest man die Erklärungen & Tooltips / Verweis auf die Validierungs-Historie als Vertrauensanker / "kein Anlageberater"-Hinweis), einmal pro Browser via `localStorage`-Flag `onboardingTourSeen` (gleiches Muster wie `InstallPrompt.js`s Install-Banner-Dismiss).
- **Einsteiger-Modus (🎓, Header-Button):** blendet pro Coin-Karte die technischen Zeilen (RSI/MACD/SMA/Volumen/Whale/Liquidität) standardmäßig aus, übrig bleiben nur Preis, Einschätzung, Warum-Erklärung und Tipp -- ein Klick auf "Details anzeigen" holt alles zurück. Persistiert per `localStorage`-Flag `beginnerMode`, standardmäßig aus (bestehende Nutzer sehen keine Verhaltensänderung, bis sie aktiv umschalten).
- **Bollinger/Stochastic RSI/OBV/Starke Kerze/Marubozu fließen standardmäßig NICHT ins Kaufen/Verkaufen-Signal ein**, obwohl sie – anders als Whale – voll historisch verfügbar wären: ein Walk-Forward-Vergleich (08./09.08.2026, jeder Indikator einzeln über 3 Zeitfenster getestet, siehe Commit-Historie) zeigte, dass keiner davon konsistent die Out-of-Sample-Rendite/Sharpe verbessert (Bollinger/StochRSI/OBV meist schädlich, Starke Kerze gemischt, Marubozu praktisch im Rauschen – zu seltenes Muster). Sie werden weiterhin berechnet und im Dashboard als Info-Zeilen (abgedunkelt) angezeigt, sind aber deaktivierbar/aktivierbar über `useBollinger`/`useStochRsi`/`useObv`/`useStrongCandle`/`useMarubozu` in `runBacktest` bzw. `boll=1`/`stoch=1`/`obv=1`/`candle=1`/`marubozu=1` in der Walk-Forward-API – für alle, die selbst mit anderen Gewichten/Schwellenwerten experimentieren wollen.
- **Nasdaq-Trend fließt ebenfalls standardmäßig NICHT in den Makro-Score ein**, trotz einer positiven Pearson-Korrelationsstudie (09.08.2026, BTC-Forward-14-Tage-Rendite gegen 90-Tage-Nasdaq-Trend, n≈2050 Tage, r≈0.10): ein anschließender Multi-Coin-Walk-Forward-Vergleich mit/ohne Score-Beitrag über 365/730/850 Tage zeigte keinen robusten Vorteil (uneinheitlich über die Fenster – 730 Tage klar besser ohne, 850 Tage etwas besser mit). Gleiche Behandlung wie oben: berechnet/angezeigt, aber standardmäßig aus, aktivierbar über `useNasdaq` in `runBacktest` bzw. `nasdaq=1` in Backtest-/Walk-Forward-API. **S&P 500 fließt gar nicht erst ein** – die Korrelationsstudie zeigte hier von vornherein keinen belastbaren Zusammenhang.

---

## Datenquellen

- **Krypto-Kurse:** [Binance API](https://binance-docs.github.io/apidocs/spot/en/) (kostenlos, kein Key nötig, volle Tages-Historie seit Listing)
- **Whale/Top-Trader-Positionierung:** [Binance Futures Data](https://binance-docs.github.io/apidocs/futures/en/#top-trader-long-short-ratio-position) (kostenlos, kein Key nötig, ~30 Tage Historie – nur Dashboard/Cron)
- **Orderbuch/Liquidität:** [Binance Spot Depth](https://binance-docs.github.io/apidocs/spot/en/#order-book) (kostenlos, kein Key nötig, nur aktuelle Momentaufnahme – nur Dashboard)
- **M2-Geldmenge:** [FRED M2SL](https://fred.stlouisfed.org/series/M2SL)
- **US-Leitzins:** [FRED FEDFUNDS](https://fred.stlouisfed.org/series/FEDFUNDS)
- **Dollar-Index:** [FRED DTWEXBGS](https://fred.stlouisfed.org/series/DTWEXBGS)
- **10J-Staatsanleihe-Rendite:** [FRED DGS10](https://fred.stlouisfed.org/series/DGS10)
- **VIX:** [FRED VIXCLS](https://fred.stlouisfed.org/series/VIXCLS)
- **Nasdaq Composite:** [FRED NASDAQCOM](https://fred.stlouisfed.org/series/NASDAQCOM)
- **S&P 500:** [FRED SP500](https://fred.stlouisfed.org/series/SP500)

---

## Disclaimer

Dies ist ein Lern- und Demoprojekt, keine Anlageberatung.
