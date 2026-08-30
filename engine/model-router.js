const PROVIDERS=[
{provider:"gateway",model:process.env.AI_GATEWAY_MODEL||null,local:false,priority:0,enabled:()=>Boolean(process.env.AI_GATEWAY_API_KEY&&process.env.AI_GATEWAY_MODEL)},
{provider:"gemini",model:process.env.GEMINI_MODEL||"gemini-2.5-flash",local:false,priority:1,enabled:()=>Boolean(process.env.GEMINI_API_KEY)},
{provider:"groq",model:process.env.GROQ_MODEL||"llama-3.3-70b-versatile",local:false,priority:2,enabled:()=>Boolean(process.env.GROQ_API_KEY)},
{provider:"cerebras",model:process.env.CEREBRAS_MODEL||"llama-3.3-70b",local:false,priority:3,enabled:()=>Boolean(process.env.CEREBRAS_API_KEY)},
{provider:"deepseek",model:process.env.DEEPSEEK_MODEL||"deepseek-chat",local:false,priority:4,enabled:()=>Boolean(process.env.DEEPSEEK_API_KEY)},
{provider:"mistral",model:process.env.MISTRAL_MODEL||"mistral-small-latest",local:false,priority:5,enabled:()=>Boolean(process.env.MISTRAL_API_KEY)},
{provider:"together",model:process.env.TOGETHER_MODEL||"meta-llama/Llama-3.3-70B-Instruct-Turbo",local:false,priority:6,enabled:()=>Boolean(process.env.TOGETHER_API_KEY)},
{provider:"openrouter",model:process.env.OPENROUTER_MODEL||"openai/gpt-4o-mini",local:false,priority:7,enabled:()=>Boolean(process.env.OPENROUTER_API_KEY)},
{provider:"xai",model:process.env.XAI_MODEL||"grok-4-1-fast-non-reasoning",local:false,priority:8,enabled:()=>Boolean(process.env.XAI_API_KEY)},
{provider:"openai",model:process.env.OPENAI_MODEL||"gpt-5.6",local:false,priority:9,enabled:()=>Boolean(process.env.OPENAI_API_KEY)},
{provider:"ollama",model:process.env.OLLAMA_MODEL||"llama3.2:3b",local:true,priority:10,enabled:()=>Boolean(process.env.OLLAMA_BASE_URL)}];
export function getProvider(){const configured=(process.env.AI_PROVIDER||"").trim().toLowerCase();if(configured&&configured!=="auto")return configured;return PROVIDERS.filter(x=>x.enabled()).sort((a,b)=>a.priority-b.priority)[0]?.provider||null}
export function getModel(){const provider=getProvider();return PROVIDERS.find(x=>x.provider===provider)?.model||null}
export function getProviderConfig(){const provider=getProvider(),config=PROVIDERS.find(x=>x.provider===provider);return{provider,model:config?.model||null,local:config?.local||false,priority:config?.priority??99}}
export function getAvailableProviders(){return PROVIDERS.filter(x=>x.enabled()).sort((a,b)=>a.priority-b.priority).map(({provider,model,local,priority})=>({provider,model,local,priority}))}
