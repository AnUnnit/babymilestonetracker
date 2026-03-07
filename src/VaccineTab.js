import { useState } from "react";

const VACCINES = [
  {
    day: 0, age: "Birth", label: "Day 0",
    vaccines: [
      { name: "BCG", who: "Bacille Calmette-Guérin vaccine protects against severe forms of tuberculosis (TB), including TB meningitis and miliary TB in young children. WHO recommends a single dose at birth in countries with high TB burden like India. It does not prevent pulmonary TB but dramatically reduces the risk of life-threatening TB in infants." },
      { name: "OPV-0", who: "Oral Polio Vaccine zero dose is given at birth to provide early intestinal immunity against poliovirus. It helps establish gut immunity before the primary series begins, critical in high-transmission settings. WHO recommends it in all countries still at risk of wild poliovirus circulation." },
      { name: "Hepatitis B (1)", who: "The first dose of Hepatitis B vaccine should be given within 24 hours of birth to prevent mother-to-child transmission. Hepatitis B causes chronic liver disease and liver cancer. WHO recommends the birth dose as the single most important strategy to prevent chronic HBV infection." },
    ],
  },
  {
    day: 42, age: "6 weeks", label: "Day 42",
    vaccines: [
      { name: "DTwP/DTaP (1)", who: "Diphtheria, Tetanus, and Pertussis combination vaccine. Pertussis (whooping cough) is most deadly before 3 months of age. WHO recommends 3 primary doses starting at 6 weeks. Diphtheria causes airway obstruction; tetanus causes muscle spasms; pertussis causes severe prolonged coughing that can be fatal in infants." },
      { name: "IPV (1)", who: "Inactivated Polio Vaccine provides systemic immunity against all three poliovirus serotypes. WHO recommends at least one IPV dose alongside OPV in the primary series to boost humoral immunity and ensure protection even if oral vaccine replication is limited." },
      { name: "Hib (1)", who: "Haemophilus influenzae type b vaccine prevents bacterial meningitis, pneumonia, and epiglottitis. Hib meningitis carries a 5% fatality rate and 15–35% risk of permanent neurological damage. WHO recommends 3 doses in the primary series." },
      { name: "Hep B (2)", who: "Second dose of Hepatitis B vaccine, part of the 3-dose primary series. Reinforces immune response initiated by the birth dose. Critical to complete the series as 2 doses alone provide incomplete protection against chronic infection." },
      { name: "PCV (1)", who: "Pneumococcal Conjugate Vaccine protects against Streptococcus pneumoniae, which causes bacterial meningitis, pneumonia, and bloodstream infections. WHO estimates it kills over 300,000 children under 5 annually. PCV is one of the highest-impact vaccines for preventing child mortality." },
      { name: "Rotavirus (1)", who: "Rotavirus vaccine prevents severe rotavirus gastroenteritis — the leading cause of severe diarrhoea and dehydration in children under 5. In India, rotavirus causes ~78,000 child deaths per year. WHO recommends inclusion in all national immunisation programmes." },
    ],
  },
  {
    day: 70, age: "10 weeks", label: "Day 70",
    vaccines: [
      { name: "DTwP/DTaP (2)", who: "Second dose of the DTP combination vaccine. Critical to maintain immunity as maternal antibodies wane. Three doses are required for full protection — the immune response after dose 2 is significantly stronger than after dose 1." },
      { name: "IPV (2)", who: "Second IPV dose to strengthen systemic immunity against poliovirus. Part of the recommended 3-dose primary series. Ensures robust IgG antibody levels providing long-term protection against all three polio serotypes." },
      { name: "Hib (2)", who: "Second Hib dose in the primary series. Reinforces protection against Haemophilus influenzae type b meningitis and pneumonia. Two doses provide substantially better protection than one; the third dose completes the series." },
      { name: "PCV (2)", who: "Second Pneumococcal Conjugate Vaccine dose. Boosts immune response against the 10 or 13 most disease-causing pneumococcal serotypes. Studies show that completing 3 PCV doses reduces invasive pneumococcal disease by over 90%." },
      { name: "Rotavirus (2)", who: "Second rotavirus vaccine dose. The primary series must be completed before 24 weeks per WHO guidelines — beyond this age the risk of intussusception from the live vaccine increases. The 2-dose series provides ~85–90% protection against severe rotavirus disease." },
    ],
  },
  {
    day: 98, age: "14 weeks", label: "Day 98",
    vaccines: [
      { name: "DTwP/DTaP (3)", who: "Third and final dose of the primary DTP series. After the 3-dose series, protection against diphtheria and tetanus is >95% and lasts several years. Booster doses are recommended at 16–18 months to maintain long-term immunity." },
      { name: "IPV (3)", who: "Third IPV dose completing the primary polio series. After 3 doses, more than 99% of children develop protective antibodies against all three poliovirus serotypes. Part of the global polio eradication strategy." },
      { name: "Hib (3)", who: "Third Hib dose completing the primary series. The 3-dose series provides >95% protection against invasive Hib disease. Since Hib vaccination, cases of Hib meningitis have declined by over 90% in countries with high coverage." },
      { name: "PCV (3)", who: "Third PCV dose completing the primary series. WHO estimates universal PCV use could prevent up to 400,000 child deaths per year globally from pneumococcal pneumonia and meningitis." },
      { name: "Rotavirus (3)", who: "Third and final rotavirus dose (for 3-dose formulations). Must be given before 32 weeks of age. The completed series reduces hospitalisations for severe rotavirus diarrhoea by 85–98% in high-income settings." },
    ],
  },
  {
    day: 183, age: "6 months", label: "Day 183",
    vaccines: [
      { name: "OPV (1)", who: "First booster dose of Oral Polio Vaccine. Provides additional intestinal immunity, particularly important in settings with high person-to-person transmission. Part of India's intensified polio eradication strategy." },
      { name: "Hep B (3)", who: "Third and final dose of the Hepatitis B vaccine primary series. The 3-dose series provides >95% protection expected to last at least 20 years, likely lifelong. Without vaccination, 25% of children infected perinatally develop liver cancer or cirrhosis." },
      { name: "Influenza (1)", who: "First dose of the annual influenza vaccine. WHO recommends flu vaccination for all children 6 months to 5 years. Children under 2 are at highest risk of severe influenza illness and pneumonia. Two doses are required in the first year of vaccination." },
    ],
  },
  {
    day: 213, age: "7 months", label: "Day 213",
    vaccines: [
      { name: "Influenza (2)", who: "Second influenza dose, required only in the first year of influenza vaccination. Children receiving flu vaccine for the first time need two doses 4 weeks apart for adequate immune response. From the second year, only one annual dose is needed." },
    ],
  },
  {
    day: 274, age: "9 months", label: "Day 274",
    vaccines: [
      { name: "OPV (2)", who: "Second booster dose of Oral Polio Vaccine. Strengthens mucosal gut immunity, important in areas with potential environmental circulation. Part of India's supplemental immunisation activities." },
      { name: "MR/MMR (1)", who: "Measles-Rubella/MMR vaccine. Measles is one of the most contagious diseases known — one case can infect 12–18 unvaccinated people. Measles kills over 100,000 children per year globally. The first dose at 9 months is critical in India due to high measles burden." },
      { name: "Typhoid Conjugate", who: "Typhoid Conjugate Vaccine (TCV) protects against Salmonella typhi causing typhoid fever. WHO recommends TCV in countries like India with high typhoid burden. Typhoid infects ~11–21 million people per year globally. TCV can be given from 6 months of age." },
    ],
  },
  {
    day: 365, age: "12 months", label: "Day 365",
    vaccines: [
      { name: "Hepatitis A (1)", who: "First dose of the Hepatitis A vaccine. HAV causes acute liver disease through the faecal-oral route, commonly via contaminated food and water. It is endemic in India. Vaccinating in infancy prevents infection and community transmission." },
      { name: "Varicella (1)", who: "First dose of the chickenpox vaccine. Varicella can cause bacterial superinfection, pneumonia, encephalitis and rarely death. A second dose is recommended at 15–18 months. Vaccination reduces hospitalisations by >90% and prevents the virus reactivating later as shingles." },
    ],
  },
];

// DEMO_BABY removed — component receives baby as prop

function daysBetween(d1, d2) {
  const [y1,m1,dd1] = d1.split("-").map(Number);
  const [y2,m2,dd2] = d2.split("-").map(Number);
  return Math.floor((Date.UTC(y2,m2-1,dd2) - Date.UTC(y1,m1-1,dd1)) / 86400000);
}
function addDays(dateStr, n) {
  const [y,m,d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split("T")[0];
}
function fmtDate(dateStr) {
  const [y,m,d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m-1]} ${y}`;
}
function fmtRel(diff) { if(diff===0)return"Today"; if(diff>0)return`In ${diff}d`; return`${Math.abs(diff)}d ago`; }
function getStatus(vacDay, todayDays, completedSet) {
  if (completedSet.has(vacDay)) return "completed";
  if (vacDay <= todayDays) return "overdue";
  return "scheduled";
}

function gcalUrl(title, dateStr, desc) {
  const d = new Date(dateStr + "T09:00:00");
  const fmt = x => x.toISOString().replace(/[-:.]/g,"").slice(0,15)+"Z";
  const e = new Date(d); e.setMinutes(e.getMinutes()+30);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(d)}/${fmt(e)}&details=${encodeURIComponent(desc)}`;
}
function makeICS(vaccines, babyName, dob, reminderDays) {
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Baby Tracker//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  vaccines.forEach(v => {
    const dt = addDays(dob, v.day).replace(/-/g,"");
    lines.push("BEGIN:VEVENT",`DTSTART;VALUE=DATE:${dt}`,`DTEND;VALUE=DATE:${dt}`,
      `SUMMARY:💉 ${babyName}: ${v.vaccines.map(x=>x.name).join(", ")}`,
      `DESCRIPTION:${v.vaccines.map(x=>x.name).join("\\n")}`,
      "BEGIN:VALARM",`TRIGGER:-P${reminderDays}D`,"ACTION:DISPLAY",
      `DESCRIPTION:Vaccine reminder for ${babyName}`,"END:VALARM","END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ── WHO Info popup ────────────────────────────────────────────────────────────
function WhoBox({ vaccine, onClose }) {
  return (
    <div style={{
      position:"absolute", zIndex:60,
      top:"calc(100% + 6px)", left:0, right:0,
      background:"rgba(12,10,36,0.99)",
      border:"1px solid rgba(99,102,241,0.45)",
      borderRadius:10,
      boxShadow:"0 16px 48px rgba(0,0,0,0.8)",
      padding:"12px 14px",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
        <span style={{fontSize:13,fontWeight:800,color:"#c7d2fe"}}>{vaccine.name}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",fontSize:18,cursor:"pointer",padding:0,lineHeight:1,flexShrink:0}}>×</button>
      </div>
      <div style={{borderTop:"1px solid rgba(99,102,241,0.15)",paddingTop:8,fontSize:12,color:"#94a3b8",lineHeight:1.7}}>
        {vaccine.who}
      </div>
      <div style={{fontSize:10,color:"#6366f1",fontWeight:600,marginTop:8}}>Source: WHO / IAP 2023</div>
    </div>
  );
}

// ── Vaccine tag ───────────────────────────────────────────────────────────────
function VTag({ vaccine, color, bg, border, strikethrough }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{position:"relative"}}>
      <button
        onClick={e=>{e.stopPropagation();setOpen(o=>!o);}}
        style={{
          padding:"3px 8px", borderRadius:5, fontSize:11, cursor:"pointer", border:`1px solid ${border}`,
          background:bg, color, display:"flex", alignItems:"center", gap:3,
          textDecoration:strikethrough?"line-through":"none",
          outline:open?`2px solid rgba(99,102,241,0.45)`:"none",
          whiteSpace:"nowrap",
        }}
      >
        {vaccine.name}
        <span style={{fontSize:9,opacity:0.55}}>ⓘ</span>
      </button>
      {open && <WhoBox vaccine={vaccine} onClose={()=>setOpen(false)}/>}
    </div>
  );
}

// ── Calendar Modal ────────────────────────────────────────────────────────────
function CalModal({ targets, baby, onClose }) {
  const isBulk = targets.length > 1;
  const [remDays, setRemDays] = useState(7);
  const [mode, setMode] = useState("gcal");
  const [copied, setCopied] = useState(false);
  const todayDays = daysBetween(baby.dob, new Date().toISOString().split("T")[0]);
  const single = !isBulk ? targets[0] : null;
  const singleDate = single ? addDays(baby.dob, single.day) : null;
  const singleUrl = single ? gcalUrl(
    `💉 ${baby.name}: ${single.vaccines.map(x=>x.name).join(", ")}`,
    singleDate,
    `Vaccines:\n${single.vaccines.map(x=>x.name).join("\n")}\n\nIAP 2023 Schedule. Confirm with your paediatrician.`
  ) : null;

  function dlICS() {
    const blob = new Blob([makeICS(targets,baby.name,baby.dob,remDays)],{type:"text/calendar"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`${baby.name.toLowerCase()}-vaccines.ics`; a.click();
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:"fixed",inset:0,zIndex:300,
      background:"rgba(3,2,18,0.92)",backdropFilter:"blur(14px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }}>
      <div style={{
        width:"100%",maxWidth:440,
        background:"#0f0d28",
        borderRadius:20,border:"1px solid rgba(99,102,241,0.35)",
        boxShadow:"0 40px 100px rgba(0,0,0,0.9)",
        overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{padding:"16px 20px 13px",borderBottom:"1px solid rgba(99,102,241,0.15)",background:"rgba(99,102,241,0.08)"}}>
          <div style={{fontSize:11,color:"#818cf8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>📅 Add to Calendar</div>
          {isBulk ? (
            <>
              <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0"}}>{targets.length} vaccine visits</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{targets.map(t=>t.age).join(" · ")}</div>
            </>
          ) : (
            <>
              <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0"}}>{single.age} · {single.label}</div>
              <div style={{fontSize:13,marginTop:5}}>
                <span style={{color:"#94a3b8"}}>Due on </span>
                <span style={{fontWeight:800,color:"#c7d2fe"}}>{fmtDate(singleDate)}</span>
                <span style={{fontSize:11,color:"#475569",marginLeft:8}}>{fmtRel(single.day-todayDays)}</span>
              </div>
            </>
          )}
        </div>

        <div style={{padding:"16px 20px"}}>
          {/* Vaccine chips */}
          {!isBulk && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Vaccines</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {single.vaccines.map(v=>(
                  <span key={v.name} style={{padding:"3px 9px",borderRadius:5,fontSize:11,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",color:"#a5b4fc"}}>{v.name}</span>
                ))}
              </div>
            </div>
          )}
          {/* Bulk list */}
          {isBulk && (
            <div style={{marginBottom:14}}>
              {targets.map(t=>(
                <div key={t.day} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,marginBottom:4,background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.13)"}}>
                  <span style={{fontSize:12,color:"#818cf8",fontWeight:700,minWidth:70}}>{t.age}</span>
                  <span style={{fontSize:12}}><span style={{color:"#64748b"}}>Due on </span><span style={{fontWeight:800,color:"#c7d2fe"}}>{fmtDate(addDays(baby.dob,t.day))}</span></span>
                  <span style={{fontSize:11,color:"#475569",marginLeft:"auto"}}>{t.vaccines.length}v</span>
                </div>
              ))}
            </div>
          )}
          {/* Mode toggle — single only */}
          {!isBulk && (
            <div style={{display:"flex",gap:4,marginBottom:14,background:"rgba(0,0,0,0.4)",borderRadius:9,padding:3}}>
              {[{id:"gcal",icon:"📅",label:"Google Calendar"},{id:"ics",icon:"📥",label:".ics file"}].map(({id,icon,label})=>(
                <button key={id} onClick={()=>setMode(id)} style={{
                  flex:1,padding:"7px 6px",borderRadius:7,border:"none",cursor:"pointer",
                  background:mode===id?"rgba(99,102,241,0.4)":"transparent",
                  color:mode===id?"#c7d2fe":"#64748b",fontSize:12,fontWeight:700,
                }}>{icon} {label}</button>
              ))}
            </div>
          )}
          {/* Reminder timing */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Remind me before</div>
            <div style={{display:"flex",gap:6}}>
              {[1,3,7,14].map(d=>(
                <button key={d} onClick={()=>setRemDays(d)} style={{
                  flex:1,padding:"8px 2px",borderRadius:8,cursor:"pointer",
                  border:`1px solid ${remDays===d?"rgba(99,102,241,0.6)":"rgba(99,102,241,0.18)"}`,
                  background:remDays===d?"rgba(99,102,241,0.28)":"rgba(99,102,241,0.04)",
                  color:remDays===d?"#c7d2fe":"#64748b",fontSize:12,fontWeight:700,
                }}>{d===1?"1 day":`${d} days`}</button>
              ))}
            </div>
          </div>
          {/* Preview */}
          {!isBulk && mode==="gcal" && (
            <div style={{marginBottom:14,padding:"10px 12px",borderRadius:9,background:"rgba(0,0,0,0.35)",border:"1px solid rgba(99,102,241,0.14)"}}>
              <div style={{fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Event preview</div>
              <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>💉 {baby.name}: {single.vaccines.slice(0,2).map(x=>x.name).join(", ")}{single.vaccines.length>2?` +${single.vaccines.length-2}`:""}</div>
              <div style={{fontSize:12,marginTop:3}}><span style={{color:"#94a3b8"}}>Due on </span><span style={{fontWeight:800,color:"#c7d2fe"}}>{fmtDate(singleDate)}</span><span style={{color:"#64748b"}}> · 9:00 AM · 30 min</span></div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Reminder: {remDays} day{remDays!==1?"s":""} before</div>
            </div>
          )}
          {/* Actions */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:9,border:"1px solid rgba(99,102,241,0.18)",background:"rgba(99,102,241,0.06)",color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            {(isBulk||mode==="ics") && (
              <button onClick={dlICS} style={{flex:2,padding:"11px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                📥 Download .ics ({targets.length} {targets.length===1?"event":"events"})
              </button>
            )}
            {!isBulk&&mode==="gcal"&&(<>
              <button onClick={()=>{navigator.clipboard.writeText(singleUrl);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"11px 12px",borderRadius:9,border:"1px solid rgba(99,102,241,0.28)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{copied?"✓ Copied":"Copy"}</button>
              <a href={singleUrl} target="_blank" rel="noreferrer" style={{flex:2,padding:"11px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",fontSize:13,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>📅 Add to Google Cal</a>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sticky action bar ─────────────────────────────────────────────────────────
function ActionBar({ type, selected, vaccines, onPrimary, onClear }) {
  const isOverdue = type === "overdue";
  const borderCol = isOverdue ? "rgba(248,113,113,0.55)" : "rgba(99,102,241,0.55)";
  const textCol   = isOverdue ? "#fca5a5" : "#a5b4fc";
  const names = vaccines.filter(v=>selected.has(v.day)).map(v=>v.age).join(", ");
  return (
    <div style={{
      position:"sticky",bottom:12,zIndex:100,margin:"14px 0 0",
      padding:"12px 14px",borderRadius:12,
      background: isOverdue ? "rgba(18,5,5,0.97)" : "rgba(5,4,22,0.97)",
      border:`1px solid ${borderCol}`,
      boxShadow:`0 8px 40px rgba(0,0,0,0.85), 0 0 0 1px ${isOverdue?"rgba(248,113,113,0.08)":"rgba(99,102,241,0.08)"}`,
      display:"flex",alignItems:"center",gap:10,
    }}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:textCol,fontWeight:700,marginBottom:2}}>{selected.size} visit{selected.size>1?"s":""} selected</div>
        <div style={{fontSize:11,color:"#475569",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{names}</div>
      </div>
      <button onClick={onClear} style={{flexShrink:0,padding:"6px 11px",borderRadius:7,border:`1px solid ${isOverdue?"rgba(248,113,113,0.28)":"rgba(99,102,241,0.28)"}`,background:"transparent",color:isOverdue?"#f87171":"#818cf8",fontSize:12,fontWeight:600,cursor:"pointer"}}>Clear</button>
      <button onClick={onPrimary} style={{flexShrink:0,padding:"8px 14px",borderRadius:8,border:"none",background:isOverdue?"linear-gradient(135deg,#4ade80,#22c55e)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:isOverdue?"#052e16":"white",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>
        {isOverdue?"✓ Mark Done":"📅 Add to Calendar"}
      </button>
    </div>
  );
}

// ── Single vaccine row ────────────────────────────────────────────────────────
function VRow({ v, status, baby, isSelected, onToggle, onDone, onUndo, onCal }) {
  const todayDays = daysBetween(baby.dob, new Date().toISOString().split("T")[0]);
  const vacDate = addDays(baby.dob, v.day);
  const daysUntil = v.day - todayDays;

  const theme = {
    completed: { rowBg:"rgba(74,222,128,0.04)",  border:"rgba(74,222,128,0.17)",  ageCol:"#86efac",  badgeCol:"#4ade80",  badgeBg:"rgba(74,222,128,0.1)",  badgeBord:"rgba(74,222,128,0.25)",  tagCol:"#86efac",  tagBg:"rgba(74,222,128,0.07)",  tagBord:"rgba(74,222,128,0.18)",  dateCol:"#86efac" },
    overdue:   { rowBg: isSelected?"rgba(248,113,113,0.14)":"rgba(248,113,113,0.06)", border:isSelected?"rgba(248,113,113,0.52)":"rgba(248,113,113,0.25)", ageCol:"#fca5a5", badgeCol:"#f87171", badgeBg:"rgba(248,113,113,0.1)", badgeBord:"rgba(248,113,113,0.28)", tagCol:"#fca5a5", tagBg:"rgba(248,113,113,0.07)", tagBord:"rgba(248,113,113,0.18)", dateCol:"#fca5a5" },
    scheduled: { rowBg: isSelected?"rgba(99,102,241,0.14)":"rgba(99,102,241,0.04)",  border:isSelected?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.13)",   ageCol:"#94a3b8",  badgeCol:"#64748b", badgeBg:"rgba(100,116,139,0.1)", badgeBord:"rgba(100,116,139,0.2)", tagCol:"#818cf8", tagBg:"rgba(99,102,241,0.07)",  tagBord:"rgba(99,102,241,0.17)",  dateCol:"#c7d2fe" },
  }[status];

  const badgeLabel = { completed:"✓ Done", overdue:"Overdue", scheduled:"Scheduled" }[status];
  const checkBorder = status==="overdue" ? (isSelected?"#f87171":"rgba(248,113,113,0.4)") : (isSelected?"#6366f1":"rgba(99,102,241,0.35)");
  const checkBg     = isSelected ? (status==="overdue"?"rgba(248,113,113,0.22)":"rgba(99,102,241,0.25)") : "transparent";
  const checkTick   = status==="overdue" ? "#f87171" : "#818cf8";

  return (
    <div style={{borderRadius:11,transition:"all 0.15s",background:theme.rowBg,border:`1px solid ${theme.border}`,opacity:status==="completed"?0.65:1}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:9,padding:"11px 12px"}}>

        {/* Checkbox / done icon */}
        {status==="completed" ? (
          <div style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:2,background:"rgba(74,222,128,0.18)",border:"2px solid #4ade80",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#4ade80",fontSize:11,fontWeight:800}}>✓</span>
          </div>
        ) : (
          <button onClick={()=>onToggle(v.day)} style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:2,border:`2px solid ${checkBorder}`,background:checkBg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.12s"}}>
            {isSelected && <span style={{color:checkTick,fontSize:11,fontWeight:800,lineHeight:1}}>✓</span>}
          </button>
        )}

        {/* Content */}
        <div style={{flex:1,minWidth:0}}>
          {/* Title + badge */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:700,color:theme.ageCol,textDecoration:status==="completed"?"line-through":"none"}}>{v.age}</span>
            <span style={{fontSize:10,color:theme.badgeCol,background:theme.badgeBg,border:`1px solid ${theme.badgeBord}`,padding:"1px 7px",borderRadius:20,fontWeight:700,whiteSpace:"nowrap"}}>{badgeLabel}</span>
          </div>
          {/* Date line */}
          <div style={{fontSize:12,marginBottom:6}}>
            <span style={{color:"#64748b"}}>Due on </span>
            <span style={{fontWeight:800,color:theme.dateCol}}>{fmtDate(vacDate)}</span>
            {status!=="completed" && <span style={{fontSize:11,color:"#475569",marginLeft:7}}>{fmtRel(daysUntil)}</span>}
          </div>
          {/* Vaccine tags — wrap freely, each relative-positioned for popup */}
          <div style={{display:"flex",flexWrap:"wrap",gap:4,position:"relative"}}>
            {v.vaccines.map(vx=>(
              <VTag key={vx.name} vaccine={vx}
                color={theme.tagCol} bg={theme.tagBg} border={theme.tagBord}
                strikethrough={status==="completed"}
              />
            ))}
          </div>
        </div>

        {/* Right action */}
        <div style={{flexShrink:0,marginTop:2}}>
          {status==="overdue" && (
            <button onClick={()=>onDone(v.day)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.08)",color:"#4ade80",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>✓ Done</button>
          )}
          {status==="scheduled" && (
            <button onClick={()=>onCal([v])} style={{padding:"5px 9px",borderRadius:7,border:"1px solid rgba(99,102,241,0.28)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>📅 +Cal</button>
          )}
          {status==="completed" && (
            <button onClick={onUndo} style={{padding:"4px 9px",borderRadius:6,border:"1px solid rgba(74,222,128,0.15)",background:"transparent",color:"#475569",fontSize:10,cursor:"pointer"}}>undo</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VaccineTab({ baby }) {
  const todayDays = daysBetween(baby.dob, new Date().toISOString().split("T")[0]);

  const [completedSet,      setCompletedSet]      = useState(new Set());
  const [selOverdue,        setSelOverdue]         = useState(new Set());
  const [selScheduled,      setSelScheduled]       = useState(new Set());
  const [calTargets,        setCalTargets]         = useState(null);

  const overdueRows   = VACCINES.filter(v=>getStatus(v.day,todayDays,completedSet)==="overdue");
  const scheduledRows = VACCINES.filter(v=>getStatus(v.day,todayDays,completedSet)==="scheduled");
  const completedRows = VACCINES.filter(v=>getStatus(v.day,todayDays,completedSet)==="completed");
  const pct = Math.round((completedRows.length/VACCINES.length)*100);

  const togOverdue   = day => setSelOverdue(p=>{const n=new Set(p);n.has(day)?n.delete(day):n.add(day);return n;});
  const togScheduled = day => setSelScheduled(p=>{const n=new Set(p);n.has(day)?n.delete(day):n.add(day);return n;});
  const markDone     = days => { setCompletedSet(p=>new Set([...p,...(Array.isArray(days)?days:[days])])); setSelOverdue(new Set()); };
  const unmark       = day  => setCompletedSet(p=>{const n=new Set(p);n.delete(day);return n;});
  const bulkCal      = ()   => setCalTargets(VACCINES.filter(v=>selScheduled.has(v.day)));

  const showOverdueBar   = selOverdue.size > 0;
  const showScheduledBar = !showOverdueBar && selScheduled.size > 0;

  const SectionHead = ({color, icon, text, action}) => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:6}}>
      <div style={{fontSize:11,color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>{icon} {text}</div>
      {action}
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",
      padding:"20px 12px 80px",
      fontFamily:"'Inter',system-ui,sans-serif",
      boxSizing:"border-box",
    }}>
      {/* Responsive max-width wrapper */}
      <div style={{maxWidth:600,margin:"0 auto",width:"100%"}}>

        {/* Header */}
        <div style={{marginBottom:20}}>
          <h2 style={{color:"#c7d2fe",fontSize:17,fontWeight:800,margin:"0 0 3px"}}>💉 IAP Vaccine Schedule</h2>
          <p style={{color:"#475569",fontSize:12,margin:"0 0 14px"}}>{baby.name} · {todayDays} days old</p>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:5,borderRadius:4,background:"rgba(99,102,241,0.15)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:"linear-gradient(90deg,#6366f1,#4ade80)",width:`${pct}%`,transition:"width 0.4s ease"}}/>
            </div>
            <span style={{fontSize:11,color:"#64748b",whiteSpace:"nowrap"}}>{completedRows.length}/{VACCINES.length} done</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap"}}>
          {[["#4ade80","Completed"],["#f87171","Overdue"],["#64748b","Scheduled"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:c,flexShrink:0}}/>
              <span style={{fontSize:11,color:"#64748b"}}>{l}</span>
            </div>
          ))}
        </div>

        {/* ── OVERDUE ── */}
        {overdueRows.length > 0 && (
          <div style={{marginBottom:18}}>
            <SectionHead color="#f87171" icon="⚠" text={`Overdue · ${overdueRows.length} visit${overdueRows.length>1?"s":""}`}
              action={overdueRows.length>1&&(
                <button onClick={()=>setSelOverdue(selOverdue.size===overdueRows.length?new Set():new Set(overdueRows.map(v=>v.day)))}
                  style={{fontSize:11,color:"#f87171",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                  {selOverdue.size===overdueRows.length?"Deselect all":"Select all"}
                </button>
              )}
            />
            <div style={{display:"grid",gap:6}}>
              {overdueRows.map(v=>(
                <VRow key={v.day} v={v} status="overdue" baby={baby}
                  isSelected={selOverdue.has(v.day)}
                  onToggle={togOverdue} onDone={markDone} onUndo={()=>{}} onCal={setCalTargets}/>
              ))}
            </div>
          </div>
        )}

        {/* ── SCHEDULED ── */}
        {scheduledRows.length > 0 && (
          <div style={{marginBottom:18}}>
            <SectionHead color="#94a3b8" icon="○" text={`Scheduled · ${scheduledRows.length} upcoming`}
              action={(
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {scheduledRows.length>1&&(
                    <button onClick={()=>setSelScheduled(selScheduled.size===scheduledRows.length?new Set():new Set(scheduledRows.map(v=>v.day)))}
                      style={{fontSize:11,color:"#818cf8",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                      {selScheduled.size===scheduledRows.length?"Deselect all":"Select all"}
                    </button>
                  )}
                  <button onClick={()=>setCalTargets(scheduledRows)} style={{fontSize:11,color:"#818cf8",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:6,cursor:"pointer",fontWeight:700,padding:"4px 10px"}}>
                    📅 Add all
                  </button>
                </div>
              )}
            />
            <div style={{display:"grid",gap:6}}>
              {scheduledRows.map(v=>(
                <VRow key={v.day} v={v} status="scheduled" baby={baby}
                  isSelected={selScheduled.has(v.day)}
                  onToggle={togScheduled} onDone={()=>{}} onUndo={()=>{}} onCal={setCalTargets}/>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPLETED ── */}
        {completedRows.length > 0 && (
          <div style={{marginBottom:18}}>
            <SectionHead color="#4ade80" icon="✓" text={`Completed · ${completedRows.length} done`} action={null}/>
            <div style={{display:"grid",gap:6}}>
              {completedRows.map(v=>(
                <VRow key={v.day} v={v} status="completed" baby={baby}
                  isSelected={false}
                  onToggle={()=>{}} onDone={()=>{}} onUndo={()=>unmark(v.day)} onCal={setCalTargets}/>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{padding:"11px 13px",borderRadius:9,background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.18)",fontSize:12,color:"#94a3b8"}}>
          ⚠️ IAP 2023 schedule. Always confirm vaccine timing with your paediatrician.
        </div>

        {/* Sticky bars */}
        {showOverdueBar && (
          <ActionBar type="overdue" selected={selOverdue} vaccines={VACCINES}
            onPrimary={()=>markDone([...selOverdue])} onClear={()=>setSelOverdue(new Set())}/>
        )}
        {showScheduledBar && (
          <ActionBar type="scheduled" selected={selScheduled} vaccines={VACCINES}
            onPrimary={bulkCal} onClear={()=>setSelScheduled(new Set())}/>
        )}
      </div>

      {calTargets && <CalModal targets={calTargets} baby={baby} onClose={()=>setCalTargets(null)}/>}
    </div>
  );
}
