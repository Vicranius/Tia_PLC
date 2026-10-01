# TIA fidelity plan — 2026-10-01

Goal: in the browser, PLC Lab Web should look and behave like the TIA Portal **Project view** (and the
**Portal view** start screen) as closely as practical, and it should present real industrial problems for the
user to solve in LAD.

Constraints:

- **No Siemens assets.** We copy layout, proportions, colors, workflows and terminology, but not logos,
  "Totally Integrated Automation PORTAL" branding or Siemens icon artwork. Icons are drawn or come from
  lucide.
- **Chrome language.** Menus, panes and editor labels use English, the language TIA Portal shows
  them in. Training content (scenarios, hints, instructor) stays in Turkish. If the UI should be fully
  Turkish instead, that is a single decision to make before Phase 2.

## 1. Where the project stands (audit)

Working today (164 passing tests, strict TypeScript):

| Area | State |
|---|---|
| LAD editor | NO/NC/P/N, coil/S/R, TON/TOF/TP, CTU/CTD/CTUD, compare, MOVE/math/convert/NORM_X/SCALE_X, nested series/parallel branches, drag, undo/redo |
| Runtime | Web Worker, deterministic 10 ms scan, OB100 → OB1, I/Q/M aliasing, forces, single scan, speed |
| Monitoring | Power flow drawn green; trace/"Why" explanations; timer ET / counter CV shown |
| Industrial problems | 27 exercises (motor, interlock, timers, counters, conveyor, tank, mixer, roaster, pumps, jam watchdog, contactor feedback, 4–20 mA), each with server-side reference programs and private timed test suites, hints and scoring |
| Plant models | Conveyor, tank, water transfer, mixer, roaster with closed-loop sensors and trends |
| Backend | TypeScript API route (Cloudflare Worker + D1/SQLite): save/restore, check, hints, solution |

Gaps compared with TIA Portal (by how much each one shows on screen):

| # | TIA Portal | PLC Lab Web today |
|---|---|---|
| G1 | Program status: **green solid** = fulfilled, **blue dashed** = not fulfilled, **gray** = unknown / not executed | Green vs. black, no dashes (**fixed in Phase 1**) |
| G2 | Starts in **Portal view** (Start / Devices & networks / PLC programming / Visualization / Online & Diagnostics) with a "Project view" switch | No Portal view (**added in Phase 1**) |
| G3 | Icon-only main toolbar: New, Open, Save, Print, Cut/Copy/Paste, Delete, Undo/Redo, Compile, Download, Upload, Start simulation, Go online/offline, Accessible devices, Start/Stop CPU, Cross-references, "Search in project" | Text buttons RUN / STOP / Single Scan / Monitor / Test et |
| G4 | Online workflow: Start simulation → PLCSIM window → Download (Load preview) → Go online (title bars turn **orange**, tree shows status icons) → Monitoring on (glasses) | RUN/STOP start the worker directly; no online/offline state |
| G5 | Bottom: **Inspector window** (Properties / Info / Diagnostics, each with sub-tabs) above a separate **editor bar** (◄ Portal view, open editors) and status line | Inspector tabs and editor tabs share one row; status bar is dark |
| G6 | Project tree: Add new device, Devices & networks, PLC_1 (…, PLC tags → Show all tags, Watch and force tables, Online backups, Traces, Program info, Local modules), HMI_1 as its own device, Common data, Languages & resources, Online access | Partly; HMI and exercises sit under PLC_1 |
| G7 | Block interface is an editable table (Input / Output / InOut / Static / Temp / Constant / Return) | One caption line |
| G8 | PLC tag table columns: Name, Data type, Address, Retain, Accessible from HMI/OPC UA, Writable from HMI, Visible in HMI engineering, Supervision, Comment, `<Add new>` row | Simplified columns |
| G9 | Watch and force table: Name, Address, Display format, Monitor value, Modify value, force flag, Comment; Modify now / Force | Simplified |
| G10 | Instructions card: Name / Description / **Version** columns; groups General, Program control, Word logic, Shift and rotate | No version column; several groups missing |
| G11 | Inserting TON/CTU opens **Call options** (single / multi instance DB); instance DBs appear under Program blocks → System blocks | Instance name typed inline; no DBs in the tree |
| G12 | Exact pixel metrics (menu ~20 px, toolbar ~28 px, 9 pt UI font, pane widths) | Close in places, but CSS is stacked override layers (78 KB) that are hard to calibrate |

## 2. How we reach "exact dimensions"

The Siemens documentation site is not reachable from the build container, and matching from memory has a
ceiling. To get pixel-level fidelity:

1. **Reference screenshots.** Take TIA Portal (V17–V20, English UI) screenshots at **1920×1080, 100 %
   Windows scaling**, and add them to `docs/reference/` with these names:
   `portal-start.png`, `project-view-ob1-offline.png`, `project-view-ob1-online-monitor.png`,
   `tag-table.png`, `watch-table.png`, `instructions-card.png`, `inspector-properties.png`.
2. **Same states in Playwright.** A script opens the app in exactly those states at 1920×1080.
3. **Overlay diff.** Each pair is compared with a pixel diff plus measured boxes (pane widths, row heights,
   font size), and the CSS tokens are adjusted until they line up.
4. **Design tokens.** Move every size and color into one `:root` token block, so calibration means editing
   one number instead of chasing overrides.

## 3. Roadmap

### Phase 1 — done in this change
- G1: TIA program-status rendering (green solid / blue dashed / gray), defined once in
  `src/ladder/status.ts` with unit tests.
- G2: Portal view start screen. Start (open project, create new project, example projects = industrial
  exercises, first steps), Devices & networks, PLC programming (block list), Visualization, Online &
  Diagnostics. Includes the "Project view" switch and the "◄ Portal view" button in the editor bar.

### Phase 2 — Project-view chrome (G3, G5, G6, G12)
- Design-token pass over `app/globals.css`; split `src/ui/Lab.tsx` into `Shell`, `MainToolbar`,
  `InspectorWindow`, `EditorBar`, `StatusLine`.
- TIA icon toolbar with "Search in project"; add the Window menu.
- Separate the Inspector window (Properties / Info / Diagnostics plus sub-tabs) from the editor bar.
- Restructure the project tree to the TIA hierarchy; HMI_1 becomes its own device.
- Collapsed panes show vertical labels (Project tree, task-card tabs), as TIA does.

### Phase 3 — Online workflow (G4)
- `online` state machine: offline → simulation started → downloaded → online → monitoring.
- PLCSIM-style compact window with RUN/STOP/ERROR/MAINT LEDs and RUN/STOP/MRES.
- Download dialog with Load preview (stop modules, overwrite blocks) and Load result.
- Orange title bars and project-tree status icons while online; Start CPU / Stop CPU in the toolbar.
- "Test et" moves into the Tasks card, so the toolbar matches TIA exactly.

### Phase 4 — Editors (G7–G11)
- Editable block interface table; FC/FB blocks with interfaces; instance and global DBs.
- Full tag table columns; `<Add new>` row; Show all tags.
- Watch and force tables with Monitor value / Modify value / force; Modify now; Force.
- Instructions card version column and missing groups (Program control: JMP/LABEL/RET;
  Word logic: AND/OR/XOR; Shift and rotate: SHL/SHR/ROL/ROR).
- Call options dialog on timer/counter insertion; empty box `??`; open/close branch on the favorites bar.

### Phase 5 — Industrial problem engine
- **Fault injection** during RUN: wire break (input stuck 0), stuck sensor, welded contactor, motor
  overload trip, analog signal < 4 mA. The user diagnoses it with monitoring and watch tables.
- **Troubleshooting exercises**: a program loads with a planted bug; the goal is to find and fix it
  (partly exists as "Debug challenge").
- **New processes**: bottling line (fill / cap / count), sorting by height on a conveyor, 3-floor elevator,
  garage door with photo-eye, pick-and-place with end switches, tank level with PID-like hysteresis,
  alarm acknowledgement (alarm word + ACK).
- HMI_1 screens: operator buttons, lamps, numeric fields and an alarm view bound to PLC tags.

## 4. Known limits (unchanged)

Educational simulator: not firmware-exact, does not download to real PLCs, no `.ap*` import. Safety
examples teach control logic only; real machines need safety relays or safety PLCs.
