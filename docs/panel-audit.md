# Panel verification — 2026-09-07

This is an audit of PLC Lab Web, not certification of TIA Portal V20 equivalence.

## Corrected and checked in the browser

- Replaced the CSS-generated toolbar image/text with accessible buttons connected to editor actions.
- Network insertion, undo and redo change the actual program; undo/redo respect history and RUN locks.
- Tags and Watch open their corresponding editors.
- Instructions and Inspector toggle the real panels.
- Compile opens the current compiler diagnostics; Monitor changes monitoring state.
- Zoom adjusts the rung rendering without changing grid coordinates or program data; reset returns to 100%.
- Instructions, Tasks · Problem and Testing · Proses are actual labeled tabs. Their panel title follows selection.
- A newly inserted TOF has a continuous wire from the left rail to IN, with no automatically inserted START contact.
- Removed decorative Libraries/Add-ins labels that had no backing panels.

## Automated checks

158 tests pass, covering reference exercises, IEC timer/counter behavior, instance operands, numeric instructions, editable operand targets, exact symmetric symbol geometry, and branch layout. TypeScript and production build pass. These checks do not establish full TIA equivalence.

## Remaining differences identified by source audit

- Technology, Communication, Extended instructions and Favorites headings are placeholders.
- Several project tree entries (including external sources, OPC UA and technology objects) are placeholders.
- No hardware download/online discovery, native TIA project import, full device configuration, library management or add-in system.
- Numeric instructions are currently modeled as network outputs; arbitrary intermediate chains are not fully modeled.
- Block interface is a caption, not an editable TIA block declaration table.
- The toolbar now describes the operations actually implemented; the original decorative symbols were not a functional TIA command mapping.

Reference for IEC counter pin definitions: https://docs.tia.siemens.cloud/r/en-us/v20/scl-s7-1200-s7-1500/counter-operations-s7-1200-s7-1500/ctud-count-up-and-down-s7-1200-s7-1500


## 2026-09-08 expansion

- Seven new exercises (21–27): batch water transfer, two-component paint mixer, nut roasting/cooling, alternating pumps, conveyor jam watchdog, contactor feedback timeout, and 4–20 mA engineering-unit scaling/diagnostics.
- Tank, mixer and roaster have separate deterministic 10 ms plant models, sensor feedback, actuator-driven diagrams, 60-second trends, and process alarms. These are educational dynamics, not calibrated machinery models or production recipes.
- References are checked with four variants each; separate closed-loop tests run the three physical processes to DONE. A stuck-high-level sensor test verifies overflow detection and FAULT shutdown.
- Motor/pump exercises now show their actual output signal schematic rather than a conveyor. Analog inputs can be changed in the process panel.
- HMI_1 Screens is a real editor document. All 27 exercises are selectable there and in Tasks. References and automated checks use the existing server-side workflow.
- Inspector uses Properties / Info / Diagnostics, with Watch, test results, instructor and scan debugging under Info.
- Work-area Maximize hides tree, task card and Inspector; Embed restores prior panel dimensions/visibility. Fixed the former 1280 px minimum that pushed window controls out of view.
- Browser: paint recipe loaded through API, reference loaded, lid closed, START pressed in RUN; observed filling, mixing and PARTİ TAMAMLANDI. Checked roaster diagram, all 27 selector options, primary/secondary Inspector tabs and panel restore. No horizontal document overflow at 1186 px.

Siemens references used for layout and scope:
- Project view (V20): https://docs.tia.siemens.cloud/r/en-us/v20/introduction-to-the-tia-portal/user-interface-and-operation/layout-of-the-user-interface/project-view
- Inspector window (V20): https://docs.tia.siemens.cloud/r/en-us/v20/introduction-to-the-tia-portal/user-interface-and-operation/layout-of-the-user-interface/inspector-window
- Work-area maximize/restore (V20): https://docs.tia.siemens.cloud/r/en-us/v20/introduction-to-the-tia-portal/user-interface-and-operation/layout-of-the-user-interface/work-area/maximizing-and-minimizing-the-work-area
- Pump control example: https://support.industry.siemens.com/cs/attachments/109479747/109479747_CP1243-8_DedicatedLine_DOC_V10_en.pdf
- Conveyor monitoring example: https://cache.industry.siemens.com/dl/files/163/109748163/att_930550/v1/109748163_Plant_diagnostic_with_WinCCV741_en.pdf
- Analog input diagnostics (module-dependent): https://docs.tia.siemens.cloud/r/en-us/v20/editing-devices-and-networks/additional-information-on-configurations/distributed-i/o/et-200eco-pn/parameter-description-analog-input

Remaining differences above still apply. Exact TIA V20 GUI/function equivalence has not been achieved or certified.
