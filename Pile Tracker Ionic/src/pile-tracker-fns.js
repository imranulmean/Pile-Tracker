    ///////////////////////////////
export const RENDER_CAP = 250;    
export const STAGES = [
    { key: "not_started", label: "Not started", short: "Pending", color: "#94A0AE" },
    { key: "drilled", label: "Drilled", short: "Drilled", color: "#3B82C4" },
    { key: "cage", label: "Cage installed", short: "Cage", color: "#7A5BD0" },
    { key: "poured", label: "Poured", short: "Poured", color: "#E0871E" },
    { key: "qa", label: "QA signed off", short: "QA done", color: "#2E9E5B" },
];
      export const stageMeta = (k) => STAGES.find((s) => s.key === k) || STAGES[0];
      export  function computeStage(p) {
        if (p.qaStatus === "Signed off") return "qa";
        if (p.pourDate) return "poured";
        if (p.cageStatus === "Installed") return "cage";
        if (p.drillDate) return "drilled";
        return "not_started";
      }
      export const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
      export function theoreticalVol(p) {
        const dia = num(p.actualDia) ?? num(p.dia);
        const depth = num(p.actualDepth);
        if (!dia || !depth) return null;
        const r = dia / 2 / 1000;
        return Math.PI * r * r * depth;
      }
      export const HP_DEF = { released: false, inspector: "", date: "", hasPhoto: false };
      export function getHp(p) {
        return { drill: { ...HP_DEF, ...(p.hp && p.hp.drill) }, cage: { ...HP_DEF, ...(p.hp && p.hp.cage) }, pour: { ...HP_DEF, ...(p.hp && p.hp.pour) } };
      }
      export function flagsFor(p) {
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
      export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      export const fmtN = (v, d = 1) => (num(v) == null ? "—" : num(v).toFixed(d));
      export const fmtInt = (v) => (num(v) == null ? "—" : String(num(v)));
      export const norm = (s) => (s || "").toString().trim().toLowerCase();
      
      export function hpPip(p, which) {
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
      export const FIELD_DEFAULTS = {
        pileRef: "", dia: "", grade: "", verticalReo: "", verticalReoLower: "", ligs: "", socket: "", cutoffRL: "", topSteelRL: "", gridRef: "", concreteDocket: "",
        actualDia: "", actualDepth: "", drillDate: "", driller: "", cageStatus: "Not installed",
        pourDate: "", concreteVol: "", deliveredGrade: "", qaStatus: "Pending", qaInspector: "", qaNotes: "",
    };


   export const PROJECTS_KEY = "piletracker:projects";
   export const PILES_KEY = "piletracker:piles";
   export const REGISTER_KEY = "piletracker:register";
   export const SHARED = true;
   export const hasStore = typeof window !== "undefined" && window.storage;
   export const photoKey = (pileId, hp) => `piletracker:photo:${pileId}:${hp}`;
    
   export async function getKey(key) {
      if (!hasStore) return null;
      try { const r = await window.storage.get(key, SHARED); return r ? JSON.parse(r.value) : null; }
      catch (e) { return null; }
    }
    export async function setKey(key, val) {
      if (!hasStore) return true;
      try { const r = await window.storage.set(key, JSON.stringify(val), SHARED); return !!r; }
      catch (e) { return false; }
    }
    export async function delKey(key) { if (!hasStore) return; try { await window.storage.delete(key, SHARED); } catch (e) {} }
    
    ////////////////////////////