import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, Download, X, Trash2, Pencil, FolderPlus, AlertTriangle,
  CheckCircle2, HardHat, Building2, MoreHorizontal, Info, Camera, Upload,
  ClipboardCheck, ListChecks, ShieldCheck, ClipboardList, Printer
} from "lucide-react";

export default function ImportModal({ projects, defaultProject, onImport, onClose }) {
    const [projectId, setProjectId] = useState(defaultProject || projects[0]?.id || "");
    const [text, setText] = useState("");

    const parsed = useMemo(() => {

      return text.split(/\r?\n/).map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim()).map((line) => {
        const c = line.split(/\t|,/).map((x) => x.trim());
        if (c.length >= 9) return { 
          pileRef: c[0] || "", dia: c[1] || "", grade: c[2] || "", verticalReo: c[3] || "", verticalReoLower: c[4] || "", ligs: c[5] || "", 
          socket: c[6] || "", cutoffRL: c[7] || "", topSteelRL: c[8] || "" 
        };
        return { pileRef: c[0] || "", dia: c[1] || "", grade: c[2] || "", verticalReo: c[3] || "", verticalReoLower: "", ligs: c[4] || "", socket: c[5] || "", cutoffRL: c[6] || "", topSteelRL: c[7] || "" };
      }).filter((r) => r.pileRef && /\d/.test(r.pileRef) && !/^(pile|number|no\b)/i.test(r.pileRef));
    }, [text]);

    return (
      <div className="pt-overlay" onMouseDown={onClose}><div className="pt-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pt-modal-head">
            <div>
                <div className="pt-eyebrow">Bulk import</div>
                <div className="pt-modal-title">Paste register from your schedule</div>
            </div>
            <button className="pt-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pt-modal-body">
            <label className="pt-field pt-col3" style={{ marginBottom: 12 }}>
                <span>Add to job</span>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    {
                        projects.map((p) => 
                        <option key={p.id} value={p.id}>{p.code ? p.code + " — " : ""}{p.name}</option>)
                    }
                </select>
            </label>
            <div className="pt-hint" style={{ marginBottom: 10 }}>
                Copy straight from your Excel schedule — one pile per line, columns in order: <b>Pile Number, Dia, Grade, Vertical Reo, Ligs, Socket, Cut-off RL, Top of steel RL</b>. If your sheet has a <b>Vertical Reo-Lower 2 M</b> column (like the CPB job), keep it right after Vertical Reo and it is picked up automatically. Tabs or commas both work; a header row is skipped.
            </div>
            <textarea className="pt-import-ta" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"1\t750\t50\t7N32\tN12-200\t5.45\t74.775\t75.915"} />
          <div className="pt-import-count">{parsed.length} pile{parsed.length === 1 ? "" : "s"} detected</div>
        </div>
        <div className="pt-modal-foot">
            <div className="pt-foot-right">
                <button className="pt-btn pt-btn-ghost" onClick={onClose}>Cancel</button>
                <button className="pt-btn pt-btn-primary" 
                        onClick={() => onImport(projectId, parsed)} 
                        disabled={!parsed.length || !projectId}>Import {parsed.length || ""}
                </button>
            </div>
        </div>
      </div>
      </div>
    );
  }