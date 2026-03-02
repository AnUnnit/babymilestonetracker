/* eslint-disable */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import {
  fetchGrowthRecords, upsertGrowthRecord, deleteGrowthRecord,
  fetchMilestoneLogs, upsertMilestoneLog, deleteMilestoneLog,
  fetchShareTokens, createShareToken, deleteShareToken,
} from './db';


// ─── WHO LMS DATA ─────────────────────────────────────────────────────────────
const WHO_LMS = {
  weight: {
    boys: [[0,0.3487,3.3464,0.14602],[1,0.2297,4.4709,0.13395],[2,0.1970,5.5675,0.12385],[3,0.1738,6.3762,0.11727],[4,0.1553,7.0023,0.11316],[5,0.1395,7.5105,0.11080],[6,0.1257,7.9340,0.10958],[7,0.1134,8.2970,0.10902],[8,0.1021,8.6151,0.10882],[9,0.0917,8.9014,0.10881],[10,0.0822,9.1649,0.10730],[11,0.0733,9.4122,0.10746],[12,0.0650,9.6479,0.10773]],
    girls: [[0,0.3809,3.2322,0.14171],[1,0.1714,4.1873,0.13724],[2,0.0962,5.1282,0.13000],[3,0.0402,5.8458,0.12619],[4,-0.0050,6.4232,0.12402],[5,-0.0390,6.8990,0.12274],[6,-0.0632,7.2970,0.12214],[7,-0.0790,7.6422,0.12192],[8,-0.0878,7.9487,0.12193],[9,-0.0912,8.2254,0.12211],[10,-0.0901,8.4800,0.12239],[11,-0.0854,8.7192,0.12273],[12,-0.0776,8.9481,0.12311]],
  },
  length: {
    boys: [[0,1,49.8842,0.03795],[1,1,54.7244,0.03557],[2,1,58.4249,0.03424],[3,1,61.4292,0.03347],[4,1,63.8860,0.03300],[5,1,65.9026,0.03271],[6,1,67.6236,0.03257],[7,1,69.1645,0.03254],[8,1,70.5994,0.03258],[9,1,71.9687,0.03267],[10,1,73.2812,0.03279],[11,1,74.5388,0.03293],[12,1,75.7488,0.03308]],
    girls: [[0,1,49.1477,0.03790],[1,1,53.6872,0.03640],[2,1,57.0673,0.03568],[3,1,59.8029,0.03525],[4,1,62.0899,0.03497],[5,1,64.0301,0.03479],[6,1,65.7311,0.03468],[7,1,67.2873,0.03462],[8,1,68.7498,0.03460],[9,1,70.1435,0.03461],[10,1,71.4818,0.03463],[11,1,72.7710,0.03467],[12,1,74.0150,0.03471]],
  },
  headCirc: {
    boys: [[0,1,34.4618,0.03686],[1,1,37.2759,0.03124],[2,1,39.1285,0.02919],[3,1,40.5135,0.02841],[4,1,41.6317,0.02798],[5,1,42.5621,0.02773],[6,1,43.3293,0.02758],[7,1,43.9684,0.02750],[8,1,44.4965,0.02747],[9,1,44.9374,0.02749],[10,1,45.3122,0.02754],[11,1,45.6387,0.02760],[12,1,45.9317,0.02768]],
    girls: [[0,1,33.8787,0.03496],[1,1,36.5408,0.03141],[2,1,38.2521,0.02964],[3,1,39.5328,0.02870],[4,1,40.5817,0.02818],[5,1,41.4639,0.02786],[6,1,42.1986,0.02765],[7,1,42.8153,0.02750],[8,1,43.3327,0.02741],[9,1,43.7743,0.02735],[10,1,44.1553,0.02733],[11,1,44.4870,0.02733],[12,1,44.7754,0.02734]],
  },
};
const PCTILE_LINES = [
  {z:-1.881,label:"3rd",color:"#f87171"},{z:-1.282,label:"10th",color:"#fb923c"},
  {z:-0.674,label:"25th",color:"#a3e635"},{z:0,label:"50th",color:"#4ade80"},
  {z:0.674,label:"75th",color:"#a3e635"},{z:1.282,label:"90th",color:"#fb923c"},
  {z:1.881,label:"97th",color:"#f87171"},
];
function lmsValue(L,M,S,z){if(Math.abs(L)<1e-6)return M*Math.exp(S*z);return M*Math.pow(1+L*S*z,1/L);}
function computeZ(v,L,M,S){if(Math.abs(L)<1e-6)return Math.log(v/M)/S;return(Math.pow(v/M,L)-1)/(L*S);}
function zToPercentile(z){const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;const sign=z<0?-1:1;const x=Math.abs(z)/Math.sqrt(2);const t=1/(1+p*x);const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);return Math.round(50*(1+sign*y));}
function getLMSAtDays(metric,sex,days){const months=days/30.4375;const rows=WHO_LMS[metric][sex];const lo=Math.max(0,Math.min(11,Math.floor(months)));const hi=Math.min(12,lo+1);if(lo===hi){const r=rows[lo];return{L:r[1],M:r[2],S:r[3]};}const frac=months-lo;const r0=rows[lo],r1=rows[hi];return{L:r0[1]+frac*(r1[1]-r0[1]),M:r0[2]+frac*(r1[2]-r0[2]),S:r0[3]+frac*(r1[3]-r0[3])};}
function buildChartData(metric,sex,records,birthValue){const gridDays=Array.from({length:Math.floor(365/15)+1},(_,i)=>i*15);const recDays=records.filter(r=>r[metric]!=null).map(r=>r.day);const allDays=Array.from(new Set([...gridDays,...recDays])).sort((a,b)=>a-b);let birthZ=null;if(birthValue!=null){const lms=getLMSAtDays(metric,sex,0);birthZ=computeZ(birthValue,lms.L,lms.M,lms.S);}const data=allDays.map(day=>{const{L,M,S}=getLMSAtDays(metric,sex,day);const pt={day};PCTILE_LINES.forEach(({z,label})=>{pt[label]=parseFloat(lmsValue(L,M,S,z).toFixed(3));});if(birthZ!==null)pt.personalised=parseFloat(lmsValue(L,M,S,birthZ).toFixed(3));const rec=records.find(r=>r.day===day&&r[metric]!=null);if(rec)pt.actual=rec[metric];return pt;});return{data,birthZ};}

// ─── MILESTONE DATA ───────────────────────────────────────────────────────────
// p5start, p95end = age in months (5th–95th percentile window)
const MILESTONE_DATA = [
  // 0–3m band
  {id:"m1",  band:"0–3m", category:"Motor",     text:"Lifts head when prone",         p5:0.5, p95:2,   desc:"Baby pushes up and briefly lifts their head while lying on tummy"},
  {id:"m2",  band:"0–3m", category:"Motor",     text:"Tracks object with eyes",        p5:0.5, p95:3,   desc:"Baby follows a slow-moving object or face with their gaze"},
  {id:"m3",  band:"0–3m", category:"Social",    text:"Social smile",                   p5:1.5, p95:3,   desc:"Baby smiles intentionally in response to a familiar face or voice (reflex smiles appear 3–5 weeks; true social smiles emerge 6–8 weeks and are distinct)"},
  {id:"m4",  band:"0–3m", category:"Language",  text:"Cooing sounds",                  p5:1.5, p95:3,   desc:"Baby makes soft vowel sounds like 'oooh' and 'aaah'"},
  {id:"m5",  band:"0–3m", category:"Motor",     text:"Head steady when held upright",  p5:2,   p95:4,   desc:"Baby holds head steady without support when held sitting"},
  // 3–6m band
  {id:"m6",  band:"3–6m", category:"Motor",     text:"Rolls front to back",            p5:3,   p95:5.5, desc:"Baby rolls from tummy to back independently"},
  {id:"m7",  band:"3–6m", category:"Fine Motor",text:"Reaches for objects",            p5:3,   p95:5,   desc:"Baby intentionally reaches toward a toy or object"},
  {id:"m8",  band:"3–6m", category:"Language",  text:"Laughs out loud",                p5:3,   p95:5,   desc:"Baby produces clear laughing sounds when played with"},
  {id:"m9",  band:"3–6m", category:"Motor",     text:"Rolls back to front",            p5:4,   p95:6,   desc:"Baby rolls from back to tummy"},
  {id:"m10", band:"3–6m", category:"Fine Motor",text:"Transfers object hand-to-hand",  p5:5,   p95:7.5, desc:"Baby passes a toy from one hand to the other. CDC/AAP 2022 updated this milestone to the 9m checklist ('Moves things from one hand to the other')"},
  {id:"m11", band:"3–6m", category:"Social",    text:"Recognises familiar faces",      p5:3,   p95:5,   desc:"Baby shows clear recognition of parents vs strangers"},
  {id:"m12", band:"3–6m", category:"Language",  text:"Babbling (vowel play → ba/da/ma)",p5:4,  p95:7,   desc:"Vocal play with vowel sounds begins ~4m; consonant babbling (ba, da, ma) emerges from ~6m — canonical babbling onset is 6–10m per Oller et al. 2018"},
  // 6–9m band
  {id:"m13", band:"6–9m", category:"Motor",     text:"Sits without support",           p5:3.8, p95:9,   desc:"Baby sits alone steadily without any support. WHO MGRS 2006: 5th %ile = 3.8m, 95th = 9.2m (Acta Paediatrica Suppl. 450:86–95)"},
  {id:"m14", band:"6–9m", category:"Motor",     text:"Pulls to stand",                 p5:4.8, p95:11,  desc:"Baby uses furniture or hands to pull themselves upright. WHO MGRS 2006: standing with assistance 5th %ile = 4.8m, 95th = 11.4m"},
  {id:"m15", band:"6–9m", category:"Fine Motor",text:"Raking grasp",                   p5:6,   p95:8,   desc:"Baby rakes small objects toward themselves with fingers"},
  {id:"m16", band:"6–9m", category:"Social",    text:"Stranger anxiety",               p5:6,   p95:9,   desc:"Baby becomes clingy or upset around unfamiliar people"},
  {id:"m17", band:"6–9m", category:"Cognitive", text:"Object permanence",              p5:6,   p95:9,   desc:"Baby understands objects still exist when hidden"},
  {id:"m18", band:"6–9m", category:"Feeding",   text:"Accepts solid foods",            p5:5,   p95:7,   desc:"Baby opens mouth and swallows pureed/mashed food"},
  {id:"m26", band:"6–9m", category:"Motor",     text:"Hands-and-knees crawling",       p5:5.2, p95:13.5,optional:true, desc:"Baby moves forward on hands and knees in alternating pattern. Optional — 4.3% of healthy babies skip crawling entirely and walk directly (WHO MGRS 2006). Not skipping means no concern."},
  // 9–12m band
  {id:"m19", band:"9–12m",category:"Motor",     text:"Cruises along furniture",        p5:6,   p95:13,  desc:"Baby walks sideways holding onto furniture. WHO MGRS 2006: walking with assistance 5th %ile = 5.9m, 95th = 13.7m"},
  {id:"m20", band:"9–12m",category:"Motor",     text:"First independent steps",        p5:9,   p95:15,  desc:"Baby takes a few steps without holding anything. WHO MGRS 2006: 5th %ile = 9.4m, 95th = 15.3m. CDC/AAP 2022 moved 'walking' benchmark to 15m. Healthy range is 9–15 months."},
  {id:"m21", band:"9–12m",category:"Fine Motor",text:"Pincer grasp",                   p5:8,   p95:11,  desc:"Baby picks up small objects between thumb and index finger"},
  {id:"m22", band:"9–12m",category:"Language",  text:"Mama/Dada with meaning",         p5:8,   p95:12,  desc:"Baby uses 'mama' or 'dada' to refer to the correct parent"},
  {id:"m23", band:"9–12m",category:"Language",  text:"First word",                     p5:10,  p95:14,  desc:"Baby says one recognisable word with consistent meaning"},
  {id:"m24", band:"9–12m",category:"Social",    text:"Waves bye-bye",                  p5:8,   p95:11,  desc:"Baby waves in response to someone leaving"},
  {id:"m25", band:"9–12m",category:"Cognitive", text:"Points to objects",              p5:9,   p95:13,  desc:"Baby points a finger to request or show interest in something"},
];

const CAT = {
  "Motor":      {color:"#818cf8", bg:"rgba(129,140,248,0.12)", border:"rgba(129,140,248,0.35)"},
  "Fine Motor": {color:"#a78bfa", bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.35)"},
  "Language":   {color:"#34d399", bg:"rgba(52,211,153,0.12)",  border:"rgba(52,211,153,0.35)"},
  "Social":     {color:"#f472b6", bg:"rgba(244,114,182,0.12)", border:"rgba(244,114,182,0.35)"},
  "Cognitive":  {color:"#fbbf24", bg:"rgba(251,191,36,0.12)",  border:"rgba(251,191,36,0.35)"},
  "Feeding":    {color:"#60a5fa", bg:"rgba(96,165,250,0.12)",  border:"rgba(96,165,250,0.35)"},
};
const BANDS = ["0–3m","3–6m","6–9m","9–12m"];
const BAND_RANGE = {"0–3m":[0,3],"3–6m":[3,6],"6–9m":[6,9],"9–12m":[9,13]};

const VACCINES = [
  {age:"Birth (Day 0)",vaccines:["BCG","OPV-0","Hepatitis B (1)"]},
  {age:"6 weeks (Day 42)",vaccines:["DTwP/DTaP (1)","IPV (1)","Hib (1)","Hep B (2)","PCV (1)","Rotavirus (1)"]},
  {age:"10 weeks (Day 70)",vaccines:["DTwP/DTaP (2)","IPV (2)","Hib (2)","PCV (2)","Rotavirus (2)"]},
  {age:"14 weeks (Day 98)",vaccines:["DTwP/DTaP (3)","IPV (3)","Hib (3)","PCV (3)","Rotavirus (3)"]},
  {age:"6 months (Day 183)",vaccines:["OPV (1)","Hep B (3)","Influenza (1)"]},
  {age:"7 months (Day 213)",vaccines:["Influenza (2) — if 1st year"]},
  {age:"9 months (Day 274)",vaccines:["OPV (2)","MR/MMR (1)","Typhoid Conjugate"]},
  {age:"12 months (Day 365)",vaccines:["Hepatitis A (1)","Varicella (1)"]},
];

// ─── CSS-ANIMATED SVG ILLUSTRATIONS ──────────────────────────────────────────
// Each returns an SVG string with keyframe animations embedded
function MilestoneIllustration({ milestoneId, category }) {
  const illustrations = {
    m1: ( // Lifts head - baby on tummy, head rises
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes liftHead{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-25deg)}}
            @keyframes bodyRock{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
            .head-lift{transform-origin:90px 85px;animation:liftHead 2s ease-in-out infinite}
            .body-rock{transform-origin:100px 100px;animation:bodyRock 2s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Floor mat */}
        <ellipse cx="100" cy="118" rx="80" ry="12" fill="#fde68a" opacity="0.6"/>
        <rect x="30" y="108" width="140" height="15" rx="7" fill="#fbbf24" opacity="0.4"/>
        {/* Baby body */}
        <g className="body-rock">
          <ellipse cx="105" cy="105" rx="35" ry="18" fill="#fcd5a0"/>
          {/* Arms */}
          <ellipse cx="75" cy="102" rx="8" ry="5" fill="#fcd5a0" transform="rotate(-20,75,102)"/>
          <ellipse cx="135" cy="102" rx="8" ry="5" fill="#fcd5a0" transform="rotate(20,135,102)"/>
          {/* Legs */}
          <ellipse cx="95" cy="120" rx="6" ry="10" fill="#fcd5a0"/>
          <ellipse cx="115" cy="120" rx="6" ry="10" fill="#fcd5a0"/>
          {/* Diaper */}
          <ellipse cx="105" cy="112" rx="20" ry="10" fill="#bfdbfe"/>
        </g>
        {/* Head lifting */}
        <g className="head-lift">
          <circle cx="90" cy="82" r="18" fill="#8B5E3C"/>
          <circle cx="90" cy="82" r="16" fill="#fcd5a0"/>
          {/* Hair */}
          <ellipse cx="90" cy="67" rx="12" ry="5" fill="#3d1c02"/>
          {/* Eyes */}
          <circle cx="84" cy="80" r="3" fill="#fff"/><circle cx="84" cy="80" r="2" fill="#3d1c02"/>
          <circle cx="96" cy="80" r="3" fill="#fff"/><circle cx="96" cy="80" r="2" fill="#3d1c02"/>
          {/* Smile */}
          <path d="M86,87 Q90,91 94,87" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
        </g>
        {/* Parent hands in background */}
        <ellipse cx="60" cy="108" rx="12" ry="8" fill="#8B4513" opacity="0.5" transform="rotate(-15,60,108)"/>
        {/* Stars of achievement */}
        <text x="155" y="70" fontSize="16" style={{animation:"bodyRock 1.5s ease-in-out infinite"}}>⭐</text>
      </svg>
    ),
    m3: ( // Social smile - parent and baby face-to-face
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes smileGlow{0%,100%{opacity:0.7}50%{opacity:1}}
            @keyframes bobHead{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
            .baby-head{animation:bobHead 1.8s ease-in-out infinite}
            .smile-glow{animation:smileGlow 1.5s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Parent - Indian woman with bindi */}
        <circle cx="55" cy="65" r="22" fill="#6B3A2A"/>
        <circle cx="55" cy="65" r="20" fill="#D2875A"/>
        {/* Bindi */}
        <circle cx="55" cy="57" r="2.5" fill="#dc2626"/>
        {/* Hair - bun style */}
        <ellipse cx="55" cy="46" rx="15" ry="8" fill="#1c0a00"/>
        <circle cx="55" cy="44" r="6" fill="#1c0a00"/>
        {/* Earring */}
        <circle cx="36" cy="68" r="3" fill="#fbbf24"/>
        {/* Eyes */}
        <ellipse cx="49" cy="63" rx="3.5" ry="2.5" fill="#1c0a00"/>
        <ellipse cx="61" cy="63" rx="3.5" ry="2.5" fill="#1c0a00"/>
        {/* Smile at baby */}
        <path d="M46,72 Q55,80 64,72" stroke="#c0694e" strokeWidth="2" fill="none" className="smile-glow"/>
        {/* Saree shoulder */}
        <path d="M35,85 Q55,95 75,85" fill="#7c3aed" opacity="0.7"/>
        {/* Baby */}
        <g className="baby-head">
          <circle cx="145" cy="70" r="22" fill="#5a2d0c"/>
          <circle cx="145" cy="70" r="20" fill="#f5c5a0"/>
          {/* Baby hair - wispy */}
          <path d="M130,53 Q145,46 160,53" stroke="#3d1c02" strokeWidth="3" fill="none"/>
          {/* Baby eyes - wide and happy */}
          <circle cx="138" cy="68" r="4" fill="#fff"/><circle cx="138" cy="68" r="2.5" fill="#3d1c02"/>
          <circle cx="152" cy="68" r="4" fill="#fff"/><circle cx="152" cy="68" r="2.5" fill="#3d1c02"/>
          {/* Big baby smile */}
          <path d="M136,78 Q145,86 154,78" stroke="#c0694e" strokeWidth="2" fill="#fca5a5" className="smile-glow"/>
          {/* Chubby cheeks */}
          <circle cx="133" cy="74" r="5" fill="#fca5a5" opacity="0.5"/>
          <circle cx="157" cy="74" r="5" fill="#fca5a5" opacity="0.5"/>
        </g>
        {/* Heart between them */}
        <text x="95" y="72" fontSize="18" className="smile-glow">❤️</text>
      </svg>
    ),
    m4: ( // Cooing - baby making sounds
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes mouthOpen{0%,100%{transform:scaleY(1)}40%,60%{transform:scaleY(0.3)}}
            @keyframes bubbleFloat{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-40px) scale(1.5);opacity:0}}
            @keyframes cushionBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
            .mouth-anim{transform-origin:100px 82px;animation:mouthOpen 1.5s ease-in-out infinite}
            .bubble1{animation:bubbleFloat 2s ease-out infinite}
            .bubble2{animation:bubbleFloat 2s ease-out 0.7s infinite}
            .cushion{animation:cushionBounce 2s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Cushion/rocker */}
        <g className="cushion">
          <ellipse cx="100" cy="115" rx="55" ry="18" fill="#a78bfa" opacity="0.5"/>
          <rect x="55" y="98" width="90" height="22" rx="11" fill="#7c3aed" opacity="0.4"/>
        </g>
        {/* Baby body in rocker */}
        <ellipse cx="100" cy="100" rx="30" ry="20" fill="#fcd5a0"/>
        <ellipse cx="100" cy="108" rx="20" ry="10" fill="#93c5fd"/>
        {/* Baby head */}
        <circle cx="100" cy="72" r="22" fill="#5a2d0c"/>
        <circle cx="100" cy="72" r="20" fill="#f5c5a0"/>
        {/* Darker skin tone */}
        <circle cx="100" cy="72" r="20" fill="#c68642" opacity="0.3"/>
        {/* Hair */}
        <ellipse cx="100" cy="53" rx="14" ry="6" fill="#1c0a00"/>
        {/* Eyes wide open, sparkling */}
        <circle cx="93" cy="70" r="4.5" fill="#fff"/><circle cx="93" cy="70" r="3" fill="#1c0a00"/>
        <circle cx="107" cy="70" r="4.5" fill="#fff"/><circle cx="107" cy="70" r="3" fill="#1c0a00"/>
        <circle cx="94" cy="69" r="1" fill="#fff"/>
        <circle cx="108" cy="69" r="1" fill="#fff"/>
        {/* Animated mouth */}
        <g className="mouth-anim">
          <ellipse cx="100" cy="82" rx="7" ry="5" fill="#c0694e"/>
          <ellipse cx="100" cy="80" rx="7" ry="3" fill="#fcd5a0"/>
        </g>
        {/* Sound bubbles */}
        <g className="bubble1">
          <ellipse cx="125" cy="58" rx="14" ry="10" fill="rgba(129,140,248,0.3)" stroke="#818cf8" strokeWidth="1"/>
          <text x="118" y="62" fontSize="9" fill="#c7d2fe">ooo!</text>
        </g>
        <g className="bubble2">
          <ellipse cx="145" cy="45" rx="12" ry="8" fill="rgba(129,140,248,0.2)" stroke="#818cf8" strokeWidth="1"/>
          <text x="139" y="49" fontSize="8" fill="#c7d2fe">aah</text>
        </g>
      </svg>
    ),
    m6: ( // Rolls front to back
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes rollBody{0%{transform:rotate(0deg) translateX(0)}50%{transform:rotate(180deg) translateX(20px)}100%{transform:rotate(360deg) translateX(40px)}}
            @keyframes fadeArrow{0%,100%{opacity:0.3}50%{opacity:1}}
            .roll-baby{transform-origin:80px 90px;animation:rollBody 3s ease-in-out infinite}
            .arrow-anim{animation:fadeArrow 1.5s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Floor */}
        <rect x="10" y="108" width="180" height="20" rx="5" fill="#fde68a" opacity="0.4"/>
        <ellipse cx="100" cy="112" rx="85" ry="8" fill="#fbbf24" opacity="0.3"/>
        {/* Direction arrows */}
        <path d="M40,80 L80,80" stroke="#818cf8" strokeWidth="2" strokeDasharray="5,3" className="arrow-anim"/>
        <polygon points="80,75 90,80 80,85" fill="#818cf8" className="arrow-anim"/>
        {/* Rolling baby */}
        <g className="roll-baby">
          <circle cx="80" cy="90" r="20" fill="#7c3aed" opacity="0.2"/>
          <circle cx="80" cy="90" r="18" fill="#fcd5a0"/>
          {/* Face */}
          <circle cx="75" cy="87" r="3" fill="#1c0a00"/>
          <circle cx="85" cy="87" r="3" fill="#1c0a00"/>
          <path d="M74,95 Q80,100 86,95" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
          {/* Hair */}
          <ellipse cx="80" cy="73" rx="12" ry="5" fill="#3d1c02"/>
        </g>
        {/* Parent encouraging from side - South Indian look */}
        <circle cx="165" cy="75" r="18" fill="#4a2511"/>
        <circle cx="165" cy="75" r="16" fill="#c47a3a"/>
        {/* Tilak on forehead */}
        <rect x="162" y="63" width="6" height="2" rx="1" fill="#ff4500"/>
        {/* Kurta */}
        <rect x="150" y="90" width="30" height="25" rx="5" fill="#f97316" opacity="0.7"/>
        <circle cx="158" cy="72" r="2.5" fill="#1c0a00"/>
        <circle cx="172" cy="72" r="2.5" fill="#1c0a00"/>
        <path d="M158,82 Q165,87 172,82" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    m8: ( // Laughing - parent tickling
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes laughShake{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}
            @keyframes handsTickle{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
            @keyframes hahaBounce{0%,100%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-35px) scale(0.5);opacity:0}}
            .baby-laugh{animation:laughShake 0.4s ease-in-out infinite}
            .tickle-hands{animation:handsTickle 0.8s ease-in-out infinite}
            .haha{animation:hahaBounce 1.5s ease-out infinite}
            .haha2{animation:hahaBounce 1.5s ease-out 0.5s infinite}
          `}</style>
        </defs>
        {/* Baby on back - feet up */}
        <g className="baby-laugh">
          <ellipse cx="90" cy="100" rx="32" ry="20" fill="#fcd5a0"/>
          <ellipse cx="90" cy="108" rx="18" ry="10" fill="#93c5fd"/>
          {/* Kicking feet */}
          <ellipse cx="65" cy="85" rx="8" ry="6" fill="#fcd5a0" transform="rotate(-40,65,85)"/>
          <ellipse cx="115" cy="83" rx="8" ry="6" fill="#fcd5a0" transform="rotate(40,115,83)"/>
          {/* Head */}
          <circle cx="90" cy="72" r="20" fill="#8B5E3C"/>
          <circle cx="90" cy="72" r="18" fill="#d4956a"/>
          {/* Hair */}
          <ellipse cx="90" cy="55" rx="13" ry="6" fill="#1c0a00"/>
          {/* Laughing eyes - squinted */}
          <path d="M81,69 Q84,65 87,69" stroke="#1c0a00" strokeWidth="2.5" fill="none"/>
          <path d="M93,69 Q96,65 99,69" stroke="#1c0a00" strokeWidth="2.5" fill="none"/>
          {/* Big open laugh mouth */}
          <ellipse cx="90" cy="79" rx="9" ry="7" fill="#c0694e"/>
          <ellipse cx="90" cy="76" rx="9" ry="4" fill="#fcd5a0"/>
          {/* Teeth hint */}
          <rect x="85" y="76" width="10" height="3" rx="1" fill="#fff" opacity="0.7"/>
          {/* Chubby cheeks */}
          <circle cx="78" cy="75" r="6" fill="#fca5a5" opacity="0.6"/>
          <circle cx="102" cy="75" r="6" fill="#fca5a5" opacity="0.6"/>
        </g>
        {/* Parent tickling hands */}
        <g className="tickle-hands">
          <ellipse cx="60" cy="95" rx="14" ry="9" fill="#5a2d0c" transform="rotate(20,60,95)"/>
          <circle cx="53" cy="90" r="4" fill="#5a2d0c"/>
          <circle cx="47" cy="87" r="3.5" fill="#5a2d0c"/>
          <circle cx="57" cy="86" r="3" fill="#5a2d0c"/>
        </g>
        {/* Ha ha bubbles */}
        <text x="115" y="55" fontSize="14" fontWeight="bold" fill="#fbbf24" className="haha">ha!</text>
        <text x="130" y="68" fontSize="11" fill="#fbbf24" className="haha2">ha!</text>
      </svg>
    ),
    m13: ( // Sits without support
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes sitSway{0%,100%{transform:rotate(0deg)}30%{transform:rotate(-3deg)}70%{transform:rotate(3deg)}}
            @keyframes toyBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
            .baby-sit{transform-origin:100px 95px;animation:sitSway 2.5s ease-in-out infinite}
            .toy-bounce{animation:toyBounce 1.2s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Play mat */}
        <ellipse cx="100" cy="118" rx="70" ry="14" fill="#86efac" opacity="0.4"/>
        {/* Sitting baby */}
        <g className="baby-sit">
          {/* Legs spread out */}
          <ellipse cx="75" cy="108" rx="18" ry="8" fill="#fcd5a0" transform="rotate(-20,75,108)"/>
          <ellipse cx="125" cy="108" rx="18" ry="8" fill="#fcd5a0" transform="rotate(20,125,108)"/>
          {/* Body */}
          <ellipse cx="100" cy="95" rx="22" ry="25" fill="#fb923c" opacity="0.8"/>
          {/* Nappy */}
          <ellipse cx="100" cy="108" rx="18" ry="10" fill="#bfdbfe"/>
          {/* Head - lighter skin */}
          <circle cx="100" cy="65" r="22" fill="#c47a3a"/>
          <circle cx="100" cy="65" r="20" fill="#f5c5a0"/>
          {/* Hair - longer */}
          <ellipse cx="100" cy="46" rx="16" ry="7" fill="#1c0a00"/>
          <ellipse cx="88" cy="52" rx="5" ry="10" fill="#1c0a00"/>
          <ellipse cx="112" cy="52" rx="5" ry="10" fill="#1c0a00"/>
          {/* Eyes */}
          <circle cx="93" cy="63" r="4" fill="#fff"/><circle cx="93" cy="63" r="2.5" fill="#1c0a00"/>
          <circle cx="107" cy="63" r="4" fill="#fff"/><circle cx="107" cy="63" r="2.5" fill="#1c0a00"/>
          {/* Smile - proud */}
          <path d="M92,74 Q100,80 108,74" stroke="#c0694e" strokeWidth="2" fill="none"/>
          {/* Arms out for balance */}
          <ellipse cx="72" cy="90" rx="12" ry="6" fill="#fcd5a0" transform="rotate(-30,72,90)"/>
          <ellipse cx="128" cy="90" rx="12" ry="6" fill="#fcd5a0" transform="rotate(30,128,90)"/>
        </g>
        {/* Toy on ground */}
        <g className="toy-bounce">
          <circle cx="150" cy="112" r="12" fill="#f87171" opacity="0.8"/>
          <text x="145" y="116" fontSize="10">🎈</text>
        </g>
        {/* Star */}
        <text x="30" y="55" fontSize="20">⭐</text>
      </svg>
    ),
    m16: ( // Stranger anxiety - clinging to parent
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes clingyShake{0%,100%{transform:rotate(0deg)}25%,75%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
            @keyframes strangerBack{0%,100%{transform:translateX(0)}50%{transform:translateX(-5px)}}
            .clingy{animation:clingyShake 1s ease-in-out infinite}
            .stranger{animation:strangerBack 2s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Parent - Muslim woman with hijab */}
        <g>
          <circle cx="60" cy="65" r="22" fill="#2d5016"/>
          <circle cx="60" cy="72" r="18" fill="#d4956a"/>
          {/* Hijab */}
          <ellipse cx="60" cy="56" rx="22" ry="16" fill="#16a34a"/>
          <ellipse cx="60" cy="70" rx="18" ry="8" fill="#16a34a"/>
          {/* Face */}
          <circle cx="54" cy="70" r="2.5" fill="#1c0a00"/>
          <circle cx="66" cy="70" r="2.5" fill="#1c0a00"/>
          <path d="M55,78 Q60,83 65,78" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
          {/* Body - abaya */}
          <rect x="42" y="86" width="36" height="40" rx="8" fill="#166534" opacity="0.8"/>
        </g>
        {/* Baby clinging */}
        <g className="clingy">
          <circle cx="60" cy="88" r="15" fill="#5a2d0c"/>
          <circle cx="60" cy="88" r="13" fill="#fcd5a0"/>
          {/* Baby eyes - worried, big */}
          <circle cx="54" cy="86" r="4.5" fill="#fff"/><circle cx="54" cy="86" r="3" fill="#1c0a00"/>
          <circle cx="66" cy="86" r="4.5" fill="#fff"/><circle cx="66" cy="86" r="3" fill="#1c0a00"/>
          {/* Worried brow */}
          <path d="M51,81 Q54,79 57,81" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
          <path d="M63,81 Q66,79 69,81" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
          {/* Downturned mouth */}
          <path d="M54,94 Q60,90 66,94" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
          {/* Arms gripping parent */}
          <ellipse cx="45" cy="88" rx="10" ry="5" fill="#fcd5a0" transform="rotate(-20,45,88)"/>
          <ellipse cx="75" cy="88" rx="10" ry="5" fill="#fcd5a0" transform="rotate(20,75,88)"/>
        </g>
        {/* Stranger on right side */}
        <g className="stranger">
          <circle cx="155" cy="68" r="18" fill="#1e3a5f"/>
          <circle cx="155" cy="68" r="16" fill="#a0522d"/>
          {/* Hair - short */}
          <ellipse cx="155" cy="52" rx="14" ry="6" fill="#3d1c02"/>
          <circle cx="154" cy="65" r="2.5" fill="#1c0a00"/>
          <circle cx="166" cy="65" r="2.5" fill="#1c0a00"/>
          <path d="M155,75 Q160,78 165,75" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
          <rect x="142" y="85" width="26" height="30" rx="5" fill="#1d4ed8" opacity="0.7"/>
        </g>
        {/* Fear indicator */}
        <text x="95" y="62" fontSize="16">😰</text>
      </svg>
    ),
    m17: ( // Object permanence - peek-a-boo with cloth
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes clothReveal{0%,100%{transform:translateY(0)}50%{transform:translateY(-25px)}}
            @keyframes babyExpect{0%,100%{transform:scaleX(1)}50%{transform:scaleX(1.05)}}
            .cloth{animation:clothReveal 2.5s ease-in-out infinite}
            .baby-peep{animation:babyExpect 2.5s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Parent hiding toy */}
        <circle cx="60" cy="58" r="20" fill="#7c2d12"/>
        <circle cx="60" cy="58" r="18" fill="#c47a3a"/>
        {/* Turban - Sikh parent */}
        <ellipse cx="60" cy="42" rx="18" ry="10" fill="#f97316"/>
        <rect x="42" y="40" width="36" height="12" rx="6" fill="#ea580c"/>
        {/* Beard */}
        <ellipse cx="60" cy="72" rx="10" ry="8" fill="#3d1c02"/>
        <circle cx="53" cy="56" r="2.5" fill="#1c0a00"/>
        <circle cx="67" cy="56" r="2.5" fill="#1c0a00"/>
        <path d="M55,65 Q60,70 65,65" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
        {/* Kurta */}
        <rect x="43" y="77" width="34" height="35" rx="7" fill="#7e22ce" opacity="0.7"/>
        {/* Hand holding cloth over toy */}
        <ellipse cx="90" cy="80" rx="12" ry="8" fill="#c47a3a" transform="rotate(-10,90,80)"/>
        {/* Cloth */}
        <g className="cloth">
          <rect x="80" y="88" width="30" height="25" rx="4" fill="#fde68a" opacity="0.9"/>
          <path d="M80,88 Q95,83 110,88" fill="#fbbf24" opacity="0.7"/>
        </g>
        {/* Toy peeking under cloth */}
        <circle cx="95" cy="108" r="10" fill="#f87171" opacity="0.8"/>
        <text x="90" y="112" fontSize="8">🧸</text>
        {/* Baby watching */}
        <g className="baby-peep">
          <circle cx="155" cy="70" r="20" fill="#5a2d0c"/>
          <circle cx="155" cy="70" r="18" fill="#f5c5a0"/>
          <ellipse cx="155" cy="53" rx="14" ry="6" fill="#3d1c02"/>
          {/* Eyes wide with anticipation */}
          <circle cx="148" cy="68" r="5" fill="#fff"/><circle cx="148" cy="68" r="3.5" fill="#1c0a00"/>
          <circle cx="162" cy="68" r="5" fill="#fff"/><circle cx="162" cy="68" r="3.5" fill="#1c0a00"/>
          <circle cx="149" cy="67" r="1.5" fill="#fff"/>
          <circle cx="163" cy="67" r="1.5" fill="#fff"/>
          {/* O mouth - surprised */}
          <ellipse cx="155" cy="78" rx="5" ry="4" fill="#c0694e"/>
        </g>
        {/* Question marks */}
        <text x="128" y="55" fontSize="14" fill="#fbbf24">?</text>
      </svg>
    ),
    m21: ( // Pincer grasp
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes fingerPinch{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-15deg)}}
            @keyframes itemGlow{0%,100%{opacity:0.8}50%{opacity:1;filter:brightness(1.3)}}
            .thumb{transform-origin:105px 85px;animation:fingerPinch 1.5s ease-in-out infinite}
            .item{animation:itemGlow 1.5s ease-in-out infinite}
          `}</style>
        </defs>
        {/* High chair */}
        <rect x="50" y="95" width="100" height="12" rx="6" fill="#92400e" opacity="0.7"/>
        <rect x="60" y="107" width="8" height="30" rx="4" fill="#78350f"/>
        <rect x="132" y="107" width="8" height="30" rx="4" fill="#78350f"/>
        {/* Baby chubby hand */}
        <ellipse cx="100" cy="88" rx="25" ry="20" fill="#fcd5a0"/>
        {/* Fingers */}
        <ellipse cx="78" cy="76" rx="6" ry="12" fill="#fcd5a0" transform="rotate(-10,78,76)"/>
        <ellipse cx="89" cy="72" rx="6" ry="14" fill="#fcd5a0" transform="rotate(-5,89,72)"/>
        <ellipse cx="100" cy="71" rx="6" ry="14" fill="#fcd5a0"/>
        <ellipse cx="111" cy="73" rx="6" ry="13" fill="#fcd5a0" transform="rotate(5,111,73)"/>
        {/* Thumb animating to pinch */}
        <g className="thumb">
          <ellipse cx="122" cy="88" rx="10" ry="7" fill="#fcd5a0" transform="rotate(40,122,88)"/>
        </g>
        {/* Tiny food item - pea */}
        <g className="item">
          <circle cx="103" cy="78" r="5" fill="#4ade80"/>
          <circle cx="103" cy="77" r="2" fill="#86efac" opacity="0.7"/>
        </g>
        {/* Knuckle dimples */}
        <circle cx="89" cy="88" r="2" fill="#fca5a5" opacity="0.5"/>
        <circle cx="100" cy="87" r="2" fill="#fca5a5" opacity="0.5"/>
        <circle cx="111" cy="88" r="2" fill="#fca5a5" opacity="0.5"/>
        {/* Achievement stars */}
        <text x="145" y="75" fontSize="14">✨</text>
        <text x="40" y="80" fontSize="12">✨</text>
      </svg>
    ),
    m22: ( // Mama/Dada
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes mouthSpeak{0%,100%{transform:scaleY(1)}40%{transform:scaleY(0.2)}70%{transform:scaleY(0.6)}}
            @keyframes parentJoy{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
            @keyframes wordFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-40px);opacity:0}}
            .speak-mouth{transform-origin:100px 80px;animation:mouthSpeak 1.8s ease-in-out infinite}
            .joy{animation:parentJoy 1s ease-in-out infinite}
            .word{animation:wordFloat 2s ease-out infinite}
            .word2{animation:wordFloat 2s ease-out 1s infinite}
          `}</style>
        </defs>
        {/* Baby - center */}
        <circle cx="100" cy="75" r="22" fill="#8B5E3C"/>
        <circle cx="100" cy="75" r="20" fill="#d4956a"/>
        <ellipse cx="100" cy="57" rx="15" ry="6" fill="#1c0a00"/>
        {/* Animated speaking mouth */}
        <g className="speak-mouth">
          <ellipse cx="100" cy="84" rx="8" ry="6" fill="#c0694e"/>
          <ellipse cx="100" cy="81" rx="8" ry="3" fill="#d4956a"/>
        </g>
        <circle cx="93" cy="72" r="3.5" fill="#1c0a00"/>
        <circle cx="107" cy="72" r="3.5" fill="#1c0a00"/>
        {/* Word bubbles */}
        <g className="word">
          <rect x="115" y="45" width="45" height="22" rx="11" fill="rgba(129,140,248,0.4)" stroke="#818cf8" strokeWidth="1.5"/>
          <text x="121" y="60" fontSize="11" fontWeight="bold" fill="#c7d2fe">Mama!</text>
        </g>
        <g className="word2">
          <rect x="115" y="28" width="42" height="20" rx="10" fill="rgba(52,211,153,0.3)" stroke="#34d399" strokeWidth="1.5"/>
          <text x="121" y="42" fontSize="11" fontWeight="bold" fill="#6ee7b7">Dada!</text>
        </g>
        {/* Mom on left reacting */}
        <g className="joy">
          <circle cx="45" cy="72" r="18" fill="#7c2d12"/>
          <circle cx="45" cy="72" r="16" fill="#c47a3a"/>
          <ellipse cx="45" cy="55" rx="14" ry="7" fill="#1c0a00"/>
          <circle cx="38" cy="70" r="2.5" fill="#1c0a00"/>
          <circle cx="52" cy="70" r="2.5" fill="#1c0a00"/>
          {/* Big happy surprised expression */}
          <ellipse cx="45" cy="78" rx="7" ry="6" fill="#c0694e"/>
          {/* Bindi */}
          <circle cx="45" cy="63" r="2" fill="#dc2626"/>
          <circle cx="35" cy="72" r="3" fill="#fbbf24"/>
        </g>
        {/* Dad on right */}
        <g>
          <circle cx="158" cy="72" r="18" fill="#1e3a5f"/>
          <circle cx="158" cy="72" r="16" fill="#8B5E3C"/>
          <ellipse cx="158" cy="56" rx="14" ry="6" fill="#3d1c02"/>
          <circle cx="151" cy="70" r="2.5" fill="#1c0a00"/>
          <circle cx="165" cy="70" r="2.5" fill="#1c0a00"/>
          <ellipse cx="158" cy="78" rx="7" ry="5" fill="#c0694e"/>
          {/* Specs */}
          <rect x="147" y="66" width="10" height="8" rx="3" fill="none" stroke="#94a3b8" strokeWidth="1.5"/>
          <rect x="160" y="66" width="10" height="8" rx="3" fill="none" stroke="#94a3b8" strokeWidth="1.5"/>
          <line x1="157" y1="70" x2="160" y2="70" stroke="#94a3b8" strokeWidth="1"/>
        </g>
        {/* Hearts */}
        <text x="70" y="35" fontSize="12">❤️</text>
        <text x="125" y="35" fontSize="12">❤️</text>
      </svg>
    ),
    m20: ( // First steps
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs>
          <style>{`
            @keyframes step1{0%,100%{transform:translateX(0) rotate(0deg)}50%{transform:translateX(8px) rotate(10deg)}}
            @keyframes step2{0%,100%{transform:translateX(0) rotate(0deg)}50%{transform:translateX(-5px) rotate(-8deg)}}
            @keyframes armsBalance{0%,100%{transform:rotate(-15deg)}50%{transform:rotate(15deg)}}
            @keyframes cheerParent{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
            .leg1{transform-origin:95px 108px;animation:step1 1s ease-in-out infinite}
            .leg2{transform-origin:108px 108px;animation:step2 1s ease-in-out 0.5s infinite}
            .arm-l{transform-origin:80px 90px;animation:armsBalance 0.8s ease-in-out infinite}
            .arm-r{transform-origin:118px 90px;animation:armsBalance 0.8s ease-in-out 0.4s infinite}
            .cheer{animation:cheerParent 0.8s ease-in-out infinite}
          `}</style>
        </defs>
        {/* Floor */}
        <rect x="10" y="118" width="180" height="15" rx="5" fill="#86efac" opacity="0.4"/>
        {/* Toddler taking steps */}
        {/* Body */}
        <ellipse cx="100" cy="90" rx="18" ry="22" fill="#f97316" opacity="0.8"/>
        {/* Legs stepping */}
        <g className="leg1"><rect x="88" y="106" width="12" height="22" rx="6" fill="#fcd5a0"/></g>
        <g className="leg2"><rect x="102" y="106" width="12" height="22" rx="6" fill="#fcd5a0"/></g>
        {/* Arms out balancing */}
        <g className="arm-l"><rect x="62" y="83" width="20" height="10" rx="5" fill="#fcd5a0"/></g>
        <g className="arm-r"><rect x="116" y="83" width="20" height="10" rx="5" fill="#fcd5a0"/></g>
        {/* Head */}
        <circle cx="100" cy="65" r="22" fill="#6B3A2A"/>
        <circle cx="100" cy="65" r="20" fill="#c47a3a"/>
        <ellipse cx="100" cy="47" rx="15" ry="7" fill="#1c0a00"/>
        <circle cx="93" cy="63" r="3.5" fill="#1c0a00"/>
        <circle cx="107" cy="63" r="3.5" fill="#1c0a00"/>
        <path d="M93,73 Q100,79 107,73" stroke="#c0694e" strokeWidth="2" fill="none"/>
        {/* Cheering parent reaching out */}
        <g className="cheer">
          <circle cx="160" cy="68" r="18" fill="#5a2d0c"/>
          <circle cx="160" cy="68" r="16" fill="#d4956a"/>
          <ellipse cx="160" cy="52" rx="13" ry="6" fill="#1c0a00"/>
          <circle cx="153" cy="66" r="2.5" fill="#1c0a00"/>
          <circle cx="167" cy="66" r="2.5" fill="#1c0a00"/>
          <path d="M153,75 Q160,81 167,75" stroke="#c0694e" strokeWidth="1.5" fill="none"/>
          <rect x="145" y="84" width="30" height="30" rx="6" fill="#7c3aed" opacity="0.7"/>
          {/* Arms reaching */}
          <ellipse cx="140" cy="88" rx="14" ry="6" fill="#d4956a" transform="rotate(-20,140,88)"/>
        </g>
        {/* Footsteps trail */}
        <ellipse cx="55" cy="120" rx="6" ry="4" fill="#a78bfa" opacity="0.5"/>
        <ellipse cx="70" cy="116" rx="6" ry="4" fill="#a78bfa" opacity="0.5"/>
        {/* Stars */}
        <text x="20" y="65" fontSize="18">🌟</text>
        <text x="130" y="40" fontSize="14">⭐</text>
      </svg>
    ),

    m2: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes moveObj2{0%,100%{transform:translateX(0)}50%{transform:translateX(70px)}}
          @keyframes eyeF{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
          @keyframes starSp{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          .obj-m{animation:moveObj2 2.5s ease-in-out infinite}
          .eye-lf{transform-origin:88px 75px;animation:eyeF 2.5s ease-in-out infinite}
          .eye-rf{transform-origin:100px 75px;animation:eyeF 2.5s ease-in-out infinite}
          .str-sp{transform-origin:50px 50px;animation:starSp 2s linear infinite}
        `}</style></defs>
        <ellipse cx="115" cy="105" rx="45" ry="18" fill="#c8a97e" opacity="0.3"/>
        <circle cx="115" cy="88" r="22" fill="#f4c07a"/>
        <circle cx="100" cy="80" r="3" fill="#1a1a2e" className="eye-lf"/>
        <circle cx="116" cy="79" r="3" fill="#1a1a2e" className="eye-rf"/>
        <path d="M104 92 Q112 97 120 92" stroke="#c07840" strokeWidth="1.5" fill="none"/>
        <ellipse cx="115" cy="112" rx="30" ry="12" fill="#e8a87c" opacity="0.6"/>
        <line x1="100" y1="100" x2="80" y2="80" stroke="#f4c07a" strokeWidth="6" strokeLinecap="round"/>
        <g className="obj-m"><text x="38" y="58" fontSize="22" className="str-sp">🌟</text></g>
      </svg>
    ),
    m5: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes headNod5{0%,100%{transform:rotate(0deg)}30%{transform:rotate(-3deg)}70%{transform:rotate(2deg)}}
          @keyframes holdSway5{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
          @keyframes gleam5{0%,100%{opacity:0}50%{opacity:1}}
          .hd-st{transform-origin:100px 55px;animation:headNod5 3s ease-in-out infinite}
          .hd-bd{transform-origin:115px 95px;animation:holdSway5 3s ease-in-out infinite}
          .sp5{animation:gleam5 1.5s ease-in-out infinite}
          .sp52{animation:gleam5 1.5s ease-in-out 0.75s infinite}
        `}</style></defs>
        <path d="M60 130 Q80 100 95 90" stroke="#a0785a" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <path d="M140 130 Q120 100 110 90" stroke="#a0785a" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <g className="hd-bd">
          <ellipse cx="102" cy="108" rx="22" ry="28" fill="#f9c784"/>
          <g className="hd-st">
            <circle cx="102" cy="68" r="22" fill="#f4c07a"/>
            <circle cx="94" cy="63" r="3.5" fill="#1a1a2e"/>
            <circle cx="110" cy="63" r="3.5" fill="#1a1a2e"/>
            <path d="M96 77 Q102 82 108 77" stroke="#c07840" strokeWidth="1.5" fill="none"/>
            <path d="M96 47 Q102 40 108 47" stroke="#8b5e3c" strokeWidth="3" fill="none"/>
          </g>
        </g>
        <text x="140" y="50" fontSize="16" className="sp5">✨</text>
        <text x="50" y="60" fontSize="14" className="sp52">⭐</text>
      </svg>
    ),
    m7: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes armR7{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-25deg)}}
          @keyframes toyB7{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
          @keyframes gG7{0%,100%{opacity:0.3}50%{opacity:1}}
          .r-arm{transform-origin:88px 95px;animation:armR7 2s ease-in-out infinite}
          .t-bob{animation:toyB7 1.5s ease-in-out infinite}
          .g-gl{animation:gG7 2s ease-in-out infinite}
        `}</style></defs>
        <ellipse cx="85" cy="118" rx="35" ry="14" fill="#c8a97e" opacity="0.4"/>
        <circle cx="85" cy="90" r="24" fill="#f4c07a"/>
        <circle cx="76" cy="83" r="3.5" fill="#1a1a2e"/>
        <circle cx="94" cy="83" r="3.5" fill="#1a1a2e"/>
        <path d="M79 97 Q85 103 91 97" stroke="#c07840" strokeWidth="1.5" fill="none"/>
        <ellipse cx="85" cy="113" rx="18" ry="10" fill="#f9c784"/>
        <g className="r-arm">
          <line x1="88" y1="100" x2="130" y2="82" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/>
          <circle cx="133" cy="80" r="5" fill="#f4c07a"/>
        </g>
        <g className="t-bob">
          <circle cx="155" cy="70" r="14" fill="#f472b6" opacity="0.9"/>
          <rect x="152" y="83" width="6" height="12" rx="3" fill="#be185d"/>
          <circle cx="150" cy="65" r="4" fill="#ec4899" opacity="0.7"/>
        </g>
        <circle cx="155" cy="70" r="20" fill="none" stroke="#f472b6" strokeWidth="2" className="g-gl"/>
      </svg>
    ),
    m9: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes fullRoll9{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-180deg)}}
          @keyframes fadeArr9{0%,100%{opacity:0.2}50%{opacity:1}}
          .roll-b9{transform-origin:100px 88px;animation:fullRoll9 3.5s ease-in-out infinite}
          .arr9{animation:fadeArr9 1.5s ease-in-out 0.5s infinite}
        `}</style></defs>
        <g className="roll-b9">
          <ellipse cx="100" cy="95" rx="38" ry="22" fill="#f9c784" opacity="0.7"/>
          <circle cx="100" cy="78" r="22" fill="#f4c07a"/>
          <circle cx="91" cy="73" r="3.5" fill="#1a1a2e"/>
          <circle cx="109" cy="73" r="3.5" fill="#1a1a2e"/>
          <path d="M94 86 Q100 92 106 86" stroke="#c07840" strokeWidth="1.5" fill="none"/>
          <ellipse cx="100" cy="108" rx="22" ry="14" fill="#818cf8" opacity="0.6"/>
          <line x1="65" y1="88" x2="50" y2="78" stroke="#f4c07a" strokeWidth="6" strokeLinecap="round"/>
          <line x1="135" y1="88" x2="150" y2="78" stroke="#f4c07a" strokeWidth="6" strokeLinecap="round"/>
        </g>
        <path d="M155 80 Q170 60 155 45" stroke="#a78bfa" strokeWidth="2.5" fill="none" strokeDasharray="5,3" className="arr9"/>
        <polygon points="152,43 160,45 155,52" fill="#a78bfa" className="arr9"/>
      </svg>
    ),
    m10: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes blkL10{0%,100%{opacity:1}45%,55%{opacity:0}}
          @keyframes blkR10{0%,44%{opacity:0}50%,94%{opacity:1}95%,100%{opacity:0}}
          @keyframes blkM10{0%,44%{opacity:0}47%,53%{opacity:1}56%,100%{opacity:0}}
          .bl10{animation:blkL10 2.5s ease-in-out infinite}
          .br10{animation:blkR10 2.5s ease-in-out infinite}
          .bm10{animation:blkM10 2.5s ease-in-out infinite}
        `}</style></defs>
        <circle cx="100" cy="45" r="22" fill="#f4c07a"/>
        <circle cx="91" cy="40" r="3" fill="#1a1a2e"/>
        <circle cx="109" cy="40" r="3" fill="#1a1a2e"/>
        <path d="M95 53 Q100 58 105 53" stroke="#c07840" strokeWidth="1.5" fill="none"/>
        <line x1="75" y1="65" x2="70" y2="90" stroke="#f4c07a" strokeWidth="8" strokeLinecap="round"/>
        <line x1="125" y1="65" x2="130" y2="90" stroke="#f4c07a" strokeWidth="8" strokeLinecap="round"/>
        <rect x="52" y="92" width="20" height="20" rx="3" fill="#60a5fa" stroke="#2563eb" strokeWidth="1.5" className="bl10"/>
        <rect x="88" y="88" width="20" height="20" rx="3" fill="#60a5fa" stroke="#2563eb" strokeWidth="1.5" className="bm10"/>
        <rect x="125" y="92" width="20" height="20" rx="3" fill="#60a5fa" stroke="#2563eb" strokeWidth="1.5" className="br10"/>
        <path d="M78 100 Q100 85 118 100" stroke="#a78bfa" strokeWidth="2" fill="none" strokeDasharray="4,2"/>
        <polygon points="116,96 121,103 112,104" fill="#a78bfa"/>
      </svg>
    ),
    m11: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes famGlow{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
          .fam-face{transform-origin:45px 70px;animation:famGlow 2s ease-in-out infinite}
        `}</style></defs>
        <circle cx="100" cy="90" r="20" fill="#f4c07a"/>
        <circle cx="93" cy="85" r="3" fill="#1a1a2e"/>
        <circle cx="107" cy="85" r="3" fill="#1a1a2e"/>
        <path d="M94 97 Q100 103 106 97" stroke="#c07840" strokeWidth="1.5" fill="none"/>
        <g className="fam-face">
          <circle cx="45" cy="70" r="22" fill="#a0785a"/>
          <circle cx="37" cy="65" r="3" fill="#1a1a2e"/>
          <circle cx="53" cy="65" r="3" fill="#1a1a2e"/>
          <path d="M38 76 Q45 84 52 76" stroke="#5d3a1a" strokeWidth="2" fill="none"/>
          <path d="M28 57 Q45 45 62 57" stroke="#5d3a1a" strokeWidth="5" fill="none"/>
        </g>
        <text x="25" y="105" fontSize="10" fill="#4ade80">Mama 😊</text>
        <circle cx="155" cy="70" r="22" fill="#94a3b8"/>
        <circle cx="147" cy="65" r="3" fill="#1a1a2e"/>
        <circle cx="163" cy="65" r="3" fill="#1a1a2e"/>
        <path d="M149 78 Q155 74 161 78" stroke="#475569" strokeWidth="2" fill="none"/>
        <text x="132" y="105" fontSize="10" fill="#f472b6">Who? 😟</text>
        <text x="62" y="42" fontSize="16">❤️</text>
        <text x="148" y="42" fontSize="16" fill="#94a3b8">?</text>
        <line x1="82" y1="95" x2="68" y2="82" stroke="#f4c07a" strokeWidth="5" strokeLinecap="round"/>
      </svg>
    ),
    m12: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes bub1f{0%{transform:translateY(0);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(-40px);opacity:0}}
          @keyframes bub2f{0%,25%{transform:translateY(0);opacity:0}45%{opacity:1}85%{opacity:1}100%{transform:translateY(-35px);opacity:0}}
          @keyframes bub3f{0%,50%{transform:translateY(0);opacity:0}70%{opacity:1}90%{opacity:1}100%{transform:translateY(-30px);opacity:0}}
          @keyframes mBab{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.4)}}
          .b1f{animation:bub1f 2.5s ease-out infinite}
          .b2f{animation:bub2f 2.5s ease-out infinite}
          .b3f{animation:bub3f 2.5s ease-out infinite}
          .mb12{transform-origin:100px 85px;animation:mBab 0.4s ease-in-out infinite}
        `}</style></defs>
        <circle cx="100" cy="95" r="28" fill="#f4c07a"/>
        <circle cx="88" cy="87" r="4.5" fill="#1a1a2e"/>
        <circle cx="112" cy="87" r="4.5" fill="#1a1a2e"/>
        <circle cx="74" cy="97" r="8" fill="#f9a8d4" opacity="0.35"/>
        <circle cx="126" cy="97" r="8" fill="#f9a8d4" opacity="0.35"/>
        <ellipse cx="100" cy="106" rx="9" ry="6" fill="#c07840" className="mb12"/>
        <g className="b1f"><rect x="58" y="48" width="28" height="18" rx="9" fill="white" stroke="#818cf8" strokeWidth="1.5"/><text x="65" y="61" fontSize="11" fill="#4338ca" fontWeight="bold">oooh</text></g>
        <g className="b2f"><rect x="95" y="38" width="24" height="18" rx="9" fill="white" stroke="#34d399" strokeWidth="1.5"/><text x="99" y="51" fontSize="11" fill="#047857" fontWeight="bold">baba</text></g>
        <g className="b3f"><rect x="130" y="48" width="24" height="18" rx="9" fill="white" stroke="#f472b6" strokeWidth="1.5"/><text x="133" y="61" fontSize="11" fill="#be185d" fontWeight="bold">dada</text></g>
      </svg>
    ),
    m14: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes pullUp14{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
          @keyframes armSt14{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-15deg)}}
          @keyframes eff14{0%,100%{opacity:0}40%,60%{opacity:1}}
          .pu14{transform-origin:80px 100px;animation:pullUp14 2.5s ease-in-out infinite}
          .as14{transform-origin:95px 88px;animation:armSt14 2.5s ease-in-out infinite}
          .ef14{animation:eff14 2.5s ease-in-out infinite}
        `}</style></defs>
        <rect x="110" y="55" width="60" height="80" rx="8" fill="#6366f1" opacity="0.7"/>
        <rect x="105" y="50" width="70" height="15" rx="6" fill="#818cf8"/>
        <rect x="108" y="125" width="12" height="10" rx="3" fill="#4f46e5"/>
        <rect x="158" y="125" width="12" height="10" rx="3" fill="#4f46e5"/>
        <g className="pu14">
          <ellipse cx="80" cy="118" rx="25" ry="14" fill="#f9c784" opacity="0.6"/>
          <ellipse cx="80" cy="103" rx="18" ry="22" fill="#f9c784"/>
          <circle cx="80" cy="78" r="20" fill="#f4c07a"/>
          <circle cx="72" cy="73" r="3" fill="#1a1a2e"/>
          <circle cx="88" cy="73" r="3" fill="#1a1a2e"/>
          <path d="M74 85 Q80 91 86 85" stroke="#c07840" strokeWidth="1.5" fill="none"/>
          <g className="as14">
            <line x1="90" y1="88" x2="110" y2="62" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/>
            <circle cx="112" cy="60" r="5" fill="#f4c07a"/>
          </g>
          <line x1="70" y1="90" x2="108" y2="65" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/>
        </g>
        <text x="28" y="65" fontSize="14" className="ef14">💪</text>
      </svg>
    ),
    m15: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes rH15{0%,100%{transform:translateX(0)}50%{transform:translateX(-30px)}}
          @keyframes pm15{0%,100%{transform:translateX(0)}50%{transform:translateX(-18px)}}
          .rh15{animation:rH15 2s ease-in-out infinite}
          .p15a{animation:pm15 2s ease-in-out 0s infinite}
          .p15b{animation:pm15 2s ease-in-out 0.2s infinite}
          .p15c{animation:pm15 2s ease-in-out 0.4s infinite}
        `}</style></defs>
        <rect x="30" y="100" width="145" height="16" rx="6" fill="#a78bfa" opacity="0.4"/>
        <circle cx="55" cy="78" r="22" fill="#f4c07a"/>
        <circle cx="47" cy="72" r="3" fill="#1a1a2e"/>
        <circle cx="63" cy="72" r="3" fill="#1a1a2e"/>
        <path d="M50 84 Q55 89 60 84" stroke="#c07840" strokeWidth="1.5" fill="none"/>
        <g className="rh15">
          <line x1="70" y1="88" x2="140" y2="98" stroke="#f4c07a" strokeWidth="8" strokeLinecap="round"/>
          <circle cx="143" cy="99" r="6" fill="#f4c07a"/>
          <line x1="140" y1="94" x2="148" y2="88" stroke="#f4c07a" strokeWidth="3" strokeLinecap="round"/>
          <line x1="142" y1="97" x2="152" y2="93" stroke="#f4c07a" strokeWidth="3" strokeLinecap="round"/>
          <line x1="142" y1="101" x2="152" y2="100" stroke="#f4c07a" strokeWidth="3" strokeLinecap="round"/>
        </g>
        <circle cx="120" cy="96" r="5" fill="#fbbf24" className="p15a"/>
        <circle cx="140" cy="94" r="5" fill="#f97316" className="p15b"/>
        <circle cx="160" cy="97" r="5" fill="#fbbf24" className="p15c"/>
      </svg>
    ),
    m18: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes spIn18{0%,100%{transform:translateX(0) rotate(0deg)}50%{transform:translateX(-35px) rotate(-10deg)}}
          @keyframes mOp18{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
          .sp18{animation:spIn18 2.5s ease-in-out infinite}
          .mo18{transform-origin:120px 92px;animation:mOp18 2.5s ease-in-out infinite}
        `}</style></defs>
        <circle cx="120" cy="78" r="26" fill="#f4c07a"/>
        <circle cx="110" cy="71" r="4" fill="#1a1a2e"/>
        <circle cx="130" cy="71" r="4" fill="#1a1a2e"/>
        <circle cx="100" cy="82" r="9" fill="#f9a8d4" opacity="0.3"/>
        <circle cx="140" cy="82" r="9" fill="#f9a8d4" opacity="0.3"/>
        <ellipse cx="120" cy="108" rx="26" ry="18" fill="white" opacity="0.8"/>
        <ellipse cx="120" cy="108" rx="20" ry="12" fill="#818cf8" opacity="0.5"/>
        <ellipse cx="120" cy="92" rx="10" ry="8" fill="#c07840" className="mo18"/>
        <g className="sp18">
          <rect x="40" y="87" width="45" height="6" rx="3" fill="#94a3b8"/>
          <ellipse cx="40" cy="90" rx="10" ry="8" fill="#fb923c"/>
          <path d="M35 78 Q37 72 35 66" stroke="#fb923c" strokeWidth="1.5" fill="none" strokeDasharray="2,2"/>
          <path d="M42 76 Q44 70 42 64" stroke="#fb923c" strokeWidth="1.5" fill="none" strokeDasharray="2,2"/>
        </g>
      </svg>
    ),
    m19: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes sStep19{0%,100%{transform:translateX(0)}50%{transform:translateX(22px)}}
          @keyframes lStep19a{0%,100%{transform:rotate(0deg)}50%{transform:rotate(15deg)}}
          @keyframes lStep19b{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-15deg)}}
          @keyframes arrF19{0%,100%{opacity:0.2}50%{opacity:1}}
          .cr19{animation:sStep19 1.8s ease-in-out infinite}
          .la19{transform-origin:88px 125px;animation:lStep19a 0.9s ease-in-out infinite}
          .lb19{transform-origin:100px 125px;animation:lStep19b 0.9s ease-in-out 0.45s infinite}
          .ca19{animation:arrF19 1.8s ease-in-out infinite}
        `}</style></defs>
        <rect x="25" y="58" width="155" height="55" rx="8" fill="#6366f1" opacity="0.6"/>
        <rect x="20" y="50" width="165" height="18" rx="6" fill="#818cf8" opacity="0.9"/>
        <rect x="22" y="105" width="14" height="14" rx="4" fill="#4f46e5"/>
        <rect x="170" y="105" width="14" height="14" rx="4" fill="#4f46e5"/>
        <g className="cr19">
          <circle cx="88" cy="68" r="18" fill="#f4c07a"/>
          <circle cx="81" cy="63" r="3" fill="#1a1a2e"/>
          <circle cx="95" cy="63" r="3" fill="#1a1a2e"/>
          <path d="M83 75 Q88 80 93 75" stroke="#c07840" strokeWidth="1.5" fill="none"/>
          <line x1="78" y1="78" x2="68" y2="58" stroke="#f4c07a" strokeWidth="5" strokeLinecap="round"/>
          <line x1="98" y1="78" x2="108" y2="58" stroke="#f4c07a" strokeWidth="5" strokeLinecap="round"/>
          <ellipse cx="88" cy="105" rx="14" ry="20" fill="#f9c784"/>
          <g className="la19"><line x1="82" y1="118" x2="78" y2="135" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/></g>
          <g className="lb19"><line x1="94" y1="118" x2="98" y2="135" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/></g>
        </g>
        <path d="M25 128 L60 128" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="5,3" className="ca19"/>
        <polygon points="62,124 70,128 62,132" fill="#a78bfa" className="ca19"/>
      </svg>
    ),
    m23: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes wPop23{0%{transform:scale(0.5);opacity:0}30%{transform:scale(1.2);opacity:1}60%{transform:scale(1);opacity:1}100%{transform:scale(0.5);opacity:0}}
          @keyframes wv1{0%,100%{transform:scaleY(1)}50%{transform:scaleY(2.5)}}
          @keyframes wv2{0%,100%{transform:scaleY(1)}50%{transform:scaleY(3.5)}}
          @keyframes wv3{0%,100%{transform:scaleY(1)}50%{transform:scaleY(2)}}
          @keyframes mW23{0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)}}
          .wp23{transform-origin:145px 50px;animation:wPop23 2.8s ease-in-out infinite}
          .w23a{transform-origin:118px 90px;animation:wv1 0.5s ease-in-out infinite}
          .w23b{transform-origin:128px 90px;animation:wv2 0.5s ease-in-out 0.12s infinite}
          .w23c{transform-origin:138px 90px;animation:wv3 0.5s ease-in-out 0.25s infinite}
          .mw23{transform-origin:88px 88px;animation:mW23 0.8s ease-in-out infinite}
        `}</style></defs>
        <circle cx="80" cy="72" r="25" fill="#f4c07a"/>
        <circle cx="71" cy="65" r="4" fill="#1a1a2e"/>
        <circle cx="89" cy="65" r="4" fill="#1a1a2e"/>
        <circle cx="60" cy="76" r="9" fill="#f9a8d4" opacity="0.3"/>
        <circle cx="100" cy="76" r="9" fill="#f9a8d4" opacity="0.3"/>
        <ellipse cx="80" cy="84" rx="10" ry="7" fill="#c07840" className="mw23"/>
        <rect x="115" y="84" width="6" height="12" rx="3" fill="#34d399" className="w23a"/>
        <rect x="125" y="82" width="6" height="16" rx="3" fill="#34d399" className="w23b"/>
        <rect x="135" y="85" width="6" height="10" rx="3" fill="#34d399" className="w23c"/>
        <g className="wp23">
          <rect x="115" y="35" width="55" height="26" rx="12" fill="white" stroke="#34d399" strokeWidth="2"/>
          <polygon points="130,61 140,61 135,70" fill="white" stroke="#34d399" strokeWidth="1.5"/>
          <text x="122" y="53" fontSize="13" fill="#047857" fontWeight="bold">mama!</text>
        </g>
      </svg>
    ),
    m24: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes wv24{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(25deg)}}
          @keyframes pW24{0%{transform:translateX(0);opacity:1}100%{transform:translateX(40px);opacity:0.2}}
          @keyframes hB24{0%,100%{transform:translateY(0);opacity:0}50%{transform:translateY(-20px);opacity:1}}
          .wa24{transform-origin:80px 95px;animation:wv24 0.8s ease-in-out infinite}
          .pw24{animation:pW24 3s ease-in-out infinite}
          .hb24{animation:hB24 2s ease-in-out infinite}
        `}</style></defs>
        <circle cx="65" cy="72" r="22" fill="#f4c07a"/>
        <circle cx="57" cy="66" r="3.5" fill="#1a1a2e"/>
        <circle cx="73" cy="66" r="3.5" fill="#1a1a2e"/>
        <path d="M60 80 Q65 86 70 80" stroke="#c07840" strokeWidth="1.5" fill="none"/>
        <ellipse cx="65" cy="108" rx="18" ry="20" fill="#f9c784"/>
        <g className="wa24">
          <line x1="78" y1="88" x2="95" y2="68" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/>
          <circle cx="97" cy="65" r="6" fill="#f4c07a"/>
        </g>
        <line x1="52" y1="90" x2="40" y2="108" stroke="#f4c07a" strokeWidth="6" strokeLinecap="round"/>
        <g className="pw24">
          <circle cx="148" cy="58" r="16" fill="#a0785a"/>
          <rect x="140" y="74" width="16" height="50" rx="6" fill="#8b6347"/>
          <line x1="135" y1="80" x2="118" y2="68" stroke="#a0785a" strokeWidth="6" strokeLinecap="round"/>
        </g>
        <text x="108" y="60" fontSize="16" className="hb24">💕</text>
      </svg>
    ),
    m25: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes fPt25{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-20deg)}}
          @keyframes tGl25{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
          .pa25{transform-origin:75px 95px;animation:fPt25 2s ease-in-out infinite}
          .tg25{transform-origin:155px 75px;animation:tGl25 2s ease-in-out infinite}
        `}</style></defs>
        <circle cx="65" cy="70" r="22" fill="#f4c07a"/>
        <circle cx="57" cy="64" r="3.5" fill="#1a1a2e"/>
        <circle cx="73" cy="64" r="3.5" fill="#1a1a2e"/>
        <path d="M59 78 Q65 84 71 78" stroke="#c07840" strokeWidth="1.5" fill="none"/>
        <g className="pa25">
          <line x1="78" y1="88" x2="125" y2="70" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/>
          <line x1="125" y1="70" x2="145" y2="62" stroke="#f4c07a" strokeWidth="4" strokeLinecap="round"/>
          <path d="M122 73 Q126 78 130 74" stroke="#f4c07a" strokeWidth="4" strokeLinecap="round" fill="none"/>
        </g>
        <g className="tg25">
          <circle cx="155" cy="75" r="18" fill="#fbbf24" opacity="0.2"/>
          <text x="142" y="84" fontSize="24">🧸</text>
        </g>
      </svg>
    ),
    m26: (
      <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}>
        <defs><style>{`
          @keyframes crBd26{0%,100%{transform:translateX(0)}50%{transform:translateX(12px)}}
          @keyframes crA126{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-20deg)}}
          @keyframes crA226{0%,100%{transform:rotate(0deg)}50%{transform:rotate(20deg)}}
          @keyframes crL126{0%,100%{transform:rotate(0deg)}50%{transform:rotate(20deg)}}
          @keyframes crL226{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-20deg)}}
          @keyframes optT{0%,100%{opacity:0.7}50%{opacity:1}}
          .cb26{animation:crBd26 1.2s ease-in-out infinite}
          .ca126{transform-origin:80px 90px;animation:crA126 0.6s ease-in-out infinite}
          .ca226{transform-origin:110px 90px;animation:crA226 0.6s ease-in-out 0.3s infinite}
          .cl126{transform-origin:88px 115px;animation:crL126 0.6s ease-in-out 0.3s infinite}
          .cl226{transform-origin:108px 115px;animation:crL226 0.6s ease-in-out infinite}
          .ot26{animation:optT 2s ease-in-out infinite}
        `}</style></defs>
        <rect x="15" y="128" width="175" height="8" rx="4" fill="#334155" opacity="0.3"/>
        <g className="cb26">
          <circle cx="95" cy="72" r="20" fill="#f4c07a"/>
          <circle cx="87" cy="67" r="3" fill="#1a1a2e"/>
          <circle cx="103" cy="67" r="3" fill="#1a1a2e"/>
          <path d="M89 80 Q95 86 101 80" stroke="#c07840" strokeWidth="1.5" fill="none"/>
          <ellipse cx="95" cy="105" rx="28" ry="16" fill="#f9c784"/>
          <ellipse cx="95" cy="108" rx="22" ry="12" fill="#818cf8" opacity="0.5"/>
          <g className="ca126"><line x1="75" y1="100" x2="58" y2="120" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/><circle cx="56" cy="122" r="5" fill="#f4c07a"/></g>
          <g className="ca226"><line x1="115" y1="100" x2="132" y2="120" stroke="#f4c07a" strokeWidth="7" strokeLinecap="round"/><circle cx="134" cy="122" r="5" fill="#f4c07a"/></g>
          <g className="cl126"><line x1="80" y1="118" x2="68" y2="132" stroke="#f4c07a" strokeWidth="8" strokeLinecap="round"/></g>
          <g className="cl226"><line x1="110" y1="118" x2="122" y2="132" stroke="#f4c07a" strokeWidth="8" strokeLinecap="round"/></g>
        </g>
        <rect x="128" y="18" width="58" height="18" rx="9" fill="#f59e0b" opacity="0.9" className="ot26"/>
        <text x="135" y="31" fontSize="10" fill="white" fontWeight="bold" className="ot26">Optional ✦</text>
        <path d="M28 118 L50 118" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4,2"/>
        <polygon points="52,114 60,118 52,122" fill="#a78bfa"/>
      </svg>
    ),
  };
  // Generic fallback per category
  const fallbacks = {
    "Motor":     <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}><circle cx="100" cy="70" r="40" fill={CAT["Motor"].bg} stroke={CAT["Motor"].color} strokeWidth="2"/><text x="82" y="78" fontSize="32">🏃</text><text x="65" y="120" fontSize="12" fill={CAT["Motor"].color}>Motor Skill</text></svg>,
    "Fine Motor":<svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}><circle cx="100" cy="70" r="40" fill={CAT["Fine Motor"].bg} stroke={CAT["Fine Motor"].color} strokeWidth="2"/><text x="82" y="78" fontSize="32">✋</text><text x="55" y="120" fontSize="12" fill={CAT["Fine Motor"].color}>Fine Motor</text></svg>,
    "Language":  <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}><circle cx="100" cy="70" r="40" fill={CAT["Language"].bg} stroke={CAT["Language"].color} strokeWidth="2"/><text x="82" y="78" fontSize="32">💬</text><text x="68" y="120" fontSize="12" fill={CAT["Language"].color}>Language</text></svg>,
    "Social":    <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}><circle cx="100" cy="70" r="40" fill={CAT["Social"].bg} stroke={CAT["Social"].color} strokeWidth="2"/><text x="82" y="78" fontSize="32">👋</text><text x="72" y="120" fontSize="12" fill={CAT["Social"].color}>Social</text></svg>,
    "Cognitive": <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}><circle cx="100" cy="70" r="40" fill={CAT["Cognitive"].bg} stroke={CAT["Cognitive"].color} strokeWidth="2"/><text x="82" y="78" fontSize="32">🧠</text><text x="65" y="120" fontSize="12" fill={CAT["Cognitive"].color}>Cognitive</text></svg>,
    "Feeding":   <svg viewBox="0 0 200 140" style={{width:"100%",height:"100%"}}><circle cx="100" cy="70" r="40" fill={CAT["Feeding"].bg} stroke={CAT["Feeding"].color} strokeWidth="2"/><text x="82" y="78" fontSize="32">🍽️</text><text x="70" y="120" fontSize="12" fill={CAT["Feeding"].color}>Feeding</text></svg>,
  };
  const el = illustrations[milestoneId] || fallbacks[category];
  return <div style={{width:"100%",height:"100%"}}>{el}</div>;
}

// ─── MILESTONE CHART (horizontal bar, like reference image) ───────────────────
function MilestoneChart({ babyAgeDays, birthDate, onSelectMilestone, achievedMap }) {
  const babyAgeMonths = babyAgeDays != null ? babyAgeDays / 30.4375 : null;
  const totalMonths = 13;
  const barH = 18, gap = 6, leftPad = 170, rightPad = 20;

  const sorted = [...MILESTONE_DATA].sort((a,b) => a.p5 - b.p5);
  const chartH = sorted.length * (barH + gap) + 60;

  return (
    <div style={{overflowX:"auto",background:"rgba(15,23,42,0.7)",borderRadius:12,padding:"16px 0 10px"}}>
      <svg width={leftPad + 520 + rightPad} height={chartH} style={{display:"block"}}>
        {/* X-axis header */}
        {Array.from({length:14},(_,i) => (
          <g key={i}>
            <line x1={leftPad + i*(520/totalMonths)} y1={28} x2={leftPad + i*(520/totalMonths)} y2={chartH - 20} stroke="rgba(99,102,241,0.12)" strokeWidth="1"/>
            <text x={leftPad + i*(520/totalMonths)} y={18} textAnchor="middle" fontSize="10" fill="#64748b">
              {i === 0 ? "B" : `${i}m`}
            </text>
          </g>
        ))}
        {/* Baby age reference line */}
        {babyAgeMonths != null && babyAgeMonths >= 0 && babyAgeMonths <= 13 && (
          <g>
            <line
              x1={leftPad + babyAgeMonths*(520/totalMonths)} y1={24}
              x2={leftPad + babyAgeMonths*(520/totalMonths)} y2={chartH-20}
              stroke="#f472b6" strokeWidth="2" strokeDasharray="5,3"
            />
            <circle cx={leftPad + babyAgeMonths*(520/totalMonths)} cy={24} r="4" fill="#f472b6"/>
            <text x={leftPad + babyAgeMonths*(520/totalMonths)+6} y={22} fontSize="9" fill="#f472b6">
              Today
            </text>
          </g>
        )}
        {/* Bars */}
        {sorted.map((ms, idx) => {
          const y = 30 + idx * (barH + gap);
          const x1 = leftPad + ms.p5 * (520/totalMonths);
          const w  = (ms.p95 - ms.p5) * (520/totalMonths);
          const catStyle = CAT[ms.category];
          const achieved = achievedMap[ms.id];
          const ageM = babyAgeMonths;
          const inWindow = ageM != null && ageM >= ms.p5 && ageM <= ms.p95;
          const overdue  = ageM != null && ageM > ms.p95 && !achieved;
          return (
            <g key={ms.id} style={{cursor:"pointer"}} onClick={() => onSelectMilestone(ms.id)}>
              {/* Label */}
              <text x={leftPad - 6} y={y + barH/2 + 4} textAnchor="end" fontSize="10"
                fill={achieved ? "#4ade80" : inWindow ? (ms.optional ? "#f59e0b" : catStyle.color) : overdue ? "#f87171" : "#94a3b8"}>
                {ms.text.length > 26 ? ms.text.slice(0,25)+"…" : ms.text}
              </text>
              {/* Optional pill tag next to label */}
              {ms.optional && (
                <>
                  <rect x={leftPad - 52} y={y + 3} width={38} height={barH - 6} rx={(barH-6)/2}
                    fill="#f59e0b" opacity="0.22"/>
                  <text x={leftPad - 33} y={y + barH/2 + 3.5} textAnchor="middle" fontSize="7.5"
                    fill="#f59e0b" fontWeight="bold" letterSpacing="0.3">OPT</text>
                </>
              )}
              {/* Background track */}
              <rect x={leftPad} y={y} width={520} height={barH} rx={barH/2}
                fill="rgba(99,102,241,0.05)"/>
              {/* Main bar — amber + dashed outline for optional */}
              <rect x={x1} y={y} width={w} height={barH} rx={barH/2}
                fill={achieved ? "#4ade80" : ms.optional ? "#f59e0b" : catStyle.color}
                opacity={achieved ? 0.9 : inWindow ? 0.85 : ms.optional ? 0.35 : 0.45}/>
              {ms.optional && !achieved && (
                <rect x={x1} y={y} width={w} height={barH} rx={barH/2}
                  fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.7"/>
              )}
              {/* Achieved marker */}
              {achieved && (
                <text x={x1 + w/2} y={y + barH/2 + 4} textAnchor="middle" fontSize="10" fill="#0f172a" fontWeight="bold">✓</text>
              )}
              {/* In-window pulse border */}
              {inWindow && !achieved && (
                <rect x={x1-1} y={y-1} width={w+2} height={barH+2} rx={barH/2}
                  fill="none" stroke={ms.optional ? "#f59e0b" : catStyle.color} strokeWidth="1.5" opacity="0.8"/>
              )}
            </g>
          );
        })}
        {/* Legend */}
        {[["Motor","#818cf8"],["Fine Motor","#a78bfa"],["Language","#34d399"],["Social","#f472b6"],["Cognitive","#fbbf24"],["Feeding","#60a5fa"]].map(([name,color],i) => (
          <g key={name} transform={`translate(${leftPad + i*88},${chartH-14})`}>
            <rect x="0" y="0" width="10" height="10" rx="2" fill={color} opacity="0.7"/>
            <text x="13" y="9" fontSize="9" fill="#64748b">{name}</text>
          </g>
        ))}
        {/* Optional legend entry */}
        <g transform={`translate(${leftPad},${chartH-2})`}>
          <rect x="0" y="0" width="10" height="7" rx="3" fill="#f59e0b" opacity="0.35"/>
          <rect x="0" y="0" width="10" height="7" rx="3" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" opacity="0.7"/>
          <text x="13" y="7" fontSize="8" fill="#f59e0b">Optional milestone (e.g. crawling — 4.3% of babies skip)</text>
        </g>
        ))}
      </svg>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const iStyle = {width:"100%",padding:"9px 12px",borderRadius:8,background:"rgba(15,23,42,0.7)",border:"1px solid rgba(99,102,241,0.35)",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box"};
const lStyle = {fontSize:12,color:"#94a3b8",display:"block",marginBottom:5};
const pctColor = p => !p?"#475569":p<3?"#ef4444":p<15?"#f97316":p<=85?"#4ade80":"#f97316";

function daysBetween(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return Math.round((b - a) / 86400000);
}
function addDaysToDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// GROWTH REFERENCE GRID COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const GRID_LMS_W=[[0,0.3487,3.3464,0.14602],[1,0.2297,4.4709,0.13395],[2,0.1970,5.5675,0.12385],[3,0.2986,6.3762,0.11727],[4,0.1986,7.0023,0.11316],[5,0.1986,7.5105,0.10953],[6,0.1986,7.9340,0.10664],[7,0.1986,8.3080,0.10399],[8,0.1986,8.6470,0.10179],[9,0.1986,8.9481,0.09998],[10,0.1986,9.2103,0.09849],[11,0.1986,9.4326,0.09728],[12,0.1986,9.6249,0.09633]];
const GRID_LMS_L=[[0,1,49.8842,0.03795],[1,1,54.7244,0.03557],[2,1,58.4249,0.03424],[3,1,61.4292,0.03279],[4,1,63.8860,0.03167],[5,1,65.9026,0.03090],[6,1,67.6236,0.03025],[7,1,69.1645,0.02963],[8,1,70.5994,0.02953],[9,1,71.9687,0.02860],[10,1,73.2812,0.02832],[11,1,74.5244,0.02815],[12,1,75.7490,0.02804]];
const GRID_LMS_H=[[0,1,34.4618,0.03686],[1,1,37.2759,0.03124],[2,1,39.1285,0.02919],[3,1,40.5135,0.02810],[4,1,41.6317,0.02724],[5,1,42.6385,0.02668],[6,1,43.3651,0.02580],[7,1,44.0241,0.02543],[8,1,44.6029,0.02502],[9,1,45.1363,0.02455],[10,1,45.6165,0.02421],[11,1,46.0691,0.02389],[12,1,46.4917,0.02362]];

function gridGetLMS(t,mo){
  const lo=Math.max(0,Math.min(t.length-2,Math.floor(mo)));
  const hi=Math.min(t.length-1,lo+1),f=mo-lo;
  return{L:t[lo][1]+f*(t[hi][1]-t[lo][1]),M:t[lo][2]+f*(t[hi][2]-t[lo][2]),S:t[lo][3]+f*(t[hi][3]-t[lo][3])};
}
function gridZ2v(z,L,M,S){return Math.abs(L)<1e-6?M*Math.exp(S*z):M*Math.pow(1+L*S*z,1/L);}
function gridV2z(v,L,M,S){return Math.abs(L)<1e-6?Math.log(v/M)/S:(Math.pow(v/M,L)-1)/(L*S);}
function gridZ2p(z){
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const s=z<0?-1:1,x=Math.abs(z)/Math.sqrt(2),t=1/(1+p*x);
  return Math.round(50*(1+s*(1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x))));
}

const GRID_PZ={5:-1.645,10:-1.282,15:-1.036,20:-0.842,25:-0.674,30:-0.524,35:-0.385,
               40:-0.253,45:-0.126,50:0,55:0.126,60:0.253,65:0.385,70:0.524,
               75:0.674,80:0.842,85:1.036,90:1.282,95:1.645};
const GRID_PCTILES=[5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95];
const GRID_WEEKS=Array.from({length:52},(_,i)=>i+1);

const GRID_CC={
  green: {bg:"rgba(52,211,153,0.11)",bd:"rgba(52,211,153,0.22)",tx:"#34d399",bx:"#6ee7b7",hbg:"rgba(52,211,153,0.35)",hbd:"rgba(52,211,153,0.6)"},
  yellow:{bg:"rgba(251,191,36,0.09)", bd:"rgba(251,191,36,0.20)",tx:"#fbbf24",bx:"#fde68a",hbg:"rgba(251,191,36,0.30)",hbd:"rgba(251,191,36,0.55)"},
  red:   {bg:"rgba(248,113,113,0.10)",bd:"rgba(248,113,113,0.22)",tx:"#f87171",bx:"#fca5a5",hbg:"rgba(248,113,113,0.32)",hbd:"rgba(248,113,113,0.58)"},
};

function gridCellColor(pctile,bZ){
  const d=Math.abs((GRID_PZ[pctile]??0)-bZ);
  return d<=1?"green":d<=2?"yellow":"red";
}

function gridWeekLogInfo(week,metKey,metTable,records){
  const s=(week-1)*7,e=s+6;
  const rec=records.find(r=>r.day>=s&&r.day<=e&&r[metKey]!=null);
  if(!rec) return null;
  const {L,M,S}=gridGetLMS(metTable,rec.day/30.4375);
  const z=gridV2z(rec[metKey],L,M,S);
  const actualP=gridZ2p(z);
  let lower=GRID_PCTILES[0],upper=GRID_PCTILES[GRID_PCTILES.length-1];
  for(let i=0;i<GRID_PCTILES.length-1;i++){
    if(actualP>=GRID_PCTILES[i]&&actualP<=GRID_PCTILES[i+1]){lower=GRID_PCTILES[i];upper=GRID_PCTILES[i+1];break;}
  }
  if(GRID_PCTILES.includes(actualP)){lower=actualP;upper=actualP;}
  return{day:rec.day,val:rec[metKey],actualP,lower,upper,note:rec.note||""};
}

// Sparkline
function GridSparkline({m,z,bZ,records,hlDay}){
  const W=300,H=85;
  const pts=[],bpts=[];
  for(let d=0;d<=364;d+=7){
    const mo=d/30.4375,{L,M,S}=gridGetLMS(m.t,mo);
    pts.push(gridZ2v(z,L,M,S));bpts.push(gridZ2v(bZ,L,M,S));
  }
  const recPts=records.filter(r=>r[m.key]!=null).map(r=>({day:r.day,val:r[m.key]}));
  const all=[...pts,...bpts,...recPts.map(r=>r.val)];
  const mn=Math.min(...all)*0.97,mx=Math.max(...all)*1.03;
  const sx=i=>(i/(pts.length-1))*W,sy=v=>H-((v-mn)/(mx-mn))*H;
  const path=a=>a.map((v,i)=>`${i===0?"M":"L"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const hx=hlDay!=null?(Math.min(hlDay,364)/364)*W:null;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H}}>
      {[.25,.5,.75].map(f=><line key={f} x1={0} y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>)}
      {hx!=null&&<line x1={hx} y1={0} x2={hx} y2={H} stroke="rgba(99,102,241,0.55)" strokeWidth={1.5} strokeDasharray="3,2"/>}
      <path d={path(bpts)} fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth={1.5} strokeDasharray="5,3"/>
      <path d={`${path(pts)} L${W},${H} L0,${H} Z`} fill="rgba(96,165,250,0.05)"/>
      <path d={path(pts)} fill="none" stroke="#60a5fa" strokeWidth={2}/>
      {recPts.map(r=>{const x=(Math.min(r.day,364)/364)*W;return <circle key={r.day} cx={x} cy={sy(r.val)} r={3.5} fill="#f59e0b" stroke="#fde68a" strokeWidth={1}/>;  })}
      {hx!=null&&(()=>{const idx=Math.min(Math.round((hx/W)*(pts.length-1)),pts.length-1);return <circle cx={hx} cy={sy(pts[idx])} r={4} fill="#6366f1" stroke="#a5b4fc" strokeWidth={1.5}/>;})()}
    </svg>
  );
}

// Week popup
function GridWeekPopup({week,pctile,activeMet,baby,birthDate,records,metDefs,onClose}){
  const [met,setMet]=useState(activeMet);
  const [selDay,setSelDay]=useState(null);
  const m=metDefs[met];
  const recByDay={};records.forEach(r=>{recByDay[r.day]=r;});

  // Birth Z for this metric
  const {L:bL,M:bM,S:bS}=gridGetLMS(m.t,0);
  const birthVal=records.find(r=>r.day===0)?.[met]??null;
  const bZ=birthVal!=null?gridV2z(birthVal,bL,bM,bS):0;
  const z=GRID_PZ[pctile]??0;
  const startDay=(week-1)*7,endDay=startDay+6;
  const color=gridCellColor(pctile,bZ);
  const c=GRID_CC[color];
  const popupLogInfo=gridWeekLogInfo(week,met,m.t,records);
  const weekHasData=records.some(r=>r.day>=startDay&&r.day<=endDay&&r[met]!=null);

  const dobDate=birthDate?new Date(birthDate):new Date();
  function toD(dayNum){
    const dt=new Date(dobDate);dt.setDate(dt.getDate()+dayNum);
    return dt.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  }

  const days=Array.from({length:7},(_,i)=>{
    const day=startDay+i,mo=day/30.4375;
    const {L,M,S}=gridGetLMS(m.t,mo);
    const pv=gridZ2v(z,L,M,S),bv=gridZ2v(bZ,L,M,S);
    const rec=recByDay[day]||null,rv=rec?.[met]??null;
    return{dayIdx:i+1,day,pv,bv,rec,rv};
  });
  const sd=selDay!=null?days[selDay-1]:null;

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(4,6,14,0.92)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#090d1a",border:"1px solid rgba(99,102,241,0.22)",borderRadius:22,padding:20,width:"100%",maxWidth:540,maxHeight:"93vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:8,color:"#1e293b",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",marginBottom:3}}>
              Week {week} · {pctile}th percentile · D{startDay}–D{endDay}
            </div>
            <div style={{fontSize:17,color:"#e2e8f0",marginBottom:4,fontWeight:600}}>
              {toD(startDay)} <span style={{color:"#334155"}}>→</span> {toD(endDay)}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:9,padding:"2px 8px",borderRadius:5,background:c.bg,border:`1px solid ${c.bd}`,color:c.tx}}>
                {color==="green"?"✓ Good (±1Z)":color==="yellow"?"~ Watch (±2Z)":"⚠ Alert (>2Z)"}
              </span>
              {weekHasData&&popupLogInfo&&(
                <span style={{fontSize:8,padding:"2px 7px",borderRadius:5,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e2e8f0",fontWeight:700}}>
                  ● {m.label} {popupLogInfo.val.toFixed(m.dp)}{m.unit} = {popupLogInfo.actualP}th %ile
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#475569",cursor:"pointer",padding:"5px 10px",fontSize:13,flexShrink:0}}>✕</button>
        </div>

        {/* Metric tabs */}
        <div style={{display:"flex",gap:5}}>
          {Object.entries(metDefs).map(([k,v])=>{
            const wkHas=records.some(r=>r.day>=startDay&&r.day<=endDay&&r[k]!=null);
            return(
              <button key={k} onClick={()=>{setMet(k);setSelDay(null);}} style={{
                padding:"4px 11px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:9,fontWeight:600,
                background:met===k?"rgba(99,102,241,0.18)":"transparent",
                borderColor:met===k?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.07)",
                color:met===k?"#a5b4fc":"#334155",position:"relative",
              }}>
                {v.label}
                {wkHas&&<span style={{position:"absolute",top:2,right:2,width:4,height:4,borderRadius:"50%",background:"#94a3b8"}}/>}
              </button>
            );
          })}
        </div>

        {/* Data point banner */}
        {popupLogInfo&&(
          <div style={{padding:"9px 14px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div style={{fontSize:18,lineHeight:1}}>📍</div>
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:"#a5b4fc",fontWeight:700,marginBottom:2}}>
                Logged value = {popupLogInfo.actualP}th percentile (D{popupLogInfo.day} · {toD(popupLogInfo.day)})
              </div>
              <div style={{fontSize:8,color:"#334155"}}>
                {popupLogInfo.lower===popupLogInfo.upper
                  ?`Exactly on the ${popupLogInfo.lower}th percentile line`
                  :`Between ${popupLogInfo.lower}th and ${popupLogInfo.upper}th percentile rows`}
                &nbsp;·&nbsp;{popupLogInfo.val.toFixed(m.dp)} {m.unit}
              </div>
            </div>
            <div style={{textAlign:"center",background:"rgba(99,102,241,0.15)",borderRadius:8,padding:"6px 12px",border:"1px solid rgba(99,102,241,0.3)"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#a5b4fc"}}>{popupLogInfo.actualP}th</div>
              <div style={{fontSize:7,color:"#334155"}}>%ile</div>
            </div>
          </div>
        )}

        {/* Sparkline */}
        <div style={{background:"#060912",borderRadius:12,padding:"10px 12px 6px",border:"1px solid rgba(255,255,255,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#1e293b",fontFamily:"monospace",marginBottom:3}}>
            <span>— {pctile}th %ile · - - birth ref · ● {m.label} entries</span><span>52 wks</span>
          </div>
          <GridSparkline m={m} z={z} bZ={bZ} records={records} hlDay={sd?.day??startDay+3}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:6,color:"#0f172a",fontFamily:"monospace",marginTop:2}}>
            <span>D0</span><span>D91</span><span>D182</span><span>D273</span><span>D364</span>
          </div>
        </div>

        {/* 7-day cards */}
        <div>
          <div style={{fontSize:7,color:"#1e293b",letterSpacing:1.5,textTransform:"uppercase",fontFamily:"monospace",marginBottom:6}}>
            Day 1–7 of week {week} · D0 = birth · tap to expand
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {days.map(({dayIdx,day,pv,bv,rv})=>{
              const isSel=selDay===dayIdx,hasR=rv!=null;
              return(
                <div key={dayIdx} onClick={()=>setSelDay(isSel?null:dayIdx)}
                  style={{cursor:"pointer",borderRadius:9,padding:"7px 2px",textAlign:"center",
                    background:isSel?"rgba(99,102,241,0.18)":hasR?"rgba(99,102,241,0.07)":c.bg,
                    border:`1px solid ${isSel?"rgba(99,102,241,0.55)":hasR?"rgba(99,102,241,0.3)":c.bd}`,
                    transition:"all 0.13s",position:"relative"}}>
                  {hasR&&<div style={{position:"absolute",top:3,right:3,width:4,height:4,borderRadius:"50%",background:"#e2e8f0"}}/>}
                  <div style={{fontSize:9,fontWeight:hasR?700:400,color:isSel?"#a5b4fc":c.tx,marginBottom:1}}>Day {dayIdx}</div>
                  <div style={{fontSize:7,color:"#334155",marginBottom:3}}>(D{day})</div>
                  <div style={{fontSize:10,fontWeight:hasR?700:400,color:isSel?"#e2e8f0":c.tx}}>{pv.toFixed(m.dp)}</div>
                  {hasR&&<div style={{fontSize:9,fontWeight:700,color:"#e2e8f0",marginTop:2,borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:2}}>{rv.toFixed(m.dp)}</div>}
                  <div style={{fontSize:6,color:"#1e293b",marginTop:2}}>ref {bv.toFixed(m.dp)}</div>
                  <div style={{fontSize:6,color:"#0f172a",marginTop:1}}>{toD(day)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {sd&&(()=>{
          const {day,pv,bv,rec,rv}=sd;
          const pdiff=pv-bv,rdiff=rv!=null?rv-bv:null;
          return(
            <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                {[
                  {lbl:"Day from birth",val:`D${day}`,sub:toD(day),col:"#a5b4fc"},
                  {lbl:`${pctile}th %ile`,val:`${pv.toFixed(m.dp)} ${m.unit}`,sub:`${pdiff>=0?"+":""}${pdiff.toFixed(m.dp)} vs ref`,col:c.tx},
                  {lbl:"Birth ref",val:`${bv.toFixed(m.dp)} ${m.unit}`,sub:`Z=${bZ.toFixed(2)}`,col:"#7c3aed"},
                ].map((s,idx)=>(
                  <div key={idx} style={{padding:"10px 10px",background:"rgba(255,255,255,0.03)",borderRight:idx<2?"1px solid rgba(255,255,255,0.06)":"none"}}>
                    <div style={{fontSize:7,color:"#334155",fontFamily:"monospace",letterSpacing:1,marginBottom:4}}>{s.lbl.toUpperCase()}</div>
                    <div style={{fontSize:15,fontWeight:700,color:s.col}}>{s.val}</div>
                    <div style={{fontSize:7,color:"#1e293b",marginTop:2}}>{s.sub}</div>
                  </div>
                ))}
              </div>
              {rec&&rv!=null?(
                <div style={{padding:"12px 14px",background:"rgba(255,255,255,0.02)",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{fontSize:7,color:"#475569",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",marginBottom:8}}>
                    📋 {rec.note||`D${day}`} — {m.label} entry
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <div style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 20px",border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{fontSize:8,color:"#475569",marginBottom:4}}>{m.label}</div>
                      <div style={{fontSize:22,fontWeight:700,color:"#e2e8f0"}}>{rv.toFixed(m.dp)}</div>
                      <div style={{fontSize:9,color:"#64748b"}}>{m.unit}</div>
                      <div style={{fontSize:8,color:"#334155",marginTop:4}}>
                        {(()=>{const{L,M,S}=gridGetLMS(m.t,day/30.4375);return gridZ2p(gridV2z(rv,L,M,S))+"th %ile";})()}
                      </div>
                    </div>
                    <div>
                      {rdiff!=null&&<div style={{fontSize:11,color:rdiff>=0?"#34d399":"#f87171",fontWeight:600,marginBottom:4}}>
                        {rdiff>=0?"+":""}{rdiff.toFixed(m.dp)} {m.unit} vs birth ref
                      </div>}
                      <div style={{fontSize:9,color:"#334155",lineHeight:1.8}}>
                        Birth ref at D{day}: {bv.toFixed(m.dp)} {m.unit}<br/>
                        {pctile}th %ile at D{day}: {pv.toFixed(m.dp)} {m.unit}
                      </div>
                    </div>
                  </div>
                </div>
              ):(
                <div style={{padding:"10px",background:"rgba(255,255,255,0.02)",borderTop:"1px solid rgba(255,255,255,0.04)",fontSize:9,color:"#1e293b",textAlign:"center"}}>
                  {rec?`No ${m.label} on D${day} — switch metric tab to see what was logged`:`No entry for D${day}`}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Main GrowthReferenceGrid — receives real data from BabyTracker
function GrowthReferenceGrid({records,baby,birthDate,sex}){
  const [met,setMet]=useState("weight");
  const [popup,setPopup]=useState(null);
  const [hov,setHov]=useState(null);

  // Metric definitions using sex-specific LMS tables (simplified: boys for now, extend for girls)
  const metDefs=useMemo(()=>({
    weight:   {label:"Weight",   unit:"kg",t:GRID_LMS_W,dp:2,key:"weight"},
    length:   {label:"Length",   unit:"cm",t:GRID_LMS_L,dp:1,key:"length"},
    headCirc: {label:"Head Circ.",unit:"cm",t:GRID_LMS_H,dp:1,key:"headCirc"},
  }),[]);

  const m=metDefs[met];
  const birthRecord=records.find(r=>r.day===0);

  // Birth Z for active metric
  const bZ=useMemo(()=>{
    const bv=birthRecord?.[met]??null;
    if(bv==null) return 0;
    const{L,M,S}=gridGetLMS(m.t,0);
    return gridV2z(bv,L,M,S);
  },[met,birthRecord]);

  // Birth Zs for all metrics (for summary strip)
  const allBZs=useMemo(()=>{
    const o={};
    Object.entries(metDefs).forEach(([k,v])=>{
      const bv=birthRecord?.[k]??null;
      if(bv==null){o[k]=0;return;}
      const{L,M,S}=gridGetLMS(v.t,0);
      o[k]=gridV2z(bv,L,M,S);
    });
    return o;
  },[birthRecord,metDefs]);

  // Per-week log info for active metric
  const weekInfoMap=useMemo(()=>{
    const map={};
    GRID_WEEKS.forEach(week=>{map[week]=gridWeekLogInfo(week,met,m.t,records);});
    return map;
  },[met,records]);

  // Grid
  const grid=useMemo(()=>GRID_PCTILES.map(pctile=>{
    const z=GRID_PZ[pctile]??0;
    return{pctile,cells:GRID_WEEKS.map(week=>{
      const d=(week-1)*7+3,{L,M,S}=gridGetLMS(m.t,d/30.4375);
      const info=weekInfoMap[week];
      const isLogCell=info!=null&&(pctile===info.lower||pctile===info.upper);
      return{week,val:gridZ2v(z,L,M,S),color:gridCellColor(pctile,bZ),isLogCell,logInfo:isLogCell?info:null};
    })};
  }),[met,bZ,weekInfoMap]);

  const refRow=useMemo(()=>GRID_WEEKS.map(week=>{
    const{L,M,S}=gridGetLMS(m.t,((week-1)*7+3)/30.4375);
    return gridZ2v(bZ,L,M,S);
  }),[met,bZ]);

  if(!birthRecord){
    return(
      <div style={{padding:40,textAlign:"center",color:"#64748b"}}>
        <div style={{fontSize:32,marginBottom:12}}>📊</div>
        <div style={{fontSize:14,marginBottom:6}}>No birth data logged yet</div>
        <div style={{fontSize:12}}>Add a Day 0 entry in the Log tab to see the Growth Reference Grid</div>
      </div>
    );
  }

  return(
    <div style={{padding:"4px 0"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🗂 Growth Reference Grid</div>
        <p style={{fontSize:11,color:"#64748b",lineHeight:1.7,margin:0}}>
          5th–95th percentile · Weeks 1–52 · Color = birth Z classification ·
          Highlighted cells = where your logged measurements fall
        </p>
      </div>

      {/* Birth metrics strip */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {Object.entries(metDefs).map(([k,v])=>{
          const bv=birthRecord?.[k]??null;
          return bv!=null&&(
            <div key={k} style={{padding:"4px 10px",borderRadius:8,background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.18)",fontSize:11}}>
              Birth {v.label}: <span style={{color:"#a78bfa",fontWeight:600}}>{bv.toFixed(v.dp)}{v.unit}</span>
              <span style={{color:"#4a5568"}}> · {gridZ2p(allBZs[k])}th %ile</span>
            </div>
          );
        })}
      </div>

      {/* Metric selector */}
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {Object.entries(metDefs).map(([k,v])=>(
          <button key={k} onClick={()=>setMet(k)} style={{
            padding:"6px 14px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:11,fontWeight:600,transition:"all .15s",
            background:met===k?"rgba(96,165,250,0.14)":"transparent",
            borderColor:met===k?"rgba(96,165,250,0.38)":"rgba(255,255,255,0.1)",
            color:met===k?"#60a5fa":"#4a5568",
          }}>{v.label} ({v.unit})</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12,fontSize:10,alignItems:"center"}}>
        {[["green","Good (±1Z)"],["yellow","Acceptable (±2Z)"],["red","Alert (>2Z)"]].map(([k,l])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:9,height:9,borderRadius:2,background:GRID_CC[k].bg,border:`1px solid ${GRID_CC[k].bd}`}}/>
            <span style={{color:"#4a5568"}}>{l}</span>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:9,height:9,borderRadius:2,background:"rgba(52,211,153,0.35)",border:"1px solid rgba(52,211,153,0.6)"}}/>
          <span style={{color:"#4a5568"}}>= logged data intersect</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <table style={{borderCollapse:"separate",borderSpacing:2,tableLayout:"fixed"}}>
          <colgroup>
            <col style={{width:44}}/>
            {GRID_WEEKS.map(w=><col key={w} style={{width:28}}/>)}
          </colgroup>
          <thead>
            <tr>
              <th style={{padding:"2px 4px",fontSize:7,color:"#1e293b",textAlign:"left"}}>%ile╲Wk</th>
              {GRID_WEEKS.map(w=>(
                <th key={w} style={{padding:"2px 0",fontSize:6,textAlign:"center",
                  fontWeight:weekInfoMap[w]?700:400,
                  color:weekInfoMap[w]?"#475569":"#1e293b"}}>
                  {w===1||w%4===0?`W${w}`:"·"}
                </th>
              ))}
            </tr>
            <tr>
              <th style={{padding:"1px 4px",fontSize:5,color:"#0f172a",textAlign:"left"}}>D.birth→</th>
              {GRID_WEEKS.map(w=>(
                <th key={w} style={{padding:"1px",fontSize:5,textAlign:"center",color:"#0a1020",fontWeight:400}}>
                  {w===1||w%4===0?`D${(w-1)*7}`:""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{padding:"2px 4px",fontSize:6,color:"#2d1b69",fontWeight:600,whiteSpace:"nowrap"}}>── ref</td>
              {refRow.map((val,i)=>(
                <td key={i} style={{padding:"2px 1px",textAlign:"center",background:"rgba(167,139,250,0.05)",border:"1px solid rgba(167,139,250,0.1)",borderRadius:3,fontSize:5,color:"#3b1f8c"}}>
                  {val.toFixed(m.dp)}
                </td>
              ))}
            </tr>
            {grid.map(({pctile,cells})=>(
              <tr key={pctile}>
                <td style={{padding:"2px 4px",fontSize:7,fontWeight:700,whiteSpace:"nowrap",
                  color:pctile===50?"#60a5fa":pctile<=10||pctile>=90?"#f87171":"#334155"}}>
                  {pctile}th
                </td>
                {cells.map(({week,val,color,isLogCell,logInfo})=>{
                  const c=GRID_CC[color];
                  const isH=hov?.p===pctile&&hov?.w===week;
                  return(
                    <td key={week}
                      onClick={()=>setPopup({pctile,week,logInfo})}
                      onMouseEnter={()=>setHov({p:pctile,w:week})}
                      onMouseLeave={()=>setHov(null)}
                      style={{
                        padding:"2px 1px",textAlign:"center",cursor:"pointer",
                        background:isLogCell?c.hbg:c.bg,
                        border:`1px solid ${isLogCell?c.hbd:isH?c.bx:c.bd}`,
                        borderRadius:3,
                        fontWeight:isLogCell?700:400,
                        fontSize:isH?8:isLogCell?7:6,
                        color:isLogCell?"#e2e8f0":isH?c.bx:c.tx,
                        boxShadow:isLogCell?`0 0 6px ${c.hbd}`:undefined,
                        transition:"all .1s",
                        transform:isH?"scale(1.2)":"scale(1)",
                        position:"relative",zIndex:isH?10:1,
                      }}>
                      {val.toFixed(m.dp)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:10,fontSize:10,color:"#1e293b",lineHeight:1.8}}>
        Color = birth Z classification · Bright cells = your logged measurement falls at that percentile intersection ·
        Click any cell → 7-day breakdown · WHO MGRS 2006
      </div>

      {popup&&(
        <GridWeekPopup
          week={popup.week} pctile={popup.pctile}
          activeMet={met} baby={baby} birthDate={birthDate}
          records={records} metDefs={metDefs}
          onClose={()=>setPopup(null)}
        />
      )}
    </div>
  );
}

export default function BabyTracker({ session, baby, onChangeBaby, onLogout }) {
  const userId   = session.user.id;
  const babyId   = baby.id;
  const babyName = baby.name;
  const sex      = baby.sex === 'female' ? 'girls' : 'boys';
  const birthDate = baby.dob; // already a string YYYY-MM-DD

  const [tab, setTab]             = useState("chart");
  const [logSubTab, setLogSubTab] = useState("growth");

  // ── Supabase-backed state ──────────────────────────────────────────────────
  const [records, setRecords]           = useState([]);
  const [milestoneLog, setMilestoneLog] = useState({});
  const [loadingData, setLoadingData]   = useState(true);
  const [saveError, setSaveError]       = useState(null);

  // Share tokens
  const [shareTokens, setShareTokens]   = useState([]);
  const [showShare, setShowShare]       = useState(false);
  const [shareLabel, setShareLabel]     = useState('');
  const [sharePin, setSharePin]         = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);

  // Load all data on mount
  useEffect(() => {
    async function load() {
      setLoadingData(true);
      try {
        const [recs, mlog, tokens] = await Promise.all([
          fetchGrowthRecords(babyId),
          fetchMilestoneLogs(babyId),
          fetchShareTokens(babyId),
        ]);
        setRecords(recs);
        setMilestoneLog(mlog);
        setShareTokens(tokens);
      } catch(e) {
        setSaveError('Failed to load data: ' + e.message);
      }
      setLoadingData(false);
    }
    load();
  }, [babyId]);

  // Responsive hook - must be before any early returns
  const [windowW, setWindowW] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  useEffect(() => {
    const handler = () => setWindowW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const isMobile = windowW < 600;

  const [entryMode, setEntryMode] = useState("monthly");
  const [selMonth, setSelMonth]   = useState(0);
  const [customDays, setCustomDays] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editLength, setEditLength] = useState("");
  const [editHC, setEditHC]         = useState("");
  const [editLabel, setEditLabel]   = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const [openBand, setOpenBand]         = useState("0–3m");
  const [openMilestone, setOpenMilestone] = useState(null);
  const [focusMilestoneId, setFocusMilestoneId] = useState(null);

  // Per-milestone form state
  const [msDate, setMsDate]   = useState("");
  const [msDays, setMsDays]   = useState("");
  const [msNote, setMsNote]   = useState("");
  const [msConflict, setMsConflict] = useState(null);

  // Chart
  const [chartMetric, setChartMetric] = useState("weight");

  const birthRecord = records.find(r => r.day === 0);
  const todayDaysFromBirth = birthDate ? daysBetween(birthDate, new Date().toISOString().split("T")[0]) : null;

  const currentDay = entryMode==="monthly"
    ? Math.round(selMonth * 30.4375)
    : (parseInt(customDays) || 0);
  const currentDayLabel = entryMode==="monthly"
    ? (selMonth===0 ? "Birth" : `Month ${selMonth}`)
    : (customDays ? `Day ${customDays}` : "");

  const birthInfo = useMemo(() => {
    if (!birthRecord?.weight) return null;
    const lms = getLMSAtDays("weight", sex, 0);
    const z = computeZ(birthRecord.weight, lms.L, lms.M, lms.S);
    return { z, pctile: zToPercentile(z) };
  }, [birthRecord, sex]);

  const { data: chartData, birthZ } = useMemo(() => {
    const bv = birthRecord?.[chartMetric] ?? null;
    return buildChartData(chartMetric, sex, records, bv);
  }, [chartMetric, sex, records, birthRecord]);

  // Growth record save (Supabase)
  async function saveRecord() {
    const w = editWeight!=="" ? parseFloat(parseFloat(editWeight).toFixed(2)) : null;
    const l = editLength!=="" ? parseFloat(parseFloat(editLength).toFixed(1)) : null;
    const h = editHC!==""     ? parseFloat(parseFloat(editHC).toFixed(1))     : null;
    if (w===null && l===null && h===null) return;
    const day = currentDay;
    const label = editLabel || currentDayLabel;
    const existingRecord = records.find(r => r.day === day);
    try {
      const saved = await upsertGrowthRecord(userId, babyId, {
        id: existingRecord?.id,
        day, label, weight: w, length: l, headCirc: h,
      });
      setRecords(prev => {
        const filtered = prev.filter(r => r.day !== day);
        return [...filtered, {
          id: saved.id, day: saved.day,
          weight: saved.weight, length: saved.length,
          headCirc: saved.head_circ, label: saved.label,
        }].sort((a,b)=>a.day-b.day);
      });
      setEditWeight(""); setEditLength(""); setEditHC(""); setEditLabel("");
    } catch(e) { setSaveError('Save failed: ' + e.message); }
  }

  // Open a milestone from chart click
  function handleChartMilestoneClick(id) {
    const ms = MILESTONE_DATA.find(m => m.id === id);
    if (!ms) return;
    setTab("log");
    setLogSubTab("milestones");
    setOpenBand(ms.band);
    setOpenMilestone(id);
    setFocusMilestoneId(id);
    // Pre-populate form if already logged
    if (milestoneLog[id]) {
      setMsDays(milestoneLog[id].daysFromBirth ?? "");
      setMsDate(milestoneLog[id].date ?? "");
      setMsNote(milestoneLog[id].note ?? "");
    } else {
      setMsDays(""); setMsDate(""); setMsNote("");
    }
  }

  // Validate and save milestone log entry (Supabase)
  async function saveMilestoneLog(id) {
    setMsConflict(null);
    let resolvedDays = msDays !== "" ? parseInt(msDays) : null;
    let resolvedDate = msDate || null;
    if (birthDate && resolvedDays !== null && resolvedDate) {
      const computedDate = addDaysToDate(birthDate, resolvedDays);
      const computedDays = daysBetween(birthDate, resolvedDate);
      if (Math.abs(computedDays - resolvedDays) > 1) {
        setMsConflict({daysFromBirth:resolvedDays,dateEntered:resolvedDate,daysFromDate:computedDays,computedDate});
        return;
      }
      resolvedDays = computedDays;
    } else if (birthDate && resolvedDate && resolvedDays === null) {
      resolvedDays = daysBetween(birthDate, resolvedDate);
    } else if (birthDate && resolvedDays !== null && !resolvedDate) {
      resolvedDate = addDaysToDate(birthDate, resolvedDays);
    }
    try {
      const saved = await upsertMilestoneLog(userId, babyId, id, {
        daysFromBirth: resolvedDays, date: resolvedDate, note: msNote,
      });
      setMilestoneLog(prev => ({...prev, [id]: {
        id: saved.id, daysFromBirth: saved.days_from_birth,
        date: saved.date_observed, note: saved.note,
      }}));
      setMsConflict(null);
    } catch(e) { setSaveError('Milestone save failed: ' + e.message); }
  }

  function resolveMilestoneConflict(useWhich) {
    if (!msConflict) return;
    let resolvedDays, resolvedDate;
    if (useWhich === "days") {
      resolvedDays = msConflict.daysFromBirth;
      resolvedDate = msConflict.computedDate;
    } else {
      resolvedDays = msConflict.daysFromDate;
      resolvedDate = msConflict.dateEntered;
    }
    upsertMilestoneLog(userId, babyId, openMilestone, {
        daysFromBirth: resolvedDays, date: resolvedDate, note: msNote,
      }).then(saved => {
        setMilestoneLog(prev => ({...prev, [openMilestone]: {
          id: saved.id, daysFromBirth: saved.days_from_birth,
          date: saved.date_observed, note: saved.note,
        }}));
      }).catch(e => setSaveError('Save failed: ' + e.message));
    setMsConflict(null);
  }


  // ── Share panel handlers ─────────────────────────────────────────────────
  async function handleCreateShare() {
    if (sharePin && (sharePin.length !== 4 || !/^\d{4}$/.test(sharePin))) {
      setSaveError('PIN must be exactly 4 digits (or leave blank for no PIN)');
      return;
    }
    setShareLoading(true);
    try {
      const t = await createShareToken(userId, babyId, shareLabel || 'Shared link', sharePin || null);
      setShareTokens(prev => [t, ...prev]);
      setShareLabel('');
      setSharePin('');
    } catch(e) { setSaveError(e.message); }
    setShareLoading(false);
  }
  async function handleDeleteShare(tokenId) {
    try {
      await deleteShareToken(tokenId);
      setShareTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch(e) { setSaveError(e.message); }
  }
  function copyLink(token) {
    const url = window.location.origin + '/share/' + token;
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(token);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  }
  const milestoneRef = useRef({});
  useEffect(() => {
    if (focusMilestoneId && milestoneRef.current[focusMilestoneId]) {
      setTimeout(() => milestoneRef.current[focusMilestoneId]?.scrollIntoView({behavior:"smooth",block:"center"}), 300);
      setFocusMilestoneId(null);
    }
  }, [focusMilestoneId, openMilestone]);

  const metricLabel = {weight:"Weight (kg)",length:"Length (cm)",headCirc:"Head Circ. (cm)"};
  const metricUnit  = {weight:"kg",length:"cm",headCirc:"cm"};

  const tabs = [
    {id:"setup",      label:"👶 Profile"},
    {id:"log",        label:"📝 Log"},
    {id:"milestones", label:"📊 Milestones"},
    {id:"chart",      label:"📈 Charts"},
    {id:"grid",       label:"🗂 Growth Grid"},
    {id:"vaccines",   label:"💉 Vaccines"},
    {id:"references", label:"📚 References"},
    {id:"about",      label:"ℹ️ About"},
  ];


  if (loadingData) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:12}}>{baby.sex==="female"?"👧":"👦"}</div>
        <div style={{color:"#6366f1",fontSize:14}}>Loading {baby.name}'s data…</div>
      </div>
    </div>
  );

  
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",fontFamily:"'DM Sans',system-ui,sans-serif",color:"#e2e8f0"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#312e81,#1e3a5f)",borderBottom:"1px solid rgba(99,102,241,0.3)",padding:"16px 24px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <span style={{fontSize:24}}>🍼</span>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:"#e0e7ff"}}>
            {babyName ? `${babyName}'s Growth Tracker` : "Infant Growth Tracker"}
          </div>
          <div style={{fontSize:11,color:"#94a3b8"}}>WHO 2006 · Day-precise · Personalised curves · Development milestones</div>
        </div>
        {birthInfo && (
          <div style={{marginLeft:"auto",background:"rgba(99,102,241,0.2)",border:"1px solid rgba(99,102,241,0.4)",borderRadius:10,padding:"5px 12px",fontSize:13,color:"#c7d2fe"}}>
            Birth wt: <strong style={{color:"#818cf8"}}>{birthRecord.weight.toFixed(2)} kg</strong>
            {" → "}<strong style={{color:"#4ade80"}}>{birthInfo.pctile}th %ile</strong>
          </div>
        )}
        {todayDaysFromBirth != null && (
          <div style={{background:"rgba(244,114,182,0.15)",border:"1px solid rgba(244,114,182,0.3)",borderRadius:10,padding:"5px 12px",fontSize:12,color:"#fda4af"}}>
            Age: <strong>Day {todayDaysFromBirth}</strong> ({(todayDaysFromBirth/30.4375).toFixed(1)}m)
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(15,23,42,0.6)",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"10px 18px",background:"none",border:"none",
            borderBottom:tab===t.id?"2px solid #818cf8":"2px solid transparent",
            color:tab===t.id?"#c7d2fe":"#64748b",
            fontWeight:tab===t.id?600:400,fontSize:13,cursor:"pointer",whiteSpace:"nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:"20px",maxWidth:960,margin:"0 auto"}}>

        {/* ══ SETUP ══ */}
        {tab==="setup" && (
        <div style={{padding:"24px 16px"}}>
          {/* Error banner */}
          {saveError && (
            <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16}}>
              {saveError} <button onClick={()=>setSaveError(null)} style={{float:"right",background:"none",border:"none",color:"#f87171",cursor:"pointer"}}>✕</button>
            </div>
          )}
          <div style={{background:"rgba(30,27,75,0.7)",borderRadius:16,padding:24,border:"1px solid rgba(99,102,241,0.2)",marginBottom:16}}>
            <h2 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:"#e2e8f0"}}>Baby Profile</h2>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
              {[["Name",baby.name],["Sex",baby.sex],["Date of Birth",baby.dob],
                ["Birth Weight",baby.birth_weight?baby.birth_weight+" kg":"—"],
                ["Birth Length",baby.birth_length?baby.birth_length+" cm":"—"],
                ["Head Circ.",baby.birth_hc?baby.birth_hc+" cm":"—"]].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:"#64748b",marginBottom:2}}>{k}</div>
                  <div style={{fontSize:15,fontWeight:600,color:"#e2e8f0"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Share section */}
          <div style={{background:"rgba(30,27,75,0.7)",borderRadius:16,padding:24,border:"1px solid rgba(99,102,241,0.2)",marginBottom:16}}>
            <h2 style={{margin:"0 0 4px",fontSize:16,fontWeight:700,color:"#e2e8f0"}}>Share with family</h2>
            <p style={{margin:"0 0 16px",fontSize:12,color:"#64748b"}}>Create a read-only link — grandparents, doctors, or anyone can view without an account.</p>
            <div style={{display:"grid",gap:8,marginBottom:16}}>
              <input value={shareLabel} onChange={e=>setShareLabel(e.target.value)}
                placeholder="Label (e.g. Grandma's link)"
                style={{padding:"10px 12px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(15,23,42,0.6)",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1}}>
                  <input value={sharePin} onChange={e=>setSharePin(e.target.value.replace(/\D/g,'').slice(0,4))}
                    placeholder="4-digit PIN (optional)"
                    inputMode="numeric" maxLength={4}
                    style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(15,23,42,0.6)",color:"#e2e8f0",fontSize:13,outline:"none",letterSpacing:sharePin?"6px":"0"}}/>
                  <div style={{fontSize:10,color:"#64748b",marginTop:3}}>Leave blank for no PIN. Recipient must enter to view.</div>
                </div>
                <button onClick={handleCreateShare} disabled={shareLoading}
                  style={{padding:"10px 16px",borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"white",fontWeight:700,cursor:"pointer",fontSize:13,whiteSpace:"nowrap"}}>
                  {shareLoading?"…":"+ Create link"}
                </button>
              </div>
            </div>
            {shareTokens.length === 0 ? (
              <div style={{color:"#64748b",fontSize:13}}>No share links yet.</div>
            ) : shareTokens.map(t => (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{t.label}</span>
                    {t.pin_hash && <span style={{fontSize:9,fontWeight:700,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.35)",color:"#f59e0b",borderRadius:8,padding:"1px 6px"}}>🔒 PIN</span>}
                  </div>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:"monospace",marginTop:2}}>{window.location.origin+"/share/"+t.token}</div>
                </div>
                <button onClick={()=>copyLink(t.token)}
                  style={{padding:"6px 12px",borderRadius:7,background:copyFeedback===t.token?"rgba(74,222,128,0.2)":"rgba(99,102,241,0.2)",border:"1px solid rgba(99,102,241,0.3)",color:copyFeedback===t.token?"#4ade80":"#a5b4fc",fontSize:12,cursor:"pointer",fontWeight:600}}>
                  {copyFeedback===t.token?"Copied!":"Copy"}
                </button>
                <button onClick={()=>handleDeleteShare(t.id)}
                  style={{padding:"6px 10px",borderRadius:7,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",fontSize:12,cursor:"pointer"}}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button onClick={onChangeBaby}
            style={{width:"100%",padding:"12px",borderRadius:10,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.2)",color:"#a5b4fc",fontWeight:700,cursor:"pointer",fontSize:14,marginBottom:8}}>
            ← Switch baby
          </button>
          <button onClick={onLogout}
            style={{width:"100%",padding:"12px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",fontWeight:700,cursor:"pointer",fontSize:14}}>
            Log out
          </button>
        </div>
      )}
      {tab==="log" && (
          <div>
            {/* Sub-tab toggle */}
            <div style={{display:"flex",gap:0,marginBottom:22,background:"rgba(30,27,75,0.5)",borderRadius:10,padding:4,width:"fit-content",border:"1px solid rgba(99,102,241,0.2)"}}>
              {[{id:"growth",label:"📏 Growth Metrics"},{id:"milestones",label:"🏁 Development Milestones"}].map(st=>(
                <button key={st.id} onClick={()=>setLogSubTab(st.id)} style={{
                  padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:logSubTab===st.id?600:400,
                  background:logSubTab===st.id?"rgba(99,102,241,0.45)":"transparent",
                  border:"none",color:logSubTab===st.id?"#c7d2fe":"#64748b",transition:"all 0.2s",
                }}>{st.label}</button>
              ))}
            </div>

            {/* ── Growth Metrics ── */}
            {logSubTab==="growth" && (
              <div>
                <div style={{background:"rgba(30,27,75,0.5)",borderRadius:12,border:"1px solid rgba(99,102,241,0.2)",padding:20,marginBottom:20}}>
                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    {[{id:"monthly",label:"📅 Monthly"},{id:"custom",label:"🗓️ Exact Day"}].map(m=>(
                      <button key={m.id} onClick={()=>setEntryMode(m.id)} style={{
                        padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:entryMode===m.id?600:400,
                        background:entryMode===m.id?"rgba(99,102,241,0.35)":"rgba(30,27,75,0.5)",
                        border:entryMode===m.id?"1px solid #818cf8":"1px solid rgba(99,102,241,0.2)",
                        color:entryMode===m.id?"#c7d2fe":"#64748b",
                      }}>{m.label}</button>
                    ))}
                  </div>
                  {entryMode==="monthly" ? (
                    <div style={{marginBottom:14}}>
                      <label style={lStyle}>Month (0 = Birth)</label>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
                        {Array.from({length:13},(_,i)=>{
                          const ad=Math.round(i*30.4375);const has=records.find(r=>r.day===ad);
                          return <button key={i} onClick={()=>{setSelMonth(i);if(has){setEditWeight(has.weight??"");setEditLength(has.length??"");setEditHC(has.headCirc??"");}else{setEditWeight("");setEditLength("");setEditHC("");}}} style={{width:36,height:36,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:500,background:selMonth===i?"rgba(99,102,241,0.5)":has?"rgba(74,222,128,0.15)":"rgba(30,27,75,0.6)",border:selMonth===i?"1px solid #818cf8":has?"1px solid rgba(74,222,128,0.4)":"1px solid rgba(99,102,241,0.2)",color:selMonth===i?"#c7d2fe":has?"#4ade80":"#64748b"}}>{i===0?"B":i}</button>;
                        })}
                      </div>
                      <div style={{fontSize:11,color:"#475569",marginTop:6}}><span style={{color:"#4ade80"}}>●</span> entered &nbsp;<span style={{color:"#818cf8"}}>●</span> selected · Day ≈ <strong style={{color:"#94a3b8"}}>{currentDay}</strong></div>
                    </div>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                      <div><label style={lStyle}>Days from birth (0–365)</label><input style={iStyle} type="number" min="0" max="365" value={customDays} onChange={e=>setCustomDays(e.target.value)} placeholder="e.g. 45"/>{customDays&&<div style={{fontSize:11,color:"#64748b",marginTop:3}}>≈ {(parseInt(customDays)/30.4375).toFixed(1)} months</div>}</div>
                      <div><label style={lStyle}>Label (optional)</label><input style={iStyle} type="text" value={editLabel} onChange={e=>setEditLabel(e.target.value)} placeholder="e.g. 6-week check"/></div>
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:12}}>
                    {[{label:"Weight (kg)",val:editWeight,set:setEditWeight,step:"0.01",ph:""},{label:"Length (cm)",val:editLength,set:setEditLength,step:"0.1",ph:""},{label:"Head Circ. (cm)",val:editHC,set:setEditHC,step:"0.1",ph:""}].map(({label,val,set,step,ph})=>(
                      <div key={label}><label style={lStyle}>{label}</label><input style={iStyle} type="number" step={step} value={val} onChange={e=>set(e.target.value)} placeholder={ph}/></div>
                    ))}
                  </div>
                  <button onClick={saveRecord} style={{marginTop:14,padding:"9px 22px",borderRadius:8,cursor:"pointer",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",border:"none",color:"#fff",fontSize:14,fontWeight:600}}>
                    Save — {currentDayLabel||`Day ${currentDay}`}
                  </button>
                </div>
                {records.length>0&&(
                  <div>
                    <h3 style={{color:"#94a3b8",fontSize:14,marginBottom:10}}>Records ({records.length})</h3>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead><tr style={{borderBottom:"1px solid rgba(99,102,241,0.25)"}}>{["Day","Age","Label","Wt (kg)","%ile","Len (cm)","%ile","HC (cm)","%ile",""].map((h,i)=><th key={i} style={{padding:"7px 9px",color:"#64748b",textAlign:"left",fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {records.map(rec=>{
                            const wL=getLMSAtDays("weight",sex,rec.day);const lL=getLMSAtDays("length",sex,rec.day);const hL=getLMSAtDays("headCirc",sex,rec.day);
                            const wP=rec.weight!=null?zToPercentile(computeZ(rec.weight,wL.L,wL.M,wL.S)):null;
                            const lP=rec.length!=null?zToPercentile(computeZ(rec.length,lL.L,lL.M,lL.S)):null;
                            const hP=rec.headCirc!=null?zToPercentile(computeZ(rec.headCirc,hL.L,hL.M,hL.S)):null;
                            return (
                              <tr key={rec.id} style={{borderBottom:"1px solid rgba(99,102,241,0.1)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                <td style={{padding:"7px 9px",color:"#c7d2fe",fontWeight:700}}>{rec.day}</td>
                                <td style={{padding:"7px 9px",color:"#64748b"}}>{(rec.day/30.4375).toFixed(1)}m</td>
                                <td style={{padding:"7px 9px",color:"#94a3b8"}}>{rec.label||"—"}</td>
                                <td style={{padding:"7px 9px"}}>{rec.weight!=null?rec.weight.toFixed(2):"—"}</td>
                                <td style={{padding:"7px 9px",color:pctColor(wP),fontWeight:600}}>{wP!=null?`${wP}th`:"—"}</td>
                                <td style={{padding:"7px 9px"}}>{rec.length!=null?rec.length.toFixed(1):"—"}</td>
                                <td style={{padding:"7px 9px",color:pctColor(lP),fontWeight:600}}>{lP!=null?`${lP}th`:"—"}</td>
                                <td style={{padding:"7px 9px"}}>{rec.headCirc!=null?rec.headCirc.toFixed(1):"—"}</td>
                                <td style={{padding:"7px 9px",color:pctColor(hP),fontWeight:600}}>{hP!=null?`${hP}th`:"—"}</td>
                                <td style={{padding:"7px 9px"}}>
                                  {confirmDel===rec.id?(
                                    <span style={{display:"flex",gap:4}}>
                                      <button onClick={()=>{(async()=>{try{await deleteGrowthRecord(rec.id);setRecords(p=>p.filter(r=>r.id!==rec.id));setConfirmDel(null);}catch(e){setSaveError('Delete failed: '+e.message);}})()}} style={{padding:"2px 8px",borderRadius:5,cursor:"pointer",background:"rgba(239,68,68,0.2)",border:"1px solid #ef4444",color:"#fca5a5",fontSize:11}}>Delete</button>
                                      <button onClick={()=>setConfirmDel(null)} style={{padding:"2px 6px",borderRadius:5,cursor:"pointer",background:"transparent",border:"1px solid rgba(99,102,241,0.3)",color:"#64748b",fontSize:11}}>×</button>
                                    </span>
                                  ):(
                                    <button onClick={()=>setConfirmDel(rec.id)} style={{padding:"2px 8px",borderRadius:5,cursor:"pointer",background:"transparent",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171",fontSize:11}}>🗑</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Development Milestones Accordion ── */}
            {logSubTab==="milestones" && (
              <div>
                <div style={{fontSize:13,color:"#64748b",marginBottom:16}}>
                  Log when your baby achieved each milestone. Click a band to expand, then click a milestone to record it.
                  {!birthDate && <span style={{color:"#fbbf24"}}> · Set Date of Birth in Baby Info for date↔days auto-conversion.</span>}
                </div>
                {BANDS.map(band=>{
                  const bandMs = MILESTONE_DATA.filter(m=>m.band===band);
                  const achieved = bandMs.filter(m=>milestoneLog[m.id]).length;
                  const isBandOpen = openBand===band;
                  return (
                    <div key={band} style={{marginBottom:10,borderRadius:12,border:"1px solid rgba(99,102,241,0.2)",overflow:"hidden"}}>
                      {/* Band header */}
                      <button onClick={()=>setOpenBand(isBandOpen?null:band)} style={{
                        width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 18px",
                        background:isBandOpen?"rgba(99,102,241,0.15)":"rgba(30,27,75,0.5)",
                        border:"none",cursor:"pointer",textAlign:"left",
                      }}>
                        <span style={{fontSize:15,fontWeight:700,color:"#c7d2fe"}}>{band}</span>
                        <span style={{fontSize:12,color:"#64748b"}}>
                          {achieved}/{bandMs.length} achieved
                        </span>
                        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
                          {bandMs.slice(0,6).map(m=>(
                            <div key={m.id} style={{width:10,height:10,borderRadius:"50%",background:milestoneLog[m.id]?"#4ade80":CAT[m.category].color,opacity:milestoneLog[m.id]?1:0.3}}/>
                          ))}
                        </div>
                        <span style={{color:"#818cf8",fontSize:16,marginLeft:8}}>{isBandOpen?"▲":"▼"}</span>
                      </button>
                      {/* Milestones */}
                      {isBandOpen && bandMs.map(ms=>{
                        const catS = CAT[ms.category];
                        const logged = milestoneLog[ms.id];
                        const isOpen = openMilestone===ms.id;
                        return (
                          <div key={ms.id} ref={el=>milestoneRef.current[ms.id]=el}
                            style={{borderTop:"1px solid rgba(99,102,241,0.12)"}}>
                            {/* Milestone row */}
                            <button onClick={()=>{
                              const nowOpen = !isOpen;
                              setOpenMilestone(nowOpen?ms.id:null);
                              if(nowOpen){
                                setMsDays(logged?.daysFromBirth??"");
                                setMsDate(logged?.date??"");
                                setMsNote(logged?.note??"");
                                setMsConflict(null);
                              }
                            }} style={{
                              width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 18px",
                              background:isOpen?catS.bg:"rgba(15,23,42,0.3)",
                              border:"none",cursor:"pointer",textAlign:"left",
                            }}>
                              {/* Category dot */}
                              <div style={{width:10,height:10,borderRadius:"50%",background:catS.color,flexShrink:0}}/>
                              {/* Text */}
                              <div style={{flex:1}}>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{fontSize:13,fontWeight:600,color:isOpen?catS.color:"#cbd5e1"}}>
                                    {ms.text}
                                  </span>
                                  {ms.optional && (
                                    <span style={{
                                      fontSize:9,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",
                                      background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",
                                      color:"#f59e0b",borderRadius:10,padding:"1px 7px",lineHeight:"16px",
                                      flexShrink:0
                                    }}>Optional</span>
                                  )}
                                </div>
                                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                                  <span style={{color:ms.optional?"#f59e0b":catS.color,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.4px"}}>{ms.optional?"Optional · ":""}{ms.category}</span>
                                  {" · "}window: {ms.p5}–{ms.p95} months
                                </div>
                              </div>
                              {/* Achieved badge */}
                              {logged ? (
                                <span style={{background:"rgba(74,222,128,0.2)",border:"1px solid rgba(74,222,128,0.4)",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#4ade80",fontWeight:600}}>
                                  ✓ Day {logged.daysFromBirth ?? "?"}
                                </span>
                              ):(
                                <span style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#64748b"}}>
                                  Not logged
                                </span>
                              )}
                              <span style={{color:"#64748b",fontSize:14}}>{isOpen?"▲":"▼"}</span>
                            </button>

                            {/* Expanded panel */}
                            {isOpen && (
                              <div style={{padding:"16px 16px 20px",background:"rgba(15,23,42,0.5)",display:"grid",gridTemplateColumns:isMobile?"1fr":"200px 1fr",gap:isMobile?12:20}}>
                                {/* SVG illustration */}
                                <div style={{width:isMobile?"100%":200,height:isMobile?100:140,borderRadius:12,overflow:"hidden",border:`1px solid ${catS.border}`,background:catS.bg,flexShrink:0}}>
                                  <MilestoneIllustration milestoneId={ms.id} category={ms.category}/>
                                </div>
                                {/* Form */}
                                <div>
                                  {ms.optional && (
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"8px 12px",marginBottom:10}}>
                                    <span style={{fontSize:14,flexShrink:0}}>✦</span>
                                    <span style={{fontSize:11,color:"#f59e0b",lineHeight:1.5}}>
                                      <strong>Optional milestone.</strong> Some babies skip this entirely — that's completely normal. Only log it if your baby does it.
                                    </span>
                                  </div>
                                )}
                                <p style={{margin:"0 0 14px",fontSize:13,color:"#94a3b8",lineHeight:1.6}}>{ms.desc}</p>
                                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                                    <div>
                                      <label style={lStyle}>Date observed</label>
                                      <input style={iStyle} type="date" value={msDate} onChange={e=>{setMsDate(e.target.value);setMsConflict(null);}}
                                        max={new Date().toISOString().split("T")[0]}/>
                                      {birthDate && msDate && <div style={{fontSize:11,color:"#64748b",marginTop:3}}>= Day {daysBetween(birthDate,msDate)} from birth</div>}
                                    </div>
                                    <div>
                                      <label style={lStyle}>Days from birth</label>
                                      <input style={iStyle} type="number" min="0" max="500" value={msDays}
                                        onChange={e=>{setMsDays(e.target.value);setMsConflict(null);}} placeholder="e.g. 92"/>
                                      {birthDate && msDays && <div style={{fontSize:11,color:"#64748b",marginTop:3}}>= {addDaysToDate(birthDate,parseInt(msDays))}</div>}
                                    </div>
                                  </div>
                                  <div style={{marginBottom:12}}>
                                    <label style={lStyle}>Observation note (optional)</label>
                                    <input style={{...iStyle,resize:"none"}} type="text" value={msNote} onChange={e=>setMsNote(e.target.value)} placeholder="e.g. Laughed at ceiling fan!"/>
                                  </div>

                                  {/* Conflict warning */}
                                  {msConflict && (
                                    <div style={{marginBottom:12,padding:"12px 14px",borderRadius:8,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.35)"}}>
                                      <div style={{fontSize:12,color:"#fbbf24",fontWeight:600,marginBottom:8}}>⚠️ Date conflict detected</div>
                                      <div style={{fontSize:12,color:"#94a3b8",marginBottom:10,lineHeight:1.6}}>
                                        You entered <strong style={{color:"#e2e8f0"}}>Day {msConflict.daysFromBirth}</strong> from birth
                                        (which would be <strong style={{color:"#e2e8f0"}}>{msConflict.computedDate}</strong>),
                                        but the date you entered <strong style={{color:"#e2e8f0"}}>{msConflict.dateEntered}</strong>
                                        is <strong style={{color:"#e2e8f0"}}>Day {msConflict.daysFromDate}</strong> from birth.
                                        Which is correct?
                                      </div>
                                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                        <button onClick={()=>resolveMilestoneConflict("days")} style={{padding:"6px 14px",borderRadius:7,cursor:"pointer",background:"rgba(99,102,241,0.3)",border:"1px solid #818cf8",color:"#c7d2fe",fontSize:12,fontWeight:600}}>
                                          Use Day {msConflict.daysFromBirth} → {msConflict.computedDate}
                                        </button>
                                        <button onClick={()=>resolveMilestoneConflict("date")} style={{padding:"6px 14px",borderRadius:7,cursor:"pointer",background:"rgba(244,114,182,0.2)",border:"1px solid #f472b6",color:"#fda4af",fontSize:12,fontWeight:600}}>
                                          Use {msConflict.dateEntered} → Day {msConflict.daysFromDate}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                                    <button onClick={()=>saveMilestoneLog(ms.id)} style={{padding:"8px 20px",borderRadius:8,cursor:"pointer",background:`linear-gradient(135deg,${catS.color},${catS.color}99)`,border:"none",color:"#0f172a",fontSize:13,fontWeight:700}}>
                                      {logged?"Update":"Mark Achieved"}
                                    </button>
                                    {logged && (
                                      <button onClick={()=>{(async()=>{try{await deleteMilestoneLog(babyId,ms.id);setMilestoneLog(prev=>{const n={...prev};delete n[ms.id];return n;});}catch(e){setSaveError('Delete failed: '+e.message);}})()}} style={{padding:"7px 14px",borderRadius:8,cursor:"pointer",background:"transparent",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171",fontSize:12}}>
                                        Remove
                                      </button>
                                    )}
                                    {logged && <span style={{fontSize:12,color:"#4ade80"}}>✓ Achieved Day {logged.daysFromBirth}</span>}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ MILESTONE CHART TAB ══ */}
        {tab==="milestones" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div>
                <h2 style={{color:"#c7d2fe",fontSize:17,margin:0}}>Developmental Milestone Chart</h2>
                <div style={{fontSize:12,color:"#64748b",marginTop:4}}>
                  Bars show the 5th–95th percentile window. Click any bar to log that milestone.
                  {todayDaysFromBirth!=null && <span style={{color:"#f472b6"}}> Pink line = baby's age today ({(todayDaysFromBirth/30.4375).toFixed(1)}m)</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:20,height:3,background:"#f472b6",borderRadius:2}}/> Today's age</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:"#4ade80"}}/> Achieved</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}><div style={{width:10,height:10,borderRadius:2,background:"#818cf8",opacity:0.85}}/> In window</div>
              </div>
            </div>
            <MilestoneChart
              babyAgeDays={todayDaysFromBirth}
              birthDate={birthDate}
              onSelectMilestone={handleChartMilestoneClick}
              achievedMap={milestoneLog}
            />
            <div style={{marginTop:14,padding:"10px 14px",borderRadius:8,background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.15)",fontSize:12,color:"#64748b"}}>
              💡 Click any milestone bar to open its log card in the <strong style={{color:"#c7d2fe"}}>Log → Development Milestones</strong> tab.
            </div>
          </div>
        )}

        {/* ══ GROWTH CHARTS ══ */}
        {tab==="chart" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[{key:"weight",label:"⚖️ Weight"},{key:"length",label:"📏 Length"},{key:"headCirc",label:"🔵 Head Circ."}].map(({key,label})=>(
                <button key={key} onClick={()=>setChartMetric(key)} style={{padding:"7px 16px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:chartMetric===key?600:400,background:chartMetric===key?"rgba(99,102,241,0.3)":"rgba(30,27,75,0.4)",border:chartMetric===key?"1px solid #818cf8":"1px solid rgba(99,102,241,0.2)",color:chartMetric===key?"#c7d2fe":"#64748b"}}>{label}</button>
              ))}
            </div>
            {birthRecord?.[chartMetric]?(
              <div style={{marginBottom:12,padding:"9px 14px",borderRadius:8,background:"rgba(244,114,182,0.07)",border:"1px solid rgba(244,114,182,0.25)",fontSize:12,color:"#fda4af"}}>
                🎯 Birth {chartMetric==="weight"?"weight":chartMetric==="length"?"length":"HC"}: <strong>
                {chartMetric==="weight"?birthRecord.weight.toFixed(2)+" kg":birthRecord[chartMetric]?.toFixed(1)+" cm"}
                </strong>
                {birthZ!=null&&<> → Z={birthZ.toFixed(2)} ({zToPercentile(birthZ)}th %ile) — <span style={{color:"#f472b6"}}>pink = personalised ref</span></>}
              </div>
            ):(
              <div style={{marginBottom:12,padding:"9px 14px",borderRadius:8,background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.2)",fontSize:12,color:"#94a3b8"}}>⚠️ Log birth measurement to activate personalised curve.</div>
            )}
            <div style={{background:"rgba(15,23,42,0.75)",borderRadius:12,padding:"16px 4px 8px"}}>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{top:8,right:18,left:4,bottom:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.09)"/>
                  <XAxis dataKey="day" type="number" domain={[0,365]} ticks={[0,30,61,91,122,152,183,213,244,274,304,335,365]} tickFormatter={v=>v===0?"Birth":`${Math.round(v/30.4375)}m`} tick={{fill:"#64748b",fontSize:10}} axisLine={{stroke:"rgba(99,102,241,0.2)"}} tickLine={false}/>
                  <YAxis tick={{fill:"#64748b",fontSize:10}} axisLine={{stroke:"rgba(99,102,241,0.2)"}} tickLine={false} width={36}/>
                  <Tooltip contentStyle={{background:"#1e1b4b",border:"1px solid rgba(99,102,241,0.4)",borderRadius:8,fontSize:11}} labelFormatter={v=>`Day ${v} (${(v/30.4375).toFixed(1)}m)`} formatter={(val,name)=>{const dp=chartMetric==="weight"?2:1;const u=chartMetric==="weight"?"kg":"cm";if(name==="actual")return[`${val.toFixed(dp)} ${u}`,"● Actual"];if(name==="personalised")return[`${val.toFixed(dp)} ${u}`,"✦ Personalised"];return[`${val.toFixed(dp)} ${u}`,name];}}/>
                  {PCTILE_LINES.map(({label,color})=><Line key={label} type="monotone" dataKey={label} stroke={color} strokeWidth={label==="50th"?1.5:1} strokeDasharray={label==="50th"?"":"5 3"} dot={false} name={label} opacity={0.5} legendType="none"/>)}
                  <Line type="monotone" dataKey="personalised" stroke="#f472b6" strokeWidth={2.5} strokeDasharray="7 3" dot={false} name="personalised" connectNulls legendType="none"/>
                  <Line type="monotone" dataKey="actual" stroke="#818cf8" strokeWidth={1.5} dot={{fill:"#818cf8",r:5,strokeWidth:2,stroke:"#c7d2fe"}} activeDot={{r:8}} name="actual" connectNulls={false} legendType="none"/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:10}}>
              {[...PCTILE_LINES.map(p=>({label:p.label,color:p.color,dot:false})),{label:"Personalised ref",color:"#f472b6",dot:false},{label:"Actual",color:"#818cf8",dot:true}].map(({label,color,dot})=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}>
                  {dot?<div style={{width:9,height:9,borderRadius:"50%",background:color}}/>:<div style={{width:20,height:2,background:color,borderRadius:2,opacity:0.7}}/>}
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ VACCINES ══ */}
        {tab==="vaccines" && (
          <div>
            <h2 style={{color:"#c7d2fe",marginBottom:18,fontSize:17}}>IAP Vaccine Schedule (India)</h2>
            <div style={{display:"grid",gap:10}}>
              {VACCINES.map(({age,vaccines})=>(
                <div key={age} style={{display:"flex",gap:16,padding:"12px 16px",borderRadius:10,background:"rgba(30,27,75,0.5)",border:"1px solid rgba(99,102,241,0.2)"}}>
                  <div style={{minWidth:145,fontWeight:700,color:"#818cf8",fontSize:12,paddingTop:2,lineHeight:1.5}}>{age}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {(Array.isArray(vaccines)?vaccines:[vaccines]).map(v=><span key={v} style={{padding:"3px 9px",borderRadius:6,fontSize:11,background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.25)",color:"#c7d2fe"}}>{v}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.2)",fontSize:12,color:"#94a3b8"}}>
              ⚠️ IAP 2023 schedule. Confirm with your pediatrician.
            </div>
          </div>
        )}

        {tab==="references" && (
          <div style={{padding:"4px 0"}}>
            <h2 style={{color:"#c7d2fe",marginBottom:6,fontSize:17}}>Scientific References</h2>
            <p style={{color:"#64748b",fontSize:12,marginBottom:18}}>All clinical data in this app is sourced from peer-reviewed literature and international health authority guidelines.</p>
            {[
              {
                section:"📈 Growth Charts & Percentiles",
                color:"#818cf8",
                refs:[
                  {title:"WHO Child Growth Standards: Methods and Development",authors:"WHO Multicentre Growth Reference Study Group",journal:"Acta Paediatrica Supplement 2006;450:1–101",url:"https://www.who.int/publications/i/item/924154693X",note:"Primary source for all LMS parameters (L, M, S) used in weight-for-age, length-for-age, and head circumference-for-age percentile calculations"},
                  {title:"WHO Weight-for-Age Z-Score Tables (Boys & Girls, 0–5 years)",authors:"World Health Organization",journal:"WHO Growth Reference Data, 2006",url:"https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/wfa-boys-0-5-zscores.pdf",note:"Official LMS S-value source used to correct app data for months 5–9"},
                  {title:"WHO Length/Height-for-Age and Head Circumference-for-Age tables",authors:"World Health Organization",journal:"WHO Growth Reference Data, 2006",url:"https://www.who.int/tools/child-growth-standards/standards",note:"Source for length and HC percentile curve parameters"},
                ]
              },
              {
                section:"🏃 Motor Developmental Milestones",
                color:"#818cf8",
                refs:[
                  {title:"WHO Motor Development Study: Windows of Achievement for Six Gross Motor Development Milestones",authors:"WHO MGRS Group",journal:"Acta Paediatrica Supplement 2006;450:86–95 (PubMed 16817682)",url:"https://pubmed.ncbi.nlm.nih.gov/16817682/",note:"Primary source for all gross motor milestone age windows (p5–p95). N=816 children across 6 countries. Provides sitting, standing, crawling, walking percentile ranges used in the milestone chart."},
                  {title:"Longitudinal study of children with motor development: the WHO study",authors:"WHO Multicentre Growth Reference Study Group",journal:"2006",url:"https://www.who.int/tools/child-growth-standards/standards/motor-development-milestones",note:"Official WHO motor milestone percentile tables"},
                ]
              },
              {
                section:"🗣️ Language & Social Milestones",
                color:"#34d399",
                refs:[
                  {title:"2022 CDC/AAP Developmental Milestones",authors:"Zubler JM, Wiggins LD, Macias MM, et al.",journal:"Pediatrics 2022;149(3):e2021052138 (PMC9680195)",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC9680195/",note:"Revised milestone checklist used for language/social milestones. Changed standard from 50th to 75th percentile. Moved walking to 15m, removed crawling, added 15m and 30m checkpoints."},
                  {title:"Canonical babbling and its role in language acquisition",authors:"Oller DK, Griebel U, et al.",journal:"Frontiers in Psychology 2018 (PMC5869132)",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC5869132/",note:"Source for canonical (consonant) babbling onset at 6–10 months. Used to correct app labelling of babbling milestone from 4m to 6m onset."},
                  {title:"Social smile and laughter development in infants",authors:"Wolff PH",journal:"Psychological Issues 1963;3(1) (PMC4424150)",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC4424150/",note:"Distinguishes reflex smiles (3–5 weeks) from true social smiles (6–8 weeks). Used to update social smile milestone description."},
                  {title:"AAP Bright Futures — Developmental Surveillance & Screening",authors:"American Academy of Pediatrics",journal:"Bright Futures Guidelines, 4th edition, 2019",url:"https://www.healthychildren.org",note:"First word range 10–15 months and general language milestone windows"},
                ]
              },
              {
                section:"💉 Vaccine Schedule",
                color:"#60a5fa",
                refs:[
                  {title:"IAP Recommended Immunization Schedule for Children (2023)",authors:"Indian Academy of Pediatrics — Advisory Committee on Vaccines & Immunization Practices (ACVIP)",journal:"Indian Pediatrics 2023",url:"https://www.iapindia.org/vaccine-schedule.php",note:"Source for the India-specific vaccine schedule including BCG, OPV, DTwP/DTaP, IPV, Hib, PCV, Rotavirus, MMR, Typhoid, Hepatitis A, and Varicella timings shown in the Vaccines tab"},
                ]
              },
              {
                section:"🔬 Validation Methodology",
                color:"#fbbf24",
                refs:[
                  {title:"Box-Cox Power Exponential (BCPE) distribution for fitting growth data",authors:"Rigby RA, Stasinopoulos DM",journal:"Applied Statistics 2004;53:507–534",url:"https://rss.onlinelibrary.wiley.com/doi/10.1111/j.1467-9876.2004.05305.x",note:"Statistical method underlying WHO LMS percentile calculation used in this app"},
                ]
              }
            ].map(({section,color,refs})=>(
              <div key={section} style={{marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color,marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${color}30`}}>{section}</div>
                <div style={{display:"grid",gap:8}}>
                  {refs.map((r,i)=>(
                    <div key={i} style={{background:"rgba(30,27,75,0.5)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:10,padding:"12px 14px"}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:2}}>{r.title}</div>
                      <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{r.authors} · <em>{r.journal}</em></div>
                      <div style={{fontSize:11,color:"#64748b",marginBottom:8,lineHeight:1.5}}>{r.note}</div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:11,color:color,textDecoration:"none",wordBreak:"break-all"}}>
                        🔗 {r.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="grid" && (
          <GrowthReferenceGrid
            records={records}
            baby={baby}
            birthDate={birthDate}
            sex={sex}
          />
        )}

        {tab==="about" && (
          <div style={{padding:"4px 0"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:52,marginBottom:10}}>👶</div>
              <h1 style={{fontSize:22,fontWeight:800,color:"#e2e8f0",margin:"0 0 4px"}}>Baby Tracker</h1>
              <div style={{display:"inline-block",background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:20,padding:"3px 14px",fontSize:12,color:"#818cf8",fontWeight:600}}>Version 0.1</div>
            </div>

            {[
              {icon:"🎯",title:"Purpose",text:"A scientifically validated infant growth and milestone tracker for the first year of life. Built for Indian families using WHO 2006 growth standards and CDC/AAP 2022 milestone guidelines."},
              {icon:"📊",title:"What's validated",text:"All growth percentile calculations use official WHO LMS parameters. Milestone age windows are sourced from WHO Motor Development Study 2006 (N=816 children) and CDC/AAP 2022 revised guidelines. See the References tab for full citations."},
              {icon:"⚠️",title:"Medical disclaimer",text:"This app is for informational and tracking purposes only. It is not a diagnostic tool. Always consult your paediatrician for clinical assessment of your baby's growth and development."},
              {icon:"🔒",title:"Privacy & data",text:"All data is stored in your personal Supabase account. No data is shared with third parties. Share links are opt-in and can be revoked at any time. PINs are hashed before storage."},
            ].map(({icon,title,text})=>(
              <div key={title} style={{background:"rgba(30,27,75,0.6)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:5}}>{icon} {title}</div>
                <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>{text}</div>
              </div>
            ))}

            <div style={{background:"rgba(30,27,75,0.6)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>🛠️ Built by</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:32}}>🐙</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:2}}>AnUnnit</div>
                  <a href="https://github.com/AnUnnit/babytracker" target="_blank" rel="noopener noreferrer"
                    style={{fontSize:12,color:"#818cf8",textDecoration:"none"}}>
                    github.com/AnUnnit/babytracker
                  </a>
                </div>
              </div>
            </div>

            <div style={{background:"rgba(30,27,75,0.6)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>📬 Contact & feedback</div>
              <div style={{fontSize:12,color:"#94a3b8",marginBottom:8}}>Found a bug or want to suggest a feature? Open an issue on GitHub:</div>
              <a href="https://github.com/AnUnnit/babytracker/issues" target="_blank" rel="noopener noreferrer"
                style={{display:"inline-block",padding:"8px 16px",borderRadius:8,background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",color:"#a5b4fc",fontSize:12,textDecoration:"none",fontWeight:600}}>
                Open an issue →
              </a>
            </div>

            <div style={{textAlign:"center",padding:"16px 0 8px",fontSize:11,color:"#334155"}}>
              Baby Tracker v0.1 · WHO MGRS 2006 · CDC/AAP 2022 · IAP 2023
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
