import {createClient} from 'npm:@supabase/supabase-js@2.99.1';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type,apikey,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const hashPassword=async(p:string,s:string)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(s),iterations:310000,hash:'SHA-256'},k,256))).map(x=>x.toString(16).padStart(2,'0')).join('');};
const check=(r:any)=>{if(r.error)throw Error(r.error.message);return r;};
const out=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 if(req.method!=='POST')return out({error:'Método inválido'},405);
 try{
 const b=await req.json(); const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(b.action==='setup'||b.action==='login'){
 const ip=await sha(req.headers.get('x-forwarded-for')||'unknown');
 const {data:limit}=check(await db.from('ac_attempts').select('*').eq('ip_hash',ip).maybeSingle());
 if(limit && Date.now()-Date.parse(limit.window_start)<900000 && limit.attempts>=8)return out({error:'Aguarde 15 minutos antes de tentar novamente.'},429);
 check(await db.from('ac_attempts').upsert({ip_hash:ip,attempts:limit&&Date.now()-Date.parse(limit.window_start)<900000?limit.attempts+1:1,window_start:limit&&Date.now()-Date.parse(limit.window_start)<900000?limit.window_start:new Date().toISOString()}));
 const {data:a}=check(await db.from('ac_auth').select('*').eq('id',1).single());
 if(typeof b.password!=='string'||b.password.length<12||b.password.length>200)return out({error:'Use uma senha com 12 a 200 caracteres.'},400);
 if(b.action==='setup'){
 if(!a.setup_hash||await sha(b.setup_token||'')!==a.setup_hash)return out({error:'Link de ativação inválido ou já utilizado.'},403);
 const salt=crypto.randomUUID();const password_hash=await hashPassword(b.password,salt);
 const {data:changed}=check(await db.from('ac_auth').update({salt,password_hash,setup_hash:null}).eq('id',1).eq('setup_hash',a.setup_hash).select('id'));
 if(!changed.length)return out({error:'Ativação já concluída.'},409);
 }else if(!a.password_hash||await hashPassword(b.password,a.salt)!==a.password_hash)return out({error:'Senha incorreta.'},401);
 const session=crypto.randomUUID()+crypto.randomUUID();check(await db.from('ac_sessions').insert({token_hash:await sha(session),expires_at:new Date(Date.now()+30*86400000).toISOString()}));
 await db.from('ac_attempts').delete().eq('ip_hash',ip);
 return out({token:session});
 }
 const {data:session}=check(await db.from('ac_sessions').select('token_hash').eq('token_hash',await sha(token)).gt('expires_at',new Date().toISOString()).maybeSingle());
 if(!session)return out({error:'Entre para acessar seu arquivo.'},401);
 if(b.action==='logout'){check(await db.from('ac_sessions').delete().eq('token_hash',await sha(token)));return out({ok:true});}
 if(b.action==='catalog'){
 const files=check(await db.from('ac_files').select('*').order('name')).data;
 const total=check(await db.from('ac_records').select('id',{count:'exact',head:true})).count;
 let state:any[]=[];for(let offset=0;;offset+=1000){const rows=check(await db.from('ac_state').select('*').order('record_id').range(offset,offset+999)).data;state.push(...rows);if(rows.length<1000)break;}
 return out({files,total,state});
 }
 if(b.action==='list'){
 let q=db.from('ac_records').select('id,file_name,ordinal,title,created_at,model,roles',{count:'exact'});
 if(b.q)q=q.ilike('search_text','%'+String(b.q).replace(/[\\%_]/g,'\\$&')+'%');
 if(b.file)q=q.eq('file_name',b.file);
 if(b.role)q=q.contains('roles',[b.role]);
 if(b.start)q=q.gte('created_at',b.start+'T00:00:00-03:00');
 if(b.end)q=q.lte('created_at',b.end+'T23:59:59.999-03:00');
 if(b.ids){if(!b.ids.length)return out({rows:[],count:0});q=q.in('id',b.ids);}
 const offset=Math.max(0,Number(b.offset)||0);const r=check(await q.order('created_at',{ascending:b.sort==='oldest',nullsFirst:false}).order('id').range(offset,offset+49));return out({rows:r.data,count:r.count});
 }
 if(b.action==='record'){const r=check(await db.from('ac_records').select('id,file_name,ordinal,title,created_at,model,raw,raw_serialized').eq('id',b.id).single());if(r.data.raw_serialized!==null)r.data.raw=JSON.parse(r.data.raw_serialized);delete r.data.raw_serialized;return out(r.data);}
 if(b.action==='state'){
 const patch:any={updated_at:new Date().toISOString()};
 if(typeof b.favorite==='boolean')patch.favorite=b.favorite;
 if(typeof b.folder==='string')patch.folder=b.folder.slice(0,120);
 if(Number.isInteger(b.position)&&b.position>=0)patch.position=b.position;
 check(await db.from('ac_state').upsert({record_id:b.id},{onConflict:'record_id',ignoreDuplicates:true}));
 const r=check(await db.from('ac_state').update(patch).eq('record_id',b.id).select().single());return out(r.data);
 }
 if(b.action==='original'){
 const {data:f}=check(await db.from('ac_files').select('name,sha256').eq('name',b.name).single());
 const r=check(await db.storage.from('ac-originals').createSignedUrl(f.name,120));return out({url:r.data.signedUrl,sha256:f.sha256});
 }
 return out({error:'Ação inválida'},400);
 }catch(e){console.error(String(e));return out({error:'Falha ao processar a solicitação. Tente novamente.'},500);}
});
