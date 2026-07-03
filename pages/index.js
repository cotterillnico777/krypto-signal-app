import { useEffect, useState } from "react";

function ema(arr, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(...new Array(period - 1).fill(null), prev);
  for (let i = period; i < arr.length; i++) {
    prev = arr[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function computeMACD(prices) {
  if (prices.length < 26) return { macd: null, signal: null, prevMacd: null, prevSignal: null };
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = prices.map((_, i) => ema12[i] != null && ema26[i] != null ? ema12[i] - ema26[i] : null);
  const validMacd = macdLine.filter(v => v != null);
  const signalLine = ema(validMacd, 9);
  const last = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return { macd: last, signal: lastSignal, prevMacd: macdLine[macdLine.length - 2], prevSignal: signalLine[signalLine.length - 2] };
}

function macdSignal(macd) {
  if (!macd.macd || !macd.signal) return { label: "n/a", dir: 0 };
  const crossed = macd.prevMacd <= macd.prevSignal && macd.macd > macd.signal;
  const crossedDown = macd.prevMacd >= macd.prevSignal && macd.macd < macd.signal;
  if (crossed) return { label: "Kaufen (Crossover)", dir: 1 };
  if (crossedDown) return { label: "Verkaufen (Crossover)", dir: -1 };
  return macd.macd > macd.signal ? { label: "Bullish", dir: 0.5 } : { label: "Bearish", dir: -0.5 };
}

function volumeSignal(volumes) {
  if (!volumes || volumes.length < 10) return { label: "n/a", dir: 0 };
  const avgVol = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
  const lastVol = volumes[volumes.length - 1];
  const ratio = lastVol / avgVol;
  if (ratio > 1.5) return { label: `+${((ratio-1)*100).toFixed(0)}% vs Ø`, dir: 1 };
  if (ratio < 0.6) return { label: `${((ratio-1)*100).toFixed(0)}% vs Ø`, dir: -0.5 };
  return { label: `${((ratio-1)*100).toFixed(0)}% vs Ø`, dir: 0 };
}

function sma(arr, period) {
  return arr.map((_, i) => i < period - 1 ? null : arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
}

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function rsiLabel(rsi) {
  if (rsi === null) return { text: "n/a", cls: "badge-gray" };
  if (rsi >= 70) return { text: `${rsi.toFixed(0)} – Überkauft`, cls: "badge-red" };
  if (rsi <= 30) return { text: `${rsi.toFixed(0)} – Überverkauft`, cls: "badge-green" };
  return { text: `${rsi.toFixed(0)} – Neutral`, cls: "badge-gray" };
}

function smaSignal(prices) {
  const p10 = Math.min(10, Math.floor(prices.length / 3));
  const p30 = Math.min(30, Math.floor(prices.length * 2 / 3));
  const s10 = sma(prices, p10), s30 = sma(prices, p30);
  const last = prices.length - 1, prev = last - 1;
  if (!s10[last] || !s30[last]) return { label: "Neutral", dir: 0 };
  const now = s10[last] - s30[last], before = s10[prev] - s30[prev];
  if (before <= 0 && now > 0) return { label: "Kaufen", dir: 1 };
  if (before >= 0 && now < 0) return { label: "Verkaufen", dir: -1 };
  return { label: now > 0 ? "Halten (bullish)" : "Halten (bearish)", dir: now > 0 ? 0.5 : -0.5 };
}

function yoyGrowth(series) {
  if (series.length < 13) return null;
  const last = series[series.length - 1].value, yearAgo = series[series.length - 13].value;
  return ((last - yearAgo) / yearAgo) * 100;
}

function computeMacroRegime(m2, fedfunds) {
  const m2Growth = yoyGrowth(m2);
  const rateNow = fedfunds[fedfunds.length - 1]?.value;
  const rate3mo = fedfunds[fedfunds.length - 4]?.value;
  if (m2Growth == null || rateNow == null || rate3mo == null) return { label: "Unbekannt", cls: "badge-gray", m2Growth, rateNow };
  const score = m2Growth - (rateNow - rate3mo) * 2;
  if (score > 1) return { label: "Risk-on", cls: "badge-green", m2Growth, rateNow };
  if (score < -1) return { label: "Risk-off", cls: "badge-red", m2Growth, rateNow };
  return { label: "Neutral", cls: "badge-gray", m2Growth, rateNow };
}

function combineSignal(smaSig, rsi, macro, fg, macdSig, volSig) {
  let score = smaSig.dir * 1.5 + macdSig.dir * 1.5;
  if (rsi !== null) { if (rsi <= 30) score += 0.8; if (rsi >= 70) score -= 0.8; }
  if (fg !== null) { if (fg <= 25) score += 0.5; if (fg >= 75) score -= 0.5; }
  if (macro.label === "Risk-on") score += 0.3;
  if (macro.label === "Risk-off") score -= 0.3;
  score += volSig.dir * 0.4;
  if (score >= 1.5) return { label: "Kaufen", cls: "badge-green" };
  if (score <= -1.5) return { label: "Verkaufen", cls: "badge-red" };
  if (score > 0) return { label: "Halten (bullish)", cls: "badge-amber" };
  if (score < 0) return { label: "Halten (bearish)", cls: "badge-amber" };
  return { label: "Neutral", cls: "badge-gray" };
}

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
      <circle cx={cx} cy={cy} r={r*0.55} fill="white"/>
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#1a1a18" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={4} fill="#1a1a18"/>
      <text x={cx} y={cy-8} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1a18">{value}</text>
      <text x={cx} y={cy+6} textAnchor="middle" fontSize="6" fill="#6b6a64">{label}</text>
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

export default function Home() {
  const [crypto,setCrypto]=useState(null);
  const [macroRaw,setMacroRaw]=useState(null);
  const [fg,setFg]=useState(null);
  const [active,setActive]=useState("bitcoin");
  const [tf,setTf]=useState("1D");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  async function loadData(timeframe) {
    setLoading(true); setError(null);
    try {
      const [cRes,mRes,fRes]=await Promise.all([
        fetch(`/api/crypto?tf=${timeframe||tf}`),
        fetch("/api/macro"),
        fetch("/api/feargreed"),
      ]);
      const [cJson,mJson,fJson]=await Promise.all([cRes.json(),mRes.json(),fRes.json()]);
      if(cJson.error) throw new Error(cJson.error);
      if(mJson.error) throw new Error(mJson.error);
      setCrypto(cJson); setMacroRaw(mJson); setFg(fJson.error?null:fJson);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(()=>{loadData("1D");},[]);
  function switchTf(newTf) { setTf(newTf); loadData(newTf); }

  const macro=macroRaw?computeMacroRegime(macroRaw.m2,macroRaw.fedfunds):null;
  const activeCoin=crypto?.find((c)=>c.id===active);
  const tfLabel=TIMEFRAMES.find(t=>t.key===tf)?.label||tf;

  return (
    <div className="container">
      <h1>Krypto Signal Dashboard</h1>
      <p className="subtitle">Binance · FRED · Fear &amp; Greed · SMA + RSI + MACD + Volumen + Makro</p>

      {error&&<div className="error-box">Fehler: {error}<div style={{marginTop:8}}><button onClick={()=>loadData(tf)}>Erneut versuchen</button></div></div>}
      {loading&&!error&&<p>Lade aktuelle Daten…</p>}

      {!loading&&!error&&macro&&(<>
        <div className="grid grid-3" style={{marginBottom:"1rem"}}>
          <div className="card"><p className="card-label">M2-Geldmenge (YoY)</p><p className="card-value">{macro.m2Growth?.toFixed(1)??"n/a"}%</p></div>
          <div className="card"><p className="card-label">Leitzins (aktuell)</p><p className="card-value">{macro.rateNow?.toFixed(2)??"n/a"}%</p></div>
          <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
            <p className="card-label" style={{alignSelf:"flex-start"}}>Fear &amp; Greed Index</p>
            {fg?<FearGreedGauge value={fg.value} label={fg.label}/>:<p>n/a</p>}
          </div>
        </div>

        <div className={`card ${macro.cls}`} style={{marginBottom:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:600}}>Makro-Regime: {macro.label}</span>
          <span style={{fontSize:12,color:"#6b6a64"}}>M2-Trend minus 2× Zins-Trend</span>
        </div>

        <div style={{display:"flex",gap:"8px",marginBottom:"1.5rem",flexWrap:"wrap",alignItems:"center"}}>
          <div className="tabs" style={{margin:0}}>
            {crypto.map((c)=><button key={c.id} className={active===c.id?"active":""} onClick={()=>setActive(c.id)}>{c.symbol}</button>)}
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:"6px",alignItems:"center"}}>
            {TIMEFRAMES.map((t)=>(
              <button key={t.key} className={tf===t.key?"active":""} onClick={()=>switchTf(t.key)} style={{padding:"5px 10px",fontSize:12}}>{t.key}</button>
            ))}
            <button onClick={()=>loadData(tf)} style={{marginLeft:4}}>↻</button>
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
            const combined=combineSignal(smaSig,rsi,macro,fg?.value??null,macdSig,volSig);
            return(
              <div className="card" key={c.id} style={{cursor:"pointer"}} onClick={()=>setActive(c.id)}>
                <p className="card-label">{c.name}</p>
                <p className="card-value">${fmtUSD(c.price)}</p>
                <span className={`badge ${combined.cls}`} style={{marginBottom:8,fontSize:13}}>{combined.label}</span>
                <p className="note">{c.change24h>=0?"+":""}{c.change24h.toFixed(1)}% (24h)</p>
                <p className="note">RSI: <span className={`badge ${rsiInfo.cls}`} style={{fontSize:11,padding:"1px 6px"}}>{rsiInfo.text}</span></p>
                <p className="note">MACD: {macdSig.label}</p>
                <p className="note">SMA: {smaSig.label}</p>
                <p className="note">Volumen: {volSig.label}</p>
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
