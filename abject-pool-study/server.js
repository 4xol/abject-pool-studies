'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname,PUBLIC=path.join(ROOT,'public'),DATA=path.join(ROOT,'data'),UPLOAD=path.join(PUBLIC,'uploads');
fs.mkdirSync(DATA,{recursive:true});fs.mkdirSync(UPLOAD,{recursive:true});
const DB=path.join(DATA,'db.json');const PORT=Number(process.env.PORT||3000);
if(process.env.NODE_ENV==='production'&&!process.env.ADMIN_PASSWORD){throw new Error('Set ADMIN_PASSWORD before public deployment.')}
const PASS=process.env.ADMIN_PASSWORD||'change-me-before-publishing';
const POOLS=['Beautiful','Interesting','Disturbing','Uncanny','Empowering','Uncomfortable'];
let db;
if(fs.existsSync(DB)){db=JSON.parse(fs.readFileSync(DB,'utf8'));}
else{db={images:Array.from({length:24},(_,i)=>({id:'demo-'+String(i+1).padStart(2,'0'),url:'/images/demo-'+String(i+1).padStart(2,'0')+'.jpg',group:'unclassified',credit:'Demo source: user-provided visual-reference screenshot',demo:true})),responses:[],created:Date.now()};save();}
function save(){const tmp=DB+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,DB)}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
function auth(req){const x=req.headers['x-admin-password']||'';const a=Buffer.from(String(x)),b=Buffer.from(PASS);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function body(req,max=18000000){return new Promise((yes,no)=>{let s='',n=0;req.on('data',z=>{n+=z.length;if(n>max){no(new Error('File too large'));req.destroy();return}s+=z});req.on('end',()=>{try{yes(JSON.parse(s||'{}'))}catch(e){no(new Error('Bad JSON'))}});req.on('error',no)})}
function randomId(){return crypto.randomBytes(12).toString('hex')}
function csvcell(x){return '"'+String(x??'').replaceAll('"','""')+'"'}
function csv(rows){return rows.map(r=>r.map(csvcell).join(',')).join('\r\n')}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
function serve(req,res,url){let rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);let filename=path.resolve(PUBLIC,'.'+rel);if(!filename.startsWith(PUBLIC+path.sep)){res.writeHead(403);res.end();return}fs.stat(filename,(err,s)=>{if(err||!s.isFile()){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':rel.includes('/uploads/')?'public, max-age=3600':'no-cache'});fs.createReadStream(filename).pipe(res)})}
function adminSummary(){let images=db.images.map(im=>{let votes=Object.fromEntries(POOLS.map(p=>[p,0]));let seen=0;for(let r of db.responses){const tags=r.answers?.[im.id];if(tags){seen++;for(let tag of tags)if(votes[tag]!==undefined)votes[tag]++}}return {...im,votes,seen};});let groups={constructed:0,lived:0,unclassified:0};for(let im of images)groups[im.group]=(groups[im.group]||0)+1;let groupStats={};for(const g of ['constructed','lived','unclassified']){let ids=new Set(images.filter(x=>x.group===g).map(x=>x.id));let counts=Object.fromEntries(POOLS.map(p=>[p,0]));let trials=0;for(let r of db.responses)for(const [id,tags] of Object.entries(r.answers||{}))if(ids.has(id)){trials++;for(let p of tags)if(counts[p]!==undefined)counts[p]++}groupStats[g]={trials,counts}}return {images,groups,groupStats,submissionCount:db.responses.length,participants:db.responses.map(x=>({id:x.id,date:x.date,number:Object.keys(x.answers||{}).length})),pools:POOLS};}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const p=url.pathname;
 if(p==='/api/public/images'&&req.method==='GET'){return send(res,200,{images:db.images.filter(x=>x.url).map(({id,url,demo})=>({id,url,demo:!!demo})),pools:POOLS,previewOnly:db.images.some(x=>x.demo)});}
 if(p==='/api/public/submit'&&req.method==='POST'){
  const b=await body(req,250000);if(!b.answers||typeof b.answers!=='object'||Array.isArray(b.answers))return send(res,400,{error:'Missing answers'});
  const allowed=new Set(db.images.map(x=>x.id));const answers={};for(const [id,tags] of Object.entries(b.answers)){if(!allowed.has(id)||!Array.isArray(tags)||tags.length>POOLS.length||tags.some(x=>!POOLS.includes(x)))return send(res,400,{error:'Invalid response'});answers[id]=[...new Set(tags)]}
  if(Object.keys(answers).length<1)return send(res,400,{error:'Nothing classified'});
  const r={id:randomId(),date:new Date().toISOString(),answers};db.responses.push(r);save();return send(res,200,{ok:true,id:r.id});
 }
 if(p.startsWith('/api/admin/')){
  if(!auth(req))return send(res,401,{error:'Admin password required / incorrect'});
  if(p==='/api/admin/dashboard'&&req.method==='GET')return send(res,200,adminSummary());
  if(p==='/api/admin/image'&&req.method==='POST'){
   let b=await body(req,20000000);if(!['constructed','lived','unclassified'].includes(b.group))return send(res,400,{error:'Invalid hidden group'});
   if(b.data){let m=/^data:image\/(png|jpeg|webp);base64,([\s\S]+)$/.exec(b.data);if(!m)return send(res,400,{error:'Only PNG, JPEG, WebP'});let buf=Buffer.from(m[2],'base64');if(buf.length>6e6)return send(res,400,{error:'Image over 6 MB'});const ext=m[1]==='jpeg'?'jpg':m[1],id=randomId();fs.writeFileSync(path.join(UPLOAD,id+'.'+ext),buf);db.images.push({id,url:'/uploads/'+id+'.'+ext,group:b.group,credit:String(b.credit||'').slice(0,500),demo:false});save();return send(res,200,{ok:true,id});}
   if(b.url&&/^https?:\/\//.test(b.url)){const id=randomId();db.images.push({id,url:b.url,group:b.group,credit:String(b.credit||'').slice(0,500),demo:false});save();return send(res,200,{ok:true,id});}
   return send(res,400,{error:'No image uploaded'});
  }
  if(p==='/api/admin/image'&&req.method==='PATCH'){let b=await body(req);let im=db.images.find(i=>i.id===b.id);if(!im)return send(res,404,{error:'Unknown image'});if(b.group&&!['constructed','lived','unclassified'].includes(b.group))return send(res,400,{error:'Invalid group'});if(b.group)im.group=b.group;if(typeof b.credit==='string')im.credit=b.credit.slice(0,500);save();return send(res,200,{ok:true});}
  if(p==='/api/admin/image'&&req.method==='DELETE'){let b=await body(req),im=db.images.find(i=>i.id===b.id);if(!im)return send(res,404,{error:'Unknown image'});db.images=db.images.filter(i=>i.id!==b.id);if(im.url.startsWith('/uploads/')){try{fs.unlinkSync(path.join(PUBLIC,im.url))}catch{}}save();return send(res,200,{ok:true});}
  if(p==='/api/admin/export'&&req.method==='GET'){
   let rows=[['response_id','date','image_id','hidden_group','image_credit','beautiful','interesting','disturbing','uncanny','empowering','uncomfortable']];let imgs=Object.fromEntries(db.images.map(i=>[i.id,i]));for(let r of db.responses)for(let [id,tags] of Object.entries(r.answers)){let im=imgs[id]||{};rows.push([r.id,r.date,id,im.group||'removed',im.credit||'',...POOLS.map(x=>tags.includes(x)?1:0)])}res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="abject-study-results.csv"'});return res.end('\ufeff'+csv(rows));
  }
  if(p==='/api/admin/reset'&&req.method==='POST'){let b=await body(req);if(b.confirm!=='RESET_RESPONSES')return send(res,400,{error:'Confirmation missing'});db.responses=[];save();return send(res,200,{ok:true});}
 }
 if(p.startsWith('/api/'))return send(res,404,{error:'No such endpoint'});
 return serve(req,res,url);
 }catch(e){return send(res,500,{error:e.message||'Server error'})}});
server.listen(PORT,'0.0.0.0',()=>console.log(`Abject Body Study: http://localhost:${PORT}\nAdmin password: configured via ADMIN_PASSWORD`));
