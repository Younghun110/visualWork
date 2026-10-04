import project from '../schema.json';
import {resolveConnection} from './api-config';
const failure=(message,status)=>Response.json({success:false,message,data:null},{status});
export async function forward(request,kind,method){
  if(method==='POST'&&!['http://'+request.headers.get('host'),'https://'+request.headers.get('host')].includes(request.headers.get('origin')))return failure('허용되지 않은 요청입니다.',403);
  const query=new URL(request.url).searchParams;
  let connection;
  try{connection=resolveConnection(project,query.get('screen')||'main',query.get('component')||undefined,kind);}catch(error){return failure(error.message,400);}
  let body;
  if(method==='POST'){try{body=await request.json();}catch{return failure('JSON 형식이 올바르지 않습니다.',400);}}
  if(method==='GET'&&query.has('input')){try{body=JSON.parse(query.get('input'));}catch{return failure('JSON 형식이 올바르지 않습니다.',400);}}
  const missing=[...connection.path.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].find(match=>body?.[match[1]]===undefined||body[match[1]]===null||body[match[1]]==='');
  if(missing)return failure('경로 파라미터 '+missing[1]+'이(가) 필요합니다.',400);
  try{
    const methodToSend=connection.api?.method||method;
    const apiPath=connection.path.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(_,key)=>{if(body?.[key]===undefined||body[key]===null||body[key]==='')throw Error('경로 파라미터 '+key+'이(가) 필요합니다.');return encodeURIComponent(String(body[key]));});
    const url=new URL(apiPath,process.env.VISUALBACK_URL||'http://127.0.0.1:4000');
    if(kind==='grid')for(const key of ['page','size'])if(query.has(key))url.searchParams.set(key,query.get(key));
    if(methodToSend==='GET'&&body)for(const [key,value]of Object.entries(body))url.searchParams.set(key,typeof value==='object'?JSON.stringify(value):String(value));
    const response=await fetch(url,{method:methodToSend,cache:'no-store',signal:AbortSignal.timeout(10000),...(methodToSend!=='GET'&&body!==undefined?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    const payload=await response.json();
    if(typeof payload.success!=='boolean'||typeof payload.message!=='string'||!Object.hasOwn(payload,'data'))return failure('API 응답은 success, message, data 구조여야 합니다.',502);
    return Response.json(payload,{status:response.status});
  }catch{return failure('VisualBack API에 연결할 수 없습니다.',502);}
}
