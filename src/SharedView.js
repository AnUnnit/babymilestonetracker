/* eslint-disable */
import { useState, useEffect } from 'react';
import { checkShareToken, fetchSharedBaby, verifyPin } from './db';

// ── WHO LMS ───────────────────────────────────────────────────────────────────
const WHO_LMS = {
  weight: {
    boys:  [[0,0.3487,3.3464,0.14602],[1,0.2297,4.4709,0.13395],[2,0.1970,5.5675,0.12385],[3,0.1738,6.3762,0.11727],[4,0.1553,7.0023,0.11316],[5,0.1395,7.5105,0.11080],[6,0.1257,7.9340,0.10958],[7,0.1134,8.2970,0.10902],[8,0.1021,8.6151,0.10882],[9,0.0917,8.9014,0.10881],[10,0.0822,9.1649,0.10730],[11,0.0733,9.4122,0.10746],[12,0.0650,9.6479,0.10773]],
    girls: [[0,0.3809,3.2322,0.14171],[1,0.1714,4.1873,0.13724],[2,0.0962,5.1282,0.13000],[3,0.0402,5.8458,0.12619],[4,-0.0050,6.4232,0.12402],[5,-0.0390,6.8990,0.12274],[6,-0.0632,7.2970,0.12214],[7,-0.0790,7.6422,0.12192],[8,-0.0878,7.9487,0.12193],[9,-0.0912,8.2254,0.12211],[10,-0.0901,8.4800,0.12239],[11,-0.0854,8.7192,0.12273],[12,-0.0776,8.9481,0.12311]],
  },
  length: {
    boys:  [[0,1,49.8842,0.03795],[1,1,54.7244,0.03557],[2,1,58.4249,0.03424],[3,1,61.4292,0.03347],[4,1,63.8860,0.03300],[5,1,65.9026,0.03271],[6,1,67.6236,0.03257],[7,1,69.1645,0.03254],[8,1,70.5994,0.03258],[9,1,71.9687,0.03267],[10,1,73.2812,0.03279],[11,1,74.5388,0.03293],[12,1,75.7488,0.03308]],
    girls: [[0,1,49.1477,0.03790],[1,1,53.6872,0.03640],[2,1,57.0673,0.03568],[3,1,59.8029,0.03525],[4,1,62.0899,0.03497],[5,1,64.0301,0.03479],[6,1,65.7311,0.03468],[7,1,67.2873,0.03462],[8,1,68.7498,0.03460],[9,1,70.1435,0.03461],[10,1,71.4818,0.03463],[11,1,72.7710,0.03467],[12,1,74.0150,0.03471]],
  },
  headCirc: {
    boys:  [[0,1,34.4618,0.03686],[1,1,37.2759,0.03124],[2,1,39.1285,0.02919],[3,1,40.5135,0.02841],[4,1,41.6317,0.02798],[5,1,42.5621,0.02773],[6,1,43.3293,0.02758],[7,1,43.9684,0.02750],[8,1,44.4965,0.02747],[9,1,44.9374,0.02749],[10,1,45.3122,0.02754],[11,1,45.6387,0.02760],[12,1,45.9317,0.02768]],
    girls: [[0,1,33.8787,0.03496],[1,1,36.5408,0.03141],[2,1,38.2521,0.02964],[3,1,39.5328,0.02870],[4,1,40.5817,0.02818],[5,1,41.4639,0.02786],[6,1,42.1986,0.02765],[7,1,42.8153,0.02750],[8,1,43.3327,0.02741],[9,1,43.7743,0.02735],[10,1,44.1553,0.02733],[11,1,44.4870,0.02733],[12,1,44.7754,0.02734]],
  },
};
function getLMS(metric, sex, days) {
  const mo=days/30.4375, rows=WHO_LMS[metric][sex];
  const lo=Math.max(0,Math.min(11,Math.floor(mo))), hi=Math.min(12,lo+1);
  if (lo===hi) { const r=rows[lo]; return {L:r[1],M:r[2],S:r[3]}; }
  const f=mo-lo, r0=rows[lo], r1=rows[hi];
  return {L:r0[1]+f*(r1[1]-r0[1]),M:r0[2]+f*(r1[2]-r0[2]),S:r0[3]+f*(r1[3]-r0[3])};
}
function calcZ(v,L,M,S) { return Math.abs(L)<1e-6?Math.log(v/M)/S:(Math.pow(v/M,L)-1)/(L*S); }
function zToPct(z) {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const s=z<0?-1:1,x=Math.abs(z)/Math.sqrt(2),t=1/(1+p*x);
  return Math.round(50*(1+s*(1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x))));
}
function pctile(metric, sex, days, val) {
  if (val==null) return null;
  const {L,M,S}=getLMS(metric,sex,days);
  return zToPct(calcZ(val,L,M,S));
}
function pctColor(p) {
  if (p==null) return '#64748b';
  if (p<3||p>97) return '#f87171';
  if (p<15||p>85) return '#fb923c';
  return '#4ade80';
}

export default function SharedView({ token }) {
  const [stage, setStage]       = useState('loading');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [data, setData]         = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const meta = await checkShareToken(token);
        if (meta.requiresPin) setStage('pin');
        else await loadData();
      } catch(e) { setErrorMsg(e.message); setStage('error'); }
    }
    init();
  }, [token]);

  async function loadData() {
    const d = await fetchSharedBaby(token);
    setData(d); setStage('view');
  }

  async function handlePin(e) {
    e.preventDefault(); setPinError(false);
    try {
      const ok = await verifyPin(token, pinInput);
      if (ok) await loadData();
      else { setPinError(true); setPinInput(''); }
    } catch(e) { setErrorMsg(e.message); setStage('error'); }
  }

  const wrap = c => (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      {c}
    </div>
  );

  if (stage==='loading') return wrap(
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:44,marginBottom:12}}>👶</div>
      <div style={{color:'#6366f1',fontSize:14}}>Loading…</div>
    </div>
  );

  if (stage==='error') return wrap(
    <div style={{textAlign:'center',maxWidth:360}}>
      <div style={{fontSize:44,marginBottom:12}}>⚠️</div>
      <div style={{color:'#f87171',fontSize:15,fontWeight:600,marginBottom:8}}>Link unavailable</div>
      <div style={{color:'#64748b',fontSize:13}}>{errorMsg}</div>
    </div>
  );

  if (stage==='pin') return wrap(
    <div style={{width:'100%',maxWidth:340,background:'rgba(30,27,75,0.8)',backdropFilter:'blur(20px)',borderRadius:20,border:'1px solid rgba(99,102,241,0.3)',padding:'32px 28px',boxShadow:'0 25px 60px rgba(0,0,0,0.5)'}}>
      <div style={{textAlign:'center',marginBottom:24}}>
        <div style={{fontSize:42,marginBottom:8}}>🔒</div>
        <h2 style={{margin:0,fontSize:18,fontWeight:700,color:'#e2e8f0'}}>PIN required</h2>
        <p style={{margin:'6px 0 0',fontSize:13,color:'#64748b'}}>Enter the 4-digit PIN to view this baby's data</p>
      </div>
      {pinError && <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,padding:'9px 14px',color:'#f87171',fontSize:13,marginBottom:14,textAlign:'center'}}>Incorrect PIN — try again</div>}
      <form onSubmit={handlePin}>
        <input value={pinInput} onChange={e=>{setPinInput(e.target.value.replace(/\D/g,'').slice(0,4));setPinError(false);}}
          placeholder="• • • •" inputMode="numeric" maxLength={4} autoFocus
          style={{width:'100%',padding:'16px',borderRadius:12,border:`2px solid ${pinError?'rgba(248,113,113,0.5)':'rgba(99,102,241,0.4)'}`,background:'rgba(15,23,42,0.7)',color:'#e2e8f0',fontSize:28,textAlign:'center',letterSpacing:12,outline:'none',boxSizing:'border-box',marginBottom:16}}/>
        <button type="submit" disabled={pinInput.length!==4}
          style={{width:'100%',padding:13,borderRadius:10,border:'none',cursor:'pointer',background:pinInput.length===4?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(99,102,241,0.2)',color:pinInput.length===4?'white':'#64748b',fontWeight:700,fontSize:15}}>
          Unlock
        </button>
      </form>
    </div>
  );

  if (stage==='view' && data) {
    const { baby, records, milestones } = data;
    const sex = baby.sex==='female'?'girls':'boys';
    const ageDays = Math.floor((Date.now()-new Date(baby.dob).getTime())/86400000);
    const ageMonths = (ageDays/30.4375).toFixed(1);
    const achievedCount = Object.keys(milestones).length;
    const latest = records.length>0 ? records[records.length-1] : null;
    const wPL = latest ? pctile('weight',  sex, latest.day, latest.weight)   : null;
    const lPL = latest ? pctile('length',  sex, latest.day, latest.length)   : null;
    const hPL = latest ? pctile('headCirc',sex, latest.day, latest.headCirc) : null;

    const card = {background:'rgba(30,27,75,0.7)',borderRadius:14,padding:'16px 18px',border:'1px solid rgba(99,102,241,0.2)'};

    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',padding:'20px 16px'}}>
        <style>{`
          .sv-desktop { display: block; }
          .sv-mobile  { display: none;  }
          @media (max-width: 540px) {
            .sv-desktop { display: none  !important; }
            .sv-mobile  { display: block !important; }
          }
        `}</style>

        <div style={{maxWidth:680,margin:'0 auto',display:'grid',gap:12}}>

          {/* ── Profile ── */}
          <div style={{...card,padding:'14px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{fontSize:36,flexShrink:0}}>{baby.sex==='female'?'👧':'👦'}</div>
              <div style={{flex:1,minWidth:0}}>
                <h1 style={{margin:0,fontSize:18,fontWeight:800,color:'#e2e8f0'}}>{baby.name}</h1>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{ageMonths} months old · DOB {baby.dob}</div>
              </div>
              <div style={{flexShrink:0,background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:8,padding:'3px 9px',fontSize:10,color:'#818cf8',fontWeight:600}}>
                READ ONLY
              </div>
            </div>
          </div>

          {/* ── Latest highlight band ── */}
          {latest && (
            <div style={{background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.10))',borderRadius:14,padding:'14px 18px',border:'1px solid rgba(99,102,241,0.35)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#818cf8',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>
                Latest · Day {latest.day} · {(latest.day/30.4375).toFixed(1)} months{latest.label?` · ${latest.label}`:''}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {[
                  {label:'Weight',val:latest.weight,  unit:'kg',dp:2,pct:wPL},
                  {label:'Length',val:latest.length,  unit:'cm',dp:1,pct:lPL},
                  {label:'Head',  val:latest.headCirc,unit:'cm',dp:1,pct:hPL},
                ].map(({label,val,unit,dp,pct})=>(
                  <div key={label} style={{textAlign:'center',background:'rgba(15,23,42,0.5)',borderRadius:10,padding:'10px 6px',border:'1px solid rgba(99,102,241,0.2)'}}>
                    <div style={{fontSize:10,color:'#64748b',marginBottom:4}}>{label} ({unit})</div>
                    <div style={{fontSize:20,fontWeight:800,color:'#e2e8f0',lineHeight:1}}>{val!=null?val.toFixed(dp):'—'}</div>
                    {pct!=null&&<div style={{fontSize:11,fontWeight:700,color:pctColor(pct),marginTop:4}}>{pct}th %ile</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Growth history ── */}
          {records.length > 0 && (
            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,color:'#c7d2fe',marginBottom:12}}>
                📏 Growth history ({records.length} {records.length===1?'entry':'entries'})
              </div>

              {/* Desktop table */}
              <div className="sv-desktop" style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:500}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid rgba(99,102,241,0.25)'}}>
                      {['Day','Age','Label','Wt (kg)','%ile','Len (cm)','%ile','HC (cm)','%ile'].map((h,i)=>(
                        <th key={i} style={{padding:'6px 8px',color:'#64748b',textAlign:'left',fontWeight:500,whiteSpace:'nowrap',fontSize:11}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(rec=>{
                      const wP=pctile('weight',sex,rec.day,rec.weight);
                      const lP=pctile('length',sex,rec.day,rec.length);
                      const hP=pctile('headCirc',sex,rec.day,rec.headCirc);
                      const isLatest=rec.day===latest?.day;
                      return (
                        <tr key={rec.id??rec.day} style={{borderBottom:'1px solid rgba(99,102,241,0.1)',background:isLatest?'rgba(99,102,241,0.08)':'transparent'}}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.06)'}
                          onMouseLeave={e=>e.currentTarget.style.background=isLatest?'rgba(99,102,241,0.08)':'transparent'}>
                          <td style={{padding:'6px 8px',color:'#c7d2fe',fontWeight:700,fontSize:12}}>{rec.day}</td>
                          <td style={{padding:'6px 8px',color:'#64748b',fontSize:12}}>{(rec.day/30.4375).toFixed(1)}m</td>
                          <td style={{padding:'6px 8px',color:'#94a3b8',fontSize:12,maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{rec.label||'—'}</td>
                          <td style={{padding:'6px 8px',fontSize:12,color:'#e2e8f0'}}>{rec.weight!=null?rec.weight.toFixed(2):'—'}</td>
                          <td style={{padding:'6px 8px',fontSize:12,fontWeight:600,color:pctColor(wP)}}>{wP!=null?`${wP}th`:'—'}</td>
                          <td style={{padding:'6px 8px',fontSize:12,color:'#e2e8f0'}}>{rec.length!=null?rec.length.toFixed(1):'—'}</td>
                          <td style={{padding:'6px 8px',fontSize:12,fontWeight:600,color:pctColor(lP)}}>{lP!=null?`${lP}th`:'—'}</td>
                          <td style={{padding:'6px 8px',fontSize:12,color:'#e2e8f0'}}>{rec.headCirc!=null?rec.headCirc.toFixed(1):'—'}</td>
                          <td style={{padding:'6px 8px',fontSize:12,fontWeight:600,color:pctColor(hP)}}>{hP!=null?`${hP}th`:'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <div className="sv-mobile">
                {records.map(rec=>{
                  const wP=pctile('weight',sex,rec.day,rec.weight);
                  const lP=pctile('length',sex,rec.day,rec.length);
                  const hP=pctile('headCirc',sex,rec.day,rec.headCirc);
                  const isLatest=rec.day===latest?.day;
                  return (
                    <div key={rec.id??rec.day} style={{borderRadius:10,padding:'10px 12px',marginBottom:8,background:isLatest?'rgba(99,102,241,0.10)':'rgba(99,102,241,0.04)',border:`1px solid ${isLatest?'rgba(99,102,241,0.35)':'rgba(99,102,241,0.12)'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,alignItems:'baseline'}}>
                        <span style={{fontWeight:700,color:'#c7d2fe',fontSize:13}}>Day {rec.day}</span>
                        <span style={{color:'#64748b',fontSize:11}}>{(rec.day/30.4375).toFixed(1)}m{rec.label?` · ${rec.label}`:''}</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                        {[['Wt',rec.weight,'kg',2,wP],['Len',rec.length,'cm',1,lP],['HC',rec.headCirc,'cm',1,hP]].map(([l,v,u,dp,p])=>(
                          <div key={l} style={{textAlign:'center',background:'rgba(15,23,42,0.4)',borderRadius:7,padding:'7px 4px'}}>
                            <div style={{fontSize:9,color:'#475569',marginBottom:2}}>{l} ({u})</div>
                            <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0'}}>{v!=null?v.toFixed(dp):'—'}</div>
                            {p!=null&&<div style={{fontSize:10,color:pctColor(p),fontWeight:600,marginTop:2}}>{p}th</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Milestones ── */}
          {achievedCount>0&&(
            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,color:'#c7d2fe',marginBottom:12}}>🎯 Milestones achieved ({achievedCount})</div>
              <div style={{display:'grid',gap:6}}>
                {Object.entries(milestones).map(([id,log])=>(
                  <div key={id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',borderRadius:8,background:'rgba(74,222,128,0.05)',border:'1px solid rgba(74,222,128,0.15)'}}>
                    <span style={{fontSize:12,color:'#4ade80'}}>✓ {id.toUpperCase()}</span>
                    <span style={{fontSize:11,color:'#64748b'}}>{log.date||`Day ${log.daysFromBirth}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{textAlign:'center',padding:'8px 0',fontSize:11,color:'#334155'}}>
            Baby Tracker · Read-only shared view · WHO MGRS 2006
          </div>
        </div>
      </div>
    );
  }

  return null;
}
