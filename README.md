# Krypto Signal Dashboard

Live-Krypto-Signale (BTC, ETH, SOL) kombiniert mit echten Makrodaten (M2-Geldmenge, US-Leitzins).

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

---

## Online deployen (kostenlos, mit Vercel)

1. Kostenlosen Account anlegen: https://vercel.com
2. Dein Projekt bei GitHub hochladen (oder Vercel CLI nutzen):
   - Einfachste Variante: https://vercel.com/new → "Import from GitHub"
3. Beim Einrichten unter "Environment Variables" hinzufügen:
   - Name: `FRED_API_KEY`
   - Value: dein FRED-Key
4. Deploy klicken → fertig. Du bekommst eine öffentliche URL wie `https://krypto-signal-xyz.vercel.app`

---

## Wie die Signale funktionieren

**Technisches Signal (SMA-Crossover):**
- SMA10 = gleitender Durchschnitt der letzten 10 Tage
- SMA30 = gleitender Durchschnitt der letzten 30 Tage
- Kreuzt SMA10 den SMA30 von unten → **Kaufen**
- Kreuzt SMA10 den SMA30 von oben → **Verkaufen**
- Sonst → **Halten**

**Makro-Regime:**
- Basiert auf M2-Geldmengenwachstum (YoY) minus 2× dem Leitzins-Trend (3 Monate)
- Positiver Score → **Risk-on** (gut für Krypto)
- Negativer Score → **Risk-off** (schlecht für Krypto)

**Kombiniertes Signal:**
- Technisches Signal + Makro-Regime werden zusammengeführt
- Widersprüche werden als "Vorsicht"-Hinweis angezeigt

---

## Datenquellen

- **Krypto-Kurse:** [CoinGecko API](https://www.coingecko.com/api) (kostenlos, kein Key nötig)
- **M2-Geldmenge:** [FRED M2SL](https://fred.stlouisfed.org/series/M2SL)
- **US-Leitzins:** [FRED FEDFUNDS](https://fred.stlouisfed.org/series/FEDFUNDS)

---

## Disclaimer

Dies ist ein Lern- und Demoprojekt, keine Anlageberatung.
