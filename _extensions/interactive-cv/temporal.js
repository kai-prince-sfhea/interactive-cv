// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Finite calendar uncertainty over an explicit public snapshot, not temporal logic.
export const TEMPORAL_VERSION='cv-temporal-v1';
export const CV_DATA_LIMITS=Object.freeze({bytes:2097152,records:2000,nodes:200000,depth:20});
const encoder=new TextEncoder(),types=new Set(['Person','Role','Project','Skill','Activity','Output','Outcome','Impact','PersonalReflection','Evidence','Time','Assertion','ServiceOffering','EvidenceSource','Relation']);
const qualifierKeys=['origin','review','verification','evidence-availability','reviewer','reviewed-at','verifier','verified-at','method','scope','source-verification','source-status','source-scope','rights','contribution','causal-attribution'];
export function cvDataError(){const error=new TypeError('interactive-cv: invalid, conflicting, stale or unsupported public feature data');error.code='invalid-cv-feature';throw error;}
export function cvFields(value,allowed,required=allowed){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))cvDataError();for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!allowed.includes(key)||!d.enumerable||!Object.hasOwn(d,'value'))cvDataError();}if(required.some(key=>!Object.hasOwn(value,key)))cvDataError();}
export function cvArray(value,max=2000){if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max)cvDataError();const keys=Reflect.ownKeys(value).filter(key=>key!=='length');if(keys.length!==value.length)cvDataError();keys.forEach((key,index)=>{const d=Object.getOwnPropertyDescriptor(value,key);if(key!==String(index)||!d.enumerable||!Object.hasOwn(d,'value'))cvDataError();});return value;}
export function cvText(value,max=8192){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff\ud800-\udfff]/u.test(value))cvDataError();return value;}
export function cvID(value){cvText(value);if(!/^[A-Za-z][A-Za-z0-9+.-]*:\S+$/u.test(value)||/\s/u.test(value))cvDataError();return value;}
export function cvURL(value){cvText(value);if(/[\u0000-\u0020\\]/u.test(value)||value.startsWith('//'))cvDataError();if(/^[a-z][a-z0-9+.-]*:/iu.test(value)){let url;try{url=new URL(value);}catch{cvDataError();}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)cvDataError();}return value;}
export function canonicalCVData(value,depth=0,ancestors=new Set(),budget={nodes:0,bytes:0}){
 if(depth>(budget.maxDepth??20)||++budget.nodes>(budget.maxNodes??200000))cvDataError();const add=count=>{budget.bytes+=count;if(budget.bytes>(budget.maxBytes??2097152))cvDataError();};
 if(typeof value==='string'){const result=JSON.stringify(value);add(encoder.encode(result).length);return result;}
 if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)){const result=JSON.stringify(value);add(result.length);return result;}
 if(!value||typeof value!=='object'||ancestors.has(value))cvDataError();ancestors.add(value);let result;
 if(Array.isArray(value)){cvArray(value);add(2+Math.max(0,value.length-1));result='['+value.map(item=>canonicalCVData(item,depth+1,ancestors,budget)).join(',')+']';}
 else{cvFields(value,Object.keys(value));const keys=Object.keys(value).sort();add(2+Math.max(0,keys.length-1));result='{'+keys.map(key=>{const name=JSON.stringify(key);add(encoder.encode(name).length+1);return name+':'+canonicalCVData(value[key],depth+1,ancestors,budget);}).join(',')+'}';}
 ancestors.delete(value);return result;
}
export function freezeCVData(value){if(value&&typeof value==='object'){Object.values(value).forEach(freezeCVData);Object.freeze(value);}return value;}
export function copyCVData(value,limits={}){cvFields(limits,['maxBytes','maxNodes','maxDepth'],[]);for(const [key,max]of [['maxBytes',4194304],['maxNodes',300000],['maxDepth',24]])if(limits[key]!==undefined&&(!Number.isSafeInteger(limits[key])||limits[key]<1||limits[key]>max))cvDataError();canonicalCVData(value,0,new Set(),{nodes:0,bytes:0,...limits});return JSON.parse(JSON.stringify(value));}
export async function hashCVData(value,{cryptoObject=globalThis.crypto}={}){if(!cryptoObject?.subtle?.digest)cvDataError();const result=await cryptoObject.subtle.digest('SHA-256',encoder.encode(canonicalCVData(value)));if(!(result instanceof ArrayBuffer)||result.byteLength!==32)cvDataError();return [...new Uint8Array(result)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function calendar(value,dayOnly=false){
 cvText(value,10);if(!(dayOnly?/^\d{4}-\d{2}-\d{2}$/u:/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/u).test(value))cvDataError();const[y,m,d]=value.split('-').map(Number),leap=y%400===0||y%4===0&&y%100!==0,days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];if(m!==undefined&&(m<1||m>12)||d!==undefined&&(d<1||d>days[m-1]))cvDataError();
 const earliest=value.length===4?value+'-01-01':value.length===7?value+'-01':value,latest=value.length===4?value+'-12-31':value.length===7?value+'-'+String(days[m-1]).padStart(2,'0'):value;
 return{earliest,latest,lower:Date.parse(earliest+'T00:00:00Z')/86400000,upper:Date.parse(latest+'T00:00:00Z')/86400000,precision:value.length===4?'year':value.length===7?'month':'day'};
}
export function cvDay(value){calendar(value,true);return value;}
/** Independent, original validation of the published data interface. It never
 * authenticates the producer, consent, rights or review declarations. */
export function validatePublicModel(model){
 cvFields(model,['version','asOf','records']);canonicalCVData(model);if(model.version!==1)cvDataError();cvDay(model.asOf);cvArray(model.records);const byID=new Map();
 for(const record of model.records){cvFields(record,['id','type','title','summary','url','qualification','publicationReview','start','end','date','scalarFacts','relations','facts'],['id','type','title','summary','url','qualification','publicationReview']);cvID(record.id);if(byID.has(record.id)||!types.has(record.type)||!['author-reviewed','independently-reviewed'].includes(record.publicationReview))cvDataError();cvText(record.title);cvText(record.summary);cvURL(record.url);const q=record.qualification;cvFields(q,qualifierKeys,['origin','review','verification','evidence-availability']);for(const value of Object.values(q))cvText(value);
  if(!['author-declared','extracted-candidate','inferred-proposal'].includes(q.origin)||!['unreviewed','author-reviewed','independently-reviewed'].includes(q.review)||!['unassessed','self-reported','externally-verified'].includes(q.verification)||!['public','restricted','unavailable','awaiting-permission'].includes(q['evidence-availability']))cvDataError();
  if(q.review==='independently-reviewed')cvText(q.reviewer);if(q.verification==='externally-verified')for(const key of ['verifier','verified-at','method','scope'])cvText(q[key]);for(const key of ['reviewed-at','verified-at'])if(q[key]!==undefined)calendar(q[key]);
  for(const key of ['start','end','date'])if(record[key]!==undefined&&record[key]!==null)cvText(record[key]);
  for(const key of ['scalarFacts','facts'])if(record[key]!==undefined)for(const fact of cvArray(record[key])){cvFields(fact,['label','value']);cvText(fact.label);cvText(fact.value);}
  if(record.relations!==undefined)for(const link of cvArray(record.relations)){cvFields(link,['predicate','target','title','url']);cvText(link.predicate);cvID(link.target);cvText(link.title);cvURL(link.url);}byID.set(record.id,record);
 }
 for(const record of model.records)for(const link of record.relations||[]){const target=byID.get(link.target);if(!target||link.title!==target.title||link.url!==target.url)cvDataError();if(link.predicate==='broader'&&(record.type!=='Skill'||target.type!=='Skill'))cvDataError();if(['supportedByEvidence','contradictedByEvidence','qualifiedByEvidence'].includes(link.predicate)&&target.type!=='Evidence')cvDataError();if(link.predicate==='hasAssertion'&&target.type!=='Assertion')cvDataError();}
 return freezeCVData(copyCVData(model));
}
export async function hashPublicModel(model,options={}){return hashCVData(validatePublicModel(model),options);}
function endpoint(value,position,asOf){
 if(value===undefined)return{kind:'missing',lower:null,upper:null};
 if(typeof value==='string'){
  if(value==='Unknown')return{kind:'unknown',lexical:value,lower:null,upper:null};
  if(value==='Present')return{kind:'present',lexical:value,lower:position==='end'?calendar(asOf,true).lower:null,upper:null,asOf};
  const date=calendar(value);return{kind:date.precision==='day'?'exact':'precision-range',lexical:value,...date};
 }
 cvFields(value,['earliest','latest']);const first=calendar(value.earliest),last=calendar(value.latest);if(first.lower>last.upper)cvDataError();return{kind:'uncertain',declaration:{earliest:value.earliest,latest:value.latest},earliest:first.earliest,latest:last.latest,lower:first.lower,upper:last.upper,earliestPrecision:first.precision,latestPrecision:last.precision};
}
function legacyDates(record){const out={};for(const key of ['start','end','date']){let value=record[key]===null?undefined:record[key];for(const fact of record.scalarFacts||[])if(fact.label===key){if(value!==undefined&&value!==fact.value)cvDataError();value=fact.value;}if(value!==undefined)out[key]=value;}return out;}
function formatEndpoint(value,position,asOf){if(value==='Unknown')return'Unknown; no exact date declared';if(value==='Present')return position==='end'?'Present at public snapshot '+asOf+'; later status unknown':'Present; no exact '+position+' date declared';if(typeof value==='string'){const date=calendar(value);return value+(date.precision==='day'?'':' ('+date.precision+' precision; exact day unknown)');}return'Between '+value.earliest+' and '+value.latest+'; endpoint uncertain and stated precision retained';}
/** Required extra readable facts for typed authoring. Legacy date facts are
 * already native scalarFacts; no endpoint may silently replace one of them. */
export function deriveTemporalFacts(model,definitions=[]){
 const snapshot=validatePublicModel(model),byID=new Map(snapshot.records.map(record=>[record.id,record]));cvArray(definitions);canonicalCVData(definitions);const seen=new Set(),records=[];
 for(const raw of definitions){cvFields(raw,['id','start','end','date'],['id']);cvID(raw.id);const record=byID.get(raw.id);if(!record||seen.has(raw.id))cvDataError();seen.add(raw.id);const legacy=legacyDates(record),declaration={id:raw.id},facts=[];
  for(const key of ['start','end','date'])if(raw[key]!==undefined){endpoint(raw[key],key,snapshot.asOf);if(legacy[key]!==undefined){if(typeof raw[key]!=='string'||legacy[key]!==raw[key])cvDataError();}else facts.push({label:'Temporal '+key,value:formatEndpoint(raw[key],key,snapshot.asOf)});declaration[key]=copyCVData(raw[key]);}
  if(Object.keys(declaration).length===1)cvDataError();records.push({id:raw.id,declaration,facts});
 }
 return freezeCVData({version:1,records});
}
function requireFacts(record,facts){for(const fact of facts){const matches=(record.facts||[]).filter(value=>value.label===fact.label);if(matches.length!==1||matches[0].value!==fact.value)cvDataError();}}
function bounds(start,end,asOf){let lo=start.lower??-Infinity,hi=start.upper??Infinity,endLo=end.lower??-Infinity,endHi=end.upper??Infinity;if(end.kind==='present'){hi=Math.min(hi,calendar(asOf,true).lower);if(lo>hi)cvDataError();}if(lo>endHi)cvDataError();return{lo,hi:Math.min(hi,endHi),endLo:Math.max(endLo,lo),endHi};}
export async function buildTemporalSidecar(model,definitions=[],options={}){
 const snapshot=validatePublicModel(model),prepared=deriveTemporalFacts(snapshot,definitions),declared=new Map(prepared.records.map(row=>[row.id,row])),rows=[];
 for(const record of snapshot.records){const typed=declared.get(record.id);if(typed)requireFacts(record,typed.facts);const legacy=legacyDates(record),values={...legacy,...(typed?.declaration||{})};delete values.id;
  const start=endpoint(values.start,'start',snapshot.asOf),end=endpoint(values.end,'end',snapshot.asOf),date=endpoint(values.date,'date',snapshot.asOf);if(start.kind!=='missing'||end.kind!=='missing')bounds(start,end,snapshot.asOf);
  rows.push({id:record.id,recordSha256:await hashCVData(record,options),start,end,date,basis:start.kind!=='missing'||end.kind!=='missing'?'interval':date.kind!=='missing'?'date':'missing'});
 }
 const result={version:1,kind:'cv-temporal-sidecar',providerVersion:TEMPORAL_VERSION,modelSha256:await hashCVData(snapshot,options),asOf:snapshot.asOf,declarations:prepared.records.map(row=>row.declaration),records:rows,scope:'declared-public-dates-only',qualification:'Calendar uncertainty and snapshot-relative Present are retained; absent end dates do not establish current appointments, activity, skill or achievement.'};canonicalCVData(result);return freezeCVData(result);
}
/** Recompute, rather than trust, hashes, bounds and facts supplied by a browser. */
export async function validateTemporalSidecar(model,value,options={}){const packet=copyCVData(value);cvFields(packet,['version','kind','providerVersion','modelSha256','asOf','declarations','records','scope','qualification']);const rebuilt=await buildTemporalSidecar(model,packet.declarations,options);if(canonicalCVData(packet)!==canonicalCVData(rebuilt))cvDataError();return rebuilt;}
export async function queryTemporal(model,sidecar,request,options={}){
 const snapshot=validatePublicModel(model);request=copyCVData(request);cvFields(request,['operation','from','through','at','field','recordIds'],['operation']);if(!['overlap','as-of','before','after','during'].includes(request.operation)||request.field!==undefined&&!['interval','date'].includes(request.field))cvDataError();let from,through;
 if(request.operation==='as-of'){if(request.from!==undefined||request.through!==undefined)cvDataError();from=through=cvDay(request.at===undefined?snapshot.asOf:request.at);}else{if(request.at!==undefined)cvDataError();from=cvDay(request.from);through=cvDay(request.through);}const qlo=calendar(from,true).lower,qhi=calendar(through,true).upper;if(qlo>qhi)cvDataError();
 const selected=request.recordIds===undefined?null:new Set(cvArray(request.recordIds).map(cvID));if(selected&&(selected.size!==request.recordIds.length||[...selected].some(id=>!snapshot.records.some(record=>record.id===id))))cvDataError();const bound=await validateTemporalSidecar(snapshot,sidecar,options),results=[];
 for(const record of bound.records){if(selected&&!selected.has(record.id))continue;const basis=request.field==='date'?(record.date.kind==='missing'?'missing':'date'):record.basis;let value='unknown',reasons=[];
  if(basis==='missing')reasons=['no-declared-dates'];else{const start=basis==='date'?record.date:record.start,end=basis==='date'?record.date:record.end,b=bounds(start,end,snapshot.asOf);
   if(request.operation==='before'){if(b.endHi<qlo){value='true';reasons=['every-consistent-end-strictly-before-window'];}else if(b.endLo>=qlo){value='false';reasons=['no-consistent-end-strictly-before-window'];}else reasons=['before-depends-on-unknown-or-imprecise-endpoint'];}
   else if(request.operation==='after'){if(b.lo>qhi){value='true';reasons=['every-consistent-start-strictly-after-window'];}else if(b.hi<=qhi){value='false';reasons=['no-consistent-start-strictly-after-window'];}else reasons=['after-depends-on-unknown-or-imprecise-endpoint'];}
   else if(request.operation==='during'){if(b.lo>=qlo&&b.endHi<=qhi){value='true';reasons=['every-consistent-interval-within-inclusive-window'];}else if(b.hi<qlo||b.endLo>qhi){value='false';reasons=['no-consistent-interval-within-inclusive-window'];}else reasons=['containment-depends-on-unknown-or-imprecise-endpoint'];}
   else if(b.lo>qhi||b.endHi<qlo){value='false';reasons=['outside-declared-possible-range'];}else if(b.hi<=qhi&&b.endLo>=qlo){value='true';reasons=['overlap-for-every-consistent-declared-interval'];}else reasons=['overlap-depends-on-unknown-or-imprecise-endpoint'];if([start,end].some(item=>['missing','unknown'].includes(item.kind)))reasons.push('endpoint-not-declared-exactly');if([start,end].some(item=>['uncertain','precision-range'].includes(item.kind)))reasons.push('declared-precision-retained');if(end.kind==='present')reasons.push('present-only-bound-through-snapshot-as-of');}
  results.push({id:record.id,value,reasons,basis});
 }
 return freezeCVData({version:1,status:'complete',modelSha256:bound.modelSha256,requestSha256:await hashCVData(request,options),results,trueIds:results.filter(row=>row.value==='true').map(row=>row.id),falseIds:results.filter(row=>row.value==='false').map(row=>row.id),unknownIds:results.filter(row=>row.value==='unknown').map(row=>row.id),coverage:{scope:'selected-public-records',exhaustiveWithinSelection:true,unknownIsNotFalse:true}});
}

/** Check only the authored Output --producedBy--> Activity association. A true
 * result is a calendar ordering statement, never proof of causality, completion,
 * achievement or the truth of an assertion. Event date takes precedence over
 * output start. An existing interval can narrow its possible start, but an
 * activity end is never required and does not establish completion. */
export async function auditActivityOutputOrdering(model,sidecar,options={}){
 const snapshot=validatePublicModel(model),bound=await validateTemporalSidecar(snapshot,sidecar,options),byID=new Map(snapshot.records.map(row=>[row.id,row])),dated=new Map(bound.records.map(row=>[row.id,row])),typed=new Map(bound.declarations.map(row=>[row.id,row])),results=[],hashes=new Map();let relations=0,bytes=0;
 const literal=(record,field)=>{const explicit=typed.get(record.id),legacy=legacyDates(record);return explicit&&Object.hasOwn(explicit,field)?explicit[field]:legacy[field];};
 const endpointHash=async(record,field)=>{const key=record.id+'\0'+field;if(!hashes.has(key)){const declaration=literal(record,field);hashes.set(key,await hashCVData({field,declared:declaration!==undefined,...(declaration===undefined?{}:{declaration})},options));}return hashes.get(key);};
 for(const output of snapshot.records){if(output.type!=='Output')continue;for(const relation of output.relations||[]){const activity=byID.get(relation.target);if(relation.predicate!=='producedBy'||activity?.type!=='Activity')continue;relations++;if(results.length>=2000||bytes>=1500000)continue;
   const outputDates=dated.get(output.id),activityDates=dated.get(activity.id),field=outputDates.date.kind!=='missing'?'date':outputDates.start.kind!=='missing'?'start':null,event=field?outputDates[field]:{kind:'missing',lower:null,upper:null},start=activityDates.start,activityBounds=bounds(start,activityDates.end,snapshot.asOf),outputBounds=field==='start'?bounds(event,outputDates.end,snapshot.asOf):{lo:event.lower??-Infinity,hi:event.upper??Infinity};
   let value='unknown',reasons=[];if(outputBounds.lo>=activityBounds.hi){value='true';reasons=['every-declared-output-date-is-on-or-after-activity-start'];}else if(outputBounds.hi<activityBounds.lo){value='false';reasons=['every-declared-output-date-precedes-activity-start'];}else reasons=['ordering-depends-on-missing-unknown-or-imprecise-date'];
   if(activityBounds.hi!==(start.upper??Infinity))reasons.push('declared-activity-interval-constrains-start-range');
   if(['missing','unknown','present'].includes(event.kind))reasons.push('output-event-date-not-declared-exactly');if(['missing','unknown','present'].includes(start.kind))reasons.push('activity-start-not-declared-exactly');if(field==='start')reasons.push('explicit-output-start-used-because-event-date-absent');
   const row={outputId:output.id,activityId:activity.id,value,basis:field==='date'?'output-date':field==='start'?'output-start':'missing',outputSha256:outputDates.recordSha256,activitySha256:activityDates.recordSha256,outputDeclarationSha256:await endpointHash(output,field??'date'),activityStartSha256:await endpointHash(activity,'start'),relationSha256:await hashCVData(relation,options),reasons};const size=encoder.encode(canonicalCVData(row)).length;if(bytes+size>1500000){bytes=1500000;continue;}bytes+=size;results.push(row);
  }}
 const result={version:1,kind:'cv-activity-output-ordering',status:relations===results.length?'complete':'incomplete',modelSha256:bound.modelSha256,asOf:snapshot.asOf,results,coverage:{scope:'explicit-public-Output-producedBy-Activity-links-only',relations,assessedRelations:results.length,omittedRelations:relations-results.length,maximumRelations:2000,maximumResultBytes:1500000,unknownIsNotFalse:true},qualification:'Calendar ordering uses the declared output event date (or its explicit start when no event date is declared) and activity start, constrained by any declared interval. Activity completion is not required; causality, factual truth, achievements and unlinked records are not assessed.'};canonicalCVData(result);return freezeCVData(result);
}

// R6 PRIVATE DRAFT reuse exports. Endpoint grammar and bounds stay unchanged.
export function parseTemporalEndpoint(value,position,asOf){if(!['start','end','date'].includes(position))cvDataError();cvDay(asOf);return freezeCVData(copyCVData(endpoint(value,position,asOf)));}
export function describeTemporalEndpoint(value,position,asOf){if(!['start','end','date'].includes(position))cvDataError();cvDay(asOf);endpoint(value,position,asOf);return formatEndpoint(value,position,asOf);}
// Internal only: callers first regenerate/validate a sidecar. Infinities denote
// missing bounds and never enter the public JSON observation unchanged.
export function consistentTemporalBounds(start,end,asOf){cvDay(asOf);return Object.freeze(bounds(start,end,asOf));}
