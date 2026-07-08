import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, Download, X, Trash2, Pencil, FolderPlus, AlertTriangle,
  CheckCircle2, HardHat, Building2, MoreHorizontal, Info, Camera, Upload,
  ClipboardCheck, ListChecks, ShieldCheck, ClipboardList, Printer
} from "lucide-react";

import { computeStage, flagsFor, getHp, num, theoreticalVol } from "../../pile-tracker-fns";
import { LOGO_URI_JS } from "../../seed";

export function ItpReport({ pile, project, photos, printData }) {
  
  console.log(printData)
  const BASE_API= import.meta.env.VITE_API_BASE_URL
  const stage = computeStage(pile), 
  hp = getHp(pile), 
  theo = theoreticalVol(pile), 
  fl = flagsFor(pile);
  const vol = num(pile.concreteVol);
  const variance = (theo && vol != null) ? Math.round((vol - theo) / theo * 100) : null;
  const cell = (label, val) => (
    <div className="itp-cell">
      <div className="itp-cell-k">{label}</div>
      <div className="itp-cell-v">{(val === 0 || val) ? val : "—"}</div>
    </div>
  );
  const hpRow = (label, h, photo) =>{
      const imageSrc = photo?.startsWith("data:image") ? photo : `${BASE_API}${photo}`;
      return(
        <tr>
          <td>{label}</td>
          <td><span className={"itp-pillbox " + (h.released ? "ok" : "open")}>{h.released ? "Released" : "Open"}</span></td>
          <td>{h.inspector || "—"}</td>
          <td>{h.date || "—"}</td>
          <td className="itp-ph">
            {
              photo ? <img src={imageSrc} alt="" /> : <span className="itp-na">no photo</span>
            }
          </td>
        </tr>        
    );
  } 

  return (
    <div className="pt-print-page">
      <div className="itp-head">
        <img className="itp-logo" src={LOGO_URI_JS} alt="NCF" />
        <div className="itp-title"><div className="itp-t1">Inspection &amp; Test Plan</div><div className="itp-t2">Bored Pile Record</div></div>
      </div>
      <div className="itp-meta">
        {cell("Project", project ? `${project.code ? project.code + " — " : ""}${project.name}` : "—")}
        {cell("Pile No.", pile.pileRef)}
        {cell("Contract no.", project && project.contractNo)}
        {cell("Report date", new Date().toLocaleDateString())}
      </div>
      <div className="itp-sec">Design / schedule</div>
      <div className="itp-grid">
        {cell("Pile Ø (mm)", pile.dia)}
        {cell("Concrete grade (MPa)", pile.grade)}
        {cell("Socket (m)", pile.socket)}
        {cell("Ligatures", pile.ligs)}
        {cell("Vertical reo (top)", pile.verticalReo)}
        {cell("Vertical reo — lower 2 m", pile.verticalReoLower)}
        {cell("Cut-off level RL", pile.cutoffRL)}
        {cell("Top of steel RL", pile.topSteelRL)}
        {cell("Grid reference", pile.gridRef)}
      </div>
      <div className="itp-sec">As-built / drilling</div>
      <div className="itp-grid">
        {cell("Drill date", pile.drillDate)}
        {cell("Driller / rig", pile.driller)}
        {cell("Drilled depth (m)", pile.actualDepth)}
        {cell("Actual Ø (mm)", pile.actualDia)}
      </div>
      <div className="itp-sec">Hold points &amp; witness</div>
      <table className="itp-hp">
        <thead>
          <tr>
            <th>Hold point</th>
            <th>Status</th>
            <th>Inspector</th>
            <th>Date</th>
            <th>Photo</th>
          </tr>
        </thead>
        <tbody>
          {
            hpRow("Pile drilled", hp.drill, photos && photos.drill)
          }
          {
            hpRow("Cage in ground (pre-pour)", hp.cage, photos && photos.cage)
          }
          {
            hpRow("Pile poured", hp.pour, photos && photos.pour)
          }
        </tbody>
      </table>
      <div className="itp-sec">Pour</div>
      <div className="itp-grid">
        {cell("Pour date", pile.pourDate)}
        {cell("Concrete volume (m³)", vol != null ? vol : "—")}
        {cell("Theoretical vol (m³)", theo != null ? theo.toFixed(2) : "—")}
        {cell("Variance vs theo", variance != null ? (variance >= 0 ? "+" : "") + variance + "%" : "—")}
        {cell("Delivered grade", pile.deliveredGrade)}
        {cell("Concrete docket no.", pile.concreteDocket)}
      </div>
      <div className="itp-sec">QA sign-off</div>
      <div className="itp-grid">
        {cell("QA status", pile.qaStatus)}
        {cell("QA inspector", pile.qaInspector)}
      </div>
      {pile.qaNotes ? <div className="itp-notes"><b>Notes: </b>{pile.qaNotes}</div> : null}
      {fl.length ? (<><div className="itp-sec">Observations / non-conformances</div><ul className="itp-flags">{fl.map((x, i) => <li key={i}>{x.text}</li>)}</ul></>) : null}
      <div className="itp-sign">
        <div className="itp-sign-box"><div className="itp-sign-line"></div>Inspected by / date</div>
        <div className="itp-sign-box"><div className="itp-sign-line"></div>Approved by / date</div>
      </div>
      <div className="itp-foot">NCF — Build with Confidence · ncf.group · Pile {pile.pileRef}{project ? ` · ${project.code || project.name}` : ""}</div>
    </div>
  );
  }