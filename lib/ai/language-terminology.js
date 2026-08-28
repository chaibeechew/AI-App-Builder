// Soolen AI global language + industry terminology knowledge layer.
// Keep this data provider-neutral so generated apps are not tied to one AI vendor.
export const SOOLEN_LANGUAGES = [
  ["en","English"],["zh-CN","简体中文"],["zh-TW","繁體中文"],["ms","Bahasa Melayu"],["id","Bahasa Indonesia"],["ta","தமிழ்"],["ja","日本語"],["ko","한국어"],["th","ไทย"],["vi","Tiếng Việt"],["fil","Filipino"],["hi","हिन्दी"],["bn","বাংলা"],["ur","اردو"],["ar","العربية"],["fa","فارسی"],["he","עברית"],["tr","Türkçe"],["es","Español"],["pt","Português"],["fr","Français"],["de","Deutsch"],["it","Italiano"],["nl","Nederlands"],["ru","Русский"],["uk","Українська"],["pl","Polski"],["cs","Čeština"],["sk","Slovenčina"],["ro","Română"],["hu","Magyar"],["el","Ελληνικά"],["sv","Svenska"],["no","Norsk"],["da","Dansk"],["fi","Suomi"],["bg","Български"],["sr","Српски"],["hr","Hrvatski"],["sl","Slovenščina"],["lt","Lietuvių"],["lv","Latviešu"],["et","Eesti"],["sw","Kiswahili"],["af","Afrikaans"],["am","አማርኛ"]
];

export const INDUSTRY_TERMINOLOGY = {
  real_estate:["listing","lead","prospect","viewing","booking","offer","SPA","sale and purchase agreement","commission","valuation","mortgage","conveyancing","agent","landlord","tenant","rental","property management"],
  finance:["KYC","AML","account","ledger","transaction","settlement","reconciliation","credit","debit","interest","loan","collateral","risk","portfolio","compliance"],
  healthcare:["patient","appointment","triage","diagnosis","prescription","clinical note","medical record","provider","care plan","referral","billing"],
  legal:["case","matter","client","retainer","contract","clause","precedent","filing","hearing","discovery","counsel","compliance"],
  ecommerce:["catalog","SKU","cart","checkout","order","payment","refund","fulfillment","inventory","shipping","coupon","conversion"],
  restaurant:["menu","table","reservation","covers","order","kitchen","POS","waitlist","delivery","takeaway","ingredient","allergen"],
  hospitality:["room","booking","check-in","check-out","occupancy","rate plan","housekeeping","guest","folio","amenity"],
  construction:["project","site","BOM","blueprint","RFI","variation order","subcontractor","milestone","quantity survey","inspection","handover"],
  education:["student","course","curriculum","lesson","assignment","assessment","grade","attendance","enrollment","faculty"],
  logistics:["shipment","consignment","waybill","tracking","warehouse","dispatch","delivery","route","carrier","ETA","proof of delivery"],
  automotive:["VIN","vehicle","service history","mileage","work order","parts","inspection","warranty","test drive","trade-in"],
  accounting:["invoice","receipt","accounts payable","accounts receivable","general ledger","journal","tax","audit","reconciliation","expense"],
  hr:["candidate","recruitment","employee","onboarding","leave","payroll","performance","benefits","job requisition","interview"],
  marketing:["campaign","audience","lead","funnel","CTR","conversion","creative","SEO","CPC","ROI","attribution"],
  insurance:["policy","premium","claim","underwriting","insured","beneficiary","coverage","deductible","renewal","adjuster"],
  technology:["workspace","user","role","permission","API","integration","webhook","deployment","analytics","subscription"]
};

export function getLanguageContext(language = "en") {
  const found = SOOLEN_LANGUAGES.find(([code]) => code === language);
  return { code: found?.[0] || "en", name: found?.[1] || "English", supportedLanguages: SOOLEN_LANGUAGES };
}

export function getIndustryTerminology(industry = "technology") {
  return INDUSTRY_TERMINOLOGY[industry] || INDUSTRY_TERMINOLOGY.technology;
}

export function buildSoolenGenerationContext({ language = "en", industry = "technology", terminology = [] } = {}) {
  return {
    language: getLanguageContext(language),
    industry,
    terminology: [...new Set([...getIndustryTerminology(industry), ...(Array.isArray(terminology) ? terminology : [])])],
    instruction: "Generate the app primarily in the requested language. Preserve recognized industry terminology where appropriate; do not blindly translate professional terms. Allow the user to switch app language without regenerating the app."
  };
}
