import React, { useState, useEffect, useMemo, useCallback } from "react";
import {Link} from 'react-router-dom'
import {
  Plus, Search, Download, X, Trash2, Pencil, FolderPlus, AlertTriangle,
  CheckCircle2, HardHat, Building2, MoreHorizontal, Info, Camera, Upload,
  ClipboardCheck, ListChecks, ShieldCheck, ClipboardList, Printer,
  DownloadIcon
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


  const downloadAllInfo= async()=>{
    try{
      await fetch(`${BASE_API}/project/getProjects`);
      await fetch(`${BASE_API}/register/loadRegister/all`);
    }catch(err){
      alert(err);
    }
  }

  const getProjects= async()=>{
    try{
      const res= await fetch(`${BASE_API}/project/getProjects`);
      const data= await res.json();
      // setProjects((await getKey(PROJECTS_KEY)) || []);
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
    const done = () => { 
      window.removeEventListener("afterprint", done); 
      setPrintData(null); 
    };
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => { try { window.print(); } catch (e) {} }, 150);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, [printData]);

  const openItp = async (list) => {
    console.log(list)
    if (!list || !list.length) return;
    const photoMap = {};
    for (const p of list) {
      photoMap[p.id || "tmp"] = { 
        drill: await getKey(photoKey(p.id, "drill")) || p.photos.drill, 
        cage: await getKey(photoKey(p.id, "cage")) || p.photos.cage, 
        pour: await getKey(photoKey(p.id, "pour")) || p.photos.pour 
      };
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

  const savePile = async (f, photos, section = "all") => {
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
    let payload = {
      id,
      registerId:rec.registerId,
      projectId: rec.projectId,
      pileRef: rec.pileRef        
    };

    switch (section) {
      case "register":
        payload = {
          ...payload,
          dia: rec.dia,
          grade: rec.grade,
          verticalReo: rec.verticalReo,
          verticalReoLower: rec.verticalReoLower,
          ligs: rec.ligs,
          socket: rec.socket,
          cutoffRL: rec.cutoffRL,
          topSteelRL: rec.topSteelRL,
          gridRef: rec.gridRef,
          cancelled:rec.cancelled
        };
        break;

      case "drill":
        payload = {
          ...payload,
          drillDate: rec.drillDate,
          driller: rec.driller,
          actualDepth: rec.actualDepth,
          actualDia: rec.actualDia,
          hp: {
            drill:rec.hp.drill
          },
          photos: {
            drill:rec.photos.drill
          }
        };
        break;

      case "cage":
        payload = {
          ...payload,
          cageStatus: rec.cageStatus,
          hp: {
            cage:rec.hp.cage
          },
          photos: {
            cage:rec.photos.cage
          }
        };
        break;

      case "pour":
        payload = {
          ...payload,
          pourDate: rec.pourDate,
          concreteVol: rec.concreteVol,
          deliveredGrade: rec.deliveredGrade,
          concreteDocket: rec.concreteDocket,
          hp: {
            pour:rec.hp.pour
          },
          photos: {
            pour:rec.photos.pour
          }
        };
        break;

      case "qa":
        payload = {
          ...payload,
          qaStatus: rec.qaStatus,
          qaInspector: rec.qaInspector,
          qaNotes: rec.qaNotes
        };
        break;

      default:
        payload = rec;
    }    
    console.log(payload)    
    // return;
    try{
      const res= await fetch(`${BASE_API}/pile/savePile`,{
        method:"POST",
        headers:{
          'content-type' : 'application/json'
        },
        body:JSON.stringify(payload)
      })
      const data= await res.json();
      console.log(data);
    }catch(err){
      alert(err);
    }
    persistPiles(exists ? piles.map((x) => (x.id === id ? rec : x)) : [...piles, rec]); 
    setEditing(null);
  };

  const deletePile = async (id,projectId, pileRef) => { 
    try {
      const res= await fetch(`${BASE_API}/pile/deletePile/${id}`,{
          method:"DELETE"
      });
      const data= await res.json();
      if(!data.success){
          alert(data.message);
          return;
      }
      await delKey(photoKey(id, "drill")); 
      await delKey(photoKey(id, "cage")); 
      await delKey(photoKey(id, "pour")); 
      persistPiles(piles.filter((x) => x.id !== id)); 
      setEditing(null);
    } catch (error) {
        alert(error)
    }     
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

  const  saveReg = async(f, isNew) => {     
    const rec = { ...f, id: f.id || uid() };     
    if(isNew){
      console.log(isNew, f.projectId, f.pileRef)
      const regExists = register.some((x) => x.projectId === f.projectId && x.pileRef === f.pileRef); 
      if(regExists) {
        alert("Register Already Exists");
        return;
      }
    }
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

  const deleteReg = async(id) => { 

    try {
      const res= await fetch(`${BASE_API}/register/deleteReg/${id}`,{
          method:"DELETE"
      });
      const data= await res.json();
      if(!data.success){
          alert(data.message);
          return;
      }  
      persistRegister(register.filter((x) => x.id !== id)); 
      setEditingReg(null);           
    } catch (err) {
      alert(err)
    }

  };
  
  const doImport = async(projectId, rows) => {     
    const bulkImport=rows.map((r) => ({ ...r, id: uid(), projectId }));
    console.log(bulkImport)
    try{
      const res= await fetch(`${BASE_API}/register/bulkImport`,{
        method:"POST",
        headers:{
          'content-type' : 'application/json'
        },
        body:JSON.stringify(bulkImport)
      })
      const data= await res.json();
      if(!data.success){
        alert(data.message);
        return;
      }
      persistRegister([...register, ...rows.map((r) => ({ ...r, id: uid(), projectId }))]);
      setShowImport(false); 
    }catch(err){
      alert(err);
    }
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
      registerId:reg.id,
      cancelled: reg.cancelled
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
      setRegister(data.register);
      setPiles(data.piles)
      setActive(projectId)
    }catch(err){
      alert(err);
    }
  }

  return (
    <div className="pt-app">
      <div className="pt-brandbar">
        <img src={LOGO_URI} alt="NCF — Build with Confidence" />
      </div>
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
              <button className="pt-btn pt-btn-primary" onClick={() => downloadAllInfo()}>
                <DownloadIcon size={16} /> Download
              </button>  
              <Link to='/administration/createUser' className="pt-btn pt-btn-primary">
                <DownloadIcon size={16} /> Create User
              </Link>                            
              <Link to="/login" className="pt-btn pt-btn-primary">
                <Plus size={16} /> Login
              </Link> 
                           
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
            {               
              printData.mode === "checklist" ? 
              <ChecklistReport piles={printData.piles} project={printData.project} projects={projects} /> 
              : 
              printData.piles.map((p) => 
                <ItpReport 
                  key={p.id || "tmp"} 
                  pile={p} 
                  project={projects.find((x) => x.id === p.projectId)} 
                  photos={printData.photos[p.id || "tmp"]}
                  printData = {printData} 
                />)
            }
          </div>
        )
      }
    </div>
  );
}

