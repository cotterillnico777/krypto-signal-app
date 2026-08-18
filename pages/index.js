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
  explainSignal,
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
import { relevantHeadlines } from "../lib/news";
import PushSubscribeButton from "../components/PushSubscribeButton";
import InstallPrompt from "../components/InstallPrompt";
import OnboardingTour from "../components/OnboardingTour";
import ReferralCard from "../components/ReferralCard";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { useLanguage, translateSignalLabel } from "../lib/i18n";

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

function signalAccent(cls) {
  if (cls === "badge-green") return "var(--green-text)";
  if (cls === "badge-red") return "var(--red-text)";
  if (cls === "badge-amber") return "var(--amber-text)";
  return "var(--border)";
}

export default function Home({ user, access }) {
  const { t, lang } = useLanguage();
  const TIMEFRAMES = [
    { key: "4H", label: t("dashboard.tf4h") },
    { key: "1D", label: t("dashboard.tf1d") },
    { key: "1W", label: t("dashboard.tf1w") },
  ];
  const [crypto,setCrypto]=useState(null);
  const [macroRaw,setMacroRaw]=useState(null);
  const [fg,setFg]=useState(null);
  const [whale,setWhale]=useState(null);
  const [liquidity,setLiquidity]=useState(null);
  const [news,setNews]=useState([]);
  const [active,setActive]=useState("bitcoin");
  const [tf,setTf]=useState("1D");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [aiAnalysis,setAiAnalysis]=useState({});
  const [aiLoading,setAiLoading]=useState({});
  const [detailsOpen,setDetailsOpen]=useState({});
  const [beginnerMode,setBeginnerMode]=useState(false);

  useEffect(()=>{
    if(typeof window==="undefined") return;
    setBeginnerMode(localStorage.getItem("beginnerMode")==="1");
  },[]);

  function toggleBeginnerMode() {
    setBeginnerMode(prev=>{
      const next=!prev;
      localStorage.setItem("beginnerMode", next?"1":"0");
      return next;
    });
  }

  async function loadData(timeframe) {
    setLoading(true); setError(null); setAiAnalysis({});
    try {
      const [cRes,mRes,fRes,wRes,lRes,nRes]=await Promise.all([
        fetch(`/api/crypto?tf=${timeframe||tf}`),
        fetch("/api/macro"),
        fetch("/api/feargreed"),
        fetch("/api/whale"),
        fetch("/api/liquidity"),
        fetch("/api/news"),
      ]);
      const [cJson,mJson,fJson,wJson,lJson,nJson]=await Promise.all([cRes.json(),mRes.json(),fRes.json(),wRes.json(),lRes.json(),nRes.json()]);
      if(cJson.error) throw new Error(cJson.error);
      if(mJson.error) throw new Error(mJson.error);
      setCrypto(cJson); setMacroRaw(mJson); setFg(fJson.error?null:fJson); setWhale(wJson.error?null:wJson); setLiquidity(lJson.error?null:lJson); setNews(nJson.items||[]);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }

  async function getAiAnalysis(coin, rsi, macd, smaSig, volSig, macro, price, change24h, whaleSig, bollSig, stochRsiSig, obvSig, candleSig, marubozuSig) {
    setAiLoading(prev => ({ ...prev, [coin.id]: true }));
    try {
      const headlines = relevantHeadlines(news, coin.name, coin.symbol).map((h) => ({ title: h.title, source: h.source }));
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
          headlines,
        }),
      });
      const data = await res.json();
      setAiAnalysis(prev => ({ ...prev, [coin.id]: data.analysis || data.error }));
    } catch(e) {
      setAiAnalysis(prev => ({ ...prev, [coin.id]: t("dashboard.errorAnalysis") }));
    } finally {
      setAiLoading(prev => ({ ...prev, [coin.id]: false }));
    }
  }

  useEffect(()=>{loadData("1D");},[]);
  function switchTf(newTf) { setTf(newTf); loadData(newTf); }

  const macro=macroRaw?computeMacroRegime(macroRaw.m2,macroRaw.fedfunds,macroRaw.dxy,macroRaw.yield10y,macroRaw.vix,macroRaw.sp500,macroRaw.nasdaq):null;
  const activeCoin=crypto?.find((c)=>c.id===active);
  const tfLabel=TIMEFRAMES.find(tfItem=>tfItem.key===tf)?.label||tf;

  return (
    <div className="container">
      <AppHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        active="dashboard"
        user={user}
        access={access}
      >
        <PushSubscribeButton />
        <button className="icon-btn" onClick={()=>loadData(tf)} title={t("dashboard.refresh")}>↻ {t("dashboard.refresh")}</button>
        <button
          className={`icon-btn${beginnerMode?" primary":""}`}
          onClick={toggleBeginnerMode}
          title={t("dashboard.beginnerModeTooltip")}
        >
          {t("dashboard.beginnerMode")}{beginnerMode?t("dashboard.beginnerModeOn"):""}
        </button>
      </AppHeader>

      <OnboardingTour />
      <InstallPrompt />
      <ReferralCard />

      {error&&<div className="error-box">{t("dashboard.errorPrefix")}{error}<div style={{marginTop:8}}><button onClick={()=>loadData(tf)}>{t("dashboard.retry")}</button></div></div>}
      {loading&&!error&&(
        <>
          <div className="loading-state"><span className="spinner" />{t("dashboard.loadingData")}</div>
          <div className="skeleton-grid" style={{marginBottom:"1rem"}}>
            <div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" />
          </div>
        </>
      )}

      {!loading&&!error&&macro&&(<>
        <div className="grid grid-3" style={{marginBottom:"1rem"}}>
          <div className="card"><p className="card-label">{t("dashboard.m2Label")}</p><p className="card-value">{macro.m2Growth?.toFixed(1)??"n/a"}%</p></div>
          <div className="card"><p className="card-label">{t("dashboard.rateLabel")}</p><p className="card-value">{macro.rateNow?.toFixed(2)??"n/a"}%</p></div>
          <div className="card" style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
            <p className="card-label" style={{alignSelf:"flex-start"}}>{t("dashboard.fgLabel")}</p>
            {fg?<FearGreedGauge value={fg.value} label={translateSignalLabel(fg.label,lang)}/>:<p>n/a</p>}
          </div>
        </div>

        <div className="grid grid-3" style={{marginBottom:"1rem"}}>
          <div className="card"><p className="card-label">{t("dashboard.dxyLabel")}</p><p className="card-value">{macro.dxyTrend!=null?`${macro.dxyTrend>=0?"+":""}${macro.dxyTrend.toFixed(1)}%`:"n/a"}</p></div>
          <div className="card"><p className="card-label">{t("dashboard.yieldLabel")}</p><p className="card-value">{macro.yieldTrend!=null?`${macro.yieldTrend>=0?"+":""}${macro.yieldTrend.toFixed(2)}pp`:"n/a"}</p></div>
          <div className="card"><p className="card-label">{t("dashboard.vixLabel")}</p><p className="card-value">{macro.vixLevel?.toFixed(1)??"n/a"}</p></div>
        </div>

        <div className="grid grid-3" style={{marginBottom:"1rem"}}>
          <div className="card" style={{opacity:0.65}} title={t("dashboard.nasdaqTooltip")}><p className="card-label">{t("dashboard.nasdaqLabel")}</p><p className="card-value">{macro.nasdaqTrend!=null?`${macro.nasdaqTrend>=0?"+":""}${macro.nasdaqTrend.toFixed(1)}%`:"n/a"}</p></div>
          <div className="card" style={{opacity:0.65}} title={t("dashboard.sp500Tooltip")}><p className="card-label">{t("dashboard.sp500Label")}</p><p className="card-value">{macro.sp500Trend!=null?`${macro.sp500Trend>=0?"+":""}${macro.sp500Trend.toFixed(1)}%`:"n/a"}</p></div>
        </div>

        <div className={`card macro-banner ${macro.cls}`}>
          <span className="label">{t("dashboard.macroRegimeLabel")}{translateSignalLabel(macro.label,lang)}</span>
          <span className="hint">{t("dashboard.macroRegimeHint")}</span>
        </div>

        {news.length>0 && (
          <div className="card" style={{marginBottom:"1rem"}}>
            <p className="section-title">{t("dashboard.newsTitle")}</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {news.slice(0,6).map((item,i)=>(
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"8px 10px",background:"var(--bg-subtle)",borderRadius:"var(--radius-sm)",textDecoration:"none",color:"var(--text)"}}
                >
                  <span style={{fontSize:13.5}}>{item.title}</span>
                  <span className="note" style={{flexShrink:0,marginLeft:8}}>{item.source}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="ticker-strip">
          {crypto.map((c)=>{
            const cIsUp=c.change24h>=0;
            return(
              <button key={c.id} className={`ticker-item${active===c.id?" active":""}`} onClick={()=>setActive(c.id)}>
                <span className="ticker-symbol"><span className={`ticker-dot ${cIsUp?"up":"down"}`} />{c.symbol}</span>
                <span className="ticker-price">${fmtUSD(c.price)}</span>
                <span className={`ticker-change ${cIsUp?"up":"down"}`}>{cIsUp?"+":""}{c.change24h.toFixed(1)}%</span>
              </button>
            );
          })}
        </div>

        <div className="toolbar">
          <div className="timeframe-group" style={{marginLeft:0}}>
            {TIMEFRAMES.map((tfItem)=>(
              <button key={tfItem.key} className={tf===tfItem.key?"active":""} onClick={()=>switchTf(tfItem.key)} style={{padding:"5px 10px",fontSize:12}}>{tfItem.key}</button>
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
            const why=explainSignal({label:combined.label,smaSig,rsi,macdSig,volSig,macro,fg:fg?.value??null,whaleSig,lang});
            const tip=PARAM_TIPS[c.id];
            const isUp = c.change24h>=0;
            return(
              <div className={`card coin-card${active===c.id?" selected":""}`} key={c.id} onClick={()=>setActive(c.id)} style={{borderLeftColor:signalAccent(combined.cls)}}>
                <div className="coin-card-top">
                  <p className="card-label" style={{margin:0}}>{c.name}</p>
                  <span className={`change-pill ${isUp?"up":"down"}`}>{isUp?"+":""}{c.change24h.toFixed(1)}%</span>
                </div>
                <p className="card-value">${fmtUSD(c.price)}</p>
                <span className={`badge ${combined.cls}`} style={{marginBottom:4,fontSize:13}}>{translateSignalLabel(combined.label,lang)}</span>
                <p className="note" style={{marginTop:0,marginBottom:8,fontStyle:"italic"}}>{why}</p>
                {tip&&(
                  <p
                    className="note"
                    style={{background:"var(--bg-subtle)",borderRadius:6,padding:"6px 8px",marginTop:0,marginBottom:8}}
                    title={t("dashboard.tipTooltip",{evidence:tip.evidence[lang]})}
                  >
                    <span className="note-label">{t("dashboard.tipBadge")}</span>
                    <span className={`badge ${tip.isDefault?"badge-gray":"badge-green"}`} style={{fontSize:11,padding:"1px 6px"}}>{tip.label[lang]}</span>
                  </p>
                )}
                {(() => {
                  const primaryRows = (
                    <>
                      <p className="note"><span className="note-label" title={t("dashboard.rsiTooltip")}>{t("dashboard.rsiLabel")}</span><span className={`badge ${rsiInfo.cls}`} style={{fontSize:11,padding:"1px 6px"}}>{translateSignalLabel(rsiInfo.text,lang)}</span></p>
                      <p className="note"><span className="note-label" title={t("dashboard.macdTooltip")}>{t("dashboard.macdLabel")}</span>{translateSignalLabel(macdSig.label,lang)}</p>
                      <p className="note"><span className="note-label" title={t("dashboard.smaTooltip")}>{t("dashboard.smaLabel")}</span>{translateSignalLabel(smaSig.label,lang)}</p>
                      <p className="note"><span className="note-label" title={t("dashboard.volumeTooltip")}>{t("dashboard.volumeLabel")}</span>{translateSignalLabel(volSig.label,lang)}</p>
                      {whaleSig&&<p className="note"><span className="note-label" title={t("dashboard.whaleTooltip")}>{t("dashboard.whaleLabel")}</span>{translateSignalLabel(whaleSig.label,lang)}</p>}
                      {liquidity?.[c.id]&&(()=>{const liq=liquidityLabel(liquidity[c.id].spreadPct);return(
                        <p className="note" style={{opacity:0.65}} title={t("dashboard.liquidityTooltip")}>
                          <span className="note-label">{t("dashboard.liquidityLabel")}</span>
                          <span className={`badge ${liq.cls}`} style={{fontSize:11,padding:"1px 6px"}}>{translateSignalLabel(liq.text,lang)}</span>
                          <span style={{marginLeft:6}}>{t("dashboard.liquidityDepth",{value:(liquidity[c.id].depthUsd/1000).toFixed(0)})}</span>
                        </p>
                      );})()}
                    </>
                  );
                  const secondaryRows = (
                    <>
                      <p className="note" style={{opacity:0.65}} title={t("dashboard.secondaryTooltipValidated")}><span className="note-label">{t("dashboard.bollingerLabel")}</span>{translateSignalLabel(bollSig.label,lang)}</p>
                      <p className="note" style={{opacity:0.65}} title={t("dashboard.secondaryTooltipValidated")}><span className="note-label">{t("dashboard.stochRsiLabel")}</span>{translateSignalLabel(stochRsiSig.label,lang)}</p>
                      <p className="note" style={{opacity:0.65}} title={t("dashboard.secondaryTooltipValidated")}><span className="note-label">{t("dashboard.obvLabel")}</span>{translateSignalLabel(obvSig.label,lang)}</p>
                      <p className="note" style={{opacity:0.65}} title={t("dashboard.secondaryTooltipUnvalidated")}><span className="note-label">{t("dashboard.strongCandleLabel")}</span>{translateSignalLabel(candleSig.label,lang)}</p>
                      <p className="note" style={{opacity:0.65}} title={t("dashboard.secondaryTooltipUnvalidated")}><span className="note-label">{t("dashboard.marubozuLabel")}</span>{translateSignalLabel(marubozuSig.label,lang)}</p>
                    </>
                  );
                  return (
                    <>
                      {!beginnerMode && primaryRows}
                      <button
                        className="details-toggle"
                        onClick={(e)=>{e.stopPropagation();setDetailsOpen(prev=>({...prev,[c.id]:!prev[c.id]}));}}
                      >
                        {detailsOpen[c.id]?t("dashboard.lessDetails"):(beginnerMode?t("dashboard.showDetails"):t("dashboard.moreIndicators"))}
                      </button>
                      {detailsOpen[c.id]&&(<>{beginnerMode && primaryRows}{secondaryRows}</>)}
                    </>
                  );
                })()}
                <button
                  className="ai-btn"
                  onClick={(e)=>{e.stopPropagation();getAiAnalysis(c,rsi,macdSig,smaSig,volSig,macro,c.price,c.change24h,whaleSig,bollSig,stochRsiSig,obvSig,candleSig,marubozuSig);}}
                  disabled={aiLoading[c.id]}
                >
                  {aiLoading[c.id]?t("dashboard.aiAnalyzing"):t("dashboard.aiButton")}
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
            <p className="section-title">{t("dashboard.priceHistory",{name:activeCoin.name,tf:tfLabel})}</p>
            <Sparkline prices={activeCoin.prices}/>
          </div>
        )}
      </>)}

      <div className="disclaimer">{t("dashboard.disclaimer")}</div>
    </div>
  );
}
