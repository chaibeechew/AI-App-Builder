export const PRECISE_EDIT_MEDIA_TYPES = Object.freeze(["text","image","video","audio","button","form","section","component"]);

export function buildPreciseEditInstruction({pageName="",pageIndex=null,sectionName="",sectionIndex=null,lineNumber=null,elementType="",position="",instruction=""}={}){
  const page = pageName ? `PAGE NAME: ${pageName}` : Number.isInteger(pageIndex) ? `PAGE NUMBER: ${pageIndex + 1}` : "PAGE: customer-selected page";
  const section = sectionName ? `SECTION: ${sectionName}` : Number.isInteger(sectionIndex) ? `SECTION NUMBER: ${sectionIndex + 1}` : "SECTION: infer only when unambiguous";
  const line = Number.isInteger(lineNumber) && lineNumber > 0 ? `CUSTOMER LINE/POSITION REFERENCE: line ${lineNumber}. Treat this as a visual/semantic position, not a source-code line number.` : "";
  const type = PRECISE_EDIT_MEDIA_TYPES.includes(String(elementType).toLowerCase()) ? `ELEMENT TYPE: ${String(elementType).toLowerCase()}` : "ELEMENT TYPE: infer from the request";
  const placement = position ? `PLACEMENT: ${String(position).slice(0,160)}` : "";
  return [
    "AI PRECISE EDITOR CONTRACT:",
    page,section,line,type,placement,
    "The customer may ask to add, replace, remove, move or modify text, images, video, audio, buttons, forms, sections or components at a precise visual location.",
    "Prefer stable semantic targeting: page -> section -> element -> before/after/inside position. Never interpret a customer-visible line number as a JavaScript/source-code line number.",
    "For image/video/audio requests, preserve customer-owned media references and use project media or approved generation tools. Never invent a successful upload, render or external media URL.",
    "For audio/video, preserve accessible controls, captions/transcript hooks where applicable, mobile playback safety and user control. Do not force autoplay with sound.",
    "Keep unrelated pages, data, workflows, permissions and working business logic unchanged unless explicitly requested.",
    "Create a new recoverable version and keep the previous version available for rollback.",
    `CUSTOMER REQUEST: ${String(instruction||"").trim().slice(0,4000)}`
  ].filter(Boolean).join("\n");
}
