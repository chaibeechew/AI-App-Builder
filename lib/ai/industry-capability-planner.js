const PROFILES=Object.freeze([
  {
    id:"real_estate",label:"Real Estate",patterns:[/real estate/i,/property/i,/properties/i,/realtor/i,/estate agent/i,/房地产/,/房产/,/地产/],
    pages:["Home / discovery","Properties / listings","Property detail","Leads / enquiries","Appointments / viewings","Dashboard"],
    data:["properties","leads","appointments","users / agents"],
    workflows:["lead capture","viewing request","lead follow-up","team notification"],
    roles:["owner/admin","agent","customer/buyer when customer accounts are required"],
  },
  {
    id:"restaurant",label:"Restaurant / Food",patterns:[/restaurant/i,/cafe/i,/food/i,/menu/i,/餐厅/,/餐饮/,/咖啡/],
    pages:["Home","Menu / catalog","Item detail","Reservation or order flow","Customer contact","Operations dashboard"],
    data:["menu_items","customers","reservations and/or orders"],
    workflows:["reservation/order acknowledgement","customer confirmation","operations notification"],
    roles:["owner/admin","staff","customer when accounts are required"],
  },
  {
    id:"ecommerce",label:"E-commerce",patterns:[/e-?commerce/i,/online shop/i,/online store/i,/shopping/i,/product catalog/i,/电商/,/网店/,/商城/],
    pages:["Home","Products","Product detail","Cart","Checkout preparation","Orders / account","Dashboard"],
    data:["products","customers","orders","inventory when relevant"],
    workflows:["order creation","order confirmation","operations notification"],
    roles:["owner/admin","operations","customer"],
  },
  {
    id:"services",label:"Service Business",patterns:[/booking/i,/appointment/i,/salon/i,/repair service/i,/consulting/i,/professional service/i,/预约/,/服务/],
    pages:["Home","Services","Service detail","Booking / enquiry","Customer contact","Dashboard"],
    data:["services","customers/leads","appointments"],
    workflows:["booking request","confirmation","reminder","team notification"],
    roles:["owner/admin","staff/provider","customer when accounts are required"],
  },
  {
    id:"education",label:"Education / Training",patterns:[/school/i,/course/i,/training/i,/student/i,/learning/i,/tuition/i,/教育/,/课程/,/学生/],
    pages:["Home","Courses / programs","Course detail","Enrolment / enquiry","Learner area when required","Dashboard"],
    data:["courses","students/leads","enrolments"],
    workflows:["enrolment/enquiry acknowledgement","class reminder","admin notification"],
    roles:["owner/admin","teacher/staff","student when accounts are required"],
  },
  {
    id:"events",label:"Events",patterns:[/event/i,/conference/i,/ticket/i,/registration/i,/活动/,/大会/,/报名/],
    pages:["Home","Events","Event detail","Registration","Attendee information","Dashboard"],
    data:["events","attendees/leads","registrations"],
    workflows:["registration acknowledgement","event reminder","organizer notification"],
    roles:["owner/admin","organizer","attendee when accounts are required"],
  },
]);

const EXPLICIT_CAPABILITIES=Object.freeze([
  {id:"whatsapp",patterns:[/whatsapp/i],instruction:"Include a WhatsApp contact/automation integration point, but do not claim it is connected or send a real message without a configured provider and explicit user action."},
  {id:"email",patterns:[/email/i,/e-mail/i],instruction:"Include email contact/automation where relevant; preserve Safe Test and provider-readiness states."},
  {id:"booking",patterns:[/booking/i,/appointment/i,/reservation/i,/预约/],instruction:"Include a complete booking/appointment flow with data, validation, confirmation state and owner view."},
  {id:"payments",patterns:[/payment/i,/checkout/i,/subscription/i,/付款/,/支付/],instruction:"Include payment/checkout preparation but never invent a payment success, secret key or connected processor."},
  {id:"map",patterns:[/map/i,/location/i,/nearby/i,/地图/,/位置/],instruction:"Include map/location UX only with a clear permission purpose and a fallback when location permission is unavailable."},
  {id:"login",patterns:[/login/i,/sign in/i,/member/i,/会员/,/登录/],instruction:"Include authentication, ownership boundaries, role-aware access and explicit loading/error states."},
]);

function text(value){return String(value??"").trim();}
function uniq(values){return [...new Set(values.filter(Boolean))];}

export function inferIndustryCapabilities({idea="",industry=""}={}){
  const source=`${text(idea)}\n${text(industry)}`;
  const profile=PROFILES.find(item=>item.patterns.some(pattern=>pattern.test(source)))||null;
  const explicit=EXPLICIT_CAPABILITIES.filter(item=>item.patterns.some(pattern=>pattern.test(source)));
  if(!profile&&!explicit.length)return {matched:false,profileId:null,label:null,pages:[],data:[],workflows:[],roles:[],explicit:[],brief:""};
  const pages=uniq(profile?.pages||[]),data=uniq(profile?.data||[]),workflows=uniq(profile?.workflows||[]),roles=uniq(profile?.roles||[]);
  const rows=[
    "SOOLENAI INDUSTRY CAPABILITY PLAN:",
    profile?`Detected business pattern: ${profile.label}.`:"No single industry profile is authoritative; follow the customer's explicit requested capabilities.",
    pages.length?`Expected product areas: ${pages.join("; ")}.`:"",
    data.length?`Expected business data: ${data.join("; ")}.`:"",
    workflows.length?`Expected workflow coverage: ${workflows.join("; ")}.`:"",
    roles.length?`Expected roles/access thinking: ${roles.join("; ")}.`:"",
    ...explicit.map(item=>item.instruction),
    "These are completeness expectations, not permission to add unwanted complexity. Adapt to the customer's exact request and omit modules that clearly do not apply.",
    "Do not silently activate paid/metred providers, external messaging, payment processors, store submission or other side effects. When an integration is relevant but unavailable, build a clear integration point/readiness state rather than claiming it works.",
    "The generated App + Website should function as a real business product, not only a collection of attractive pages."
  ].filter(Boolean);
  return {matched:true,profileId:profile?.id||null,label:profile?.label||null,pages,data,workflows,roles,explicit:explicit.map(item=>item.id),brief:rows.join("\n")};
}

export {PROFILES as INDUSTRY_CAPABILITY_PROFILES};
