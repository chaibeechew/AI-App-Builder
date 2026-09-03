function safeObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function unique(values){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||"").trim()).filter(Boolean))];}

const BASELINE=Object.freeze({
  stability:[
    "Every generated data/action surface has explicit loading, empty, validation, error, retry, status and confirmation feedback instead of placeholder-only behavior.",
    "Navigation and primary actions use deterministic routes/state transitions with recoverable retry plus backup/offline-safe behavior where a connection can disappear.",
    "Saved project/version state is authoritative and replay-safe so an interrupted generation or mutation can recover without duplicating the customer project."
  ],
  privacy:[
    "Customer projects, uploaded assets and personal data are private by default; public visibility only begins after explicit consent through a version-bound publish action.",
    "Generated workflows minimize personal data, explain each data purpose and keep owner/customer records isolated by authenticated ownership and permission boundaries.",
    "Delete/export controls are planned where relevant, while optional permissions, analytics and external integrations remain consent-bound with a usable denial fallback."
  ],
  comfort:[
    "Mobile-first and responsive layouts keep navigation simple and clear, use accessible 44px-or-larger controls and preserve readable spacing on narrow screens.",
    "Search and filter interactions stay discoverable on data-heavy pages, with focused results and obvious recovery instead of desktop-only tables.",
    "Forms, primary actions and feedback use accessible labels, predictable focus behavior and low-friction responsive states across App and Website."
  ],
  naturalness:[
    "Primary workflows follow a natural real-world order users expect, preserving local context from the task through confirmation and the next useful action.",
    "UI copy uses human, friendly and context-aware language with personalized status where customer context exists, rather than robotic implementation terminology or fake provider claims.",
    "App and Website share one project identity, current version, design language and workflow terminology so switching surfaces feels continuous rather than duplicated."
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
      comfort:unique([...BASELINE.comfort,...(Array.isArray(qualityPlan.comfort)?qualityPlan.comfort:[])]),
      naturalness:unique([...BASELINE.naturalness,...(Array.isArray(qualityPlan.naturalness)?qualityPlan.naturalness:[])]),
    }
  };
}

export const GENERATED_QUALITY_BASELINE=BASELINE;
