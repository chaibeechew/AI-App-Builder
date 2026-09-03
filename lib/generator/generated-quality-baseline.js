function safeObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function unique(values){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||"").trim()).filter(Boolean))];}

const BASELINE=Object.freeze({
  stability:[
    "Every generated data/action surface has explicit loading, empty, validation, error, retry and success feedback instead of placeholder-only behavior.",
    "Navigation and primary actions use deterministic routes/state transitions with recoverable back/retry behavior on mobile and web.",
    "Saved project/version state is authoritative and replay-safe so an interrupted generation or mutation can recover without duplicating the customer project."
  ],
  privacy:[
    "Customer projects and uploaded assets are private by default; public visibility only begins after an explicit version-bound publish action.",
    "Generated workflows minimize personal data, explain the purpose of collected fields and keep owner/customer data isolated by authenticated ownership boundaries.",
    "Optional permissions, analytics and external integrations remain off or consent-bound until the product actually needs them; denial has a usable fallback."
  ],
  naturalness:[
    "Primary flows follow the real-world order users expect: understand context, perform the main task, confirm the result and expose the next useful action.",
    "UI copy uses concise human labels, contextual status and actionable error language rather than robotic implementation terminology or fake provider claims.",
    "App and Website share one project identity, current version, design language and customer terminology so switching surfaces feels continuous rather than duplicated."
  ]
});

export function applyGeneratedQualityBaseline(specification={}){
  const spec=safeObject(specification);
  const qualityPlan=safeObject(spec.qualityPlan);
  const design=safeObject(spec.designSystem);
  const primary=String(design.primaryColor||"").trim();
  const accent=String(design.accentColor||"").trim();
  return {
    ...spec,
    designSystem:{
      ...design,
      themeMode:String(design.themeMode||"auto"),
      colorPreference:String(design.colorPreference||"Auto Theme coordinated across App and Website"),
      paletteRationale:String(design.paletteRationale||`Use ${primary||"the industry primary color"} with ${accent||"a restrained accent"} as one accessible hierarchy across backgrounds, surfaces, cards, controls, icons and imagery.`),
    },
    qualityPlan:{
      ...qualityPlan,
      stability:unique([...BASELINE.stability,...(Array.isArray(qualityPlan.stability)?qualityPlan.stability:[])]),
      privacy:unique([...BASELINE.privacy,...(Array.isArray(qualityPlan.privacy)?qualityPlan.privacy:[])]),
      naturalness:unique([...BASELINE.naturalness,...(Array.isArray(qualityPlan.naturalness)?qualityPlan.naturalness:[])]),
    }
  };
}

export const GENERATED_QUALITY_BASELINE=BASELINE;
