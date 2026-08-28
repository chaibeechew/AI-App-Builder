import { NextResponse } from "next/server";

function esc(value) { return String(value).replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c])); }
function palette(prompt) {
  const p = prompt.toLowerCase();
  if (/real estate|property|房地产|房产/.test(p)) return ["#0B3B2E", "#D8BF62", "#F4EFE0"];
  if (/food|restaurant|咖啡|餐厅/.test(p)) return ["#7B3F24", "#E6A23C", "#FFF4E5"];
  if (/health|medical|医院|医疗/.test(p)) return ["#126E82", "#78C6A3", "#F2FBFA"];
  if (/finance|bank|金融|银行/.test(p)) return ["#102A43", "#3C9D9B", "#EAF4F4"];
  return ["#173F35", "#D8BF62", "#F5F8F5"];
}
export async function POST(request) {
  try {
    const { prompt, width = 1024, height = 1024 } = await request.json();
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) return NextResponse.json({ error:"Image prompt is required." }, { status:400 });
    if (cleanPrompt.length > 4000) return NextResponse.json({ error:"Image prompt is too long." }, { status:413 });
    const [primary, accent, background] = palette(cleanPrompt);
    const title = cleanPrompt.split(/[.!?。！？]/)[0].slice(0, 70);
    const w=Math.min(1536,Math.max(320,Number(width)||1024)), h=Math.min(1536,Math.max(320,Number(height)||1024));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${accent}"/></linearGradient><radialGradient id="r"><stop stop-color="${accent}" stop-opacity=".65"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="1024" height="1024" fill="${background}"/><circle cx="820" cy="170" r="300" fill="url(#r)"/><path d="M0 760 Q240 560 500 720 T1024 570 V1024 H0Z" fill="url(#g)"/><rect x="76" y="76" width="872" height="872" rx="64" fill="none" stroke="${primary}" stroke-opacity=".12" stroke-width="3"/><circle cx="220" cy="220" r="84" fill="${primary}"/><path d="M180 220h80M220 180v80" stroke="${accent}" stroke-width="16" stroke-linecap="round"/><text x="76" y="900" fill="${background}" font-family="Arial,sans-serif" font-size="32" font-weight="700">${esc(title)}</text></svg>`;
    return NextResponse.json({ success:true,image:`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,engine:"Soolen Image Engine",generated:true,note:"Original programmatic visual; no OpenAI image API used." });
  } catch(error) { console.error("SOOLEN_IMAGE_ENGINE_ERROR:",error); return NextResponse.json({error:error?.message||"Unable to generate image."},{status:500}); }
}
