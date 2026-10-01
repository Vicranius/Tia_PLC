// TIA program status in LAD: green solid = fulfilled, blue dashed = not fulfilled,
// gray solid = unknown / not executed in the last scan. Offline edit view stays black.
export type FlowStatus='edit'|'fulfilled'|'unfulfilled'|'unknown';
export const LAD_STATUS_COLOR:Record<FlowStatus,string>={edit:'#202A33',fulfilled:'#13a538',unfulfilled:'#1f5fd6',unknown:'#9a9ea6'};
export const LAD_STATUS_DASH='4 3';
export const flowStatus=(online:boolean,executed:boolean,powered:boolean):FlowStatus=>!online?'edit':!executed?'unknown':powered?'fulfilled':'unfulfilled';
export const statusDash=(status:FlowStatus)=>status==='unfulfilled'?LAD_STATUS_DASH:undefined;
