import { laneriqEmailProviderStatus, sendLaneriqEmail } from "../email-provider/server.js";
import { integrationStatus, sendManagedWhatsApp } from "../integrations/server.js";

const SUPPORTED=new Set(["email","whatsapp"]);

function safeChannel(value){const channel=String(value||"").trim().toLowerCase();if(!SUPPORTED.has(channel))throw new Error("Unsupported LANERIQ delivery channel.");return channel;}

export function deliveryAdapterStatus(){
  const email=laneriqEmailProviderStatus();
  const status=integrationStatus();
  return {
    email:{ready:Boolean(email.ready),adapter:"laneriq-email",provider:"LANERIQ Email"},
    whatsapp:{ready:Boolean(status.whatsapp?.ready),adapter:"managed"},
  };
}

export async function deliverCommunication({channel,to,subject,body,html,purpose="transactional"}){
  const selected=safeChannel(channel);
  if(selected==="email")return sendLaneriqEmail({to,subject,text:body,html,purpose});
  return sendManagedWhatsApp({to,body});
}
