# Krypto Signal Dashboard

Live-Krypto-Signale (BTC, ETH, SOL, XRP, TAO) kombiniert mit echten Makrodaten (M2-Geldmenge, US-Leitzins), Fear & Greed Index und KI-Analyse. Als installierbare PWA mit Push-Benachrichtigungen bei Kaufsignalen.

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
- Der Stop-Loss prüft pro simuliertem Tag das Tagestief gegen den Einstiegspreis und schließt die Position zum Stop-Kurs – realistischer als ein reiner Schlusskurs-Check, aber immer noch ohne Slippage.
- Reine historische Simulation, keine Garantie für zukünftige Ergebnisse und keine Anlageberatung.

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

### 4. Automatische Prüfung (Cron-Job)
`vercel.json` enthält bereits einen Cron-Job, der `/api/cron/check-signals` täglich um 07:00 UTC aufruft (im kostenlosen Vercel-Hobby-Plan ist 1×/Tag das Maximum). Uhrzeit anpassbar über das `schedule`-Feld (Cron-Syntax).

Damit der Cron-Endpunkt nicht von außen missbraucht werden kann, ist er über `CRON_SECRET` geschützt. Vercel setzt bei aktiviertem Cron automatisch den passenden `Authorization`-Header. Trage `CRON_SECRET` (siehe `.env.local`) zusätzlich als Environment Variable bei Vercel ein.

Manuell testen (lokal):
```
curl "http://localhost:3000/api/cron/check-signals?secret=DEIN_CRON_SECRET"
```

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
4. Deploy klicken → fertig. Du bekommst eine öffentliche URL wie `https://krypto-signal-xyz.vercel.app`. Der Cron-Job wird automatisch aus `vercel.json` übernommen (sichtbar unter Project → Settings → Cron Jobs).

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

**Kombiniertes Signal:**
- Technisches Signal + Makro-Regime + Fear & Greed werden zusammengeführt
- Widersprüche werden als "Vorsicht"-Hinweis angezeigt

---

## Datenquellen

- **Krypto-Kurse:** [Binance API](https://binance-docs.github.io/apidocs/spot/en/) (kostenlos, kein Key nötig, volle Tages-Historie seit Listing)
- **M2-Geldmenge:** [FRED M2SL](https://fred.stlouisfed.org/series/M2SL)
- **US-Leitzins:** [FRED FEDFUNDS](https://fred.stlouisfed.org/series/FEDFUNDS)
- **Dollar-Index:** [FRED DTWEXBGS](https://fred.stlouisfed.org/series/DTWEXBGS)
- **10J-Staatsanleihe-Rendite:** [FRED DGS10](https://fred.stlouisfed.org/series/DGS10)
- **VIX:** [FRED VIXCLS](https://fred.stlouisfed.org/series/VIXCLS)

---

## Disclaimer

Dies ist ein Lern- und Demoprojekt, keine Anlageberatung.
