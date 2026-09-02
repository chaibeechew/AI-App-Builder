import { integrationStatus, sendManagedEmail, sendManagedWhatsApp } from "../integrations/server.js";

const SUPPORTED=new Set(["email","whatsapp"]);

function safeChannel(value){const channel=String(value||"").trim().toLowerCase();if(!SUPPORTED.has(channel))throw new Error("Unsupported LANERIQ delivery channel.");return channel;}

export function deliveryAdapterStatus(){
  const status=integrationStatus();
  return {
    email:{ready:Boolean(status.email?.ready),adapter:"managed"},
    whatsapp:{ready:Boolean(status.whatsapp?.ready),adapter:"managed"},
  };
}

export async function deliverCommunication({channel,to,subject,body,html}){
  const selected=safeChannel(channel);
  if(selected==="email")return sendManagedEmail({to,subject,text:body,html});
  return sendManagedWhatsApp({to,body});
}
