// Pro-Coin-Empfehlungen für Backtest-Parameter (Hebel, Long/Short, Stop-Loss),
// angezeigt als Dashboard- und Backtest-Tipp. Empirisch ermittelt via
// Multi-Fold Walk-Forward (/api/walkforward, das etablierte Verfahren dieses
// Projekts) über zwei unabhängige Zeitfenster (730 und 850 Tage) -- ein
// Parameter-Set gilt nur dann als eigenständiger Tipp (isDefault: false), wenn
// es in BEIDEN Fenstern die Standardeinstellung (1x, Nur Long, kein Stop) auf
// Ø-Out-of-Sample-Rendite UND Sharpe schlägt UND dabei selbst profitabel
// bleibt. "Nur in einem Fenster besser" reicht nicht -- genau das Muster, vor
// dem lib/validationHistory.js wiederholt warnt (z.B. TAO: ein 730-Tage-
// Kandidat kippte bei 850 Tagen ins Negative, siehe unten).
//
// Getestetes Raster pro Coin: Hebel {1x,2x,3x} × Richtung {Nur Long,Long+Short}
// (Stufe 1), danach Stop-Loss {kein,-10%,-15%,-20%} auf der besten Stufe-1-
// Kombination (Stufe 2). Datum: 2026-08-13.
//
// isDefault: true heißt nicht "nichts getestet", sondern "getestet, aber keine
// robuste Verbesserung gefunden -- die Standardeinstellung bleibt die
// empfohlene Wahl". Jeder Coin bekommt trotzdem ein vollständiges, anzeigbares
// Empfehlungs-Objekt (leverage/allowShort/stopLossPct/label), damit Dashboard
// und Backtest immer eine konkrete Einstellung zeigen können, nicht nur einen
// vagen Hinweis.
export const PARAM_TIPS = {
  bitcoin: {
    isDefault: true,
    leverage: 1,
    allowShort: false,
    stopLossPct: null,
    label: "1x Nur Long, kein Stop-Loss (Standard)",
    evidence:
      "Getestete Alternativen verbesserten die Kennzahlen nicht robust: -15% Stop-Loss schlug die Standardeinstellung zwar leicht (Ø-Rendite -4,2%/-8,2% statt -6,9%/-11,4% über 730/850 Tage), blieb aber in beiden Testfenstern im Minus -- kein profitabler Tipp.",
  },
  ethereum: {
    isDefault: false,
    leverage: 1,
    allowShort: true,
    stopLossPct: 10,
    label: "1x Long+Short, -10% Stop-Loss",
    evidence:
      "Ø Out-of-Sample-Rendite +15,2%/+1,6% (Standard: +4,2%/-13,7%) über 730/850 Tage, Sharpe 1,25/0,32 (Standard: 0,45/-0,86).",
  },
  solana: {
    isDefault: true,
    leverage: 1,
    allowShort: false,
    stopLossPct: null,
    label: "1x Nur Long, kein Stop-Loss (Standard)",
    evidence:
      "Keine der getesteten Hebel-/Richtungs-/Stop-Loss-Kombinationen schlug die Standardeinstellung in beiden Testfenstern (730/850 Tage).",
  },
  ripple: {
    isDefault: false,
    leverage: 2,
    allowShort: true,
    stopLossPct: null,
    label: "2x Long+Short, kein Stop-Loss",
    evidence:
      "Ø Out-of-Sample-Rendite +7,5%/+78,6% (Standard: -8,5%/+59,9%) über 730/850 Tage, Sharpe 0,79/1,49 (Standard: -0,38/0,68).",
  },
  bittensor: {
    isDefault: true,
    leverage: 1,
    allowShort: false,
    stopLossPct: null,
    label: "1x Nur Long, kein Stop-Loss (Standard)",
    evidence:
      "Sowohl 1x Long+Short als auch -15% Stop-Loss sahen im 730-Tage-Fenster vielversprechend aus, fielen im 850-Tage-Fenster aber jeweils hinter die Standardeinstellung zurück -- bei TAOs kurzer, volatiler Historie kein verlässliches Muster.",
  },
};
