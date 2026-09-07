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

121 tests pass, covering reference exercises, IEC timer/counter behavior, instance operands, numeric instructions, editable operand targets, exact symmetric symbol geometry, and branch layout. TypeScript and production build pass. These checks do not establish full TIA equivalence.

## Remaining differences identified by source audit

- Technology, Communication, Extended instructions and Favorites headings are placeholders.
- Several project tree entries (including external sources, OPC UA and technology objects) are placeholders.
- No hardware download/online discovery, native TIA project import, full device configuration, library management or add-in system.
- Numeric instructions are currently modeled as network outputs; arbitrary intermediate chains are not fully modeled.
- Block interface is a caption, not an editable TIA block declaration table.
- The toolbar now describes the operations actually implemented; the original decorative symbols were not a functional TIA command mapping.

Reference for IEC counter pin definitions: https://docs.tia.siemens.cloud/r/en-us/v20/scl-s7-1200-s7-1500/counter-operations-s7-1200-s7-1500/ctud-count-up-and-down-s7-1200-s7-1500
