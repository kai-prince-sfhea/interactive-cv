// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Explicit read-only author audit. It never cleans files or grants permission.
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import './export.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw new Error('interactive-cv audit: '+x);};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>JSON.stringify(x&&typeof x==='object'?(Array.isArray(x)?x.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(canonical(x[k]))]))):x);
const safeRelative=x=>typeof x==='string'&&/^[A-Za-z0-9_./-]+\.html(?:#[A-Za-z0-9_-]+)?$/u.test(x)&&!x.startsWith('/')&&!x.split('/').some(p=>!p||p==='.'||p==='..');
function decodeHtml(s){return s.replace(/&#(x[\da-f]+|\d+);/giu,(_,n)=>{const c=parseInt(n[0].toLowerCase()==='x'?n.slice(1):n,n[0].toLowerCase()==='x'?16:10);return c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&quot;/gu,'"').replace(/&#39;|&apos;/gu,"'").replace(/&lt;/gu,'<').replace(/&gt;/gu,'>').replace(/&amp;/gu,'&');}
const visibleHtml=s=>decodeHtml(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu,'').replace(/<[^>]*>/gu,''));
function jsonStrings(value){const stack=[{value,depth:0}],texts=[];let count=0;while(stack.length){const {value:v,depth}=stack.pop();if(depth>64||++count>100000)fail('JSON output exceeds text-audit structural limit');if(typeof v==='string')texts.push(v);else if(v&&typeof v==='object')for(const x of Object.values(v))stack.push({value:x,depth:depth+1});}return texts.join('\n');}
function zipText(bytes){
  let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(bytes.readUInt32LE(p)===0x06054b50){end=p;break;}
  if(end<0)fail('invalid DOCX ZIP');const count=bytes.readUInt16LE(end+10);if(count>2000)fail('DOCX has too many entries');
  let p=bytes.readUInt32LE(end+16),total=0,text='';
  for(let i=0;i<count;i++){
    if(p+46>bytes.length||bytes.readUInt32LE(p)!==0x02014b50)fail('invalid DOCX directory');
    const flags=bytes.readUInt16LE(p+8),method=bytes.readUInt16LE(p+10),packed=bytes.readUInt32LE(p+20),size=bytes.readUInt32LE(p+24),n=bytes.readUInt16LE(p+28),extra=bytes.readUInt16LE(p+30),comment=bytes.readUInt16LE(p+32),offset=bytes.readUInt32LE(p+42);
    const name=bytes.subarray(p+46,p+46+n).toString('utf8');p+=46+n+extra+comment;
    if(flags&1||size>16777216||total+size>67108864)fail('encrypted/excessive DOCX entry');total+=size;
    if(!/\.(?:xml|rels)$/u.test(name))continue;
    if(offset+30>bytes.length||bytes.readUInt32LE(offset)!==0x04034b50)fail('invalid DOCX local entry');
    const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28);if(start+packed>bytes.length)fail('truncated DOCX');
    const data=bytes.subarray(start,start+packed),raw=method===0?data:method===8?inflateRawSync(data,{maxOutputLength:16777216}):null;
    if(!raw||raw.length!==size)fail('unsupported/corrupt DOCX entry');text+='\n'+raw.toString('utf8');
  }
  return text;
}
function readModel(body){
  const models=[];
  for(const m of body.matchAll(/<script\b(?=[^>]*\bclass="interactive-cv-model")(?=[^>]*\btype="application\/json")[^>]*>([\s\S]*?)<\/script>/gu)){
    if(Buffer.byteLength(m[1])>2097152)fail('public model exceeds 2 MiB');
    const model=JSON.parse(m[1]);
    if(!object(model)||Object.keys(model).some(k=>!['version','asOf','records'].includes(k))||model.version!==1||typeof model.asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/u.test(model.asOf)||!Array.isArray(model.records)||model.records.length>2000)fail('invalid public model');
    const day=new Date(model.asOf+'T00:00:00Z');if(!Number.isFinite(day.valueOf())||day.toISOString().slice(0,10)!==model.asOf)fail('invalid public model date');
    if(model.records.length)globalThis.InteractiveCVExport.selectRecords(model,model.records.map(r=>r.id));
    if(model.records.some(r=>!['author-reviewed','independently-reviewed'].includes(r.publicationReview)))fail('public model has unreviewed publication');
    models.push(model);
  }
  return models;
}
function destinationBody(html,anchor){
  if(!anchor)return html;
  const start=new RegExp('<([A-Za-z][A-Za-z0-9]*)\\b[^>]*\\bid=["\']'+anchor+'["\'][^>]*>','u').exec(html);if(!start)return null;
  const tag=start[1],tokens=new RegExp('<\\/?'+tag+'\\b[^>]*>','giu');tokens.lastIndex=start.index;let depth=0,m;
  while((m=tokens.exec(html))){depth+=m[0].startsWith('</')?-1:1;if(depth===0)return html.slice(start.index,tokens.lastIndex);}
  return null;
}
export function auditSite({outputDir,policy,previous=null}){
  if(!object(policy)||policy.version!==1||typeof policy.asOf!=='string'||!Array.isArray(policy.expectedIds)||policy.expectedIds.length>2000||new Set(policy.expectedIds).size!==policy.expectedIds.length||policy.expectedIds.some(id=>typeof id!=='string'||!id))fail('policy needs version 1, asOf and unique expectedIds from the intended public projection');
  for(const k of Object.keys(policy))if(!['version','asOf','expectedIds','forbidden','expectedModelSha256'].includes(k))fail('unknown policy field');
  const forbidden=policy.forbidden||[];if(!Array.isArray(forbidden)||forbidden.length>1000||forbidden.some(s=>typeof s!=='string'||!s||s.length>8192))fail('invalid forbidden markers');
  if(policy.expectedModelSha256&&!/^[0-9a-f]{64}$/u.test(policy.expectedModelSha256))fail('invalid expected model digest');
  if(previous&&(!object(previous)||previous.version!==1||!object(previous.records)))fail('invalid previous inventory');
  if(lstatSync(resolve(outputDir)).isSymbolicLink())fail('output root must be a real directory');const root=realpathSync(outputDir);
  const result={version:1,status:'failed',asOf:policy.asOf,files:{},records:{},errors:[],warnings:[],scope:'Whole supplied local output inventory against explicit intended IDs/forbidden markers. Detection only; no permission, authenticity or conformance verdict.'};
  const texts=new Map(),htmls=new Map(),models=[];let bytes=0;
  function walk(folder){for(const e of readdirSync(folder,{withFileTypes:true})){
    const path=join(folder,e.name),stat=lstatSync(path),name=relative(root,path).split(sep).join('/');
    if(stat.isSymbolicLink())fail('output contains symlink; audit an explicit real-file inventory');
    const actual=realpathSync(path),offset=relative(root,actual);if(offset==='..'||offset.startsWith('..'+sep)||isAbsolute(offset))fail('output escaped its root');
    if(stat.isDirectory()){walk(path);continue;}if(!stat.isFile())fail('output contains a non-file');
    if(Object.keys(result.files).length>=10000||stat.size>33554432||(bytes+=stat.size)>134217728)fail('output exceeds audit limits (10000 files, 32 MiB per file, 128 MiB total)');
    const data=readFileSync(path);result.files[name]={sha256:hash(data),bytes:data.length};
    if(/(?:^|\/)(?:\.env|.*\.(?:qmd|yml|yaml|sqlite3|sqlite))$/iu.test(name))result.errors.push({code:'author-source-published',file:name});
    let text=data.toString('utf8');
    if(/\.docx$/iu.test(name)){const xml=zipText(data);text=decodeHtml(xml)+'\n'+decodeHtml(xml.replace(/<[^>]*>/gu,''));}
    else if(/\.json$/iu.test(name)){try{const parsed=JSON.parse(text);if(object(parsed)&&(parsed['interactive-cv']||parsed.schema==='kai-cv-interchange/1'||Array.isArray(parsed.expectedIds)&&Array.isArray(parsed.forbidden)))result.errors.push({code:'author-source-published',file:name});text+='\n'+jsonStrings(parsed);}catch{result.errors.push({code:'invalid-json-output',file:name});}}
    else if(/\.html$/iu.test(name)){htmls.set(name,text);models.push(...readModel(text).map(model=>({file:name,model})));text=decodeHtml(text)+'\n'+visibleHtml(text)+'\n'+models.filter(m=>m.file===name).map(m=>jsonStrings(m.model)).join('\n');}
    texts.set(name,text);
    for(let i=0;i<forbidden.length;i++)if(text.includes(forbidden[i])||data.includes(Buffer.from(forbidden[i])))result.errors.push({code:'forbidden-marker',file:name,markerIndex:i});
  }}
  walk(root);
  if(!models.length)result.errors.push({code:'public-scope-unknown',detail:'No complete declared public catalogue found; not an empty CV.'});
  const union=new Map();
  for(const {file,model}of models){
    if(model.asOf!==policy.asOf)result.errors.push({code:'as-of-mismatch',file});
    for(const r of model.records){
      if(!object(r)||typeof r.id!=='string'||typeof r.title!=='string'||typeof r.summary!=='string'||!safeRelative(r.url))fail('invalid record in public model');
      const fingerprint=hash(canonical(r));if(union.has(r.id)&&union.get(r.id).fingerprint!==fingerprint)result.errors.push({code:'conflicting-public-record',id:r.id,file});
      union.set(r.id,{...r,fingerprint});
    }
  }
  const expected=new Set(policy.expectedIds);
  for(const id of expected)if(!union.has(id))result.errors.push({code:'missing-expected-record',id});
  for(const [id,r]of union){
    if(!expected.has(id))result.errors.push({code:'unexpected-public-record',id});
    const [file,anchor]=r.url.split('#'),body=htmls.has(file)?destinationBody(htmls.get(file),anchor):null;
    const required=[r.title,r.summary,r.publicationReview,...Object.values(r.qualification),...(r.scalarFacts||[]).map(f=>f.value),...(r.facts||[]).map(f=>f.value),...(r.relations||[]).flatMap(rel=>[rel.predicate==='hasAssertion'?'Assertion':rel.predicate,rel.title])];
    if(!body)result.errors.push({code:'missing-static-destination',id,file});
    else if(required.some(value=>!visibleHtml(body).includes(value)))result.errors.push({code:'destination-wording-mismatch',id,file});
    result.records[id]={url:r.url,fingerprint:r.fingerprint,title:r.title,summary:r.summary};
  }
  const combined={version:1,asOf:policy.asOf,records:[...union.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(({fingerprint,...r})=>r)};
  result.modelSha256=hash(canonical(combined));if(policy.expectedModelSha256&&policy.expectedModelSha256!==result.modelSha256)result.errors.push({code:'model-digest-mismatch'});
  if(previous){for(const [id,r]of Object.entries(previous.records))if(!expected.has(id)){
    if(!object(r)||!safeRelative(r.url)||typeof r.summary!=='string')fail('invalid previous record');
    const [oldFile,oldAnchor]=r.url.split('#');
    for(const [file,text]of texts){
      const staleId=text.includes(id),staleAnchor=oldAnchor&&text.includes(oldAnchor),uniqueSummary=r.summary.length>=24&&![...union.values()].some(n=>n.summary===r.summary)&&text.includes(r.summary);
      if(staleId||staleAnchor||uniqueSummary)result.errors.push({code:'withdrawn-record-remains',id,file});
    }
    if(![...union.values()].some(n=>n.url.split('#')[0]===oldFile)&&existsSync(join(root,oldFile)))result.errors.push({code:'withdrawn-destination-remains',id,file:oldFile});
  }}
  result.status=result.errors.length?'failed':'passed';return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const args=process.argv.slice(2);if(args.includes('--help')){console.log('node audit.mjs --output-dir _site --policy private/cv-policy.json --manifest private/audit.json [--previous private/previous-audit.json]\nPolicy: {version:1,asOf:"YYYY-MM-DD",expectedIds:[...],forbidden:[...]} . Read-only scan; manifest must be new and outside output. No automatic cleanup or permission verification.');process.exit(0);}
    const o={};for(let i=0;i<args.length;i+=2){if(!['--output-dir','--policy','--manifest','--previous'].includes(args[i])||!args[i+1]||o[args[i]])fail('invalid CLI arguments');o[args[i]]=args[i+1];}
    if(!o['--output-dir']||!o['--policy']||!o['--manifest'])fail('output-dir, policy and manifest required');
    const root=realpathSync(o['--output-dir']),dest=resolve(o['--manifest']),offset=relative(root,dest);
    if(!isAbsolute(offset)&&offset!=='..'&&!offset.startsWith('..'+sep))fail('manifest must stay outside the published output');
    const actualDest=join(realpathSync(dirname(dest)),basename(dest)),actualOffset=relative(root,actualDest);
    if(!isAbsolute(actualOffset)&&actualOffset!=='..'&&!actualOffset.startsWith('..'+sep))fail('manifest parent resolves inside published output');
    const result=auditSite({outputDir:o['--output-dir'],policy:JSON.parse(readFileSync(o['--policy'],'utf8')),previous:o['--previous']?JSON.parse(readFileSync(o['--previous'],'utf8')):null});
    writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,files:Object.keys(result.files).length,records:Object.keys(result.records).length,errors:result.errors.length,manifest:dest}));if(result.status!=='passed')process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
