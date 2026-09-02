import { integrationStatus, sendManagedEmail, sendManagedWhatsApp } from "../integrations/server.js";

const CHANNELS=new Set(["email","whatsapp"]);

function safeChannel(value){const channel=String(value||"").trim().toLowerCase();if(!CHANNELS.has(channel))throw new Error("Unsupported LANERIQ communication channel.");return channel;}
function safeRecipient(value,max=320){return String(value||"").trim().slice(0,max);}
function safeBody(value,max=12000){return String(value||"").trim().slice(0,max);}

export function laneriqCommunicationStatus(){
  const status=integrationStatus();
  return {
    service:"LANERIQ Communications",
    managedBackend:true,
    channels:{
      email:{ready:Boolean(status.email?.ready),managed:true},
      whatsapp:{ready:Boolean(status.whatsapp?.ready),managed:true},
    },
  };
}

export async function sendLaneriqCommunication({channel,to,subject,body,html}){
  const selected=safeChannel(channel);
  const recipient=safeRecipient(to);
  if(!recipient)return {status:"skipped",channel:selected,message:"Recipient is required."};
  if(selected==="email"){
    const result=await sendManagedEmail({to:recipient,subject:safeBody(subject,180)||"LANERIQ AI notification",text:safeBody(body,12000),html:html?safeBody(html,20000):undefined});
    return {...result,service:"LANERIQ Communications"};
  }
  const result=await sendManagedWhatsApp({to:recipient,body:safeBody(body,4000)});
  return {...result,service:"LANERIQ Communications"};
}
