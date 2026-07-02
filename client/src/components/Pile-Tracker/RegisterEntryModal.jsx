import { useState } from "react";
import { X } from "lucide-react";

export default function RegisterEntryModal({ entry, projects, defaultProject, onSave, onDelete, onClose }) {
    const [f, setF] = useState(() => ({ pileRef: "", dia: "", grade: "", verticalReo: "", verticalReoLower: "", ligs: "", socket: "", cutoffRL: "", topSteelRL: "", gridRef: "", projectId: defaultProject || projects[0]?.id || "", ...entry }));
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
    const isNew = !entry?.id;
    return (
      <div className="pt-overlay" onMouseDown={onClose}><div className="pt-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pt-modal-head"><div><div className="pt-eyebrow">{isNew ? "Register entry" : "Edit entry"}</div><div className="pt-modal-title">Pile {f.pileRef || "—"}</div></div><button className="pt-iconbtn" onClick={onClose}><X size={18} /></button></div>
        <div className="pt-modal-body"><div className="pt-grid">
          <label className="pt-field"><span>Job</span><select value={f.projectId} onChange={set("projectId")}>{projects.map((p) => <option key={p.id} value={p.id}>{p.code ? p.code + " — " : ""}{p.name}</option>)}</select></label>
          <label className="pt-field"><span>Pile number</span><input value={f.pileRef} onChange={set("pileRef")} placeholder="1" /></label>
          <label className="pt-field"><span>Grid ref</span><input value={f.gridRef} onChange={set("gridRef")} placeholder="C-7" /></label>
          <label className="pt-field"><span>Pile Ø (mm)</span><input inputMode="decimal" value={f.dia} onChange={set("dia")} placeholder="750" /></label>
          <label className="pt-field"><span>Grade (MPa)</span><input inputMode="decimal" value={f.grade} onChange={set("grade")} placeholder="50" /></label>
          <label className="pt-field"><span>Vertical reo (top)</span><input value={f.verticalReo} onChange={set("verticalReo")} placeholder="7N32" /></label>
          <label className="pt-field"><span>Vertical reo — lower 2 m</span><input value={f.verticalReoLower} onChange={set("verticalReoLower")} placeholder="9N36 (if any)" /></label>
          <label className="pt-field"><span>Ligs</span><input value={f.ligs} onChange={set("ligs")} placeholder="N12-200" /></label>
          <label className="pt-field"><span>Socket (m)</span><input inputMode="decimal" value={f.socket} onChange={set("socket")} placeholder="5.45" /></label>
          <label className="pt-field"><span>Cut-off RL</span><input inputMode="decimal" value={f.cutoffRL} onChange={set("cutoffRL")} placeholder="74.775" /></label>
          <label className="pt-field"><span>Top of steel RL</span><input inputMode="decimal" value={f.topSteelRL} onChange={set("topSteelRL")} placeholder="75.915" /></label>
        </div></div>
        <div className="pt-modal-foot">{!isNew && <button className="pt-btn pt-btn-danger" onClick={() => onDelete(f.id)}><Trash2 size={15} /> Delete</button>}<div className="pt-foot-right"><button className="pt-btn pt-btn-ghost" onClick={onClose}>Cancel</button><button className="pt-btn pt-btn-primary" onClick={() => onSave(f)} disabled={!String(f.pileRef).trim() || !f.projectId}>{isNew ? "Add entry" : "Save"}</button></div></div>
      </div></div>
    );
  }