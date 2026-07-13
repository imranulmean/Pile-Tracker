import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, Download, X, Trash2, Pencil, FolderPlus, AlertTriangle,
  CheckCircle2, HardHat, Building2, MoreHorizontal, Info, Camera, Upload,
  ClipboardCheck, ListChecks, ShieldCheck, ClipboardList, Printer
} from "lucide-react";
import { computeStage, fmtInt, norm, stageMeta } from "../../pile-tracker-fns";

export default function RegisterView({ register, piles, projects, active, onAdd, onImport, onLoadSchedule, onLoadCPB, onEditEntry, onLog, onEditPile }) {
    
    const RENDER_CAP = 250;
    const REG_STATUS = {
        matched: { label: "Matched", color: "#2E9E5B" },
        mismatch: { label: "Mismatch", color: "#C5432B" },
        missing: { label: "Not logged", color: "#94A0AE" },
        unregistered: { label: "Not in register", color: "#E0871E" },
        cancelled: { label: "Cancelled", color: "#B9C0C9" },
      };
      function reconcile(register, piles, projectId) {
        // register= register.map(r=> r['registerId']=r.id);
        const reg = register.filter((r) => projectId === "all" || r.projectId === projectId);
        const trk = piles.filter((p) => projectId === "all" || p.projectId === projectId);
        const byKey = {}; 
        trk.forEach((p) => { 
          byKey[p.projectId + "|" + norm(p.pileRef)] = p; 
        });
        const seen = new Set();
        const rows = reg.map((r) => {
          const key = r.projectId + "|" + norm(r.pileRef); 
          seen.add(key);
          const t = byKey[key];         
          let status = "missing", detail = [];
          if (r.cancelled && !t) 
            return { reg: r, trk: null, status: "cancelled", detail: "" };

          if (t) {  
            if (r.cancelled) 
              detail.push("cancelled in register");
            const checks = [
              ["Ø", r.dia, t.dia], 
              ["grade", r.grade, t.grade], 
              ["reo", r.verticalReo, t.verticalReo], 
              ["reo-btm", r.verticalReoLower, t.verticalReoLower], 
              ["ligs", r.ligs, t.ligs]
            ];
            checks.forEach(([lbl, a, b]) => { 
              if (a != null && a !== "" && b != null && b !== "" && norm(a) !== norm(b)) 
                detail.push(`${lbl} ${a}→${b}`); 
            });
            status = detail.length ? "mismatch" : "matched";         
          }
          return { reg: r, trk: t, status, detail: detail.join(", ") };
        });

        const extra = trk.filter((p) => !seen.has(p.projectId + "|" + norm(p.pileRef))).map((p) => ({ 
            trk: p, status: "unregistered", detail: "" 
        }));
        return [...rows, ...extra];
      }

    const [filter, setFilter] = useState("all");
    const [q, setQ] = useState("");
    const rows = useMemo(() => reconcile(register, piles, active), [register, piles, active]);
    const counts = useMemo(() => rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; a.total++; return a; }, { total: 0 }), [rows]);
    const filtered = useMemo(() => {
      const s = q.trim().toLowerCase();
      return rows.filter((r) => filter === "all" || r.status === filter).filter((r) => { if (!s) return true; const src = r.reg || r.trk; return String(src.pileRef).toLowerCase().includes(s) || norm(src.verticalReo).includes(s); });
    }, [rows, filter, q]);    
    const shown = filtered.slice(0, RENDER_CAP);
    const issues = (counts.mismatch || 0) + (counts.missing || 0) + (counts.unregistered || 0);
  
    if (register.filter((r) => active === "all" || r.projectId === active).length === 0 && rows.length === 0) {
      return (
        <div className="pt-empty pt-empty-lg">
          <div className="pt-empty-glyph"><ClipboardList size={56} strokeWidth={1.4} color="#26384F" /></div>
          <h2>Build your pile register</h2>
          <p>Your source of truth from the schedule. Load it once, then the board flags any pile the site team logs that doesn't match — or hasn't been logged at all.</p>
          <div className="pt-empty-actions">
            {/* <button className="pt-btn pt-btn-primary" onClick={onLoadSchedule}><Upload size={16} /> Load Rev 26 (1300)</button>
            <button className="pt-btn pt-btn-primary" onClick={onLoadCPB}><Upload size={16} /> Load CPB job (123)</button> */}
            <button className="pt-btn pt-btn-ghost" onClick={onImport} disabled={active === "all"}>Paste a register</button>
            <button className="pt-btn pt-btn-ghost" onClick={onAdd} disabled={active === "all"}><Plus size={15} /> Add entry</button>
          </div>
          {active === "all" && <div className="pt-hint" style={{ marginTop: 14 }}>Pick a specific job above to add register entries manually.</div>}
        </div>
      );
    }
    return (
      <>
        <div className="pt-recon-summary">
          {/* {(() => {
            const hasRev = projects.some((p) => p.code === "REV26");
            const hasCPB = projects.some((p) => p.code === "CPB");
            if (hasRev && hasCPB) return null;
            return (
              <div className="pt-loadrow">
                <span className="pt-loadrow-label">Add a job:</span>
                {!hasRev && <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={onLoadSchedule}><Upload size={14} /> Rev 26 (1300)</button>}
                {!hasCPB && <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={onLoadCPB}><Upload size={14} /> CPB job (123)</button>}
              </div>
            );
          })()} */}
          <div className="pt-recon-headline"><ClipboardCheck size={18} color={issues ? "#C5432B" : "#2E9E5B"} /><span>{issues === 0 ? "Site log matches the register" : `${issues} item${issues === 1 ? "" : "s"} to reconcile`}</span></div>
            <div className="pt-recon-stats">
              <button
                className={"pt-recon-stat" + (filter === "all" ? " is-active" : "")}
                onClick={() => setFilter("all")}
              >
                <b>{counts.total}</b> registered
              </button>

              <button
                className={"pt-recon-stat" + (filter === "matched" ? " is-active" : "")}
                onClick={() => setFilter("matched")}
              >
                <span className="pt-dot" style={{ background: REG_STATUS.matched.color }} />
                <b>{counts.matched || 0}</b> matched
              </button>

              <button
                className={"pt-recon-stat" + (filter === "mismatch" ? " is-active" : "")}
                onClick={() => setFilter("mismatch")}
              >
                <span className="pt-dot" style={{ background: REG_STATUS.mismatch.color }} />
                <b>{counts.mismatch || 0}</b> mismatch
              </button>

              <button
                className={"pt-recon-stat" + (filter === "missing" ? " is-active" : "")}
                onClick={() => setFilter("missing")}
              >
                <span className="pt-dot" style={{ background: REG_STATUS.missing.color }} />
                <b>{counts.missing || 0}</b> not logged
              </button>

              <button
                className={"pt-recon-stat" + (filter === "unregistered" ? " is-active" : "")}
                onClick={() => setFilter("unregistered")}
              >
                <span className="pt-dot" style={{ background: REG_STATUS.unregistered.color }} />
                <b>{counts.unregistered || 0}</b> not in reg.
              </button>

              {counts.cancelled ? (
                <button
                  className={"pt-recon-stat" + (filter === "cancelled" ? " is-active" : "")}
                  onClick={() => setFilter("cancelled")}
                >
                  <span className="pt-dot" style={{ background: REG_STATUS.cancelled.color }} />
                  <b>{counts.cancelled}</b> cancelled
                </button>
              ) : null}
            </div>
          <div className="pt-searchbox" style={{ marginTop: 12 }}>
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find pile number or reo…" />
          </div>
        </div>
        <div className="pt-recon-list">
          <div className="pt-recon-row pt-recon-head">
            <div>Pile</div>
            <div>Ø/grade</div>
            <div>Reo/ligs (reg.)</div>
            <div>Logged status</div>
            <div>Check</div>
            <div></div>
          </div>
          {shown.map((r, i) => {
            const st = REG_STATUS[r.status], 
            src = r.reg || r.trk, 
            stage = r.trk ? computeStage(r.trk) : null;
            return (
              <div className="pt-recon-row" key={i}>
                <div className="pt-recon-ref">{src.pileRef}</div>

                <div className="pt-mono">
                  {r.reg ? (
                    `${fmtInt(r.reg.dia)}·${fmtInt(r.reg.grade)}`
                  ) : (
                    <span className="pt-muted">—</span>
                  )}
                </div>

                <div className="pt-mono pt-small">
                  {r.reg ? (
                    `${r.reg.verticalReo || "—"}${r.reg.verticalReoLower ? " · " + r.reg.verticalReoLower : ""} / ${
                      r.reg.ligs || "—"
                    }`
                  ) : (
                    <span className="pt-muted">—</span>
                  )}
                </div>

                <div>
                  {stage ? (
                    <span
                      className="pt-chip"
                      style={{ background: stageMeta(stage).color + "22", color: stageMeta(stage).color }}
                    >
                      {stageMeta(stage).label}
                    </span>
                  ) : (
                    <span className="pt-muted">—</span>
                  )}
                </div>
                    {/* Showing Matched */}
                <div>
                  <span className="pt-recon-badge" style={{ background: st.color + "1e", color: st.color }}>
                    {st.label}
                  </span>
                  {r.detail && <span className="pt-recon-detail">{r.detail}</span>}
                </div>

                <div className="pt-recon-act">
                  {r.status === "missing" && (
                    <button className="pt-btn pt-btn-ghost pt-btn-sm" onClick={() => onLog(r.reg)}>
                      <Plus size={13} /> Log
                    </button>
                  )}
                  {r.trk && (
                    <button className="pt-iconbtn" onClick={() => onEditPile(r.trk)}>
                      <Pencil size={14} />
                    </button>
                  )}
                  {r.reg && (
                    <button className="pt-iconbtn" onClick={() => onEditEntry(r.reg)} title="Edit register entry">
                      <ClipboardList size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length > RENDER_CAP && <div className="pt-recon-more">Showing {RENDER_CAP} of {filtered.length} — search or filter to narrow.</div>}
          {shown.length === 0 && <div className="pt-empty" style={{ border: "none" }}>Nothing in this filter.</div>}
        </div>
      </>
    );
  }