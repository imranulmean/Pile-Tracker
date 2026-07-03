import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, Download, X, Trash2, Pencil, FolderPlus, AlertTriangle,
  CheckCircle2, HardHat, Building2, MoreHorizontal, Info, Camera, Upload,
  ClipboardCheck, ListChecks, ShieldCheck, ClipboardList, Printer
} from "lucide-react";

import { FIELD_DEFAULTS, fmtN, getHp, getKey, num, photoKey, theoreticalVol } from "../../pile-tracker-fns";

/* ───────────────────────── photo + hold point ───────────────────────── */
function PhotoBox({ data, onPick, onRemove, label }) {
  
    const [busy, setBusy] = useState(false);

    function fileToDataUrl(file, maxDim = 1280, quality = 0.7) {
      return new Promise((resolve, reject) => {
        const img = new Image(); 
        const url = URL.createObjectURL(file);
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) { 
            height = Math.round(height * maxDim / width); width = maxDim; 
          }
          else if (height > maxDim) { 
            width = Math.round(width * maxDim / height); height = maxDim; 
          }
          const c = document.createElement("canvas"); 
          c.width = width; 
          c.height = height;
          c.getContext("2d").drawImage(img, 0, 0, width, height); 
          // URL.revokeObjectURL(url);
          try { 
            resolve(c.toDataURL("image/jpeg", quality)); 
          } catch (e) { 
            reject(e); 
          }
        };
        img.onerror = reject; 
        img.src = url;
      });
    }

    const handle = async (e) => { 
      const file = e.target.files && e.target.files[0]; 
      if (!file) return; 
      setBusy(true); 
      try {
        const dataUrl = await fileToDataUrl(file);
        // console.log(dataUrl);
        onPick(dataUrl);        
      } catch (err) {
        console.error("fileToDataUrl failed:", err);
      } 
      setBusy(false); 
      e.target.value = ""; 
    };
    if (data) return (
      <div className="pt-photo">
        <img src={data} alt={label} />
        <button className="pt-photo-x" onClick={onRemove} type="button"><X size={13} /></button>
      </div>
    );
    return (
      <label className="pt-photo-add">
        <input type="file" accept="image/*" capture="environment" onChange={handle} style={{ display: "none" }} />
        {busy ? 
          <span className="pt-spinner pt-spinner-sm" /> : <Camera size={16} />
        }
        {busy ? "Adding…" : "Add photo"}
      </label>
    );
  }
  function HoldPoint({ title, sub, hp, photo, onChange, onPhoto, onPhotoRemove }) {
    return (
      <div className={"pt-hp" + (hp.released ? " is-released" : "")}>
        <div className="pt-hp-head">
          <div><div className="pt-hp-title"><ShieldCheck size={14} /> {title}</div><div className="pt-hp-sub">{sub}</div></div>
          <label className="pt-switch">
            <input type="checkbox" checked={!!hp.released} onChange={(e) => onChange({ ...hp, released: e.target.checked })} /><span className="pt-switch-track"><span className="pt-switch-thumb" /></span><span className="pt-switch-label">{hp.released ? "Released" : "Open"}</span></label>
        </div>
        <div className="pt-hp-body">
          <div className="pt-hp-fields">
            <label className="pt-field"><span>Inspector</span><input value={hp.inspector} onChange={(e) => onChange({ ...hp, inspector: e.target.value })} placeholder="Name" /></label>
            <label className="pt-field"><span>Date</span><input type="date" value={hp.date} onChange={(e) => onChange({ ...hp, date: e.target.value })} /></label>
          </div>
          <PhotoBox data={photo} onPick={onPhoto} onRemove={onPhotoRemove} label={title} />
        </div>
      </div>
    );
  }

  
export default function PileModal({ pile, projects, defaultProject, onSave, onDelete, onPrint, onClose }) {
    console.log(pile)
    const [f, setF] = useState(() => ({ ...FIELD_DEFAULTS, projectId: defaultProject || projects[0]?.id || "", ...pile, hp: getHp(pile || {}) }));
    const [photos, setPhotos] = useState({ drill: null, cage: null, pour: null });
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
    const setHp = (which) => (val) => setF((p) => ({ ...p, hp: { ...p.hp, [which]: val } }));
    const isNew = !pile?.id, theo = theoreticalVol(f); 


    useEffect(() => {
      let alive = true;
      (async () => { if (pile?.id) { 
        const dr = await getKey(photoKey(pile.id, "drill")); 
        const c = await getKey(photoKey(pile.id, "cage")); 
        const po = await getKey(photoKey(pile.id, "pour")); 
        if (alive) 
          setPhotos({ drill: dr || null, cage: c || null, pour: po || null }); } })();
      return () => { alive = false; };
    }, [pile?.id]);
    return (
      <div className="pt-overlay" onMouseDown={onClose}>
        <div className="pt-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="pt-modal-head">
            <div>
              <div className="pt-eyebrow">
                {isNew ? "New pile" : "Edit pile"}
              </div>
              <div className="pt-modal-title">Pile {f.pileRef || "—"}</div></div>
              <button className="pt-iconbtn" onClick={onClose}><X size={18} /></button>
            </div>
          <div className="pt-modal-body">
            <section className="pt-fset">
              <div className="pt-fset-label">Schedule — design</div>
              <div className="pt-grid">
                <label className="pt-field"><span>Job</span><select value={f.projectId} onChange={set("projectId")}>{projects.map((p) => <option key={p.id} value={p.id}>{p.code ? p.code + " — " : ""}{p.name}</option>)}</select></label>
                <label className="pt-field"><span>Pile number</span><input value={f.pileRef} onChange={set("pileRef")} placeholder="1" /></label>
                <label className="pt-field"><span>Grid ref</span><input value={f.gridRef} onChange={set("gridRef")} placeholder="e.g. C-7" /></label>
                <label className="pt-field"><span>Pile Ø (mm)</span><input inputMode="decimal" value={f.dia} onChange={set("dia")} placeholder="750" /></label>
                <label className="pt-field"><span>Conc. grade (MPa)</span><input inputMode="decimal" value={f.grade} onChange={set("grade")} placeholder="50" /></label>
                <label className="pt-field"><span>Vertical reo (top)</span><input value={f.verticalReo} onChange={set("verticalReo")} placeholder="7N32" /></label>
                <label className="pt-field"><span>Vertical reo — lower 2 m</span><input value={f.verticalReoLower} onChange={set("verticalReoLower")} placeholder="9N36 (if any)" /></label>
                <label className="pt-field"><span>Ligs</span><input value={f.ligs} onChange={set("ligs")} placeholder="N12-200" /></label>
                <label className="pt-field"><span>Socket (m)</span><input inputMode="decimal" value={f.socket} onChange={set("socket")} placeholder="5.45" /></label>
                <label className="pt-field"><span>Cut-off RL</span><input inputMode="decimal" value={f.cutoffRL} onChange={set("cutoffRL")} placeholder="74.775" /></label>
                <label className="pt-field"><span>Top of steel RL</span><input inputMode="decimal" value={f.topSteelRL} onChange={set("topSteelRL")} placeholder="75.915" /></label>
              </div>
            </section>
            <section className="pt-fset">
              <div className="pt-fset-label">Drilling — actual</div>
              <div className="pt-grid">
                <label className="pt-field"><span>Drill date</span><input type="date" value={f.drillDate} onChange={set("drillDate")} /></label>
                <label className="pt-field"><span>Driller / rig</span><input value={f.driller} onChange={set("driller")} placeholder="Rig 1 / Frankipile" /></label>
                <label className="pt-field"><span>Drilled depth (m)</span><input inputMode="decimal" value={f.actualDepth} onChange={set("actualDepth")} placeholder="for volume" /></label>
                <label className="pt-field"><span>Actual Ø (mm)</span><input inputMode="decimal" value={f.actualDia} onChange={set("actualDia")} placeholder="if ≠ spec" /></label>
              </div>
              <HoldPoint 
                title="Hold point — pile drilled" 
                sub="Witness the bore before the cage. Attach a site photo." 
                hp={f.hp.drill} 
                photo={photos.drill} 
                onChange={setHp("drill")} 
                onPhoto={(d) =>{
                  setPhotos((p) => ({ ...p, drill: d }))
                }} 
                onPhotoRemove={() => setPhotos((p) => ({ ...p, drill: null }))} />
            </section>
            <section className="pt-fset">
              <div className="pt-fset-label">Reo cage</div>
              <div className="pt-grid"><label className="pt-field"><span>Cage status</span><select value={f.cageStatus} onChange={set("cageStatus")}><option>Not installed</option><option>Installed</option></select></label></div>
              <HoldPoint 
                title="Hold point — cage in ground" 
                sub="Pre-pour witness. Release to authorise the pour." 
                hp={f.hp.cage} 
                photo={photos.cage} 
                onChange={setHp("cage")} 
                onPhoto={(d) => setPhotos((p) => ({ ...p, cage: d }))} 
                onPhotoRemove={() => setPhotos((p) => ({ ...p, cage: null }))} />
            </section>
            <section className="pt-fset">
              <div className="pt-fset-label">Pour</div>
              <div className="pt-grid">
                <label className="pt-field"><span>Pour date</span><input type="date" value={f.pourDate} onChange={set("pourDate")} /></label>
                <label className="pt-field"><span>Concrete vol (m³)</span><input inputMode="decimal" value={f.concreteVol} onChange={set("concreteVol")} placeholder="docket m³" /></label>
                <label className="pt-field"><span>Delivered grade</span><input value={f.deliveredGrade} onChange={set("deliveredGrade")} placeholder={f.grade ? `spec ${f.grade}` : "MPa"} /></label>
                <label className="pt-field"><span>Concrete docket no.</span><input value={f.concreteDocket} onChange={set("concreteDocket")} placeholder="docket #" /></label>
              </div>
              {theo != null && <div className="pt-hint">Theoretical vol ≈ <b>{theo.toFixed(2)} m³</b> (from {num(f.actualDia) ?? num(f.dia)}mm × {fmtN(f.actualDepth, 1)}m drilled){num(f.concreteVol) != null && <span> · docket {fmtN(f.concreteVol, 2)} m³ ({((num(f.concreteVol) - theo) / theo * 100 >= 0 ? "+" : "") + Math.round((num(f.concreteVol) - theo) / theo * 100)}%)</span>}</div>}
              <HoldPoint 
                title="Hold point — pile poured" 
                sub="Witness the pour. Attach a site photo." 
                hp={f.hp.pour} photo={photos.pour} 
                onChange={setHp("pour")} 
                onPhoto={(d) => setPhotos((p) => ({ ...p, pour: d }))} 
                onPhotoRemove={() => setPhotos((p) => ({ ...p, pour: null }))} />
            </section>
            <section className="pt-fset">
              <div className="pt-fset-label">QA sign-off</div>
              <div className="pt-grid">
                <label className="pt-field"><span>QA status</span><select value={f.qaStatus} onChange={set("qaStatus")}><option>Pending</option><option>Signed off</option></select></label>
                <label className="pt-field pt-col2"><span>Inspector</span><input value={f.qaInspector} onChange={set("qaInspector")} placeholder="Name" /></label>
                <label className="pt-field pt-col3"><span>Notes</span><textarea rows={2} value={f.qaNotes} onChange={set("qaNotes")} placeholder="Observations, hold points, NCRs…" /></label>
              </div>
            </section>
          </div>
            <div className="pt-modal-foot">
                {!isNew && (
                    <button className="pt-btn pt-btn-danger" onClick={() => onDelete(f.id)}>
                    <Trash2 size={15} /> Delete
                    </button>
                )}
            
                <div className="pt-foot-right">
                    <button className="pt-btn pt-btn-ghost" onClick={() => onPrint(f, photos)}>
                        <Printer size={15} /> Print ITP
                    </button>
                    
                    <button className="pt-btn pt-btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    
                    <button 
                        className="pt-btn pt-btn-primary" 
                        onClick={() => onSave(f, photos)} 
                        disabled={!String(f.pileRef).trim() || !f.projectId}
                        >
                        {isNew ? "Add pile" : "Save changes"}
                    </button>
                </div>
            </div>          
        </div>
      </div>
    );
}