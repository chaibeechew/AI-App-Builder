"use client";
import { useRef,useState } from "react";

function newRequestId(){try{return `enquiry-${crypto.randomUUID()}`}catch{return `enquiry-${Date.now()}-${Math.random().toString(36).slice(2)}`}}
function fingerprint(form){return JSON.stringify([form.name.trim(),form.email.trim().toLowerCase(),form.phone.trim(),form.message.trim()]);}

export default function WebsiteEnquiryForm({appId,enabled=true}){
  const[form,setForm]=useState({name:"",email:"",phone:"",message:"",website:""});const[sending,setSending]=useState(false);const[result,setResult]=useState("");const[error,setError]=useState("");const requestRef=useRef({fingerprint:"",requestId:""});
  function update(key,value){setForm(current=>({...current,[key]:value}));setResult("");setError("")}
  function requestId(){const fp=fingerprint(form);if(requestRef.current.fingerprint===fp&&requestRef.current.requestId)return requestRef.current.requestId;const id=newRequestId();requestRef.current={fingerprint:fp,requestId:id};return id;}
  async function submit(event){
    event.preventDefault();if(!enabled||sending)return;setSending(true);setError("");setResult("");
    try{
      const response=await fetch(`/api/public/website/${appId}/enquiries`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,requestId:requestId()})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error||"Unable to send your enquiry.");
      requestRef.current={fingerprint:"",requestId:""};setResult("Thanks — your enquiry was sent successfully.");setForm({name:"",email:"",phone:"",message:"",website:""});
    }catch(err){setError(String(err?.message||"Unable to send your enquiry."))}finally{setSending(false)}
  }
  if(!enabled)return <div className="previewNotice">Publish this website to activate the customer enquiry form.</div>;
  return <form className="enquiryForm" onSubmit={submit} noValidate>
    <div className="row"><label><span>Name</span><input value={form.name} onChange={e=>update("name",e.target.value)} maxLength={120} autoComplete="name" required/></label><label><span>Email</span><input value={form.email} onChange={e=>update("email",e.target.value)} maxLength={254} type="email" autoComplete="email"/></label></div>
    <label><span>Phone</span><input value={form.phone} onChange={e=>update("phone",e.target.value)} maxLength={50} type="tel" autoComplete="tel" placeholder="Email or phone is required"/></label>
    <label><span>How can we help?</span><textarea value={form.message} onChange={e=>update("message",e.target.value)} maxLength={2000} rows={5} required/></label>
    <label className="trap" aria-hidden="true"><span>Website</span><input value={form.website} onChange={e=>update("website",e.target.value)} tabIndex={-1} autoComplete="off"/></label>
    <button className="submit" type="submit" disabled={sending}>{sending?"Sending…":"Send Enquiry"}</button>
    {result&&<p className="ok" role="status">{result}</p>}{error&&<p className="fail" role="alert">{error}</p>}
    <style jsx>{`.enquiryForm{width:min(720px,100%);margin:28px auto 0;text-align:left;display:grid;gap:14px}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}label span{display:block;font-size:12px;font-weight:900;letter-spacing:.06em;margin:0 0 7px;color:#fff}input,textarea{width:100%;border:1px solid #ffffff40;background:#ffffff12;color:#fff;border-radius:14px;padding:14px 15px;font:inherit;outline:none}input{min-height:48px}textarea{resize:vertical;min-height:130px}input:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}.submit{min-height:50px;border:0;border-radius:999px;background:var(--accent);color:color-mix(in srgb,var(--foreground) 84%,#000);font-weight:950;padding:13px 20px;font-size:15px}.submit:disabled{opacity:.55}.ok,.fail{margin:0;padding:11px 13px;border-radius:12px;font-weight:800}.ok{background:#0f6b4380;color:#c6ffe4}.fail{background:#7a252580;color:#ffd0ca}.trap{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}.previewNotice{width:min(720px,100%);margin:26px auto 0;padding:16px;border-radius:14px;background:#ffffff12;border:1px solid #ffffff2b;color:#fff;font-weight:800}@media(max-width:640px){.row{grid-template-columns:1fr}input,textarea{font-size:16px}}`}</style>
  </form>;
}
