/* eslint-disable */
import { useState, useEffect } from 'react';
import { checkShareToken, fetchSharedBaby, verifyPin } from './db';

// Minimal read-only view of a baby's growth data for share link recipients
export default function SharedView({ token }) {
  const [stage, setStage]     = useState('loading'); // loading | pin | view | error
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [data, setData]       = useState(null);       // { baby, records, milestones }
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const meta = await checkShareToken(token);
        if (meta.requiresPin) {
          setStage('pin');
        } else {
          await loadData();
        }
      } catch (e) {
        setErrorMsg(e.message);
        setStage('error');
      }
    }
    init();
  }, [token]);

  async function loadData() {
    const d = await fetchSharedBaby(token);
    setData(d);
    setStage('view');
  }

  async function handlePin(e) {
    e.preventDefault();
    setPinError(false);
    try {
      const ok = await verifyPin(token, pinInput);
      if (ok) {
        await loadData();
      } else {
        setPinError(true);
        setPinInput('');
      }
    } catch (e) {
      setErrorMsg(e.message);
      setStage('error');
    }
  }

  const wrap = (children) => (
    <div style={{
      minHeight:'100vh', background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>{children}</div>
  );

  if (stage === 'loading') return wrap(
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:44,marginBottom:12}}>👶</div>
      <div style={{color:'#6366f1',fontSize:14}}>Loading…</div>
    </div>
  );

  if (stage === 'error') return wrap(
    <div style={{textAlign:'center',maxWidth:360}}>
      <div style={{fontSize:44,marginBottom:12}}>⚠️</div>
      <div style={{color:'#f87171',fontSize:15,fontWeight:600,marginBottom:8}}>Link unavailable</div>
      <div style={{color:'#64748b',fontSize:13}}>{errorMsg}</div>
    </div>
  );

  if (stage === 'pin') return wrap(
    <div style={{
      width:'100%', maxWidth:340,
      background:'rgba(30,27,75,0.8)', backdropFilter:'blur(20px)',
      borderRadius:20, border:'1px solid rgba(99,102,241,0.3)',
      padding:'32px 28px', boxShadow:'0 25px 60px rgba(0,0,0,0.5)',
    }}>
      <div style={{textAlign:'center',marginBottom:24}}>
        <div style={{fontSize:42,marginBottom:8}}>🔒</div>
        <h2 style={{margin:0,fontSize:18,fontWeight:700,color:'#e2e8f0'}}>PIN required</h2>
        <p style={{margin:'6px 0 0',fontSize:13,color:'#64748b'}}>Enter the 4-digit PIN to view this baby's data</p>
      </div>
      {pinError && (
        <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,padding:'9px 14px',color:'#f87171',fontSize:13,marginBottom:14,textAlign:'center'}}>
          Incorrect PIN — try again
        </div>
      )}
      <form onSubmit={handlePin}>
        <input
          value={pinInput}
          onChange={e => { setPinInput(e.target.value.replace(/\D/g,'').slice(0,4)); setPinError(false); }}
          placeholder="• • • •"
          inputMode="numeric" maxLength={4} autoFocus
          style={{
            width:'100%', padding:'16px', borderRadius:12,
            border:`2px solid ${pinError ? 'rgba(248,113,113,0.5)' : 'rgba(99,102,241,0.4)'}`,
            background:'rgba(15,23,42,0.7)', color:'#e2e8f0',
            fontSize:28, textAlign:'center', letterSpacing:12, outline:'none',
            boxSizing:'border-box', marginBottom:16,
          }}
        />
        <button type="submit" disabled={pinInput.length !== 4}
          style={{
            width:'100%', padding:13, borderRadius:10, border:'none', cursor:'pointer',
            background:pinInput.length===4 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.2)',
            color:pinInput.length===4 ? 'white' : '#64748b',
            fontWeight:700, fontSize:15,
          }}>
          Unlock
        </button>
      </form>
    </div>
  );

  if (stage === 'view' && data) {
    const { baby, records, milestones } = data;
    const ageDays = Math.floor((Date.now() - new Date(baby.dob).getTime()) / 86400000);
    const ageMonths = Math.floor(ageDays / 30.4375);
    const achievedCount = Object.keys(milestones).length;

    return (
      <div style={{
        minHeight:'100vh', background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
        padding:'20px 16px',
      }}>
        {/* Header */}
        <div style={{maxWidth:560,margin:'0 auto 20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,background:'rgba(30,27,75,0.7)',borderRadius:16,padding:'16px 20px',border:'1px solid rgba(99,102,241,0.2)'}}>
            <div style={{fontSize:40}}>{baby.sex==='female'?'👧':'👦'}</div>
            <div>
              <h1 style={{margin:0,fontSize:20,fontWeight:800,color:'#e2e8f0'}}>{baby.name}</h1>
              <div style={{fontSize:13,color:'#64748b'}}>{ageMonths} months old · DOB {baby.dob}</div>
              {baby.birth_weight && <div style={{fontSize:12,color:'#818cf8',marginTop:2}}>Born {baby.birth_weight} kg · {baby.birth_length} cm</div>}
            </div>
            <div style={{marginLeft:'auto',background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:8,padding:'4px 10px',fontSize:10,color:'#818cf8',fontWeight:600}}>READ ONLY</div>
          </div>
        </div>

        <div style={{maxWidth:560,margin:'0 auto',display:'grid',gap:14}}>
          {/* Latest measurements */}
          {records.length > 0 && (() => {
            const latest = records[records.length - 1];
            return (
              <div style={{background:'rgba(30,27,75,0.7)',borderRadius:14,padding:'16px 18px',border:'1px solid rgba(99,102,241,0.2)'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#c7d2fe',marginBottom:12}}>📏 Latest measurements · Day {latest.day}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                  {[['Weight',latest.weight,'kg'],['Length',latest.length,'cm'],['Head',latest.headCirc,'cm']].map(([l,v,u])=>(
                    v != null && <div key={l} style={{textAlign:'center',background:'rgba(99,102,241,0.08)',borderRadius:10,padding:'10px 8px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:'#e2e8f0'}}>{v}</div>
                      <div style={{fontSize:10,color:'#64748b'}}>{l} ({u})</div>
                    </div>
                  ))}
                </div>
                {latest.note && <div style={{marginTop:10,fontSize:12,color:'#94a3b8',fontStyle:'italic'}}>"{latest.note}"</div>}
              </div>
            );
          })()}

          {/* Growth history */}
          {records.length > 1 && (
            <div style={{background:'rgba(30,27,75,0.7)',borderRadius:14,padding:'16px 18px',border:'1px solid rgba(99,102,241,0.2)'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#c7d2fe',marginBottom:12}}>📊 Growth history ({records.length} entries)</div>
              <div style={{display:'grid',gap:6}}>
                {[...records].reverse().slice(0,8).map(r=>(
                  <div key={r.day} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',borderRadius:8,background:'rgba(99,102,241,0.06)'}}>
                    <span style={{fontSize:12,color:'#818cf8',fontWeight:600,minWidth:60}}>{r.label||`Day ${r.day}`}</span>
                    <span style={{fontSize:12,color:'#94a3b8'}}>
                      {[r.weight&&`${r.weight}kg`,r.length&&`${r.length}cm`,r.headCirc&&`HC ${r.headCirc}cm`].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ))}
                {records.length > 8 && <div style={{fontSize:11,color:'#475569',textAlign:'center',paddingTop:4}}>+{records.length-8} more entries</div>}
              </div>
            </div>
          )}

          {/* Milestones achieved */}
          {achievedCount > 0 && (
            <div style={{background:'rgba(30,27,75,0.7)',borderRadius:14,padding:'16px 18px',border:'1px solid rgba(99,102,241,0.2)'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#c7d2fe',marginBottom:12}}>🎯 Milestones achieved ({achievedCount})</div>
              <div style={{display:'grid',gap:6}}>
                {Object.entries(milestones).map(([id,log])=>{
                  const {MILESTONE_DATA_SHARED} = {MILESTONE_DATA_SHARED:null}; // placeholder
                  return (
                    <div key={id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',borderRadius:8,background:'rgba(74,222,128,0.05)',border:'1px solid rgba(74,222,128,0.15)'}}>
                      <span style={{fontSize:12,color:'#4ade80'}}>✓ {id.toUpperCase()}</span>
                      <span style={{fontSize:11,color:'#64748b'}}>{log.date||`Day ${log.daysFromBirth}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{textAlign:'center',padding:'12px 0',fontSize:11,color:'#334155'}}>
            Baby Tracker · Read-only shared view · <a href="https://github.com/AnUnnit/babytracker" style={{color:'#475569'}}>github.com/AnUnnit/babytracker</a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
