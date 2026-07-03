import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, Download, X, Trash2, Pencil, FolderPlus, AlertTriangle,
  CheckCircle2, HardHat, Building2, MoreHorizontal, Info, Camera, Upload,
  ClipboardCheck, ListChecks, ShieldCheck, ClipboardList, Printer
} from "lucide-react";
import { SCHEDULE_SEED_JS, CPB_SEED_JS, LOGO_URI_JS } from "../seed";
import RegisterView from "../components/Pile-Tracker/RegisterView";
import PileModal from "../components/Pile-Tracker/PileModal";
import { ItpReport } from "../components/Pile-Tracker/ItpReport";
import ImportModal from "../components/Pile-Tracker/ImportModal";
import ProjectModal from "../components/Pile-Tracker/ProjectModal";
import RegisterEntryModal from "../components/Pile-Tracker/RegisterEntryModal";

/* schedule seeded from "Pile Schedule Rev 26 — 19 May 26" (1300 piles)
   columns: [no, dia, grade, verticalReo, ligs, socket, cutoffRL, topSteelRL, cancelled?] */
const SCHEDULE_SEED = SCHEDULE_SEED_JS;
/* CPB job Rev 08: [no,dia,grade,verticalReo,verticalReoLower,ligs,socket,cutoffRL,topSteelRL,cancelled?] */
const CPB_SEED = CPB_SEED_JS;
const LOGO_URI = LOGO_URI_JS;

/* ───────────────────────── storage ───────────────────────── */
const PROJECTS_KEY = "piletracker:projects";
const PILES_KEY = "piletracker:piles";
const REGISTER_KEY = "piletracker:register";
const SHARED = true;
const hasStore = typeof window !== "undefined" && window.storage;
const photoKey = (pileId, hp) => `piletracker:photo:${pileId}:${hp}`;

async function getKey(key) {
  if (!hasStore) return null;
  try { 
    const r = await window.storage.get(key, SHARED); 
    return r ? JSON.parse(r.value) : null; 
  }
  catch (e) { return null; }
}

async function setKey(key, val) {
  if (!hasStore) return true;
  try { 
    const r = await window.storage.set(key, JSON.stringify(val), SHARED); 
    return !!r; 
  }
  catch (e) { return false; }
}

async function delKey(key) { 
  if (!hasStore) return; 
  try { 
    await window.storage.delete(key, SHARED); 
  } 
  catch (e) {} 
}

/* ───────────────────────── domain ───────────────────────── */
const STAGES = [
  { key: "not_started", label: "Not started", short: "Pending", color: "#94A0AE" },
  { key: "drilled", label: "Drilled", short: "Drilled", color: "#3B82C4" },
  { key: "cage", label: "Cage installed", short: "Cage", color: "#7A5BD0" },
  { key: "poured", label: "Poured", short: "Poured", color: "#E0871E" },
  { key: "qa", label: "QA signed off", short: "QA done", color: "#2E9E5B" },
];
const stageMeta = (k) => STAGES.find((s) => s.key === k) || STAGES[0];
function computeStage(p) {
  if (p.qaStatus === "Signed off") return "qa";
  if (p.pourDate) return "poured";
  if (p.cageStatus === "Installed") return "cage";
  if (p.drillDate) return "drilled";
  return "not_started";
}
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
function theoreticalVol(p) {
  const dia = num(p.actualDia) ?? num(p.dia);
  const depth = num(p.actualDepth);
  if (!dia || !depth) return null;
  const r = dia / 2 / 1000;
  return Math.PI * r * r * depth;
}
const HP_DEF = { released: false, inspector: "", date: "", hasPhoto: false };
function getHp(p) {
  return { drill: { ...HP_DEF, ...(p.hp && p.hp.drill) }, cage: { ...HP_DEF, ...(p.hp && p.hp.cage) }, pour: { ...HP_DEF, ...(p.hp && p.hp.pour) } };
}
function flagsFor(p) {
  const out = [];
  const dDia = num(p.dia), aDia = num(p.actualDia);
  if (dDia != null && aDia != null && aDia !== dDia) out.push({ level: "warn", text: `Ø mismatch: ${aDia} vs ${dDia} spec` });
  const stage = computeStage(p), hp = getHp(p), theo = theoreticalVol(p), vol = num(p.concreteVol);
  if (p.deliveredGrade && p.grade && norm(p.deliveredGrade) !== norm(String(p.grade)))
    out.push({ level: "warn", text: `Grade: ${p.deliveredGrade} vs spec ${p.grade} MPa` });
  if (stage === "poured" || stage === "qa") {
    if (vol == null) out.push({ level: "warn", text: "Pour logged, volume missing" });
    else if (theo) {
      const dev = (vol - theo) / theo;
      if (dev < -0.1) out.push({ level: "warn", text: `Under-pour: ${vol} vs ${theo.toFixed(2)} theo` });
      else if (dev > 0.2) out.push({ level: "info", text: `Overbreak +${Math.round(dev * 100)}%` });
    }
    if (!hp.cage.released) out.push({ level: "warn", text: "Poured before pre-pour HP released" });
    if (!hp.pour.hasPhoto) out.push({ level: "warn", text: "Pour HP photo missing" });
  }
  if ((stage === "cage" || stage === "poured" || stage === "qa") && !hp.cage.hasPhoto)
    out.push({ level: "warn", text: "Cage HP photo missing" });
  if (stage !== "not_started" && !hp.drill.hasPhoto)
    out.push({ level: "warn", text: "Drill HP photo missing" });
  return out;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtN = (v, d = 1) => (num(v) == null ? "—" : num(v).toFixed(d));
const fmtInt = (v) => (num(v) == null ? "—" : String(num(v)));
const norm = (s) => (s || "").toString().trim().toLowerCase();

/* ───────────────────────── pile glyph ───────────────────────── */
function PileGlyph({ stage, size = 38 }) {
  const w = size * 0.46, h = size, m = stageMeta(stage);
  const fillLevels = { not_started: 0, drilled: 0, cage: 0.55, poured: 1, qa: 1 };
  const fill = fillLevels[stage] ?? 0, top = h * (1 - fill), bored = stage !== "not_started", id = `pile-${stage}-${size}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", flexShrink: 0 }}>
      <defs><clipPath id={id}><path d={`M2 2 H${w - 2} V${h - w / 2} A${(w - 4) / 2} ${(w - 4) / 2} 0 0 1 2 ${h - w / 2} Z`} /></clipPath></defs>
      <path d={`M2 2 H${w - 2} V${h - w / 2} A${(w - 4) / 2} ${(w - 4) / 2} 0 0 1 2 ${h - w / 2} Z`} fill={bored ? "#EEF1F4" : "none"} stroke={bored ? "#9AA4B0" : "#C2C9D2"} strokeWidth="1.6" strokeDasharray={bored ? "none" : "3 3"} />
      {fill > 0 && <rect x="0" y={top} width={w} height={h - top} fill={m.color} clipPath={`url(#${id})`} opacity={stage === "cage" ? 0.18 : 0.9} />}
      {(stage === "cage" || stage === "poured" || stage === "qa") && (
        <g clipPath={`url(#${id})`} stroke={stage === "cage" ? "#7A5BD0" : "rgba(255,255,255,0.55)"} strokeWidth="1.1">
          <line x1="0" y1={h * 0.32} x2={w} y2={h * 0.32} /><line x1="0" y1={h * 0.52} x2={w} y2={h * 0.52} /><line x1="0" y1={h * 0.72} x2={w} y2={h * 0.72} /><line x1={w * 0.32} y1="2" x2={w * 0.32} y2={h} /><line x1={w * 0.68} y1="2" x2={w * 0.68} y2={h} />
        </g>
      )}
      {stage === "qa" && <circle cx={w - 1} cy={6} r={6} fill="#2E9E5B" stroke="#fff" strokeWidth="1.4" />}
    </svg>
  );
}

/* seed builder */
function seedSchedule() {
  const pid = uid();
  const proj = { id: pid, name: "Pile Schedule — Rev 26 (19 May 26)", code: "REV26", location: "" };
  const register = SCHEDULE_SEED.map((r) => ({
    id: uid(), projectId: pid, pileRef: String(r[0]),
    dia: r[1] ?? "", grade: r[2] ?? "", verticalReo: r[3] || "", verticalReoLower: "", ligs: r[4] || "",
    socket: r[5] ?? "", cutoffRL: r[6] ?? "", topSteelRL: r[7] ?? "", cancelled: r[8] === 1,
  }));

  return { proj, register };
}

function seedCPB() {
  const pid = uid();
  const proj = { id: pid, name: "Pile Register — CPB job (Rev 08)", code: "CPB", location: "" };
  const register = CPB_SEED.map((r) => ({
    id: uid(), projectId: pid, pileRef: String(r[0]),
    dia: r[1] ?? "", grade: r[2] ?? "", verticalReo: r[3] || "", verticalReoLower: r[4] || "",
    ligs: r[5] || "", socket: r[6] ?? "", cutoffRL: r[7] ?? "", topSteelRL: r[8] ?? "", cancelled: r[9] === 1,
  }));
  return { proj, register };
}

/* ───────────────────────── small bits ───────────────────────── */
function Stat({ label, value, sub, accent }) {
  return (<div className="pt-stat"><div className="pt-stat-val" style={accent ? { color: accent } : undefined}>{value}</div><div className="pt-stat-label">{label}</div>{sub && <div className="pt-stat-sub">{sub}</div>}</div>);
}
function StageBar({ counts, total }) {
  if (!total) return null;
  return (<div className="pt-stagebar"><div className="pt-stagebar-track">{STAGES.map((s) => { const c = counts[s.key] || 0; return c ? <div key={s.key} title={`${s.label}: ${c}`} style={{ flex: c, background: s.color }} /> : null; })}</div><div className="pt-stagebar-legend">{STAGES.map((s) => <span key={s.key} className="pt-legend-item"><span className="pt-dot" style={{ background: s.color }} />{s.short} <b>{counts[s.key] || 0}</b></span>)}</div></div>);
}
function hpPip(p, which) {
  const hp = getHp(p);
  if (which === "drill") {
    if (hp.drill.released) return { c: "#2E9E5B", t: "Drill HP released" };
    if (p.drillDate) return { c: "#E0871E", t: "Drilled, HP open" };
    return { c: "#C2C9D2", t: "Drill pending" };
  }
  if (which === "cage") {
    if (hp.cage.released) return { c: "#2E9E5B", t: "Cage HP released" };
    if (p.cageStatus === "Installed") return { c: "#E0871E", t: "Cage in ground, HP open" };
    return { c: "#C2C9D2", t: "Cage pending" };
  }
  if (hp.pour.released) return { c: "#2E9E5B", t: "Pour HP released" };
  if (p.pourDate) return { c: "#E0871E", t: "Poured, HP open" };
  return { c: "#C2C9D2", t: "Pour pending" };
}



/* ───────────────────────── pile modal ───────────────────────── */




/* ───────────────────────── pile row ───────────────────────── */
function PileRow({ p, projects, onEdit }) {
  const stage = computeStage(p), m = stageMeta(stage), fl = flagsFor(p);
  const proj = projects.find((x) => x.id === p.projectId), theo = theoreticalVol(p);
  const drill = hpPip(p, "drill"), cage = hpPip(p, "cage"), pour = hpPip(p, "pour");
  return (
    <div className="pt-row" onClick={() => onEdit(p)}>
      <div className="pt-row-glyph"><PileGlyph stage={stage} /></div>
      <div className="pt-row-id">
        <div className="pt-row-ref">Pile {p.pileRef}</div>
        <div className="pt-row-sub">{proj ? (proj.code || proj.name) : ""}</div>
        <div className="pt-row-tags"><span className="pt-chip" style={{ background: m.color + "22", color: m.color }}>{m.label}</span><span className="pt-pip" title={drill.t}><span style={{ background: drill.c }} />D</span><span className="pt-pip" title={cage.t}><span style={{ background: cage.c }} />C</span><span className="pt-pip" title={pour.t}><span style={{ background: pour.c }} />P</span></div>
      </div>
      <div className="pt-cell"><div className="pt-cell-k">Ø · grade</div><div className="pt-cell-v">{fmtInt(p.actualDia ?? p.dia)}<span className="pt-unit">mm</span> · {fmtInt(p.grade)}<span className="pt-unit">MPa</span></div></div>
      <div className="pt-cell"><div className="pt-cell-k">Reo / ligs</div><div className="pt-cell-v">{p.verticalReo || "—"}{p.verticalReoLower ? <span className="pt-theo"> · {p.verticalReoLower} btm</span> : null} <span className="pt-theo">/ {p.ligs || "—"}</span></div></div>
      <div className="pt-cell"><div className="pt-cell-k">Drilled</div><div className="pt-cell-v">{p.drillDate || "—"}</div></div>
      <div className="pt-cell"><div className="pt-cell-k">Pour · vol</div><div className="pt-cell-v">{p.pourDate || "—"}{num(p.concreteVol) != null ? ` · ${fmtN(p.concreteVol, 1)}m³` : ""}{theo ? <span className="pt-theo"> /{theo.toFixed(1)}</span> : null}</div></div>
      <div className="pt-cell pt-cell-flags">{fl.length === 0 ? <span className="pt-ok"><CheckCircle2 size={14} /> clear</span> : fl.map((x, i) => <span key={i} className={x.level === "warn" ? "pt-flag pt-flag-warn" : "pt-flag pt-flag-info"}>{x.level === "warn" ? <AlertTriangle size={12} /> : <Info size={12} />} {x.text}</span>)}</div>
      <button className="pt-iconbtn pt-row-edit" onClick={(e) => { e.stopPropagation(); onEdit(p); }}><Pencil size={15} /></button>
    </div>
  );
}

/* ───────────────────────── reconciliation ───────────────────────── */

const RENDER_CAP = 250;


function ChecklistReport({ piles, project, projects }) {
  const cellC = (label, val) => (<div className="itp-cell"><div className="itp-cell-k">{label}</div><div className="itp-cell-v">{(val === 0 || val) ? val : "—"}</div></div>);
  const tick = (ok) => ok ? <span className="ck-ok">✓</span> : <span className="ck-no">–</span>;
  return (
    <div className="pt-print-page">
      <div className="itp-head">
        <img className="itp-logo" src={LOGO_URI} alt="NCF" />
        <div className="itp-title"><div className="itp-t1">ITP Checklist</div><div className="itp-t2">Bored Piles — witness &amp; sign-off</div></div>
      </div>
      <div className="itp-meta">
        {cellC("Project", project ? `${project.code ? project.code + " — " : ""}${project.name}` : "Multiple jobs")}
        {cellC("Contract no.", project && project.contractNo)}
        {cellC("Piles", piles.length)}
        {cellC("Report date", new Date().toLocaleDateString())}
      </div>
      <table className="ck-table">
        <thead><tr><th>Pile</th><th>Ø/grade</th><th>Grid</th><th>Drilled</th><th>Cage</th><th>Poured</th><th>Vol m³</th><th>Docket</th><th>QA</th><th>Sign</th></tr></thead>
        <tbody>
          {piles.map((p) => {
            const hp = getHp(p), proj = projects.find((x) => x.id === p.projectId);
            return (
              <tr key={p.id}>
                <td className="ck-ref">{p.pileRef}{!project && proj ? <span className="ck-job"> · {proj.code || ""}</span> : null}</td>
                <td>{p.dia || "—"}/{p.grade || "—"}</td>
                <td>{p.gridRef || "—"}</td>
                <td>{p.drillDate || "—"} {tick(hp.drill.released)}</td>
                <td>{p.cageStatus === "Installed" ? "In " : ""}{tick(hp.cage.released)}</td>
                <td>{p.pourDate || "—"} {tick(hp.pour.released)}</td>
                <td>{num(p.concreteVol) != null ? p.concreteVol : "—"}</td>
                <td>{p.concreteDocket || "—"}</td>
                <td>{p.qaStatus === "Signed off" ? tick(true) : "—"}</td>
                <td className="ck-sign"></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="itp-sign" style={{ marginTop: 18 }}>
        <div className="itp-sign-box"><div className="itp-sign-line"></div>Compiled by / date</div>
        <div className="itp-sign-box"><div className="itp-sign-line"></div>Approved by / date</div>
      </div>
      <div className="itp-foot">NCF — Build with Confidence · ncf.group · ITP checklist · {piles.length} pile(s)</div>
    </div>
  );
}

/* ───────────────────────── app ───────────────────────── */
export default function PileTracker() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [piles, setPiles] = useState([]);
  const [register, setRegister] = useState([]);
  const [view, setView] = useState("tracker");
  const [active, setActive] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showProject, setShowProject] = useState(false);
  const [editingReg, setEditingReg] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [banner, setBanner] = useState(null);
  const [printData, setPrintData] = useState(null);
  const BASE_API= import.meta.env.VITE_API_BASE_URL

  useEffect(() => { 
    // (async () => {

    // }
    // )();
    getProjects();
  }, []);


  const getProjects= async()=>{
    try{
      const res= await fetch(`${BASE_API}/project/getProjects`);
      const data= await res.json();
      // setProjects((await getKey(PROJECTS_KEY)) || []);
      console.log(data.message)
      setProjects(data.message); 
      // setPiles((await getKey(PILES_KEY)) || []); 
      // setRegister((await getKey(REGISTER_KEY)) || []); 
      setLoading(false);       
    }catch(err){
      alert(err);
    }

  }

  useEffect(() => {
    if (!printData) return;
    const done = () => { window.removeEventListener("afterprint", done); setPrintData(null); };
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => { try { window.print(); } catch (e) {} }, 150);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, [printData]);

  const openItp = async (list) => {
    if (!list || !list.length) return;
    const photoMap = {};
    for (const p of list) {
      photoMap[p.id || "tmp"] = { drill: await getKey(photoKey(p.id, "drill")), cage: await getKey(photoKey(p.id, "cage")), pour: await getKey(photoKey(p.id, "pour")) };
    }
    setPrintData({ mode: "full", piles: list, photos: photoMap });
  };

  const printOne = (pile, ph) => { 
    setPrintData({ mode: "full", piles: [pile], photos: { [pile.id || "tmp"]: ph } }); 
  };

  const openChecklist = (list) => { 
    if (!list || !list.length) 
    return; 
    const proj = active !== "all" ? projects.find((p) => p.id === active) : null; 
    setPrintData({ mode: "checklist", piles: list, project: proj }); 
  };

  const persistPiles = useCallback(async (next) => { 
    setPiles(next); 
    const ok = await setKey(PILES_KEY, next); 
    if (!ok) 
    setBanner("Couldn't save to shared storage — changes may not sync to teammates."); 
  }, []);

  const persistProjects = useCallback(async (next) => {
     setProjects(next); 
     await setKey(PROJECTS_KEY, next); 
    }, []);

  const persistRegister = useCallback(async (next) => { 
    setRegister(next); 
    await setKey(REGISTER_KEY, next); 
  }, []);

  const savePile = async (f, photos) => {
    const exists = piles.some((x) => x.id === f.id); 
    const id = f.id || uid();
    const hp = { 
      drill: { ...f.hp.drill }, 
      cage: { ...f.hp.cage }, 
      pour: { ...f.hp.pour } 
    };
    for (const k of ["drill", "cage", "pour"]) { 
      const data = photos[k]; 
      if (data) { 
        await setKey(photoKey(id, k), data); hp[k].hasPhoto = true; 
      } else { 
        await delKey(photoKey(id, k)); hp[k].hasPhoto = false; 
      } 
    }
    const rec = { ...f, id, hp,  photos};
    console.log(rec)
    try{
      const res= await fetch(`${BASE_API}/pile/savePile`,{
        method:"POST",
        headers:{
          'content-type' : 'application/json'
        },
        body:JSON.stringify(rec)
      })
      const data= await res.json();
      console.log(data);
    }catch(err){
      alert(err);
    }
    persistPiles(exists ? piles.map((x) => (x.id === id ? rec : x)) : [...piles, rec]); 
    setEditing(null);
  };

  const deletePile = async (id) => { 
    await delKey(photoKey(id, "drill")); 
    await delKey(photoKey(id, "cage")); 
    await delKey(photoKey(id, "pour")); 
    persistPiles(piles.filter((x) => x.id !== id)); 
    setEditing(null); 
  };

  const saveProject = async(f) => { 
    let proj;
    if (f.id) { 
      // persistProjects(projects.map((p) => (p.id === f.id ? { ...p, ...f } : p))); 
      proj=f;
    } 
    else { 
      proj = { ...f, id: uid() };
    } 
      ///////////////////////////
      setLoading(true);
      try {
        const res= await fetch(`${BASE_API}/project/saveProject`,{
            method:"POST",
            headers: { 
                "Content-Type": "application/json"
              },
            body: JSON.stringify(proj)
        })
        const data= await res.json();
        if(!data.success){
            alert(data.message);
            return;
        }
        persistProjects([...projects, proj]); 
        setActive(proj.id);
      } catch (error) {
          alert(error)
      }
      finally{
          setLoading(false);
      }      
      /////////////////////////////

    setShowProject(false); 
  };

  const saveReg = async(f) => {     
    const rec = { ...f, id: f.id || uid() }; 
    try{
      const res= await fetch(`${BASE_API}/register/saveReg`,{
          method:"POST",
          headers: { 
              "Content-Type": "application/json"
            },
          body: JSON.stringify(rec)
      })
      const data= await res.json();
      if(!data.success){
          alert(data.message);
          return;
      }
      const exists = register.some((x) => x.id === f.id); 
      persistRegister(exists ? register.map((x) => (x.id === rec.id ? rec : x)) : [...register, rec]); 
      setEditingReg(null);       
    }catch(err){
      alert(err);
    }
  };

  const deleteReg = (id) => { persistRegister(register.filter((x) => x.id !== id)); setEditingReg(null); };
  
  const doImport = (projectId, rows) => { 
    console.log(rows)
    persistRegister([...register, ...rows.map((r) => ({ ...r, id: uid(), projectId }))]); 
    setShowImport(false); 
  };
  
  const logFromRegister = (reg) =>
    setEditing({
      projectId: reg.projectId,
      id:reg.id,
      pileRef: reg.pileRef,
      dia: reg.dia,
      grade: reg.grade,
      verticalReo: reg.verticalReo,
      verticalReoLower: reg.verticalReoLower,
      ligs: reg.ligs,
      socket: reg.socket,
      cutoffRL: reg.cutoffRL,
      topSteelRL: reg.topSteelRL,
      gridRef: reg.gridRef,
      registerId:reg.id
    });  
  
  const loadSchedule = () => { 
    const { proj, register: rg } = seedSchedule(); 
    persistProjects([...projects, proj]); 
    persistRegister([...register, ...rg]); 
    setActive(proj.id); 
    setView("register"); 
  };

  const loadCPB = () => { 
    const { proj, register: rg } = seedCPB(); 
    persistProjects([...projects, proj]); 
    persistRegister([...register, ...rg]); 
    setActive(proj.id); 
    setView("register"); 
  };

  const scoped = useMemo(() => piles.filter((p) => active === "all" || p.projectId === active), [piles, active]);

  const visible = useMemo(() => {
    const qq = search.trim().toLowerCase();
    return scoped.filter((p) => stageFilter === "all" || computeStage(p) === stageFilter)
      .filter((p) => !qq || (String(p.pileRef) + " " + (p.verticalReo || "")).toLowerCase().includes(qq))
      .sort((a, b) => String(a.pileRef).localeCompare(String(b.pileRef), undefined, { numeric: true }));
  }, [scoped, stageFilter, search]);

  const stats = useMemo(() => {
    const counts = {}; let poured = 0, theoSum = 0, done = 0;
    scoped.forEach((p) => { const s = computeStage(p); counts[s] = (counts[s] || 0) + 1; if (s === "qa") done++; const v = num(p.concreteVol); if (v != null && (s === "poured" || s === "qa")) poured += v; const t = theoreticalVol(p); if (t != null && (s === "poured" || s === "qa")) theoSum += t; });
    const total = scoped.length;
    return { counts, total, poured, theoSum, pct: total ? Math.round((done / total) * 100) : 0, variance: theoSum ? Math.round(((poured - theoSum) / theoSum) * 100) : null };
  }, [scoped]);

  const exportCsv = () => {
    const cols = ["Pile Number", "Pile Dia(mm)", "Concrete Grade(Mpa)", "Vertical Reo", "Vertical Reo-Lower 2 M", "Ligs", "Socket", "Pile Cut off level RL", "Top of steel R.L", "Grid ref", "Stage", "Drill date", "Drilled depth(m)", "Driller/rig", "Actual Ø(mm)", "Drill HP", "Drill photo", "Cage", "Cage HP", "Cage photo", "Pour date", "Concrete vol(m³)", "Concrete docket", "Delivered grade", "Theo vol(m³)", "Pour HP", "Pour photo", "QA", "Inspector", "Notes", "Flags"];
    const esc = (v) => { 
      const s = v == null ? "" : String(v); 
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; 
    };
    const rows = visible.map((p) => {
      const theo = theoreticalVol(p), 
      hp = getHp(p); 
      return [
        p.pileRef, 
        p.dia, 
        p.grade, 
        p.verticalReo, 
        p.verticalReoLower, 
        p.ligs, 
        p.socket, 
        p.cutoffRL, 
        p.topSteelRL, 
        p.gridRef, 
        stageMeta(computeStage(p)).label, 
        p.drillDate, 
        p.actualDepth, 
        p.driller, 
        p.actualDia, 
        hp.drill.released ? "Released" : "Open", 
        hp.drill.hasPhoto ? "Yes" : "No", 
        p.cageStatus, hp.cage.released ? "Released" : "Open", 
        hp.cage.hasPhoto ? "Yes" : "No", 
        p.pourDate, 
        p.concreteVol, 
        p.concreteDocket, 
        p.deliveredGrade, 
        theo != null ? theo.toFixed(2) : "", hp.pour.released ? "Released" : "Open", 
        hp.pour.hasPhoto ? "Yes" : "No", p.qaStatus, 
        p.qaInspector, p.qaNotes, flagsFor(p).map((x) => x.text).join("; ")
      ].map(esc).join(","); });
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); 
    const a = document.createElement("a"); 
    a.href = URL.createObjectURL(blob); 
    a.download = `pile-tracker-${new Date().toISOString().slice(0, 10)}.csv`; 
    a.click(); 
    URL.revokeObjectURL(a.href);
  };

  const regCount = register.filter((r) => active === "all" || r.projectId === active).length;
  const visShown = visible.slice(0, RENDER_CAP);

  const loadRegister= async(projectId)=>{
    // return;
    try{
      const res= await fetch(`${BASE_API}/register/loadRegister/${projectId}`);
      const data = await res.json();
      console.log(data)
      setRegister(data.register);
      setPiles(data.piles)
      setActive(projectId)
    }catch(err){
      alert(err);
    }
  }

  return (
    <div className="pt-app">
      <style>{CSS}</style>
      <div className="pt-brandbar"><img src={LOGO_URI} alt="NCF — Build with Confidence" /></div>
      <header className="pt-header">
        <div className="pt-brand"><span className="pt-brand-mark"><HardHat size={18} /></span><div><div className="pt-brand-name">Pile Tracker</div><div className="pt-brand-sub">Drill · cage · pour · QA</div></div></div>
        <div className="pt-header-actions">
          {
            view === "tracker" ? (
            <>
              <button className="pt-btn pt-btn-ghost" onClick={() => openItp(visible)} disabled={!visible.length}>
                <Printer size={15} /> ITP sheets
              </button>
              <button className="pt-btn pt-btn-ghost" onClick={() => openChecklist(visible)} disabled={!visible.length}>
                <ListChecks size={15} /> ITP list
              </button>
              <button className="pt-btn pt-btn-ghost" onClick={exportCsv} disabled={!visible.length}>
                <Download size={15} /> Export CSV
              </button>
              <button className="pt-btn pt-btn-primary" onClick={() => setEditing({})} disabled={!projects.length}>
                <Plus size={16} /> Add pile
              </button>
            </>
            )
              : 
            (
              <>
                <button className="pt-btn pt-btn-ghost" onClick={() => setShowImport(true)} disabled={!projects.length}>
                  <Upload size={15} /> Import
                </button>
                <button className="pt-btn pt-btn-primary" onClick={() => setEditingReg({})} disabled={!projects.length}>
                  <Plus size={16} /> Add entry
                </button>
              </>
            )
          }
        </div>
      </header>
      {banner && <div className="pt-banner"><AlertTriangle size={15} /> {banner} <button onClick={() => setBanner(null)}><X size={14} /></button></div>}
      {!loading && projects.length > 0 && (
        <div className="pt-tabs">
          <button className={"pt-tab" + (view === "tracker" ? " is-active" : "")} onClick={() => setView("tracker")}><ListChecks size={15} /> Tracker</button>
          <button className={"pt-tab" + (view === "register" ? " is-active" : "")} onClick={() => setView("register")}><ClipboardList size={15} /> Register <span className="pt-tab-count">{regCount}</span></button>
        </div>
      )}
      {loading ? (<div className="pt-empty"><div className="pt-spinner" /> Loading the yard…</div>)
        : projects.length === 0 ? (
          <div className="pt-empty pt-empty-lg">
            <div className="pt-empty-glyph"><PileGlyph stage="poured" size={64} /></div>
            <h2>Start tracking your piles</h2>
            <p>Load your Rev 26 schedule to populate the register with all 1,300 piles, then log each one as it's drilled, caged, poured and signed off — with hold-point photos.</p>
            <div className="pt-empty-actions">
              <button className="pt-btn pt-btn-primary" onClick={loadSchedule}><
                Upload size={16} /> Load Rev 26 (1300)
              </button>
              <button className="pt-btn pt-btn-primary" onClick={loadCPB}>
                <Upload size={16} /> Load CPB job (123)
              </button>
              <button className="pt-btn pt-btn-ghost" onClick={() => setShowProject(true)}>
                <FolderPlus size={16} /> Add a blank job
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="pt-projects">              
              <button className={"pt-proj" + (active === "all" ? " is-active" : "")} onClick={() => setActive("all")}>
                <Building2 size={14} /> All jobs <span className="pt-proj-count">{view === "register" ? register.length : piles.length}</span>
              </button>
              {projects.map((p) => { 
                const c = (view === "register" ? register : piles).filter((x) => x.projectId === p.id).length; 
                return (
                  <button
                    key={p.id}
                    className={"pt-proj" + (active === p.id ? " is-active" : "")}
                    onClick={() => loadRegister(p.id)}
                  >
                    {p.code || p.name}
                    <span className="pt-proj-count">{c}</span>
                  </button>
                );
                })}                
              <button className="pt-proj pt-proj-add" onClick={() => setShowProject(true)}><Plus size={14} /> Job</button>
            {active !== "all" && <button className="pt-proj pt-proj-add" onClick={() => setShowProject(projects.find((p) => p.id === active))}><Pencil size={13} /> Edit</button>}
            </div>
            {view === "tracker" ? (
              <>
                <div className="pt-stats">
                  <Stat label="Piles logged" value={stats.total} sub={regCount ? `of ${regCount} in reg.` : undefined} />
                  <Stat label="Poured" value={(stats.counts.poured || 0) + (stats.counts.qa || 0)} sub={`of ${stats.total}`} />
                  <Stat label="QA complete" value={stats.pct + "%"} accent="#2E9E5B" />
                  <Stat label="Concrete poured" value={stats.poured.toFixed(1)} sub="m³ logged" accent="#E0871E" />
                  <Stat label="Vol vs theo" value={stats.variance == null ? "—" : (stats.variance >= 0 ? "+" : "") + stats.variance + "%"} sub={stats.theoSum ? `${stats.theoSum.toFixed(1)} m³ theo` : "no pours yet"} accent={stats.variance != null && stats.variance < -5 ? "#C5432B" : undefined} />
                </div>
                <StageBar counts={stats.counts} total={stats.total} />
                <div className="pt-controls">
                  <div className="pt-searchbox"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pile number or reo…" /></div>
                  <div className="pt-filters"><button className={"pt-pill" + (stageFilter === "all" ? " is-active" : "")} onClick={() => setStageFilter("all")}>All</button>{STAGES.map((s) => <button key={s.key} className={"pt-pill" + (stageFilter === s.key ? " is-active" : "")} onClick={() => setStageFilter(s.key)} style={stageFilter === s.key ? { borderColor: s.color, color: s.color } : undefined}><span className="pt-dot" style={{ background: s.color }} />{s.short}</button>)}</div>
                </div>
                <div className="pt-list">
                  {
                    visible.length === 0 ? (
                      <div className="pt-empty">
                        <MoreHorizontal size={20} />{scoped.length === 0 ? "No piles logged yet — log them from the Register tab, or add one here." : "No piles match these filters."}{scoped.length === 0 && <div className="pt-empty-actions" style={{ marginTop: 12 }}><button className="pt-btn pt-btn-ghost" onClick={() => setView("register")}><ClipboardList size={15} /> Go to Register</button><button className="pt-btn pt-btn-primary" onClick={() => setEditing({ projectId: active === "all" ? projects[0].id : active })}><Plus size={15} /> Add pile</button></div>}</div>
                  ) : (
                        <>
                          {
                            visShown.map((p) => 
                              <PileRow key={p.id} p={p} projects={projects} onEdit={(x) => setEditing(x)} />)
                          }
                          {
                            visible.length > RENDER_CAP && 
                              <div className="pt-recon-more">Showing {RENDER_CAP} of {visible.length} — search or filter to narrow.
                              </div>
                          }
                        </>
                      )
                  }
                </div>
              </>
            ) : (
              <RegisterView
                register={register}
                piles={piles}
                projects={projects}
                active={active}
                onAdd={() => setEditingReg({ projectId: active !== "all" ? active : projects[0]?.id })}
                onImport={() => setShowImport(true)}
                onLoadSchedule={loadSchedule}
                onLoadCPB={loadCPB}
                onEditEntry={(r) => setEditingReg(r)}
                onLog={logFromRegister}
                onEditPile={(p) => setEditing(p)}
              />              
            )}
          </>
        )}
        {editing && (
          <PileModal
            pile={editing.id ? editing : (editing.projectId ? editing : null)} 
            projects={projects} 
            defaultProject={active !== "all" ? active : undefined} 
            onSave={savePile} 
            onDelete={deletePile} 
            onPrint={printOne} 
            onClose={() => setEditing(null)} 
          />
        )}      
        {
        showProject && 
          <ProjectModal 
            project={typeof showProject === "object" ? showProject : null} 
            onSave={saveProject} 
            onLoadSchedule={() => { 
              loadSchedule(); 
              setShowProject(false); 
            }} 
            onLoadCPB={() => { 
              loadCPB(); 
              setShowProject(false); 
            }} 
            onClose={() => setShowProject(false)} 
          />
        }
      {editingReg && 
        <RegisterEntryModal 
        entry={editingReg.id ? editingReg : null} 
        projects={projects} 
        defaultProject={editingReg.projectId || (active !== "all" ? active : undefined)} 
        onSave={saveReg} 
        onDelete={deleteReg} 
        onClose={() => setEditingReg(null)} />
      }
      {showImport && 
        <ImportModal 
        projects={projects} 
        defaultProject={active !== "all" ? active : undefined} 
        onImport={doImport} 
        onClose={() => setShowImport(false)} />
      }
      {
        printData && (          
          <div className="pt-print">
            <p>{JSON.stringify(printData)}</p>
            {               
              printData.mode === "checklist" ? 
              <ChecklistReport piles={printData.piles} project={printData.project} projects={projects} /> 
              : 
              printData.piles.map((p) => <ItpReport key={p.id || "tmp"} pile={p} project={projects.find((x) => x.id === p.projectId)} photos={printData.photos[p.id || "tmp"]} />)}
          </div>
        )
      }
    </div>
  );
}

const CSS = `
.pt-app{--bg:#E9ECF0;--surface:#fff;--ink:#161B22;--muted:#697482;--line:#D8DDE4;--steel:#26384F;--hivis:#F2A20C;--hivis-ink:#3a2600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);min-height:100%;padding:18px;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
.pt-app *{box-sizing:border-box;}
.pt-brandbar{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;}
.pt-brandbar img{height:54px;width:auto;max-width:100%;display:block;}
@media(max-width:560px){.pt-brandbar{padding:8px 10px;}.pt-brandbar img{height:40px;}}
.pt-mono,.pt-cell-v,.pt-stat-val,.pt-row-ref,.pt-proj-count,.pt-recon-ref{font-variant-numeric:tabular-nums;}
.pt-small{font-size:12px;}
.pt-muted{color:var(--muted);}
.pt-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.pt-brand{display:flex;align-items:center;gap:11px;}
.pt-brand-mark{width:38px;height:38px;border-radius:10px;background:var(--steel);color:var(--hivis);display:flex;align-items:center;justify-content:center;}
.pt-brand-name{font-size:18px;font-weight:800;letter-spacing:-.02em;}
.pt-brand-sub{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-top:1px;}
.pt-header-actions{display:flex;gap:8px;}
.pt-btn{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:9px;font-size:13.5px;font-weight:650;padding:9px 14px;cursor:pointer;font-family:inherit;transition:transform .04s,filter .12s,background .12s;white-space:nowrap;}
.pt-btn:active{transform:translateY(1px);}
.pt-btn:disabled{opacity:.45;cursor:not-allowed;}
.pt-btn-sm{padding:6px 10px;font-size:12.5px;}
.pt-btn-primary{background:var(--hivis);color:var(--hivis-ink);}
.pt-btn-primary:hover:not(:disabled){filter:brightness(1.05);}
.pt-btn-ghost{background:var(--surface);color:var(--ink);border:1px solid var(--line);}
.pt-btn-ghost:hover:not(:disabled){background:#f3f5f8;}
.pt-btn-danger{background:#fbeae7;color:#C5432B;}
.pt-btn-danger:hover{background:#f7ddd8;}
.pt-iconbtn{background:transparent;border:none;color:var(--muted);cursor:pointer;padding:6px;border-radius:7px;display:flex;align-items:center;}
.pt-iconbtn:hover{background:#00000010;color:var(--ink);}
.pt-banner{display:flex;align-items:center;gap:9px;background:#fff4e0;border:1px solid #f3d9a3;color:#7a5200;padding:9px 13px;border-radius:9px;font-size:13px;font-weight:550;margin-bottom:12px;}
.pt-banner button{margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;display:flex;}
.pt-tabs{display:flex;gap:4px;background:#dde2e8;padding:4px;border-radius:11px;width:fit-content;margin-bottom:14px;}
.pt-tab{display:inline-flex;align-items:center;gap:7px;background:transparent;border:none;border-radius:8px;padding:8px 16px;font-size:13.5px;font-weight:700;color:var(--muted);cursor:pointer;font-family:inherit;}
.pt-tab.is-active{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px #0000001a;}
.pt-tab-count{font-size:11px;background:#00000012;border-radius:999px;padding:1px 7px;font-weight:700;}
.pt-tab.is-active .pt-tab-count{background:var(--hivis);color:var(--hivis-ink);}
.pt-projects{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;margin-bottom:14px;-webkit-overflow-scrolling:touch;}
.pt-proj{display:inline-flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--line);color:var(--ink);border-radius:999px;padding:7px 13px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap;font-family:inherit;}
.pt-proj:hover{background:#f3f5f8;}
.pt-proj.is-active{background:var(--steel);color:#fff;border-color:var(--steel);}
.pt-proj-count{font-size:11px;background:#00000018;border-radius:999px;padding:1px 7px;font-weight:700;}
.pt-proj.is-active .pt-proj-count{background:#ffffff2e;}
.pt-proj-add{border-style:dashed;color:var(--muted);}
.pt-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px;}
.pt-stat{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:13px 15px;}
.pt-stat-val{font-size:25px;font-weight:800;letter-spacing:-.03em;line-height:1;}
.pt-stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-top:7px;}
.pt-stat-sub{font-size:11.5px;color:var(--muted);margin-top:2px;}
.pt-stagebar{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:13px 15px;margin-bottom:14px;}
.pt-stagebar-track{display:flex;height:11px;border-radius:6px;overflow:hidden;background:#eef1f4;gap:1.5px;}
.pt-stagebar-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:11px;font-size:12px;color:var(--muted);}
.pt-legend-item{display:inline-flex;align-items:center;gap:6px;}
.pt-legend-item b{color:var(--ink);}
.pt-dot{width:9px;height:9px;border-radius:3px;display:inline-block;flex-shrink:0;}
.pt-controls{display:flex;gap:10px;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;}
.pt-searchbox{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:8px 12px;color:var(--muted);flex:1;min-width:200px;}
.pt-searchbox input{border:none;outline:none;background:none;font-size:13.5px;color:var(--ink);width:100%;font-family:inherit;}
.pt-filters{display:flex;gap:6px;flex-wrap:wrap;}
.pt-pill{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:650;color:var(--muted);cursor:pointer;font-family:inherit;}
.pt-pill.is-active{color:var(--ink);border-color:var(--ink);background:#fff;}
.pt-list{display:flex;flex-direction:column;gap:8px;}
.pt-row{display:grid;grid-template-columns:auto 1.5fr 1fr 1.2fr .9fr 1.5fr 1.8fr auto;gap:13px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;transition:border-color .12s,box-shadow .12s;}
.pt-row:hover{border-color:#b9c2cd;box-shadow:0 2px 10px #1b2a3c12;}
.pt-row-glyph{display:flex;align-items:center;}
.pt-row-id{display:flex;flex-direction:column;gap:3px;min-width:0;}
.pt-row-ref{font-size:15px;font-weight:750;letter-spacing:-.01em;}
.pt-row-sub{font-size:11.5px;color:var(--muted);}
.pt-row-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;}
.pt-chip{font-size:10.5px;font-weight:750;padding:2px 8px;border-radius:999px;}
.pt-pip{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:800;color:var(--muted);letter-spacing:.03em;}
.pt-pip span{width:8px;height:8px;border-radius:50%;display:inline-block;}
.pt-cell{min-width:0;}
.pt-cell-k{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:3px;}
.pt-cell-v{font-size:13px;font-weight:600;}
.pt-unit{font-size:10.5px;color:var(--muted);margin-left:1px;}
.pt-theo{color:var(--muted);font-weight:500;}
.pt-cell-flags{display:flex;flex-direction:column;gap:4px;align-items:flex-start;}
.pt-ok{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#2E9E5B;font-weight:600;}
.pt-flag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;line-height:1.3;}
.pt-flag-warn{background:#fbeae7;color:#C5432B;}
.pt-flag-info{background:#eef2f7;color:#4a6a8a;}
.pt-row-edit{justify-self:end;}
.pt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;color:var(--muted);background:var(--surface);border:1px dashed var(--line);border-radius:14px;padding:38px 20px;font-size:14px;}
.pt-empty-lg{padding:54px 24px;}
.pt-empty-lg h2{color:var(--ink);font-size:21px;font-weight:800;margin:6px 0 0;letter-spacing:-.02em;}
.pt-empty-lg p{max-width:460px;margin:0;line-height:1.5;}
.pt-empty-glyph{margin-bottom:4px;}
.pt-empty-actions{display:flex;gap:9px;margin-top:8px;flex-wrap:wrap;justify-content:center;}
.pt-spinner{width:22px;height:22px;border:3px solid var(--line);border-top-color:var(--steel);border-radius:50%;animation:pt-spin .8s linear infinite;}
.pt-spinner-sm{width:14px;height:14px;border-width:2px;}
@keyframes pt-spin{to{transform:rotate(360deg);}}
.pt-overlay{position:fixed;inset:0;background:#0c121bbb;backdrop-filter:blur(2px);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;z-index:50;overflow-y:auto;}
.pt-modal{background:var(--surface);border-radius:16px;width:100%;max-width:700px;box-shadow:0 24px 60px #0008;overflow:hidden;animation:pt-pop .15s ease;}
.pt-modal-sm{max-width:480px;}
@keyframes pt-pop{from{transform:translateY(8px);opacity:0;}}
.pt-modal-head{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--line);}
.pt-eyebrow{font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--hivis);font-weight:800;}
.pt-modal-title{font-size:18px;font-weight:800;letter-spacing:-.02em;margin-top:2px;}
.pt-modal-body{padding:8px 20px 4px;max-height:64vh;overflow-y:auto;}
.pt-fset{padding:12px 0;border-bottom:1px solid #eef1f4;}
.pt-fset:last-child{border-bottom:none;}
.pt-fset-label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--steel);font-weight:800;margin-bottom:11px;}
.pt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;}
.pt-field{display:flex;flex-direction:column;gap:5px;min-width:0;}
.pt-field>span{font-size:11.5px;color:var(--muted);font-weight:650;}
.pt-field input,.pt-field select,.pt-field textarea{border:1px solid var(--line);border-radius:8px;padding:9px 11px;font-size:13.5px;font-family:inherit;color:var(--ink);background:#fff;outline:none;width:100%;}
.pt-field input:focus,.pt-field select:focus,.pt-field textarea:focus{border-color:var(--steel);box-shadow:0 0 0 3px #26384f1f;}
.pt-field textarea{resize:vertical;}
.pt-col2{grid-column:span 2;}
.pt-col3{grid-column:span 3;}
.pt-hint{font-size:12.5px;color:var(--muted);background:#f4f6f9;border-radius:8px;padding:8px 11px;}
.pt-hint b{color:var(--ink);}
.pt-hp{margin-top:12px;border:1px solid var(--line);border-radius:11px;padding:13px;background:#fbfcfd;}
.pt-hp.is-released{border-color:#bfe3cd;background:#f3faf5;}
.pt-hp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px;}
.pt-hp-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:750;}
.pt-hp-sub{font-size:11.5px;color:var(--muted);margin-top:2px;}
.pt-hp-body{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;}
.pt-hp-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pt-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;}
.pt-switch input{position:absolute;opacity:0;width:0;height:0;}
.pt-switch-track{width:38px;height:22px;border-radius:999px;background:#cdd4dc;position:relative;transition:background .15s;}
.pt-switch-thumb{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s;box-shadow:0 1px 2px #0003;}
.pt-switch input:checked+.pt-switch-track{background:#2E9E5B;}
.pt-switch input:checked+.pt-switch-track .pt-switch-thumb{transform:translateX(16px);}
.pt-switch-label{font-size:12px;font-weight:700;color:var(--muted);}
.pt-photo{position:relative;width:84px;height:84px;border-radius:10px;overflow:hidden;border:1px solid var(--line);flex-shrink:0;}
.pt-photo img{width:100%;height:100%;object-fit:cover;display:block;}
.pt-photo-x{position:absolute;top:4px;right:4px;background:#000000a8;border:none;color:#fff;border-radius:6px;padding:3px;cursor:pointer;display:flex;}
.pt-photo-add{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:84px;height:84px;border-radius:10px;border:1.5px dashed #b9c2cd;color:var(--muted);font-size:11px;font-weight:650;cursor:pointer;background:#fff;flex-shrink:0;text-align:center;}
.pt-photo-add:hover{border-color:var(--steel);color:var(--steel);}
.pt-modal-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 20px;border-top:1px solid var(--line);background:#fafbfc;}
.pt-foot-right{display:flex;gap:9px;margin-left:auto;}
.pt-import-ta{width:100%;border:1px solid var(--line);border-radius:9px;padding:11px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;outline:none;resize:vertical;}
.pt-import-ta:focus{border-color:var(--steel);box-shadow:0 0 0 3px #26384f1f;}
.pt-import-count{margin-top:8px;font-size:12.5px;font-weight:700;color:var(--steel);}
.pt-recon-summary{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:14px;}
.pt-recon-headline{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:750;margin-bottom:12px;}
.pt-recon-stats{display:flex;gap:8px;flex-wrap:wrap;}
.pt-recon-stat{display:inline-flex;align-items:center;gap:7px;background:#f4f6f9;border:1px solid transparent;border-radius:9px;padding:7px 12px;font-size:12.5px;color:var(--muted);font-weight:600;cursor:pointer;font-family:inherit;}
.pt-recon-stat b{color:var(--ink);font-variant-numeric:tabular-nums;}
.pt-recon-stat.is-active{border-color:var(--steel);background:#fff;}
.pt-recon-list{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.pt-recon-row{display:grid;grid-template-columns:.7fr .8fr 1.4fr 1.2fr 1.5fr auto;gap:12px;align-items:center;padding:11px 16px;border-bottom:1px solid #eef1f4;font-size:13px;}
.pt-recon-row:last-child{border-bottom:none;}
.pt-recon-head{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800;background:#fafbfc;}
.pt-recon-ref{font-weight:750;font-size:14px;}
.pt-recon-badge{font-size:11px;font-weight:750;padding:3px 9px;border-radius:999px;}
.pt-recon-detail{display:block;font-size:11px;color:#C5432B;margin-top:4px;font-variant-numeric:tabular-nums;}
.pt-recon-act{display:flex;gap:4px;justify-content:flex-end;align-items:center;}
.pt-recon-more{padding:12px 16px;font-size:12.5px;color:var(--muted);text-align:center;font-weight:600;}
.pt-loadrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #eef1f4;}
.pt-loadrow-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800;}
.pt-print{display:none;}
.itp-head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:3px solid #26384F;padding-bottom:10px;margin-bottom:12px;}
.itp-logo{height:46px;width:auto;}
.itp-title{text-align:right;}
.itp-t1{font-size:18px;font-weight:800;color:#161B22;text-transform:uppercase;letter-spacing:-.01em;}
.itp-t2{font-size:12px;color:#697482;font-weight:600;letter-spacing:.05em;}
.itp-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:6px;}
.itp-sec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#26384F;background:#eef1f4;padding:5px 9px;border-radius:4px;margin:14px 0 8px;}
.itp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.itp-cell{border:1px solid #D8DDE4;border-radius:5px;padding:6px 9px;}
.itp-cell-k{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:#697482;font-weight:700;}
.itp-cell-v{font-size:12.5px;font-weight:600;color:#161B22;margin-top:2px;word-break:break-word;}
.itp-hp{width:100%;border-collapse:collapse;}
.itp-hp th,.itp-hp td{border:1px solid #D8DDE4;padding:6px 8px;font-size:11px;text-align:left;vertical-align:middle;}
.itp-hp th{background:#26384F;color:#fff;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;}
.itp-pillbox{font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;}
.itp-pillbox.ok{background:#e3f3ea;color:#2E9E5B;}
.itp-pillbox.open{background:#f0f2f5;color:#697482;}
.itp-ph img{height:54px;width:auto;border-radius:3px;display:block;}
.itp-na{color:#b0b7c0;font-size:10px;font-style:italic;}
.itp-notes{font-size:11.5px;margin-top:8px;color:#161B22;}
.itp-flags{margin:4px 0 0;padding-left:18px;font-size:11.5px;color:#C5432B;}
.itp-sign{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:24px;}
.itp-sign-box{font-size:10px;color:#697482;text-transform:uppercase;letter-spacing:.05em;}
.itp-sign-line{border-bottom:1px solid #161B22;height:34px;margin-bottom:5px;}
.itp-foot{margin-top:14px;border-top:1px solid #D8DDE4;padding-top:7px;font-size:9px;color:#94A0AE;text-align:center;}
.ck-table{width:100%;border-collapse:collapse;font-size:9px;margin-top:2px;}
.ck-table th,.ck-table td{border:1px solid #D8DDE4;padding:4px 5px;text-align:left;vertical-align:middle;}
.ck-table th{background:#26384F;color:#fff;font-size:8px;text-transform:uppercase;letter-spacing:.03em;}
.ck-ref{font-weight:700;}
.ck-job{color:#697482;font-weight:600;}
.ck-ok{color:#2E9E5B;font-weight:800;}
.ck-no{color:#b0b7c0;}
.ck-sign{width:58px;}
.ck-table thead{display:table-header-group;}
@media print{
  .pt-app{background:#fff !important;padding:0 !important;}
  .pt-app > *:not(.pt-print){display:none !important;}
  .pt-print{display:block !important;}
  .pt-print-page{page-break-after:always;}
  .pt-print-page:last-child{page-break-after:auto;}
  @page{size:A4;margin:12mm;}
}
@media(max-width:900px){
  .pt-stats{grid-template-columns:repeat(2,1fr);}
  .pt-row{grid-template-columns:auto 1fr auto;grid-template-areas:"glyph id edit" "cells cells cells" "flags flags flags";row-gap:10px;}
  .pt-row-glyph{grid-area:glyph;}.pt-row-id{grid-area:id;}.pt-row-edit{grid-area:edit;}
  .pt-row .pt-cell:nth-of-type(2){grid-area:cells;display:flex;gap:16px;flex-wrap:wrap;}
  .pt-cell{display:inline-flex;flex-direction:column;}
  .pt-cell-flags{grid-area:flags;flex-direction:row;flex-wrap:wrap;}
  .pt-grid{grid-template-columns:repeat(2,1fr);}
  .pt-col2,.pt-col3{grid-column:span 2;}
  .pt-hp-body{grid-template-columns:1fr;}
  .pt-recon-row{grid-template-columns:1fr auto;grid-template-areas:"ref act" "meta meta" "status status";row-gap:8px;}
  .pt-recon-row>div:nth-child(1){grid-area:ref;}
  .pt-recon-row>div:nth-child(2),.pt-recon-row>div:nth-child(3),.pt-recon-row>div:nth-child(4){grid-area:meta;display:inline-flex;gap:10px;}
  .pt-recon-row>div:nth-child(5){grid-area:status;}
  .pt-recon-act{grid-area:act;}
  .pt-recon-head{display:none;}
}
@media(max-width:560px){.pt-app{padding:12px;}.pt-header-actions{width:100%;}.pt-header-actions .pt-btn{flex:1;justify-content:center;}}
`;
