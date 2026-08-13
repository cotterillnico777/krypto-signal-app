import { useEffect, useState } from "react";
import {
  computeMACD,
  macdSignal,
  volumeSignal,
  computeRSI,
  rsiLabel,
  smaSignal,
  computeMacroRegime,
  combineSignal,
  whaleSignal,
  liquidityLabel,
  computeBollinger,
  bollingerSignal,
  computeStochRSI,
  stochRsiSignal,
  computeOBVSignal,
  strongCandleSignal,
  marubozuSignal,
} from "../lib/signals";
import { PARAM_TIPS } from "../lib/paramTips";
import PushSubscribeButton from "../components/PushSubscribeButton";
import InstallPrompt from "../components/InstallPrompt";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";

export const getServerSideProps = requireActiveAccess;

function fmtUSD(n) { return n.toLocaleString("de-DE", { maximumFractionDigits: n < 10 ? 3 : 0 }); }

function FearGreedGauge({ value, label }) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const angle = -90 + (value / 100) * 180;
  const r = 60, cx = 80, cy = 75;
  const needleX = cx + r * 0.8 * Math.cos(toRad(angle - 90));
  const needleY = cy + r * 0.8 * Math.sin(toRad(angle - 90));
  return (
    <svg viewBox="0 0 160 90" width="100%" style={{ maxWidth: 200 }}>
      {[["#dc2626",180,144],["#ea580c",144,108],["#ca8a04",108,72],["#16a34a",72,36],["#15803d",36,0]].map(([c,from,to]) => {
        const x1=cx+r*Math.cos(toRad(from-90)),y1=cy+r*Math.sin(toRad(from-90));
        const x2=cx+r*Math.cos(toRad(to-90)),y2=cy+r*Math.sin(toRad(to-90));
        return <path key={c} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={c} opacity="0.85"/>;
      })}
      <circle cx={cx} cy={cy} r={r*0.55} style={{fill:"var(--bg-elevated)"}}/>
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} style={{stroke:"var(--text)"}} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={4} style={{fill:"var(--text)"}}/>
      <text x={cx} y={cy-8} textAnchor="middle" fontSize="14" fontWeight="700" style={{fill:"var(--text)"}}>{value}</text>
      <text x={cx} y={cy+6} textAnchor="middle" fontSize="6" style={{fill:"var(--text-muted)"}}>{label}</text>
    </svg>
  );
}

function Sparkline({ prices }) {
  if (!prices || prices.length < 2) return null;
  const w=400,h=80,pad=4;
  const min=Math.min(...prices),max=Math.max(...prices),range=max-min||1;
  const points=prices.map((p,i)=>{
    const x=pad+(i/(prices.length-1))*(w-pad*2);
    const y=h-pad-((p-min)/range)*(h-pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const isUp=prices[prices.length-1]>=prices[0];
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}><polyline points={points} fill="none" stroke={isUp?"#16a34a":"#dc2626"} strokeWidth="2"/></svg>;
}

const TIMEFRAMES = [
  { key: "4H", label: "4 Stunden" },
  { key: "1D", label: "Täglich" },
  { key: "1W", label: "Wöchentlich" },
];

export default function Home({ user, access }) {
  const [crypto,setCrypto]=useState(null);
  const [macroRaw,setMacroRaw]=useState(null);
  const [fg,setFg]=useState(null);
  const [whale,setWhale]=useState(null);
  const [liquidity,setLiquidity]=useState(null);
  const [active,setActive]=useState("bitcoin");
  const [tf,setTf]=useState("1D");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [aiAnalysis,setAiAnalysis]=useState({});
  const [aiLoading,setAiLoading]=useState({});

  async function loadData(timeframe) {
    setLoading(true); setError(null); setAiAnalysis({});
    try {
      const [cRes,mRes,fRes,wRes,lRes]=await Promise.all([
        fetch(`/api/crypto?tf=${timeframe||tf}`),
        fetch("/api/macro"),
        fetch("/api/feargreed"),
        fetch("/api/whale"),
        fetch("/api/liquidity"),
      ]);
      const [cJson,mJson,fJson,wJson,lJson]=await Promise.all([cRes.json(),mRes.json(),fRes.json(),wRes.json(),lRes.json()]);
      if(cJson.error) throw new Error(cJson.error);
      if(mJson.error) throw new Error(mJson.error);
      setCrypto(cJson); setMacroRaw(mJson); setFg(fJson.error?null:fJson); setWhale(wJson.error?null:wJson); setLiquidity(lJson.error?null:lJson);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }

  async function getAiAnalysis(coin, rsi, macd, smaSig, volSig, macro, price, change24h, whaleSig, bollSig, stochRsiSig, obvSig, candleSig, marubozuSig) {
    setAiLoading(prev => ({ ...prev, [coin.id]: true }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin: coin.name,
          price, change24h, rsi: rsi?.toFixed(0),
          macd: macd.label, sma: smaSig.label,
          volume: volSig.label,
          macro: macro.label,
          feargreed: fg ? `${fg.value} (${fg.label})` : "n/a",
          whale: whaleSig ? whaleSig.label : "n/a",
          bollinger: bollSig.label,
          stochRsi: stochRsiSig.label,
          obv: obvSig.label,
          candle: candleSig ? candleSig.label : "n/a",
          marubozu: marubozuSig ? marubozuSig.label : "n/a",
          tf,
        }),
      });
      const data = await res.json();
      setAiAnalysis(prev => ({ ...prev, [coin.id]: data.analysis || data.error }));
    } catch(e) {
      setAiAnalysis(prev => ({ ...prev, [coin.id]: "Fehler beim Laden der KI-Analyse." }));
    } finally {
      setAiLoading(prev => ({ ...prev, [coin.id]: false }));
    }
  }

  useEffect(()=>{loadData("1D");},[]);
  function switchTf(newTf) { setTf(newTf); loadData(newTf); }

  const macro=macroRaw?computeMacroRegime(macroRaw.m2,macroRaw.fedfunds,macroRaw.dxy,macroRaw.yield10y,macroRaw.vix,macroRaw.sp500,macroRaw.nasdaq):null;
  const activeCoin=crypto?.find((c)=>c.id===active);
  const tfLabel=TIMEFRAMES.find(t=>t.key===tf)?.label||tf;

  return (
    <div className="container">
      <AppHeader
        title="Krypto Signal Dashboard"
        subtitle="Binance · FRED · Fear & Greed · SMA + RSI + MACD + Volumen + Bollinger + StochRSI + OBV + Kerze + Marubozu + Whale + KI"
        active="dashboard"
        user={user}
        access={access}
      >
        <PushSubscribeButton />
        <button className="icon-btn" onClick={()=>loadData(tf)} title="Aktualisieren">↻ Aktualisieren</button>
      </AppHeader>

      <InstallPrompt />

      {error&&<div className="error-box">Fehler: {error}<div style={{marginTop:8}}><button onClick={()=>loadData(tf)}>Erneut versuchen</button></div></div>}
      {loading&&!error&&<div className="loading-state"><span className="spinner" />Lade aktuelle Daten…</div>}

      {!loading&&!error&&macro&&(<>
        <div className="grid grid-3" style={{marginBottom:"1rem"}}>
          <div className="card"><p className="card-label">M2-Geldmenge (YoY)</p><p className="card-value">{macro.m2Growth?.toFixed(1)??"n/a"}%</p></div>
          <div className="card"><p className="card-label">Leitzins (aktuell)</p><p className="card-value">{macro.rateNow?.toFixed(2)??"n/a"}%</p></div>
          <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
            <p className="card-label" style={{alignSelf:"flex-start"}}>Fear &amp; Greed Index</p>
            {fg?<FearGreedGauge value={fg.value} label={fg.label}/>:<p>n/a</p>}
          </div>
        </div>

        <div className="grid grid-3" style={{marginBottom:"1rem"}}>
          <div className="card"><p className="card-label">Dollar-Index (3M-Trend)</p><p className="card-value">{macro.dxyTrend!=null?`${macro.dxyTrend>=0?"+":""}${macro.dxyTrend.toFixed(1)}%`:"n/a"}</p></div>
          <div className="card"><p className="card-label">10J-Rendite (3M-Trend)</p><p className="card-value">{macro.yieldTrend!=null?`${macro.yieldTrend>=0?"+":""}${macro.yieldTrend.toFixed(2)}pp`:"n/a"}</p></div>
          <div className="card"><p className="card-label">VIX (aktuell)</p><p className="card-value">{macro.vixLevel?.toFixed(1)??"n/a"}</p></div>
        </div>

        <div className="grid grid-3" style={{marginBottom:"1rem"}}>
          <div className="card" style={{opacity:0.65}} title="Fließt nicht ins Makro-Regime ein (Walk-Forward-Vergleich 09.08.2026 zeigte trotz positiver Korrelationsstudie keinen robusten Vorteil über 365/730/850 Tage)"><p className="card-label">Nasdaq (90T-Trend)</p><p className="card-value">{macro.nasdaqTrend!=null?`${macro.nasdaqTrend>=0?"+":""}${macro.nasdaqTrend.toFixed(1)}%`:"n/a"}</p></div>
          <div className="card" style={{opacity:0.65}} title="Fließt nicht ins Makro-Regime ein (Korrelationsstudie 09.08.2026 zeigte zu schwachen/uneinheitlichen Zusammenhang)"><p className="card-label">S&amp;P 500 (3M-Trend)</p><p className="card-value">{macro.sp500Trend!=null?`${macro.sp500Trend>=0?"+":""}${macro.sp500Trend.toFixed(1)}%`:"n/a"}</p></div>
        </div>

        <div className={`card macro-banner ${macro.cls}`}>
          <span className="label">Makro-Regime: {macro.label}</span>
          <span className="hint">M2 · Zins-Trend · Dollar · 10J-Rendite · VIX</span>
        </div>

        <div className="toolbar">
          <div className="tabs">
            {crypto.map((c)=><button key={c.id} className={active===c.id?"active":""} onClick={()=>setActive(c.id)}>{c.symbol}</button>)}
          </div>
          <div className="timeframe-group">
            {TIMEFRAMES.map((t)=>(
              <button key={t.key} className={tf===t.key?"active":""} onClick={()=>switchTf(t.key)} style={{padding:"5px 10px",fontSize:12}}>{t.key}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-3" style={{marginBottom:"1.5rem"}}>
          {crypto.map((c)=>{
            const rsi=computeRSI(c.prices);
            const rsiInfo=rsiLabel(rsi);
            const smaSig=smaSignal(c.prices);
            const macd=computeMACD(c.prices);
            const macdSig=macdSignal(macd);
            const volSig=volumeSignal(c.volumes);
            const whaleSig=whale?.[c.id]?whaleSignal(whale[c.id]):null;
            const bollSig=bollingerSignal(computeBollinger(c.prices).percentB);
            const stochRsiSig=stochRsiSignal(computeStochRSI(c.prices).k);
            const obvSig=computeOBVSignal(c.prices,c.volumes);
            const candleSig=c.highs&&c.lows?strongCandleSignal(c.highs,c.lows,c.prices):{label:"n/a",dir:0};
            const marubozuSig=c.opens&&c.highs&&c.lows?marubozuSignal(c.opens,c.highs,c.lows,c.prices):{label:"n/a",dir:0};
            const combined=combineSignal(smaSig,rsi,macro,fg?.value??null,macdSig,volSig,{whaleSig});
            const isUp = c.change24h>=0;
            return(
              <div className={`card coin-card${active===c.id?" selected":""}`} key={c.id} onClick={()=>setActive(c.id)}>
                <div className="coin-card-top">
                  <p className="card-label" style={{margin:0}}>{c.name}</p>
                  <span className={`change-pill ${isUp?"up":"down"}`}>{isUp?"+":""}{c.change24h.toFixed(1)}%</span>
                </div>
                <p className="card-value">${fmtUSD(c.price)}</p>
                <span className={`badge ${combined.cls}`} style={{marginBottom:8,fontSize:13}}>{combined.label}</span>
                {PARAM_TIPS[c.id]&&(PARAM_TIPS[c.id].hasTip?(
                  <p
                    className="note"
                    style={{background:"var(--bg-subtle)",borderRadius:6,padding:"6px 8px",marginTop:0,marginBottom:8}}
                    title={`Aus dem Backtest ermittelt (Multi-Fold Walk-Forward, 730+850 Tage): ${PARAM_TIPS[c.id].evidence} Keine Anlageberatung -- historische Auswertung, keine Garantie für die Zukunft.`}
                  >
                    <span className="note-label">💡 Tipp</span>
                    <span className="badge badge-green" style={{fontSize:11,padding:"1px 6px"}}>{PARAM_TIPS[c.id].label}</span>
                  </p>
                ):(
                  <p
                    className="note"
                    style={{opacity:0.55,marginTop:0,marginBottom:8}}
                    title={PARAM_TIPS[c.id].note}
                  >
                    <span className="note-label">💡 Tipp</span>
                    <span style={{fontSize:12}}>Standardeinstellung bleibt beste bekannte Wahl</span>
                  </p>
                ))}
                <p className="note"><span className="note-label">RSI</span><span className={`badge ${rsiInfo.cls}`} style={{fontSize:11,padding:"1px 6px"}}>{rsiInfo.text}</span></p>
                <p className="note"><span className="note-label">MACD</span>{macdSig.label}</p>
                <p className="note"><span className="note-label">SMA</span>{smaSig.label}</p>
                <p className="note"><span className="note-label">Volumen</span>{volSig.label}</p>
                {whaleSig&&<p className="note"><span className="note-label">🐋 Whale</span>{whaleSig.label}</p>}
                {liquidity?.[c.id]&&(()=>{const liq=liquidityLabel(liquidity[c.id].spreadPct);return(
                  <p className="note" style={{opacity:0.65}} title="Fließt nicht ins Kaufen/Verkaufen-Signal ein -- reiner Marktkontext, keine Historie verfügbar (nur Live-Momentaufnahme)">
                    <span className="note-label">💧 Liquidität</span>
                    <span className={`badge ${liq.cls}`} style={{fontSize:11,padding:"1px 6px"}}>{liq.text}</span>
                    <span style={{marginLeft:6}}>${(liquidity[c.id].depthUsd/1000).toFixed(0)}k Tiefe (±1%)</span>
                  </p>
                );})()}
                <p className="note" style={{opacity:0.65}} title="Fließt nicht ins Kaufen/Verkaufen-Signal ein (siehe Walk-Forward-Vergleich)"><span className="note-label">Bollinger</span>{bollSig.label}</p>
                <p className="note" style={{opacity:0.65}} title="Fließt nicht ins Kaufen/Verkaufen-Signal ein (siehe Walk-Forward-Vergleich)"><span className="note-label">StochRSI</span>{stochRsiSig.label}</p>
                <p className="note" style={{opacity:0.65}} title="Fließt nicht ins Kaufen/Verkaufen-Signal ein (siehe Walk-Forward-Vergleich)"><span className="note-label">OBV</span>{obvSig.label}</p>
                <p className="note" style={{opacity:0.65}} title="Fließt nicht ins Kaufen/Verkaufen-Signal ein (noch nicht validiert)"><span className="note-label">Starke Kerze</span>{candleSig.label}</p>
                <p className="note" style={{opacity:0.65}} title="Fließt nicht ins Kaufen/Verkaufen-Signal ein (noch nicht validiert)"><span className="note-label">Marubozu</span>{marubozuSig.label}</p>
                <button
                  className="ai-btn"
                  onClick={(e)=>{e.stopPropagation();getAiAnalysis(c,rsi,macdSig,smaSig,volSig,macro,c.price,c.change24h,whaleSig,bollSig,stochRsiSig,obvSig,candleSig,marubozuSig);}}
                  disabled={aiLoading[c.id]}
                >
                  {aiLoading[c.id]?"KI analysiert…":"🤖 KI-Analyse"}
                </button>
                {aiAnalysis[c.id]&&(
                  <div className="ai-result">{aiAnalysis[c.id]}</div>
                )}
              </div>
            );
          })}
        </div>

        {activeCoin&&(
          <div className="card">
            <p className="section-title">{activeCoin.name} — Kursverlauf ({tfLabel})</p>
            <Sparkline prices={activeCoin.prices}/>
          </div>
        )}
      </>)}

      <div className="disclaimer">Keine Anlageberatung. Kryptowährungen sind hoch volatil – Investitionen können zum Totalverlust führen.</div>
    </div>
  );
}
