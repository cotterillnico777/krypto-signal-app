// Statische Datenquelle für den Learn-Hub (pages/learn.js) -- gleiches
// "Daten in JS, keine Lektionstexte erfunden"-Prinzip wie lib/glossary.js/
// lib/validationHistory.js. `id` deckt sich für 5 der 6 Pfade direkt mit den
// Zielwerten aus pages/api/profile/goal.js' ALLOWED_GOALS (learn_money/
// start_investing/understand_etfs/understand_crypto/learn_trading) -- macht
// eine spätere Personalisierung anhand von profiles.onboarding_goal für
// diese 5 trivial (einfacher Array-find nach id). "save_avoid_traps" hat
// keine eigene Entsprechung im Onboarding (dort nicht abgefragt), und das
// Onboarding-Ziel "structure_trading" (bereits tradende Nutzer) hat keinen
// eigenen Pfad -- würde bei künftiger Personalisierung auf "learn_trading"
// zeigen. Diese Datei implementiert noch keine Personalisierung selbst.
// Alle 6 Pfade sind ehrlich als "in Vorbereitung" markiert -- es existiert
// noch keine einzige Lektion, daher darf keiner als "verfügbar" erscheinen.
export const LEARN_PATHS = [
  {
    id: "learn_money",
    titleKey: "learn.pathMoneyTitle",
    audienceKey: "learn.pathMoneyAudience",
    goalKey: "learn.pathMoneyGoal",
    modulesKey: ["learn.pathMoneyModule1", "learn.pathMoneyModule2", "learn.pathMoneyModule3"],
    status: "in_preparation",
  },
  {
    id: "save_avoid_traps",
    titleKey: "learn.pathSavingTitle",
    audienceKey: "learn.pathSavingAudience",
    goalKey: "learn.pathSavingGoal",
    modulesKey: ["learn.pathSavingModule1", "learn.pathSavingModule2", "learn.pathSavingModule3"],
    status: "in_preparation",
  },
  {
    id: "start_investing",
    titleKey: "learn.pathInvestingTitle",
    audienceKey: "learn.pathInvestingAudience",
    goalKey: "learn.pathInvestingGoal",
    modulesKey: ["learn.pathInvestingModule1", "learn.pathInvestingModule2", "learn.pathInvestingModule3"],
    status: "in_preparation",
  },
  {
    id: "understand_etfs",
    titleKey: "learn.pathEtfTitle",
    audienceKey: "learn.pathEtfAudience",
    goalKey: "learn.pathEtfGoal",
    modulesKey: ["learn.pathEtfModule1", "learn.pathEtfModule2", "learn.pathEtfModule3"],
    status: "in_preparation",
  },
  {
    id: "understand_crypto",
    titleKey: "learn.pathCryptoTitle",
    audienceKey: "learn.pathCryptoAudience",
    goalKey: "learn.pathCryptoGoal",
    modulesKey: ["learn.pathCryptoModule1", "learn.pathCryptoModule2", "learn.pathCryptoModule3"],
    status: "in_preparation",
  },
  {
    id: "learn_trading",
    titleKey: "learn.pathTradingTitle",
    audienceKey: "learn.pathTradingAudience",
    goalKey: "learn.pathTradingGoal",
    modulesKey: ["learn.pathTradingModule1", "learn.pathTradingModule2", "learn.pathTradingModule3"],
    status: "in_preparation",
  },
];
