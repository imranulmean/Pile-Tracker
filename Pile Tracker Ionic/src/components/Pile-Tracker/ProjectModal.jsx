import { useState } from "react";
import { X } from "lucide-react";

export default function ProjectModal({ project, onSave, onLoadSchedule, onLoadCPB, onClose }) {
    const isEdit = !!(project && project.id);
    const [f, setF] = useState({ name: "", code: "", location: "", contractNo: "", ...(project || {}) });
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
    return (
        <div className="pt-overlay" onMouseDown={onClose}>
            <div className="pt-modal pt-modal-sm" onMouseDown={(e) => e.stopPropagation()}>
                <div className="pt-modal-head">
                    <div>
                        <div className="pt-eyebrow">
                            {isEdit ? "Edit job" : "New job"}
                        </div>
                        <div className="pt-modal-title">
                            {isEdit ? (f.name || "Edit job") : "Add a project"}
                        </div>
                    </div>
                    <button className="pt-iconbtn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="pt-modal-body">
                    <div className="pt-grid">
                        <label className="pt-field pt-col3">
                            <span>Job name</span>
                            <input value={f.name} onChange={set("name")} placeholder="MEL 11 — VDC Data Centre" />
                        </label>
                        <label className="pt-field">
                            <span>Job code</span>
                            <input value={f.code} onChange={set("code")} placeholder="VDC" />
                        </label>
                        <label className="pt-field pt-col2">
                            <span>Location</span>
                            <input value={f.location} onChange={set("location")} placeholder="Tullamarine" />
                        </label><label className="pt-field pt-col3">
                            <span>Contract / project no.</span>
                            <input value={f.contractNo} onChange={set("contractNo")} placeholder="e.g. CPB-2024-118 — prints on the ITP" />
                        </label>
                    </div>
                        {
                            !isEdit && (onLoadSchedule || onLoadCPB) && (
                                <>
                                    <div className="pt-fset-label" style={{ marginTop: 16, marginBottom: 8 }}>
                                        Or load a ready register
                                    </div>
                                    <div className="pt-empty-actions" style={{ justifyContent: "flex-start", marginTop: 0 }}>
                                        <button className="pt-btn pt-btn-ghost" onClick={onLoadSchedule}>Rev 26 (1300)</button>
                                        <button className="pt-btn pt-btn-ghost" onClick={onLoadCPB}>CPB job (123)</button>
                                    </div>
                                </>
                            )
                        }
                </div>
                <div className="pt-modal-foot">
                    <div className="pt-foot-right">
                        <button className="pt-btn pt-btn-ghost" onClick={onClose}>Cancel</button>
                        <button className="pt-btn pt-btn-primary" 
                                onClick={() => onSave(f)} 
                                disabled={!f.name.trim()}>{isEdit ? "Save job" : "Add job"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  }