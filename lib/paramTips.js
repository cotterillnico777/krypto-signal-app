// Pro-Coin-Empfehlungen für Backtest-Parameter (Hebel, Long/Short, Stop-Loss),
// angezeigt als Dashboard-Tipp. Empirisch ermittelt via Multi-Fold Walk-Forward
// (/api/walkforward, das etablierte Verfahren dieses Projekts) über zwei
// unabhängige Zeitfenster (730 und 850 Tage) -- ein Parameter-Set gilt hier nur
// dann als "Tipp", wenn es in BEIDEN Fenstern die Standardeinstellung (1x, Nur
// Long, kein Stop) auf Ø-Out-of-Sample-Rendite UND Sharpe schlägt UND dabei
// selbst profitabel bleibt. "Nur in einem Fenster besser" reicht nicht -- genau
// das Muster, vor dem lib/validationHistory.js wiederholt warnt (z.B. TAO: ein
// 730-Tage-Kandidat kippte bei 850 Tagen ins Negative, siehe unten).
//
// Getestetes Raster pro Coin: Hebel {1x,2x,3x} × Richtung {Nur Long,Long+Short}
// (Stufe 1), danach Stop-Loss {kein,-10%,-15%,-20%} auf der besten Stufe-1-
// Kombination (Stufe 2). Datum: 2026-08-13.
//
// hasTip: false bedeutet nicht "nichts getestet", sondern "getestet, aber
// keine robuste Verbesserung gefunden" -- bewusst genauso ehrlich behandelt
// wie ein "rejected"-Eintrag in der Validierungs-Historie.
export const PARAM_TIPS = {
  bitcoin: {
    hasTip: false,
    note:
      "Kein robuster Tipp: -15% Stop-Loss verbesserte beide Kennzahlen leicht gegenüber der Standardeinstellung (Ø-Rendite -4,2%/-8,2% statt -6,9%/-11,4% über 730/850 Tage), blieb aber in beiden Testfenstern im Minus.",
  },
  ethereum: {
    hasTip: true,
    leverage: 1,
    allowShort: true,
    stopLossPct: 10,
    label: "1x Long+Short, -10% Stop-Loss",
    evidence:
      "Ø Out-of-Sample-Rendite +15,2%/+1,6% (Standard: +4,2%/-13,7%) über 730/850 Tage, Sharpe 1,25/0,32 (Standard: 0,45/-0,86).",
  },
  solana: {
    hasTip: false,
    note:
      "Kein robuster Tipp: keine der getesteten Hebel-/Richtungs-/Stop-Loss-Kombinationen schlug die Standardeinstellung in beiden Testfenstern.",
  },
  ripple: {
    hasTip: true,
    leverage: 2,
    allowShort: true,
    stopLossPct: null,
    label: "2x Long+Short, kein Stop-Loss",
    evidence:
      "Ø Out-of-Sample-Rendite +7,5%/+78,6% (Standard: -8,5%/+59,9%) über 730/850 Tage, Sharpe 0,79/1,49 (Standard: -0,38/0,68).",
  },
  bittensor: {
    hasTip: false,
    note:
      "Kein robuster Tipp: sowohl 1x Long+Short als auch -15% Stop-Loss sahen im 730-Tage-Fenster vielversprechend aus, fielen im 850-Tage-Fenster aber jeweils hinter die Standardeinstellung zurück -- bei TAOs kurzer, volatiler Historie kein verlässliches Muster.",
  },
};
