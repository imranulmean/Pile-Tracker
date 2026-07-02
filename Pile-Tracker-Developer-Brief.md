# Pile Tracker — Developer Brief

**Prepared for:** prospective app developer / agency
**Prepared by:** Ziad, NCF
**Purpose:** Turn an existing working prototype into a hosted, multi-user mobile + web app for tracking bored-pile construction (drilling, reinforcement cage, pour, QA) and producing Inspection & Test Plan (ITP) records.

---

## 1. What this is

A field QA tool for a piling/reinforcement contractor. The site team logs each pile as it is drilled, caged, poured and signed off — capturing dates, rig, depths, concrete volumes, three witness/hold points (each with a photo), and QA sign-off. A "register" (the design schedule) is loaded per job, and the app reconciles what the site team actually logged against that register to catch missing or mismatched piles. It also generates ITP reports (full per-pile sheets and a condensed checklist) for sign-off.

**A fully working prototype already exists** (attached). Please run it first — it is the spec. Everything below describes it and what must change to make it production-grade.

## 2. What's attached

1. **`pile-tracker.html`** — a self-contained, runnable demo. Open it in a browser (needs internet to load React from a CDN). It contains two real pile schedules already loaded (1,300 piles and 123 piles). This shows the exact intended UX, screens, fields, reports and behaviour.
2. **`pile-tracker.jsx`** — the React source for the same app. This is the clearest reference for the data model, fields, validation and business logic. Reuse as much of it as you like.

> The prototype stores all data in the browser on one device (localStorage) and embeds photos in-browser. That is the main thing that must be replaced with real infrastructure (see §4).

## 3. Users & roles

- **Site team / supervisors** — log piles from a phone on site (often poor signal), take hold-point photos, record pours.
- **Scheduler / QA (e.g. Ziad)** — loads the register from the schedule, reviews reconciliation, signs off QA, generates ITP reports.
- **Approver / engineer** (optional) — reviews/approves hold points and ITPs.

Roles, permissions and an audit trail (who changed what, when) matter because the output is a formal QA record.

## 4. What must become "real" (the actual build)

The prototype fakes these; production needs them properly:

1. **Multi-user shared data** — one live dataset the whole team sees, not per-device. Requires a hosted database and API.
2. **Authentication** — user logins; ideally roles/permissions (who can sign off a hold point or QA).
3. **Photo upload & storage** — hold-point photos uploaded from phones to cloud storage, not embedded in the browser. Three photos per pile (drill, cage, pour). Thousands of piles → thousands of photos.
4. **Concurrent editing** — several people logging piles at once without overwriting each other (the prototype is last-write-wins).
5. **Offline / poor-signal support** — site reality. The app should let a user log a pile and take photos with no signal and sync when back online.
6. **Audit trail & data integrity** — timestamps, user attribution, ideally immutable history for sign-offs.
7. **Backups & data ownership** — NCF owns the data; regular backups; export on demand.
8. **Install on phones** — must work as an installable app on **iPhone and Android** (a PWA "Add to Home Screen", or native — your recommendation), plus a web/desktop view for the office.

## 5. Feature list (all present in the prototype)

**Jobs / projects**
- Multiple jobs at once; switch between them.
- Each job has: name, code, location, **contract/project number** (prints on ITP).

**Register (design schedule)**
- Per-job master list of expected piles.
- Bulk import by pasting from Excel (and ideally direct `.xlsx` upload).
- Reconciliation view comparing the register against logged piles, classifying each as: **Matched / Mismatch / Not logged / Not in register / Cancelled**, with the specific differing fields shown.

**Pile tracking** — automatic stage progression: **Not started → Drilled → Cage installed → Poured → QA signed off.**

**Three hold points**, each with status (Open/Released), inspector, date and **photo**: *Pile drilled*, *Cage in ground (pre-pour)*, *Pile poured*.

**QA automatic flags** — e.g. Ø/grade mismatch vs schedule, pour volume vs theoretical (under-pour / overbreak), poured-before-cage-hold-point-released, missing hold-point photos.

**Reports**
- **ITP sheet** — one A4 page per pile (logo, all fields, hold-point photos, signature lines).
- **ITP checklist** — condensed multi-pile table with sign-off column.
- Both branded with the **NCF logo** and contract number; printable / save-as-PDF.

**Export** — CSV of all fields (column headers mirror NCF's existing schedule format).

**Branding** — NCF logo across the top and on reports.

## 6. Data model (from the prototype)

**Project**: `id, name, code, location, contractNo`

**Register entry**: `id, projectId, pileRef (pile number), dia (mm), grade (MPa), verticalReo, verticalReoLower (lower 2 m), ligs, socket (m), cutoffRL, topSteelRL, gridRef, cancelled`

**Pile record (as-built)**: all register fields **plus** `actualDia, actualDepth (drilled length m), drillDate, driller/rig, cageStatus, pourDate, concreteVol (m³), concreteDocket, deliveredGrade, qaStatus, qaInspector, qaNotes` **plus** hold points:
`hp.drill { released, inspector, date, photo }`, `hp.cage { … }`, `hp.pour { … }`

Theoretical concrete volume is computed from diameter × drilled depth and compared to the logged volume.

> Note: a pile schedule can have **two vertical-reo columns** (top, and lower 2 m) — both must be kept as separate fields. Reconciliation compares dia, grade, both vertical-reo values, and ligs.

## 7. Scale

- A single job can be **1,300+ piles**; multiple jobs run at once.
- ~3 photos per pile.
- Plan for tens of thousands of piles and photos across the company over time.

## 8. Non-functional requirements

- **Data location:** Australian data residency preferred (NCF and its clients are Australian construction; some head contractors require AU-hosted data). Please confirm where data and photos would be hosted.
- **Security:** logins, role-based access, encrypted storage of photos and records.
- **Reliability/offline:** usable on site with intermittent connectivity.
- **Maintainability:** documented; NCF should not be locked in — data exportable, source/ownership terms clear.

## 9. Suggested approach (your call — just context)

The prototype is React. A common path would be a React/React-Native (or PWA) front end, a hosted backend + database (e.g. a managed platform such as Supabase/Firebase, or a custom API + PostgreSQL), and cloud object storage for photos, with auth and offline sync. **We're not prescribing the stack — recommend what you'd support best.**

## 10. What we'd like back from you

1. A recommended approach (web + iOS/Android), and whether PWA or native.
2. A fixed-scope quote for an **MVP** that matches the attached prototype (jobs, register + reconciliation, pile logging, 3 hold points with photo upload, QA sign-off, ITP sheet + checklist, CSV export, logins), plus a separate estimate for offline sync and roles if priced separately.
3. Indicative **timeline**.
4. **Hosting/running cost** (monthly) and ongoing support/maintenance options.
5. Data ownership, backups and exit terms.
6. Anything you need from us to start.

## 11. We can provide

- The two prototype files (above).
- NCF logo assets (full-resolution).
- Real pile schedules / registers (Excel) for the active jobs.
- The exact ITP sign-off fields and any client-specific report requirements.
- A list of users and roles.

---

*This brief describes an existing working prototype; please treat the attached `pile-tracker.html` as the definitive reference for intended behaviour and `pile-tracker.jsx` as the reference for fields and logic.*
