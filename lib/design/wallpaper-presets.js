export const WALLPAPER_PRESETS = Object.freeze([
  { id:"golden-valley", name:"Golden Valley", description:"Warm sunrise, dramatic peaks and a luminous river.", stages:["idea","understand","plan","design"] },
  { id:"ocean-glow", name:"Ocean Glow", description:"Deep ocean horizon with soft aurora light and islands.", stages:["media","preview"] },
  { id:"emerald-falls", name:"Emerald Falls", description:"Forest cliffs, mist and cascading water with premium depth.", stages:["data","automation","edit"] },
  { id:"neon-skyline", name:"Neon Skyline", description:"Modern city silhouettes, atmospheric glow and clean technology energy.", stages:["build","operations"] },
  { id:"desert-glass", name:"Desert Glass", description:"Sculpted dunes, glass architecture and soft editorial light.", stages:["connect","payments","pro"] },
  { id:"aurora-lake", name:"Aurora Lake", description:"Reflective lake, aurora ribbons and quiet mountain layers.", stages:["quality","test","analytics"] },
  { id:"cloud-kingdom", name:"Cloud Kingdom", description:"Floating architecture, cloud valleys and a bright celestial horizon.", stages:["publish","release","success"] },
]);

const DEFAULTS={primary:"#0b3b2e",accent:"#d8bf62",background:"#03100d",surface:"#102820"};
const STAGE_ORDER=["idea","understand","plan","media","build","connect","quality","preview","publish","release","data","automation","edit","operations","analytics","pro"];
function color(value,fallback){const v=String(value||"").trim();return /^#[0-9a-f]{6}$/i.test(v)?v:fallback;}
function hash(value){let h=2166136261;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return Math.abs(h>>>0);}
function sceneIndex(id){const index=WALLPAPER_PRESETS.findIndex(x=>x.id===id);return index<0?0:index;}
export function resolveWallpaperId(id,fallback="neon-skyline"){return WALLPAPER_PRESETS.some(x=>x.id===id)?id:fallback;}
function skyline(index,primary,accent){const blocks=[];for(let i=0;i<13;i++){const x=48+i*84+(index%3)*8;const h=70+((i*37+index*29)%150);const w=42+((i*19)%38);blocks.push(`<rect x="${x}" y="${570-h}" width="${w}" height="${h}" rx="5" fill="${primary}" opacity="${0.34+(i%4)*0.08}"/><rect x="${x+9}" y="${585-h}" width="5" height="5" fill="${accent}" opacity=".8"/>`);}return blocks.join("");}
function stars(index,accent,count=22){const dots=[];for(let i=0;i<count;i++){const x=30+((i*83+index*47)%1130),y=35+((i*53+index*31)%300),r=1+((i+index)%3);dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" opacity="${0.25+(i%5)*0.09}"/>`);}return dots.join("");}
export function wallpaperSvg(id,{primary=DEFAULTS.primary,accent=DEFAULTS.accent,background=DEFAULTS.background,surface=DEFAULTS.surface}={}){
  const preset=resolveWallpaperId(id);const index=sceneIndex(preset);
  primary=color(primary,DEFAULTS.primary);accent=color(accent,DEFAULTS.accent);background=color(background,DEFAULTS.background);surface=color(surface,DEFAULTS.surface);
  const moonX=850-(index%4)*95,moonY=150+(index%3)*25,moonR=92+(index%2)*28;
  const ridgeA=`M0 ${455+(index%3)*18} Q180 ${320+(index%2)*55} 330 ${430-(index%3)*22} T650 ${390+(index%4)*18} T940 ${405-(index%2)*32} T1200 ${345+(index%3)*35} V800 H0Z`;
  const ridgeB=`M0 ${565-(index%2)*25} Q220 ${450+(index%4)*16} 430 ${545-(index%3)*28} T780 ${500+(index%2)*26} T1200 ${455+(index%3)*25} V800 H0Z`;
  const river=`M${420+(index%3)*90} 800 C${470+(index%4)*70} 690 ${620-(index%3)*35} 630 ${650+(index%2)*50} 540 C${705+(index%2)*60} 455 ${760-(index%3)*25} 410 ${820+(index%3)*45} 340 L${890+(index%2)*30} 365 C${825+(index%3)*35} 455 ${800+(index%2)*25} 535 ${760+(index%3)*45} 620 C${720+(index%2)*45} 705 ${690+(index%3)*20} 760 ${650+(index%2)*25} 800Z`;
  const showCity=[0,3,6].includes(index);const showFalls=[1,2,5].includes(index);
  const falls=showFalls?`<path d="M760 390 C740 460 748 520 720 580 C700 625 700 680 675 800 L765 800 C785 700 795 640 812 575 C830 510 828 455 845 402Z" fill="url(#water)" opacity=".72"/>`:"";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${background}"/><stop offset=".52" stop-color="${primary}"/><stop offset="1" stop-color="${surface}"/></linearGradient><linearGradient id="ridge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${background}"/></linearGradient><linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}" stop-opacity=".86"/><stop offset="1" stop-color="#ffffff" stop-opacity=".24"/></linearGradient><radialGradient id="halo"><stop stop-color="${accent}" stop-opacity=".62"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="34"/></filter></defs><rect width="1200" height="800" fill="url(#sky)"/><ellipse cx="${moonX}" cy="${moonY}" rx="250" ry="180" fill="url(#halo)" filter="url(#blur)"/><circle cx="${moonX}" cy="${moonY}" r="${moonR}" fill="#fff4d1" opacity=".84"/>${stars(index,accent)}<path d="${ridgeA}" fill="${background}" opacity=".66"/><path d="${ridgeB}" fill="url(#ridge)" opacity=".94"/>${showCity?skyline(index,primary,accent):""}${falls}<path d="${river}" fill="url(#water)" opacity=".62"/><ellipse cx="600" cy="700" rx="520" ry="95" fill="#ffffff" opacity=".035"/><rect width="1200" height="800" fill="url(#halo)" opacity=".10"/></svg>`;
}
export function wallpaperDataUri(id,colors={}){return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(wallpaperSvg(id,colors))}`;}
export function wallpaperStyle(id,colors={}){const uri=wallpaperDataUri(id,colors);return {backgroundImage:`linear-gradient(180deg,rgba(1,9,8,.10),rgba(1,9,8,.72)),url("${uri}")`,backgroundSize:"cover",backgroundPosition:"center",backgroundRepeat:"no-repeat"};}
export function pickWallpaperForStage(stage,seed="session"){const key=String(stage||"idea").toLowerCase();const matchedStage=STAGE_ORDER.find(item=>key.includes(item));if(matchedStage){const base=STAGE_ORDER.indexOf(matchedStage)%WALLPAPER_PRESETS.length;const shift=hash(seed)%WALLPAPER_PRESETS.length;return WALLPAPER_PRESETS[(base+shift)%WALLPAPER_PRESETS.length].id;}return WALLPAPER_PRESETS[hash(`${seed}:${key}`)%WALLPAPER_PRESETS.length].id;}
