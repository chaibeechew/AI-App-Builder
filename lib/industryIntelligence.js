import { INDUSTRIES, getTemplateCatalog } from './templateCatalog.js';
import { buildTrendingReferenceContext, selectTrendingAppReferences } from './trendingAppReferences.js';
import { INDUSTRY_INTELLIGENCE_PROFILES } from './industryIntelligenceProfiles.js';
import { buildGenerationVariantKey, selectDiverseTemplateSet } from './generationDiversity.js';

const INDUSTRY_SIGNALS = Object.freeze({
  'Real Estate': ['real estate','property','properties','realtor','agent','agency','房产','房地产','房源','地产'],
  'Property Management': ['property management','tenant','landlord','rental management','物业管理','租客','房东'],
  'Restaurant': ['restaurant','cafe','food','menu','reservation','餐厅','餐馆','菜单','订位'],
  'Healthcare': ['healthcare','clinic','doctor','patient','medical','医院','诊所','医生','病人'],
  'Education': ['education','school','course','student','learning','教育','学校','课程','学生'],
  'E-commerce': ['ecommerce','e-commerce','online store','shop','product','购物','电商','网店','商品'],
  'Retail': ['retail','store','shop','pos','零售','商店'],
  'Hotel & Hospitality': ['hotel','hospitality','resort','room booking','酒店','旅馆','度假村'],
  'Travel': ['travel','tour','trip','itinerary','旅游','旅行','行程'],
  'Logistics': ['logistics','delivery','fleet','shipment','warehouse','物流','配送','车队','仓库'],
  'Recruitment': ['recruitment','hiring','job','candidate','招聘','求职','候选人'],
  'Creator Economy': ['creator','influencer','content creator','fans','创作者','网红','内容'],
  'SaaS': ['saas','software as a service','subscription software','订阅软件'],
  'AI Services': ['ai service','ai app','artificial intelligence','agentic','人工智能','ai服务'],
});

const INDUSTRY_BLUEPRINTS = Object.freeze({
  'Real Estate': { archetypes:['crm','marketplace','booking','analytics'], entities:['properties','buyers','tenants','owners','agents','viewings','offers','commissions'], workflow:['lead capture','qualification','property matching','viewing','offer','closing','commission follow-up'] },
  'Property Management': { archetypes:['operations','crm','inventory','analytics'], entities:['properties','units','tenants','leases','maintenance requests','vendors','payments'], workflow:['tenant onboarding','lease tracking','maintenance triage','vendor assignment','payment follow-up','renewal'] },
  'Restaurant': { archetypes:['booking','store','operations','membership'], entities:['menu items','tables','reservations','orders','customers','staff','loyalty members'], workflow:['discover','reserve or order','kitchen preparation','fulfilment','payment','loyalty follow-up'] },
  'Healthcare': { archetypes:['booking','crm','operations','analytics'], entities:['patients','practitioners','appointments','consultations','care plans','documents','follow-ups'], workflow:['patient intake','appointment','consultation','care plan','follow-up','reporting'] },
  'Education': { archetypes:['learning','membership','community','analytics'], entities:['students','teachers','courses','lessons','assignments','progress','certificates'], workflow:['enrolment','learning plan','lesson delivery','assessment','progress review','completion'] },
  'E-commerce': { archetypes:['store','inventory','crm','analytics'], entities:['products','variants','customers','carts','orders','payments','shipments','promotions'], workflow:['discover','add to cart','checkout','payment','fulfilment','delivery','retention'] },
  'Retail': { archetypes:['store','inventory','crm','analytics'], entities:['products','inventory','customers','orders','suppliers','promotions'], workflow:['merchandise','sell','replenish','customer follow-up','reporting'] },
  'Hotel & Hospitality': { archetypes:['booking','operations','crm','membership'], entities:['rooms','guests','reservations','stays','services','staff','loyalty members'], workflow:['search','book','pre-arrival','check-in','stay service','check-out','loyalty follow-up'] },
  'Travel': { archetypes:['marketplace','booking','directory','crm'], entities:['travellers','trips','itineraries','bookings','destinations','suppliers','messages'], workflow:['discover','plan','book','prepare','travel','support','review'] },
  'Logistics': { archetypes:['operations','inventory','analytics','crm'], entities:['shipments','drivers','vehicles','routes','warehouses','customers','exceptions'], workflow:['order intake','dispatch','pickup','in transit','exception handling','delivery','proof of delivery'] },
  'Recruitment': { archetypes:['crm','marketplace','operations','analytics'], entities:['jobs','candidates','applications','interviews','offers','clients','recruiters'], workflow:['job intake','sourcing','screening','interview','offer','placement','follow-up'] },
  'Creator Economy': { archetypes:['community','membership','store','analytics'], entities:['creators','content','members','campaigns','products','messages','earnings'], workflow:['publish','engage','monetize','community nurture','campaign delivery','analytics'] },
  'SaaS': { archetypes:['membership','crm','analytics','operations'], entities:['accounts','users','workspaces','subscriptions','usage','tickets','invoices'], workflow:['signup','onboarding','activation','usage','support','renewal','expansion'] },
  'AI Services': { archetypes:['service','operations','analytics','membership'], entities:['users','agents','workflows','runs','providers','usage','evaluations'], workflow:['intent capture','plan','execute','evaluate','recover','deliver','learn'] },
});

const ARCHETYPE_SIGNALS = Object.freeze({
  booking:['booking','reservation','appointment','schedule','book','预约','预订','订位'], crm:['crm','lead','customer','client','pipeline','sales','顾客','客户','线索'], marketplace:['marketplace','listing','directory','browse','seller','buyer','平台','市场','列表'], store:['store','shop','cart','checkout','order','commerce','购物','商店','下单'], directory:['directory','map','listing','find nearby','目录','地图','附近'], operations:['operations','job tracking','workflow','dispatch','team','运营','工单','派单'], membership:['membership','subscription','member','portal','会员','订阅'], learning:['learning','course','lesson','quiz','student','课程','学习','测验'], service:['service','quote','project','consulting','服务','报价','项目'], inventory:['inventory','stock','supplier','warehouse','库存','供应商','仓库'], community:['community','social','feed','group','post','社区','动态','群组'], analytics:['analytics','report','dashboard','metric','kpi','分析','报表','指标'],
});
const STYLE_SIGNALS = Object.freeze({ luxury:['luxury','premium','editorial','high-end','高级','豪华','奢华'], glass:['glass','cinematic','immersive','liquid glass','玻璃','电影感','沉浸'], 'dark-tech':['dark','tech','futuristic','cyber','深色','科技','未来'], natural:['natural','warm','organic','human','自然','温暖','人性化'], minimal:['minimal','clean','simple','modern','极简','简洁','现代'] });

function normalize(input){return String(input||'').toLowerCase().slice(0,12000)}
function scoreSignals(text, signals){return signals.reduce((score,signal)=>score+(text.includes(signal)?Math.max(1,signal.length/5):0),0)}
function profileFor(industry){return INDUSTRY_BLUEPRINTS[industry]||INDUSTRY_INTELLIGENCE_PROFILES[industry]||{archetypes:[],entities:[],workflow:[]}}
function signalsFor(industry){return [...new Set([industry.toLowerCase(),...(INDUSTRY_SIGNALS[industry]||[]),...(INDUSTRY_INTELLIGENCE_PROFILES[industry]?.keywords||[])])]}

export function detectIndustryIntent(input){const text=normalize(input);let best=null;let bestScore=0;for(const industry of INDUSTRIES){const score=scoreSignals(text,signalsFor(industry));if(score>bestScore){best=industry;bestScore=score}}return {industry:best,confidence:bestScore>0?Math.min(0.98,0.48+bestScore/24):0};}
export function detectArchetypeIntent(input){const text=normalize(input);return Object.entries(ARCHETYPE_SIGNALS).map(([id,signals])=>({id,score:scoreSignals(text,signals)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.id);}
export function detectStyleIntent(input){const text=normalize(input);return Object.entries(STYLE_SIGNALS).map(([id,signals])=>({id,score:scoreSignals(text,signals)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]?.id||null;}

export function selectIndustryTemplateBlend(input,{limit=6,variantKey=''}={}){
  const {industry,confidence}=detectIndustryIntent(input);
  const explicitArchetypes=detectArchetypeIntent(input), styleId=detectStyleIntent(input), blueprint=profileFor(industry);
  const archetypeIds=[...new Set([...explicitArchetypes,...(blueprint.archetypes||[])])].slice(0,6);
  const safeVariant=variantKey||buildGenerationVariantKey(input);
  const diversity=selectDiverseTemplateSet({catalog:getTemplateCatalog(),industry,archetypeIds,styleId,variantKey:safeVariant,limit});
  return {
    industry,
    confidence,
    archetypeIds,
    styleId,
    entities:blueprint.entities||[],
    workflow:blueprint.workflow||[],
    templates:[...diversity.templates],
    diversity,
    trendingReferences:selectTrendingAppReferences(input,{limit:5}),
  };
}

export function buildIndustryIntelligenceContext(input,{variantKey=''}={}){
  const blend=selectIndustryTemplateBlend(input,{limit:6,variantKey});
  const lines=['LANERIQ AI Industry Intelligence Engine:','LANERIQ AI Generation Diversity Engine:'];
  if(blend.industry)lines.push(`Detected industry: ${blend.industry} (confidence ${blend.confidence.toFixed(2)}).`);
  else lines.push('No reliable industry detected. Stay industry-neutral: do not borrow entities, workflows, branding or assumptions from the first catalog industry.');
  if(blend.archetypeIds.length)lines.push(`Recommended product patterns: ${blend.archetypeIds.join(', ')}.`);
  if(blend.entities.length)lines.push(`Industry-native data entities to consider: ${blend.entities.join(', ')}.`);
  if(blend.workflow.length)lines.push(`Industry workflow to model: ${blend.workflow.join(' → ')}.`);
  if(blend.templates.length)lines.push(`Blend these LANERIQ inspiration patterns instead of cloning one template: ${blend.templates.map(t=>`${t.industry}/${t.archetype}/${t.style}`).join(' | ')}.`);
  lines.push(`Generation diversity fingerprint: ${blend.diversity.fingerprint}. Pre-generation originality gate: ${blend.diversity.gate.passed?'PASS':'REPLAN'} (${blend.diversity.gate.mode}).`);
  lines.push(`Variation axes: hero=${blend.diversity.axes.hero}; navigation=${blend.diversity.axes.navigation}; composition=${blend.diversity.axes.composition}; motion=${blend.diversity.axes.motion}. Use these as abstract composition constraints so repeated ideas do not collapse into the same layout.`);
  lines.push('The fingerprint and variation key are internal design controls only. Never display them to the end user, use them as branding, or infer identity from them.');
  lines.push(buildTrendingReferenceContext(input));
  lines.push('Treat every reference as inspiration-only. Re-plan the information architecture, flows, components, copy, visuals and interactions into an original LANERIQ AI Living Intelligence UI result.');
  return lines.join('\n');
}
