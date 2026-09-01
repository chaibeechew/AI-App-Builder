const MAX_IDEA_LENGTH=6000;
const MAX_LIST_ITEMS=12;
const MAX_ITEM_LENGTH=240;
const SECRET_KEY_PATTERN=/(password|passwd|secret|token|api.?key|credential|authorization|private.?key|auth.?key)/i;
const CORRECTION_PATTERN=/\b(instead|actually|change that|correction|not\s+.+\s+but)\b|不要.+改|不是.+是|改成|更正|sebaliknya|bukan.+tetapi/i;
const NEGATION_PATTERN=/\b(no|not|without|remove|exclude|don't|do not)\s*$/i;

const FEATURE_RULES=[
  ["authentication",/\b(login|log in|sign in|signup|sign up|authentication|account)\b|登录|登入|注册|帳戶|账号|akaun|log masuk/i],
  ["booking",/\b(book|booking|appointment|reservation|schedule)\b|预约|預約|预订|預訂|行程|tempahan|janji temu/i],
  ["payments",/\b(payment|pay|checkout|invoice|subscription|billing)\b|付款|支付|结账|結帳|账单|帳單|bayaran|pembayaran/i],
  ["messaging",/\b(chat|message|messaging|whatsapp|sms|inbox)\b|聊天|讯息|訊息|消息|聊天功能|mesej|sembang/i],
  ["crm",/\b(crm|lead|client management|customer management|follow[- ]?up)\b|客户管理|客戶管理|潜在客户|潛在客戶|跟进|跟進|pelanggan|susulan/i],
  ["listings",/\b(listing|listings|property|properties|catalog|catalogue|directory)\b|房源|房地产|房地產|物业|物業|目录|目錄|hartanah|senarai/i],
  ["orders",/\b(order|orders|cart|purchase|sales order)\b|订单|訂單|购物车|購物車|pesanan/i],
  ["inventory",/\b(inventory|stock|warehouse)\b|库存|庫存|仓库|倉庫|inventori|stok/i],
  ["search",/\b(search|filter|find|browse)\b|搜索|搜尋|筛选|篩選|查找|carian|tapis/i],
  ["reports",/\b(report|reports|analytics|dashboard|metrics)\b|报告|報告|分析|仪表板|儀表板|laporan|analitik/i],
  ["maps",/\b(map|maps|location|nearby|directions)\b|地图|地圖|位置|附近|peta|lokasi/i],
  ["media",/\b(upload|photo|photos|image|images|video|gallery|media)\b|上传|上傳|照片|图片|圖片|视频|影片|图库|圖庫|muat naik|gambar|video/i],
  ["content",/\b(post|posts|content|article|feed|creator)\b|帖子|内容|內容|文章|动态|動態|kandungan|siaran/i],
  ["learning",/\b(course|courses|lesson|lessons|learning|quiz|assignment)\b|课程|課程|学习|學習|课堂|課堂|作业|作業|kursus|pembelajaran/i],
  ["gameplay",/\b(game|play|player|level|score|battle|match)\b|游戏|遊戲|玩家|关卡|關卡|战斗|戰鬥|permainan|pemain/i],
];

const DOMAIN_RULES=[
  ["Real Estate",/\b(real estate|property|properties|realtor|agent|tenant|landlord)\b|房地产|房地產|地产|地產|房产|房產|物业|物業|hartanah/i],
  ["Food & Beverage",/\b(restaurant|cafe|food|menu|table|dining)\b|餐厅|餐廳|咖啡|菜单|菜單|makanan|restoran|kafe/i],
  ["Education",/\b(school|student|teacher|education|course|learning)\b|学校|學校|学生|學生|老师|老師|教育|课程|課程|sekolah|pelajar|guru/i],
  ["Commerce",/\b(shop|store|commerce|ecommerce|product|products|retail)\b|商店|商城|购物|購物|产品|產品|kedai|produk/i],
  ["Health Services",/\b(clinic|patient|medical|health|doctor|therapy)\b|诊所|診所|病人|患者|医疗|醫療|健康|klinik|pesakit/i],
  ["Travel",/\b(travel|trip|hotel|tour|itinerary|destination)\b|旅行|旅游|旅遊|酒店|行程|pelancongan|perjalanan|hotel/i],
  ["Social / Creator",/\b(social|creator|community|profile|feed|followers)\b|社交|创作者|創作者|社区|社區|关注|關注|sosial|komuniti/i],
  ["Game",/\b(game|moba|racing|shooter|rpg|puzzle|player)\b|游戏|遊戲|玩家|赛车|賽車|射击|射擊|permainan|pemain/i],
  ["Business Operations",/\b(crm|business|client|lead|sales|operations|workflow)\b|生意|业务|業務|客户|客戶|销售|銷售|operasi|perniagaan/i],
];

const AUDIENCE_RULES=[
  ["customers",/\b(customers?|clients?|buyers?|guests?|visitors?)\b|顾客|顧客|客户|客戶|买家|買家|访客|訪客|pelanggan|pembeli|tetamu/i],
  ["staff",/\b(staff|employees?|team members?|admins?|operators?)\b|员工|員工|团队|團隊|管理员|管理員|staf|pekerja|pasukan|pentadbir/i],
  ["agents",/\b(agents?|realtors?|brokers?|sales agents?)\b|经纪|經紀|代理|销售员|銷售員|ejen/i],
  ["students",/\b(students?|learners?)\b|学生|學生|学习者|學習者|pelajar/i],
  ["teachers",/\b(teachers?|educators?|tutors?)\b|老师|老師|教师|教師|导师|導師|guru|pengajar/i],
  ["players",/\b(players?|gamers?)\b|玩家|游戏者|遊戲者|pemain/i],
  ["patients",/\b(patients?|members?)\b|病人|患者|会员|會員|pesakit|ahli/i],
  ["family",/\b(family|parents?|children|kids)\b|家人|家庭|父母|孩子|keluarga|ibu bapa|kanak-kanak/i],
];

function clean(value,max=MAX_ITEM_LENGTH){return String(value??"").replace(/\s+/g," ").trim().slice(0,max);}
function unique(values,max=MAX_LIST_ITEMS){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v)).filter(Boolean))].slice(0,max);}
function safeObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function stripSecretKeys(value,depth=0){if(depth>4)return null;if(Array.isArray(value))return value.slice(0,MAX_LIST_ITEMS).map(v=>stripSecretKeys(v,depth+1));if(value&&typeof value==="object"){const out={};for(const [key,val] of Object.entries(value).slice(0,40)){if(SECRET_KEY_PATTERN.test(key))continue;out[clean(key,80)]=stripSecretKeys(val,depth+1);}return out;}if(typeof value==="string")return clean(value,1000);if(typeof value==="number"||typeof value==="boolean"||value===null)return value;return null;}

export function detectIdeaLanguage(value){const text=String(value||"");if(/[\u4e00-\u9fff]/.test(text))return"zh-CN";if(/[\u3040-\u30ff]/.test(text))return"ja";if(/[\uac00-\ud7af]/.test(text))return"ko";if(/[\u0e00-\u0e7f]/.test(text))return"th";if(/[\u0600-\u06ff]/.test(text))return"ar";if(/\b(saya|mahu|buat|aplikasi|pelanggan|untuk|boleh)\b/i.test(text))return"ms";return"en";}
function guidedField(text,labelPattern){const match=String(text||"").match(new RegExp(`${labelPattern}\\s*:\\s*([^\\n]+)`,`i`));const value=clean(match?.[1]||"",500);return /^(not specified|none|n\/a|未指定|没有|沒有)$/i.test(value)?"":value;}
function inferAudience(text){const explicit=guidedField(text,"Who will use this project\\?");if(explicit)return explicit;let winner={name:"",index:-1};for(const [name,pattern] of AUDIENCE_RULES){const index=String(text||"").search(pattern);if(index>winner.index)winner={name,index};}return winner.name;}
function inferDomain(text){for(const [name,pattern] of DOMAIN_RULES)if(pattern.test(text))return name;return"";}
function featureMatchState(text,pattern){const source=String(text||""),match=source.match(pattern);if(!match)return"absent";const index=Number(match.index||0),prefix=source.slice(Math.max(0,index-18),index);return NEGATION_PATTERN.test(prefix)||/(不要|不用|移除|删除|刪除|排除)\s*$/.test(prefix)?"negated":"present";}
function inferFeatures(text){const explicit=guidedField(text,"What must it include\\?");const found=[];if(explicit)found.push(...explicit.split(/[,;，、]+/));for(const [name,pattern] of FEATURE_RULES)if(featureMatchState(text,pattern)==="present")found.push(name);return unique(found,10);}
function inferNegatedFeatures(text){return unique(FEATURE_RULES.filter(([,pattern])=>featureMatchState(text,pattern)==="negated").map(([name])=>name),10);}
function explicitGoal(text){return guidedField(text,"What should it help them do\\?");}
function genericOnly(text){const normalized=clean(text,1000).toLowerCase();if(!normalized)return true;const stripped=normalized.replace(/\b(build|make|create|need|want|please|me|an?|the|app|application|website|web|good|nice|beautiful|premium|modern|simple|something|anything|for)\b/g," ").replace(/做|制作|製作|一个|一個|应用|應用|网站|網站|漂亮|高级|高級|现代|現代|简单|簡單|帮我|幫我/g," ").replace(/[^a-z0-9\u4e00-\u9fff]+/g," ").trim();return stripped.length<4;}
function gameIntent(text,domain,features){return domain==="Game"||features.includes("gameplay")||/\b(moba|rpg|shooter|racing game|mobile game)\b|手游|手机游戏|手機遊戲/i.test(text);}
function localizedQuestion(language,key){const zh={audience:"这个 App / Website 最主要给谁使用？",goal:"他们最重要要完成什么事情？",feature:"最少告诉我一个必须有的核心功能，例如预约、客户管理、付款或聊天。",purpose:"这个产品主要解决什么问题或属于什么行业？"};const ms={audience:"Siapa pengguna utama App / Website ini?",goal:"Apakah perkara utama yang mereka perlu lakukan?",feature:"Nyatakan sekurang-kurangnya satu fungsi utama, contohnya tempahan, CRM, bayaran atau mesej.",purpose:"Apakah masalah utama atau industri untuk produk ini?"};const en={audience:"Who is the main user of this App / Website?",goal:"What is the most important thing they need to accomplish?",feature:"Name at least one must-have capability, such as booking, CRM, payments or messaging.",purpose:"What main problem or industry is this product for?"};const map=language==="zh-CN"?zh:language==="ms"?ms:en;return map[key];}

export function evaluateIdeaReadiness(message,{audience="",features=[],domain="",goal=""}={}){
  const text=clean(message,MAX_IDEA_LENGTH),language=detectIdeaLanguage(text),inferredAudience=clean(audience,300)||inferAudience(text),inferredFeatures=unique(features.length?features:inferFeatures(text),10),inferredDomain=clean(domain,120)||inferDomain(text),inferredGoal=clean(goal,500)||explicitGoal(text);
  const hasPurpose=Boolean(inferredDomain||inferredGoal||inferredFeatures.length>=2),hasCapability=Boolean(inferredGoal||inferredFeatures.length>=1),audienceSatisfied=Boolean(inferredAudience),workflowSpecificity=Boolean(inferredGoal&&inferredFeatures.length>=1)||inferredFeatures.length>=2,vague=genericOnly(text);
  const readyToBuild=Boolean(!vague&&hasPurpose&&hasCapability&&(audienceSatisfied||workflowSpecificity)),missing=[];
  if(!hasPurpose)missing.push("purpose");if(!hasCapability)missing.push("feature");if(!audienceSatisfied&&!workflowSpecificity)missing.push("audience");if(inferredDomain&&!inferredGoal&&!inferredFeatures.length)missing.push("goal");
  const questions=readyToBuild?[]:unique(missing.map(key=>localizedQuestion(language,key)),3),signalCount=[hasPurpose,hasCapability,audienceSatisfied,workflowSpecificity,!vague].filter(Boolean).length;
  return {readyToBuild,language,audience:inferredAudience,features:inferredFeatures,domain:inferredDomain,goal:inferredGoal,questions,confidence:Math.min(.95,Math.max(.2,.3+signalCount*.13)),signals:{hasPurpose,hasCapability,audienceSatisfied,workflowSpecificity,vague}};
}

export function buildIdeaPlan(message,{modelPlan=null,previousPlan=null}={}){
  const text=clean(message,MAX_IDEA_LENGTH),raw=safeObject(modelPlan),previous=stripSecretKeys(safeObject(previousPlan))||{},sanitized=stripSecretKeys(raw)||{};
  const messageFeatures=inferFeatures(text),negatedFeatures=inferNegatedFeatures(text),messageAudience=inferAudience(text),messageDomain=inferDomain(text),messageGoal=explicitGoal(text);
  const previousFeatures=unique(previous.features,10).filter(feature=>!negatedFeatures.includes(feature)),confirmedFeatures=unique([...previousFeatures,...messageFeatures],10);
  const audience=messageAudience||clean(previous.audience,300),confirmedDomain=messageDomain||clean(previous.appType==="Unresolved"?"":previous.appType,120),goal=messageGoal||clean(previous.intent,500);
  const readiness=evaluateIdeaReadiness(text,{audience,features:confirmedFeatures,domain:confirmedDomain,goal}),suggestedFeatures=unique(sanitized.features,8),features=unique([...confirmedFeatures,...suggestedFeatures],10),appType=confirmedDomain||clean(sanitized.appType||sanitized.domain,120)||"Unresolved",isCorrection=CORRECTION_PATTERN.test(text),corrections=unique([...(Array.isArray(previous.corrections)?previous.corrections:[]),...(isCorrection?[text]:[])],8);
  return {normalizedIdea:text,language:readiness.language,intent:clean(goal||sanitized.intent||"Build an App + Website",500),audience:audience||"",appType,features,entities:unique(sanitized.entities||previous.entities,10),constraints:unique(sanitized.constraints||previous.constraints,10),questions:readiness.questions,corrections,confidence:readiness.confidence,readyToBuild:readiness.readyToBuild,gameIntent:gameIntent(text,confirmedDomain,confirmedFeatures),rawPrivateAssetsReusableAcrossCustomers:false,readiness:readiness.signals};
}

export const IDEA_PLANNING_LIMITS=Object.freeze({MAX_IDEA_LENGTH,MAX_LIST_ITEMS,MAX_ITEM_LENGTH});
