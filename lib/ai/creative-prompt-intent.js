const MAX_PROMPT_CHARS=12000;
const COST_MODES=new Set(['zero','free','balanced','paid']);
const MODALITIES=new Set(['image','video','mixed']);
const PLATFORMS=new Set(['universal','app','web','social-vertical','social-square','youtube','app-store','google-play','game']);
const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLowerCase();
const boundedText=value=>clean(value).slice(0,MAX_PROMPT_CHARS);
const RULES=Object.freeze([
  {family:'real-estate',terms:['real estate','property','house','home','villa','mansion','condo','apartment','房产','房地产','豪宅','公寓','别墅','住宅']},
  {family:'ecommerce',terms:['ecommerce','e-commerce','product listing','marketplace','catalog','商品图','电商','商品详情','主图']},
  {family:'product-ad',terms:['product ad','product commercial','product campaign','产品广告','产品宣传','商品广告']},
  {family:'app-promo',terms:['app promo','app launch','mobile app','ios app','android app','应用宣传','app宣传','应用发布']},
  {family:'web-hero',terms:['web hero','website hero','landing hero','网站首页','网页主视觉','网站hero']},
  {family:'game-character',terms:['game character','character sheet','npc character','游戏角色','角色设定','人物设定']},
  {family:'game-world',terms:['game world','game environment','level environment','游戏场景','游戏世界','关卡场景']},
  {family:'cinematic-trailer',terms:['cinematic trailer','movie trailer','teaser trailer','电影预告','预告片','电影感预告']},
  {family:'social-short',terms:['short video','reels','tiktok','shorts','短视频','短片','reel']},
  {family:'storyboard',terms:['storyboard','shot board','分镜','故事板']},
  {family:'education-demo',terms:['tutorial','how to','explainer','education video','教程','教学视频','讲解视频']},
  {family:'avatar',terms:['talking avatar','avatar speech','digital human','数字人','虚拟人','口播头像']},
  {family:'brand-campaign',terms:['brand campaign','brand ad','campaign','branding','品牌广告','品牌宣传','品牌活动']},
]);
function scoreFamily(text,rule){let score=0;const matches=[];const terms=[...rule.terms].sort((a,b)=>b.length-a.length);for(const term of terms){if(!text.includes(term))continue;if(matches.some(existing=>existing.includes(term)||term.includes(existing)))continue;score+=term.length>=6?3:2;matches.push(term);}return {family:rule.family,score,matches};}
function detectModality(text,requested){const explicit=lower(requested);if(MODALITIES.has(explicit))return {value:explicit,source:'explicit'};const image=/\b(image|photo|poster|banner|thumbnail|wallpaper)\b|图片|海报|照片|主图|壁纸/.test(text);const video=/\b(video|film|clip|trailer|reel|shorts?)\b|视频|影片|短片|预告片/.test(text);return {value:image&&video?'mixed':video?'video':image?'image':'mixed',source:image||video?'prompt-signal':'safe-default'};}
function detectGoal(text){if(/convert|conversion|sell|sales|lead|purchase|book now|成交|销售|获客|转化|购买/.test(text))return 'conversion';if(/launch|release|announce|发布|上线|首发/.test(text))return 'launch';if(/teach|tutorial|explain|education|教程|教学|讲解/.test(text))return 'education';if(/story|storytelling|narrative|故事|叙事/.test(text))return 'storytelling';if(/engage|viral|social|互动|传播|社媒/.test(text))return 'engagement';if(/showcase|portfolio|展示|作品集/.test(text))return 'showcase';return 'awareness';}
function detectPlatform(text,requested){const explicit=lower(requested);if(PLATFORMS.has(explicit))return {value:explicit,source:'explicit'};if(/tiktok|reels|shorts|9:16|竖版|竖屏/.test(text))return {value:'social-vertical',source:'prompt-signal'};if(/instagram square|1:1|方形/.test(text))return {value:'social-square',source:'prompt-signal'};if(/youtube|16:9|横版|横屏/.test(text))return {value:'youtube',source:'prompt-signal'};if(/app store/.test(text))return {value:'app-store',source:'prompt-signal'};if(/google play/.test(text))return {value:'google-play',source:'prompt-signal'};if(/website|web hero|landing|网站|网页/.test(text))return {value:'web',source:'prompt-signal'};if(/\bapp\b|ios|android|应用/.test(text))return {value:'app',source:'prompt-signal'};if(/game|游戏/.test(text))return {value:'game',source:'prompt-signal'};return {value:'universal',source:'safe-default'};}
export function analyzeCreativePromptIntent(input={}){const prompt=boundedText(input.prompt);if(!prompt)return {ok:false,code:'CREATIVE_PROMPT_REQUIRED'};const text=prompt.toLowerCase();const ranked=RULES.map(rule=>scoreFamily(text,rule)).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.family.localeCompare(b.family));const family=ranked[0]?.family||'brand-campaign';const modality=detectModality(text,input.requestedModality);const platform=detectPlatform(text,input.requestedPlatform);const rawCost=lower(input.costMode||'zero');const costMode=COST_MODES.has(rawCost)?rawCost:'zero';const confidence=Math.min(1,Number(((ranked[0]?.score||0)/(Math.max(3,(ranked[0]?.score||0)+(ranked[1]?.score||0)))).toFixed(3)));
return {ok:true,schemaVersion:'creative-prompt-intent.v1',prompt,family,modality:modality.value,goal:detectGoal(text),platform:platform.value,costMode,confidence,familyCandidates:ranked.slice(0,5),signals:{modalitySource:modality.source,platformSource:platform.source,matchedTerms:ranked.flatMap(row=>row.matches).slice(0,20)},deterministicRuleExtraction:true,overlappingTermsDeduplicated:true,privateChainOfThoughtStored:false,hiddenModelWeightsRequired:false,truth:'CODE_READY'};}
