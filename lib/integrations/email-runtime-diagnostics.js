function clean(value){return String(value||"").trim();}

function mailbox(value){
  const raw=clean(value).replace(/[\r\n]+/g," ");
  const angle=raw.match(/<([^<>]+)>/);
  const address=(angle?angle[1]:raw).trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)?address:null;
}

function gmailCredential(value){
  return String(value||"")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g,"")
    .replace(/^["'`]+|["'`]+$/g,"");
}

export function emailTransportRuntimeDiagnostics(env=process.env){
  const host=clean(env.SMTP_HOST).toLowerCase();
  const portValue=Number(env.SMTP_PORT||465);
  const port=Number.isInteger(portValue)&&portValue>0&&portValue<=65535?portValue:465;
  const user=mailbox(env.SMTP_USER);
  const sender=mailbox(env.EMAIL_FROM);
  const smtpCredential=String(env.SMTP_PASS||"");
  const smtpConfigured=Boolean(host&&user&&smtpCredential&&sender);
  const resendConfigured=Boolean(env.RESEND_API_KEY&&sender);
  const gmail=host==="smtp.gmail.com";
  const normalizedCredential=gmail?gmailCredential(smtpCredential):smtpCredential;
  const credentialShapeValid=Boolean(smtpCredential)&&(!gmail||normalizedCredential.length===16);
  const senderAligned=Boolean(user&&sender&&user===sender);
  const portExpected=!gmail||port===465||port===587;

  let provider="none";
  if(smtpConfigured)provider=gmail?"gmail":"smtp";
  else if(resendConfigured)provider="resend";

  let configurationIssue=null;
  if(provider==="none")configurationIssue="transport_not_configured";
  else if(provider==="gmail"&&!credentialShapeValid)configurationIssue="gmail_credential_shape";
  else if(provider==="gmail"&&!portExpected)configurationIssue="gmail_port_unexpected";
  else if(provider==="gmail"&&!senderAligned)configurationIssue="gmail_sender_mismatch";

  return {
    provider,
    smtpConfigured,
    resendConfigured,
    gmail,
    portExpected,
    credentialShapeValid,
    senderAligned,
    configurationIssue,
  };
}
