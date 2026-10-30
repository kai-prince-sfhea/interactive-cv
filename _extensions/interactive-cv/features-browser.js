// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Generated from original sibling modules by developer-only tests/bundle.mjs. Do not edit.
(() => {

const temporal = (() => {
// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Finite calendar uncertainty over an explicit public snapshot, not temporal logic.
const TEMPORAL_VERSION='cv-temporal-v1';
const CV_DATA_LIMITS=Object.freeze({bytes:2097152,records:2000,nodes:200000,depth:20});
const encoder=new TextEncoder(),types=new Set(['Person','Role','Project','Skill','Activity','Output','Outcome','Impact','PersonalReflection','Evidence','Time','Assertion','ServiceOffering','EvidenceSource','Relation']);
const qualifierKeys=['origin','review','verification','evidence-availability','reviewer','reviewed-at','verifier','verified-at','method','scope','source-verification','source-status','source-scope','rights','contribution','causal-attribution'];
function cvDataError(){const error=new TypeError('interactive-cv: invalid, conflicting, stale or unsupported public feature data');error.code='invalid-cv-feature';throw error;}
function cvFields(value,allowed,required=allowed){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))cvDataError();for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!allowed.includes(key)||!d.enumerable||!Object.hasOwn(d,'value'))cvDataError();}if(required.some(key=>!Object.hasOwn(value,key)))cvDataError();}
function cvArray(value,max=2000){if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max)cvDataError();const keys=Reflect.ownKeys(value).filter(key=>key!=='length');if(keys.length!==value.length)cvDataError();keys.forEach((key,index)=>{const d=Object.getOwnPropertyDescriptor(value,key);if(key!==String(index)||!d.enumerable||!Object.hasOwn(d,'value'))cvDataError();});return value;}
function cvText(value,max=8192){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff\ud800-\udfff]/u.test(value))cvDataError();return value;}
function cvID(value){cvText(value);if(!/^[A-Za-z][A-Za-z0-9+.-]*:\S+$/u.test(value)||/\s/u.test(value))cvDataError();return value;}
function cvURL(value){cvText(value);if(/[\u0000-\u0020\\]/u.test(value)||value.startsWith('//'))cvDataError();if(/^[a-z][a-z0-9+.-]*:/iu.test(value)){let url;try{url=new URL(value);}catch{cvDataError();}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)cvDataError();}return value;}
function canonicalCVData(value,depth=0,ancestors=new Set(),budget={nodes:0,bytes:0}){
 if(depth>(budget.maxDepth??20)||++budget.nodes>(budget.maxNodes??200000))cvDataError();const add=count=>{budget.bytes+=count;if(budget.bytes>(budget.maxBytes??2097152))cvDataError();};
 if(typeof value==='string'){const result=JSON.stringify(value);add(encoder.encode(result).length);return result;}
 if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)){const result=JSON.stringify(value);add(result.length);return result;}
 if(!value||typeof value!=='object'||ancestors.has(value))cvDataError();ancestors.add(value);let result;
 if(Array.isArray(value)){cvArray(value);add(2+Math.max(0,value.length-1));result='['+value.map(item=>canonicalCVData(item,depth+1,ancestors,budget)).join(',')+']';}
 else{cvFields(value,Object.keys(value));const keys=Object.keys(value).sort();add(2+Math.max(0,keys.length-1));result='{'+keys.map(key=>{const name=JSON.stringify(key);add(encoder.encode(name).length+1);return name+':'+canonicalCVData(value[key],depth+1,ancestors,budget);}).join(',')+'}';}
 ancestors.delete(value);return result;
}
function freezeCVData(value){if(value&&typeof value==='object'){Object.values(value).forEach(freezeCVData);Object.freeze(value);}return value;}
function copyCVData(value,limits={}){cvFields(limits,['maxBytes','maxNodes','maxDepth'],[]);for(const [key,max]of [['maxBytes',4194304],['maxNodes',300000],['maxDepth',24]])if(limits[key]!==undefined&&(!Number.isSafeInteger(limits[key])||limits[key]<1||limits[key]>max))cvDataError();canonicalCVData(value,0,new Set(),{nodes:0,bytes:0,...limits});return JSON.parse(JSON.stringify(value));}
async function hashCVData(value,{cryptoObject=globalThis.crypto}={}){if(!cryptoObject?.subtle?.digest)cvDataError();const result=await cryptoObject.subtle.digest('SHA-256',encoder.encode(canonicalCVData(value)));if(!(result instanceof ArrayBuffer)||result.byteLength!==32)cvDataError();return [...new Uint8Array(result)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function calendar(value,dayOnly=false){
 cvText(value,10);if(!(dayOnly?/^\d{4}-\d{2}-\d{2}$/u:/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/u).test(value))cvDataError();const[y,m,d]=value.split('-').map(Number),leap=y%400===0||y%4===0&&y%100!==0,days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];if(m!==undefined&&(m<1||m>12)||d!==undefined&&(d<1||d>days[m-1]))cvDataError();
 const earliest=value.length===4?value+'-01-01':value.length===7?value+'-01':value,latest=value.length===4?value+'-12-31':value.length===7?value+'-'+String(days[m-1]).padStart(2,'0'):value;
 return{earliest,latest,lower:Date.parse(earliest+'T00:00:00Z')/86400000,upper:Date.parse(latest+'T00:00:00Z')/86400000,precision:value.length===4?'year':value.length===7?'month':'day'};
}
function cvDay(value){calendar(value,true);return value;}
/** Independent, original validation of the published data interface. It never
 * authenticates the producer, consent, rights or review declarations. */
function validatePublicModel(model){
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
async function hashPublicModel(model,options={}){return hashCVData(validatePublicModel(model),options);}
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
function deriveTemporalFacts(model,definitions=[]){
 const snapshot=validatePublicModel(model),byID=new Map(snapshot.records.map(record=>[record.id,record]));cvArray(definitions);canonicalCVData(definitions);const seen=new Set(),records=[];
 for(const raw of definitions){cvFields(raw,['id','start','end','date'],['id']);cvID(raw.id);const record=byID.get(raw.id);if(!record||seen.has(raw.id))cvDataError();seen.add(raw.id);const legacy=legacyDates(record),declaration={id:raw.id},facts=[];
  for(const key of ['start','end','date'])if(raw[key]!==undefined){endpoint(raw[key],key,snapshot.asOf);if(legacy[key]!==undefined){if(typeof raw[key]!=='string'||legacy[key]!==raw[key])cvDataError();}else facts.push({label:'Temporal '+key,value:formatEndpoint(raw[key],key,snapshot.asOf)});declaration[key]=copyCVData(raw[key]);}
  if(Object.keys(declaration).length===1)cvDataError();records.push({id:raw.id,declaration,facts});
 }
 return freezeCVData({version:1,records});
}
function requireFacts(record,facts){for(const fact of facts){const matches=(record.facts||[]).filter(value=>value.label===fact.label);if(matches.length!==1||matches[0].value!==fact.value)cvDataError();}}
function bounds(start,end,asOf){let lo=start.lower??-Infinity,hi=start.upper??Infinity,endLo=end.lower??-Infinity,endHi=end.upper??Infinity;if(end.kind==='present'){hi=Math.min(hi,calendar(asOf,true).lower);if(lo>hi)cvDataError();}if(lo>endHi)cvDataError();return{lo,hi:Math.min(hi,endHi),endLo:Math.max(endLo,lo),endHi};}
async function buildTemporalSidecar(model,definitions=[],options={}){
 const snapshot=validatePublicModel(model),prepared=deriveTemporalFacts(snapshot,definitions),declared=new Map(prepared.records.map(row=>[row.id,row])),rows=[];
 for(const record of snapshot.records){const typed=declared.get(record.id);if(typed)requireFacts(record,typed.facts);const legacy=legacyDates(record),values={...legacy,...(typed?.declaration||{})};delete values.id;
  const start=endpoint(values.start,'start',snapshot.asOf),end=endpoint(values.end,'end',snapshot.asOf),date=endpoint(values.date,'date',snapshot.asOf);if(start.kind!=='missing'||end.kind!=='missing')bounds(start,end,snapshot.asOf);
  rows.push({id:record.id,recordSha256:await hashCVData(record,options),start,end,date,basis:start.kind!=='missing'||end.kind!=='missing'?'interval':date.kind!=='missing'?'date':'missing'});
 }
 const result={version:1,kind:'cv-temporal-sidecar',providerVersion:TEMPORAL_VERSION,modelSha256:await hashCVData(snapshot,options),asOf:snapshot.asOf,declarations:prepared.records.map(row=>row.declaration),records:rows,scope:'declared-public-dates-only',qualification:'Calendar uncertainty and snapshot-relative Present are retained; absent end dates do not establish current appointments, activity, skill or achievement.'};canonicalCVData(result);return freezeCVData(result);
}
/** Recompute, rather than trust, hashes, bounds and facts supplied by a browser. */
async function validateTemporalSidecar(model,value,options={}){const packet=copyCVData(value);cvFields(packet,['version','kind','providerVersion','modelSha256','asOf','declarations','records','scope','qualification']);const rebuilt=await buildTemporalSidecar(model,packet.declarations,options);if(canonicalCVData(packet)!==canonicalCVData(rebuilt))cvDataError();return rebuilt;}
async function queryTemporal(model,sidecar,request,options={}){
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
async function auditActivityOutputOrdering(model,sidecar,options={}){
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
function parseTemporalEndpoint(value,position,asOf){if(!['start','end','date'].includes(position))cvDataError();cvDay(asOf);return freezeCVData(copyCVData(endpoint(value,position,asOf)));}
function describeTemporalEndpoint(value,position,asOf){if(!['start','end','date'].includes(position))cvDataError();cvDay(asOf);endpoint(value,position,asOf);return formatEndpoint(value,position,asOf);}
// Internal only: callers first regenerate/validate a sidecar. Infinities denote
// missing bounds and never enter the public JSON observation unchanged.
function consistentTemporalBounds(start,end,asOf){cvDay(asOf);return Object.freeze(bounds(start,end,asOf));}

return {TEMPORAL_VERSION,CV_DATA_LIMITS,cvDataError,cvFields,cvArray,cvText,cvID,cvURL,canonicalCVData,freezeCVData,copyCVData,hashCVData,cvDay,validatePublicModel,hashPublicModel,deriveTemporalFacts,buildTemporalSidecar,validateTemporalSidecar,queryTemporal,auditActivityOutputOrdering,parseTemporalEndpoint,describeTemporalEndpoint,consistentTemporalBounds};
})();

const services = (() => {
// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Author-declared service windows. No live availability, consent authentication,
// commercial terms or source/external review are inferred by these utilities.
const {validatePublicModel,hashCVData,canonicalCVData,copyCVData,freezeCVData,cvFields,cvArray,cvText,cvID,cvDay,cvDataError} = temporal;
const SERVICE_VERSION='cv-services-v1';
const statuses=new Set(['proposed','offered','paused','withdrawn']);
const consentNotice='Consent declaration recorded by the author; not independently verified.';
const qualification='Status, provider, dates and consent are author declarations. The publication-day test is not live availability, consent authentication, external verification or a new source review.';

function prepare(model,definitions,consentingPersonIds){
 const snapshot=validatePublicModel(model),byID=new Map(snapshot.records.map(record=>[record.id,record])),consent=new Set();cvArray(consentingPersonIds);canonicalCVData(consentingPersonIds);for(const id of consentingPersonIds){cvID(id);const person=byID.get(id),markers=(person?.scalarFacts||[]).filter(fact=>fact.label==='Consent');if(consent.has(id)||person?.type!=='Person'||markers.length!==1||markers[0].value!==consentNotice)cvDataError();consent.add(id);}
 const rows=[],seen=new Set();cvArray(definitions);canonicalCVData(definitions);
 for(const raw of definitions){cvFields(raw,['id','status','provider','validFrom','validThrough','jsonld'],['id','status','provider']);cvID(raw.id);cvID(raw.provider);const record=byID.get(raw.id),provider=byID.get(raw.provider);if(record?.type!=='ServiceOffering'||provider?.type!=='Person'||!consent.has(raw.provider)||seen.has(raw.id)||!statuses.has(raw.status)||raw.jsonld!==undefined&&typeof raw.jsonld!=='boolean')cvDataError();seen.add(raw.id);
  for(const key of ['validFrom','validThrough'])if(raw[key]!==undefined)cvDay(raw[key]);if(raw.validFrom!==undefined&&raw.validThrough!==undefined&&raw.validFrom>raw.validThrough)cvDataError();
  const declaration={id:raw.id,status:raw.status,provider:raw.provider,...(raw.validFrom===undefined?{}:{validFrom:raw.validFrom}),...(raw.validThrough===undefined?{}:{validThrough:raw.validThrough}),jsonld:raw.jsonld===true};
  const facts=[{label:'Declared service status',value:raw.status},{label:'Declared service provider',value:provider.title+' ('+provider.id+')'},...(raw.validFrom===undefined?[]:[{label:'Offer valid from',value:raw.validFrom}]),...(raw.validThrough===undefined?[]:[{label:'Offer valid through',value:raw.validThrough}]),{label:'Service structured-data publication',value:declaration.jsonld?'Explicitly requested; only offered services within the complete declared window on the publication day are eligible.':'Not requested.'}];
  rows.push({id:record.id,declaration,facts});
 }
 return{snapshot,byID,consentingPersonIds:snapshot.records.filter(record=>consent.has(record.id)).map(record=>record.id),rows};
}
/** Stable readable declarations only. Evaluation-day results deliberately never
 * enter the public model and therefore never change its language/source pins. */
function deriveServiceFacts(model,definitions=[],{consentingPersonIds=[]}={}){const value=prepare(model,definitions,consentingPersonIds);return freezeCVData({version:1,records:value.rows});}
function availability(declaration,at){
 if(declaration.status!=='offered')return{value:'false',reasons:['declared-status-is-not-offered']};
 if(declaration.validFrom!==undefined&&at<declaration.validFrom||declaration.validThrough!==undefined&&at>declaration.validThrough)return{value:'false',reasons:['outside-declared-offer-window']};
 if(declaration.validFrom===undefined||declaration.validThrough===undefined)return{value:'unknown',reasons:['complete-declared-offer-window-missing']};
 return{value:'true',reasons:['offered-within-declared-calendar-window','live-availability-not-verified']};
}
function requireFacts(record,facts){for(const fact of facts){const matches=(record.facts||[]).filter(item=>item.label===fact.label);if(matches.length!==1||matches[0].value!==fact.value)cvDataError();}}
async function buildServiceSidecar(model,definitions=[],{consentingPersonIds=[],evaluatedOn,cryptoObject=globalThis.crypto}={}){
 const prepared=prepare(model,definitions,consentingPersonIds),snapshot=prepared.snapshot,day=cvDay(evaluatedOn===undefined?snapshot.asOf:evaluatedOn),rows=[],options={cryptoObject};
 for(const entry of prepared.rows){const record=prepared.byID.get(entry.id),provider=prepared.byID.get(entry.declaration.provider);requireFacts(record,entry.facts);const current=availability(entry.declaration,day);rows.push({id:entry.id,recordSha256:await hashCVData(record,options),providerSha256:await hashCVData(provider,options),...entry.declaration,currentOffer:current.value,reasons:current.reasons});}
 const result={version:1,kind:'cv-service-sidecar',providerVersion:SERVICE_VERSION,modelSha256:await hashCVData(snapshot,options),asOf:snapshot.asOf,evaluatedOn:day,consentingPersonIds:prepared.consentingPersonIds,declarations:prepared.rows.map(row=>row.declaration),records:rows,scope:'declared-public-service-offerings-only',qualification};canonicalCVData(result);return freezeCVData(result);
}
/** Replay the receipt's explicit evaluation day and consent declarations, never
 * the browser clock. A valid hash is identity, not proof of permission or truth. */
async function validateServiceSidecar(model,value,{cryptoObject=globalThis.crypto}={}){
 const packet=copyCVData(value);cvFields(packet,['version','kind','providerVersion','modelSha256','asOf','evaluatedOn','consentingPersonIds','declarations','records','scope','qualification']);const result=await buildServiceSidecar(model,packet.declarations,{consentingPersonIds:packet.consentingPersonIds,evaluatedOn:packet.evaluatedOn,cryptoObject});if(canonicalCVData(packet)!==canonicalCVData(result))cvDataError();return result;
}
async function queryServices(model,sidecar,request={},options={}){
 const snapshot=validatePublicModel(model);request=copyCVData(request);cvFields(request,['status','at','recordIds'],[]);const wanted=request.status??'any';if(wanted!=='any'&&!statuses.has(wanted))cvDataError();if(request.at!==undefined)cvDay(request.at);const ids=new Set(snapshot.records.map(row=>row.id)),selected=request.recordIds===undefined?ids:new Set(cvArray(request.recordIds).map(cvID));if(request.recordIds!==undefined&&(selected.size!==request.recordIds.length||[...selected].some(id=>!ids.has(id))))cvDataError();
 const bound=await validateServiceSidecar(snapshot,sidecar,options),byID=new Map(bound.records.map(row=>[row.id,row])),results=[];
 for(const record of snapshot.records){if(!selected.has(record.id))continue;const declaration=byID.get(record.id);if(!declaration){results.push({id:record.id,value:'unknown',status:'not-declared',currentOffer:'unknown',reasons:['no-typed-public-service-declaration']});continue;}
  const current=availability(declaration,request.at??bound.evaluatedOn),match=wanted==='any'||wanted===declaration.status;let value=match?'true':'false',reasons=[match?'declared-status-matches':'declared-status-does-not-match'];if(request.at!==undefined&&match){value=current.value;reasons.push(...current.reasons);}results.push({id:record.id,value,status:declaration.status,currentOffer:current.value,reasons});
 }
 return freezeCVData({version:1,status:'complete',modelSha256:bound.modelSha256,requestSha256:await hashCVData(request,options),evaluatedOn:request.at??bound.evaluatedOn,results,trueIds:results.filter(row=>row.value==='true').map(row=>row.id),falseIds:results.filter(row=>row.value==='false').map(row=>row.id),unknownIds:results.filter(row=>row.value==='unknown').map(row=>row.id),coverage:{scope:'selected-public-records',exhaustiveWithinSelection:true,unknownIsNotFalse:true},qualification});
}
function siteRoot(value){cvText(value,2048);let url;try{url=new URL(value);}catch{cvDataError();}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||/[\\%\u0000-\u0020]/u.test(value)||value.split('/').some(part=>part==='.'||part==='..'))cvDataError();url.pathname=url.pathname.replace(/\/*$/u,'/');return url;}
function nativeURL(value,base){cvText(value,2048);if(/[\\%\u0000-\u0020]/u.test(value)||value.startsWith('//')||value.split(/[/?#]/u).some(part=>part==='.'||part==='..'))cvDataError();let url;try{url=new URL(value,base);}catch{cvDataError();}if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||!url.pathname.endsWith('.html')||url.username||url.password||url.search)cvDataError();return url.href;}
/** Schema.org Offer dates retain their authored Date lexical values. Catalogues
 * are separate per consenting provider; no prices, stock or outcomes invented. */
async function buildServiceStructuredData(model,sidecar,{siteURL,cryptoObject=globalThis.crypto}={}){
 const snapshot=validatePublicModel(model),bound=await validateServiceSidecar(snapshot,sidecar,{cryptoObject}),selected=bound.records.filter(row=>row.jsonld&&row.currentOffer==='true'),byID=new Map(snapshot.records.map(row=>[row.id,row]));
 const receipt={version:1,modelSha256:bound.modelSha256,sourceAsOf:bound.asOf,evaluatedOn:bound.evaluatedOn,status:selected.length?'eligible-author-declarations':'no-current-opted-in-author-declarations',serviceIds:selected.map(row=>row.id),qualification};if(!selected.length)return freezeCVData({jsonld:null,receipt});
 const base=siteRoot(siteURL),graph=[],groups=new Map();for(const row of selected){const service=byID.get(row.id),provider=byID.get(row.provider);if(!groups.has(row.provider))groups.set(row.provider,{provider,offers:[]});const group=groups.get(row.provider),offerID='_:cvOffer'+graph.length,url=nativeURL(service.url,base),qualifiers=Object.keys(service.qualification).sort().map(key=>key+': '+service.qualification[key]).join('; ');group.offers.push({'@id':offerID});graph.push({'@type':'Service','@id':service.id,name:service.title,description:service.summary,disambiguatingDescription:'Declared public qualifications — '+qualifiers+'; publication-review: '+service.publicationReview+'. '+qualification,url,provider:{'@id':provider.id},offers:{'@id':offerID}},{'@type':'Offer','@id':offerID,itemOffered:{'@id':service.id},offeredBy:{'@id':provider.id},url,validFrom:row.validFrom,validThrough:row.validThrough});}
 let index=0;for(const {provider,offers}of groups.values()){const catalogueID='_:cvCatalogue'+index++;graph.push({'@type':'Person','@id':provider.id,name:provider.title,url:nativeURL(provider.url,base),hasOfferCatalog:{'@id':catalogueID}},{'@type':'OfferCatalog','@id':catalogueID,name:'Declared services from '+provider.title,itemListElement:offers});}
 return freezeCVData({jsonld:{'@context':'https://schema.org','@graph':graph},receipt});
}

return {SERVICE_VERSION,deriveServiceFacts,buildServiceSidecar,validateServiceSidecar,queryServices,buildServiceStructuredData};
})();

const reader_selection = (() => {
// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Original finite public-record selection. No inference or source rewriting.
const {validatePublicModel,hashPublicModel,copyCVData} = temporal;
const contextTypes={withinRole:'Role',prerequisiteRole:'Role',withinProject:'Project',prerequisiteProject:'Project',producedBy:'Activity',followsOutput:'Output',contributedBy:'Outcome'};
const evidencePredicates=new Set(['supportedByEvidence','contradictedByEvidence','qualifiedByEvidence','evidence']);
const fail=()=>{throw new TypeError('Interactive CV: invalid public selection or feature sidecar.');};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
function selectedIds(value,byId){if(!Array.isArray(value)||value.length>2000||Reflect.ownKeys(value).length!==value.length+1)fail();const seen=new Set();for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,String(index));if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='string'||!byId.has(descriptor.value)||seen.has(descriptor.value))fail();seen.add(descriptor.value);}return seen;}
function fields(value,names){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail();for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!names.includes(key)||!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))fail();}if(names.some(key=>!Object.hasOwn(value,key)))fail();}
function canonical(value){if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
async function hash(value,cryptoObject){if(!cryptoObject?.subtle)fail();return[...new Uint8Array(await cryptoObject.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))].map(value=>value.toString(16).padStart(2,'0')).join('');}

/** Bind both optional feature catalogues to the exact complete public model.
 * Each query still validates/regenerates its own sidecar before using it. */
async function validateFeatureData(model,value,{cryptoObject=globalThis.crypto}={}){
 const snapshot=validatePublicModel(model),packet=copyCVData(value,{maxBytes:4194304,maxNodes:300000,maxDepth:24});fields(packet,['version','modelSha256','asOf','temporal','services']);if(packet.version!==1||packet.asOf!==snapshot.asOf||!/^[a-f0-9]{64}$/u.test(packet.modelSha256)||packet.modelSha256!==await hashPublicModel(snapshot,{cryptoObject}))fail();
 for(const sidecar of [packet.temporal,packet.services])if(!sidecar||typeof sidecar!=='object'||sidecar.modelSha256!==packet.modelSha256)fail();
 return freeze(packet);
}

/** Classify only declared public evidence links. Unknown availability remains
 * separate; no missing public link proves that evidence does not exist. */
async function queryEvidence(model,{mode='linked',recordIds}={}, {cryptoObject=globalThis.crypto}={}){
 const snapshot=validatePublicModel(model),byId=new Map(snapshot.records.map(record=>[record.id,record]));if(!['linked','support','contrary','qualifying'].includes(mode))fail();const chosen=recordIds===undefined?new Set(byId.keys()):selectedIds(recordIds,byId),predicates=mode==='linked'?evidencePredicates:new Set([{support:'supportedByEvidence',contrary:'contradictedByEvidence',qualifying:'qualifiedByEvidence'}[mode]]),results=[];
 const assertions=new Map();for(const record of snapshot.records)if(record.type==='Assertion')for(const relation of record.relations||[])if(['subject','object'].includes(relation.predicate)){if(!assertions.has(relation.target))assertions.set(relation.target,[]);assertions.get(relation.target).push(record);}
 for(const record of snapshot.records)if(chosen.has(record.id)){
  const owners=[record,...(record.relations||[]).filter(link=>link.predicate==='hasAssertion'&&byId.get(link.target)?.type==='Assertion').map(link=>byId.get(link.target)),...(assertions.get(record.id)||[])],links=[];
  for(const owner of owners)for(const relation of owner.relations||[])if(predicates.has(relation.predicate)&&byId.get(relation.target)?.type==='Evidence')links.push({owner:owner.id,predicate:relation.predicate,target:relation.target});
  const availability=record.qualification['evidence-availability'],value=links.length?'true':availability==='public'?'false':'unknown';results.push({id:record.id,value,reasons:[links.length?'matching-declared-public-evidence-link':availability==='public'?'no-matching-link-in-public-model':'evidence-not-publicly-decidable'],links});
 }
 return freeze({version:1,status:'complete',modelSha256:await hashPublicModel(snapshot,{cryptoObject}),mode,results,trueIds:results.filter(value=>value.value==='true').map(value=>value.id),falseIds:results.filter(value=>value.value==='false').map(value=>value.id),unknownIds:results.filter(value=>value.value==='unknown').map(value=>value.id),coverage:{scope:'complete-declared-public-model-only',absenceBeyondModel:'not-inferred'}});
}

/** Preserve mandatory context around the explicit primary selection. The
 * caller passes the full original model to exports with these selectionIds. */
async function selectPublicRecords(model,primaryIds,{includeAssociatedEvidence=true,cryptoObject=globalThis.crypto}={}){
 const snapshot=validatePublicModel(model),byId=new Map(snapshot.records.map(record=>[record.id,record])),primary=selectedIds(primaryIds,byId);if(typeof includeAssociatedEvidence!=='boolean')fail();const reasons=new Map(),queue=[],processed=new Set();let visits=0;
 function include(id,reason){if(!byId.has(id))fail();if(!reasons.has(id)){reasons.set(id,[]);queue.push(id);}const items=reasons.get(id);if(!items.some(value=>canonical(value)===canonical(reason)))items.push(reason);}
 for(const record of snapshot.records)if(primary.has(record.id))include(record.id,{kind:'primary-match'});
 if(primary.size)for(const record of snapshot.records)if(record.type==='Person')include(record.id,{kind:'public-person-context'});
 const reverse=new Map();for(const record of snapshot.records)for(const relation of record.relations||[])if(record.type==='Assertion'&&['subject','object'].includes(relation.predicate)||includeAssociatedEvidence&&record.type==='Evidence'&&relation.predicate==='documents'){if(!reverse.has(relation.target))reverse.set(relation.target,[]);reverse.get(relation.target).push({id:record.id,predicate:relation.predicate});}
 for(let index=0;index<queue.length;index++){
  const id=queue[index];if(processed.has(id))continue;processed.add(id);const record=byId.get(id);
  for(const relation of record.relations||[]){if(++visits>200000)fail();const target=byId.get(relation.target);let kind=null;
   if(contextTypes[relation.predicate]===target.type)kind='declared-context';
   if(target.type==='Skill')kind=relation.predicate==='broader'?'declared-skill-ancestor':'declared-skill-context';
   if(relation.predicate==='hasAssertion'&&target.type==='Assertion')kind='required-assertion';
   if(record.type==='Assertion'&&['subject','object'].includes(relation.predicate))kind='required-assertion-context';
   if(evidencePredicates.has(relation.predicate)&&target.type==='Evidence')kind='required-evidence';
   if(record.type==='Evidence'&&target.type==='EvidenceSource'&&['source','fromSource'].includes(relation.predicate))kind='evidence-source';
   if(kind)include(target.id,{kind,sourceId:id,predicate:relation.predicate});
  }
  for(const item of reverse.get(id)||[]){if(++visits>200000)fail();include(item.id,{kind:byId.get(item.id).type==='Assertion'?'required-associated-assertion':'declared-associated-evidence',sourceId:id,predicate:item.predicate});}
 }
 const orderedPrimary=snapshot.records.filter(record=>primary.has(record.id)).map(record=>record.id),selectionIds=snapshot.records.filter(record=>reasons.has(record.id)).map(record=>record.id),receipt={version:1,kind:'cv-public-selection',asOf:snapshot.asOf,modelSha256:await hashPublicModel(snapshot,{cryptoObject}),primaryIds:orderedPrimary,selectionIds,reasons:selectionIds.map(id=>({id,reasons:reasons.get(id)})),coverage:{scope:'complete-declared-public-model-only',totalRecords:snapshot.records.length,matchedRecords:orderedPrimary.length,selectedRecords:selectionIds.length},qualification:'Public wording and qualifications are unchanged. Additional records preserve claim context, contrary and qualifying evidence; a match is not verification or proof of competence.'};
 return freeze({...receipt,selectionSha256:await hash(receipt,cryptoObject)});
}

return {validateFeatureData,queryEvidence,selectPublicRecords};
})();

const delivery = (() => {
// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// PRIVATE R6 DRAFT. Original public-only index and explicitly requested details.
const {validatePublicModel,hashCVData,freezeCVData,cvFields,cvArray,cvText,cvID,cvURL,cvDay,cvDataError} = temporal;
const CV_DELIVERY_LIMITS=Object.freeze({records:2000,indexBytes:4194304,bundleBytes:2097152,bundles:512,transferBytes:8388608,query:512,terms:100000});
const encoder=new TextEncoder(),hashPattern=/^[a-f0-9]{64}$/u,norm=value=>value.normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
const recordTypes=new Set(['Person','Role','Project','Skill','Activity','Output','Outcome','Impact','PersonalReflection','Evidence','Time','Assertion','ServiceOffering','EvidenceSource','Relation']);
const qualifierKeys=['origin','review','verification','evidence-availability','reviewer','reviewed-at','verifier','verified-at','method','scope','source-verification','source-status','source-scope','rights','contribution','causal-attribution'];
const fail=code=>{const error=Error(code);error.code=code;throw error;};
const check=({signal,isCurrent})=>{if(signal?.aborted)throw signal.reason??new DOMException('Cancelled','AbortError');if(isCurrent&&isCurrent()!==true)fail('cv-delivery-stale');};
const hashBytes=async(bytes,cryptoObject)=>{if(!cryptoObject?.subtle)cvDataError();const digest=await cryptoObject.subtle.digest('SHA-256',bytes);if(!(digest instanceof ArrayBuffer)||digest.byteLength!==32)cvDataError();return[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');};
// The compact token dictionary can contain more than 2,000 items. The public
// model guard deliberately caps every array at 2,000, so use a separate bounded
// JSON guard for this delivery envelope; never weaken the public model guard.
function canonical(value,depth=0,ancestors=new Set(),budget={nodes:0,bytes:0}){
 if(depth>24||++budget.nodes>400000)cvDataError();const add=n=>{if((budget.bytes+=n)>CV_DELIVERY_LIMITS.indexBytes)cvDataError();};
 if(typeof value==='string'){const text=JSON.stringify(value);add(encoder.encode(text).length);return text;}
 if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)){const text=JSON.stringify(value);add(text.length);return text;}
 if(!value||typeof value!=='object'||ancestors.has(value))cvDataError();ancestors.add(value);let text;
 if(Array.isArray(value)){cvArray(value,CV_DELIVERY_LIMITS.terms);add(2+Math.max(0,value.length-1));text='['+value.map(item=>canonical(item,depth+1,ancestors,budget)).join(',')+']';}
 else{cvFields(value,Object.keys(value));const keys=Object.keys(value).sort();add(2+Math.max(0,keys.length-1));text='{'+keys.map(key=>{const name=JSON.stringify(key);add(encoder.encode(name).length+1);return name+':'+canonical(value[key],depth+1,ancestors,budget);}).join(',')+'}';}
 ancestors.delete(value);return text;
}
const copied=value=>JSON.parse(canonical(value));
function skillsFor(model){const byID=new Map(model.records.map(row=>[row.id,row])),done=new Map(),active=new Set();function parents(id,depth=0){if(depth>64||active.has(id))fail('cv-delivery-skill-cycle');if(done.has(id)){const found=done.get(id);if(depth+found.height>64)fail('cv-delivery-skill-depth');return found;}active.add(id);const ids=new Set([id]);let height=0;for(const link of byID.get(id).relations??[])if(link.predicate==='broader'){const parent=parents(link.target,depth+1);height=Math.max(height,parent.height+1);for(const ancestor of parent.ids)ids.add(ancestor);}active.delete(id);const result={ids,height};done.set(id,result);return result;}for(const record of model.records)if(record.type==='Skill')parents(record.id);return record=>{const selected=new Set(record.type==='Skill'?parents(record.id).ids:[]);for(const link of record.relations??[])if(byID.get(link.target).type==='Skill')for(const parent of parents(link.target).ids)selected.add(parent);return[...selected];};}
/** Native preparation only: consume the same validated closed public model.
 * Partition placement is storage only, not new project/causal membership. */
async function buildCVDelivery(model,{cryptoObject=globalThis.crypto,targetBundleBytes=262144}={}){
 const snapshot=validatePublicModel(model);if(!Number.isSafeInteger(targetBundleBytes)||targetBundleBytes<1024||targetBundleBytes>CV_DELIVERY_LIMITS.bundleBytes)cvDataError();const modelSha256=await hashCVData(snapshot,{cryptoObject}),byID=new Map(snapshot.records.map(row=>[row.id,row])),groups=new Map(),files=[],records=[],dictionary=[],words=new Map(),skills=skillsFor(snapshot);
 for(const record of snapshot.records){const project=record.type==='Project'?record.id:(record.relations??[]).find(link=>link.predicate==='withinProject'&&byID.get(link.target).type==='Project')?.target,key=['Evidence','EvidenceSource'].includes(record.type)?'evidence':project?'project:'+project:'shared';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
 async function emit(rows,group){if(!rows.length)return;const packet={version:1,kind:'cv-public-record-bundle',modelSha256,records:rows},text=canonical(packet),bytes=encoder.encode(text);if(bytes.length>CV_DELIVERY_LIMITS.bundleBytes)fail('cv-delivery-bundle-budget');const sha256=await hashBytes(bytes,cryptoObject),url='bundles/'+sha256+'.json';files.push({url,bytes,descriptor:{url,sha256,bytes:bytes.length,ids:rows.map(row=>row.id),group}});}
 for(const[group,rows]of groups){let batch=[];for(const record of rows){const trial=[...batch,record];if(batch.length&&encoder.encode(canonical({version:1,kind:'cv-public-record-bundle',modelSha256,records:trial})).length>targetBundleBytes){await emit(batch,group);batch=[];}batch.push(record);}await emit(batch,group);}
 if(files.length>CV_DELIVERY_LIMITS.bundles)fail('cv-delivery-bundle-count');const location=new Map(files.flatMap(file=>file.descriptor.ids.map(id=>[id,file.url])));
 for(const record of snapshot.records){const skillIds=skills(record),skillWords=skillIds.flatMap(id=>{const skill=byID.get(id);return[skill.title,...(skill.scalarFacts??[]).filter(row=>row.label==='Aliases').map(row=>row.value)];}),search=norm([record.title,record.summary,...Object.values(record.qualification),...(record.scalarFacts??[]).map(row=>row.value),...(record.facts??[]).flatMap(row=>[row.label,row.value]),...['start','end','date'].map(key=>record[key]??''),...skillWords].join(' ')),terms=[];for(const token of new Set(search.split(' ').filter(Boolean))){if(!words.has(token)){if(dictionary.length>=CV_DELIVERY_LIMITS.terms)fail('cv-delivery-term-budget');words.set(token,dictionary.length);dictionary.push(token);}terms.push(words.get(token));}records.push({id:record.id,type:record.type,title:record.title,url:record.url,qualification:record.qualification,publicationReview:record.publicationReview,recordSha256:await hashCVData(record,{cryptoObject}),skillIds,termIds:terms,bundle:location.get(record.id)});}
 const index=freezeCVData({version:1,kind:'cv-public-delivery-index',modelSha256,asOf:snapshot.asOf,records,dictionary,bundles:files.map(file=>file.descriptor),coverage:{scope:'complete-declared-public-model',records:snapshot.records.length,literalDiscovery:'complete-before-detail-loading',detailCompleteness:'requires-requested-bundles',liveFreshness:'not-established'},qualification:'Public index and observed bundle hashes bind an explicit published snapshot. Unloaded or unavailable details are unknown, not absent. No consent, review authenticity, source truth, skill or current status is inferred.'}),indexText=canonical(index),indexBytes=encoder.encode(indexText);if(indexBytes.length>CV_DELIVERY_LIMITS.indexBytes)fail('cv-delivery-index-budget');return freezeCVData({version:1,index,indexSha256:await hashBytes(indexBytes,cryptoObject),indexText,files:files.map(file=>({url:file.url,text:new TextDecoder().decode(file.bytes),sha256:file.descriptor.sha256}))});
}
function validateIndex(value){
 const index=copied(value);cvFields(index,['version','kind','modelSha256','asOf','records','dictionary','bundles','coverage','qualification']);if(index.version!==1||index.kind!=='cv-public-delivery-index'||!hashPattern.test(index.modelSha256))cvDataError();cvDay(index.asOf);cvText(index.qualification);cvArray(index.records,2000);cvArray(index.dictionary,CV_DELIVERY_LIMITS.terms);cvArray(index.bundles,CV_DELIVERY_LIMITS.bundles);const dictionary=new Set();for(const token of index.dictionary){cvText(token,8192);if(/\s/u.test(token)||norm(token)!==token||dictionary.has(token))cvDataError();dictionary.add(token);}const byID=new Map(),bundles=new Map();
 for(const row of index.records){cvFields(row,['id','type','title','url','qualification','publicationReview','recordSha256','skillIds','termIds','bundle']);cvID(row.id);cvText(row.title);cvURL(row.url);if(!recordTypes.has(row.type)||!['author-reviewed','independently-reviewed'].includes(row.publicationReview)||byID.has(row.id)||!hashPattern.test(row.recordSha256))cvDataError();const q=row.qualification;cvFields(q,qualifierKeys,['origin','review','verification','evidence-availability']);Object.values(q).forEach(value=>cvText(value));if(!['author-declared','extracted-candidate','inferred-proposal'].includes(q.origin)||!['unreviewed','author-reviewed','independently-reviewed'].includes(q.review)||!['unassessed','self-reported','externally-verified'].includes(q.verification)||!['public','restricted','unavailable','awaiting-permission'].includes(q['evidence-availability']))cvDataError();if(q.review==='independently-reviewed')cvText(q.reviewer);if(q.verification==='externally-verified')for(const field of ['verifier','verified-at','method','scope'])cvText(q[field]);cvArray(row.skillIds,2000);row.skillIds.forEach(cvID);cvArray(row.termIds,CV_DELIVERY_LIMITS.terms);if(new Set(row.skillIds).size!==row.skillIds.length||new Set(row.termIds).size!==row.termIds.length||row.termIds.some(id=>!Number.isSafeInteger(id)||id<0||id>=index.dictionary.length))cvDataError();byID.set(row.id,row);}
 const assigned=new Set();for(const bundle of index.bundles){cvFields(bundle,['url','sha256','bytes','ids','group']);if(!/^bundles\/[a-f0-9]{64}\.json$/u.test(bundle.url)||bundle.url!=='bundles/'+bundle.sha256+'.json'||!Number.isSafeInteger(bundle.bytes)||bundle.bytes<1||bundle.bytes>CV_DELIVERY_LIMITS.bundleBytes||bundles.has(bundle.url))cvDataError();cvText(bundle.group);if(!['shared','evidence'].includes(bundle.group)&&!bundle.group.startsWith('project:'))cvDataError();cvArray(bundle.ids,2000);if(!bundle.ids.length)cvDataError();for(const id of bundle.ids){if(assigned.has(id)||byID.get(id)?.bundle!==bundle.url)cvDataError();assigned.add(id);}bundles.set(bundle.url,bundle);}
 cvFields(index.coverage,['scope','records','literalDiscovery','detailCompleteness','liveFreshness']);if(index.coverage.scope!=='complete-declared-public-model'||index.coverage.records!==index.records.length||index.coverage.literalDiscovery!=='complete-before-detail-loading'||index.coverage.detailCompleteness!=='requires-requested-bundles'||index.coverage.liveFreshness!=='not-established')cvDataError();
 if(assigned.size!==index.records.length||index.records.some(row=>row.skillIds.some(id=>byID.get(id)?.type!=='Skill')))cvDataError();return freezeCVData(index);
}
/** Opening verifies the native pointer's index pin, but performs no fetch or
 * browser-cache operation. All content acquisition is an explicit later call. */
async function openCVDelivery(value,{expectedSha256,baseURL,cryptoObject=globalThis.crypto,fetchImpl=globalThis.fetch?.bind(globalThis)}={}){
 const index=validateIndex(value);if(!hashPattern.test(expectedSha256??'')||await hashBytes(encoder.encode(canonical(index)),cryptoObject)!==expectedSha256)fail('cv-delivery-index-mismatch');let base;try{base=new URL(baseURL);}catch{cvDataError();}if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||typeof fetchImpl!=='function')cvDataError();const byID=new Map(index.records.map(row=>[row.id,row])),bundles=new Map(index.bundles.map(row=>[row.url,row])),cache=new Map();let disposed=false;
 const ensure=options=>{if(disposed)fail('cv-delivery-disposed');check(options);};
 function query(request={}){ensure({});const q=copied(request);cvFields(q,['query','types','skillIds'],[]);if(q.query!==undefined&&(typeof q.query!=='string'||q.query.length>512||/[\u0000-\u001f\u007f]/u.test(q.query)))cvDataError();for(const name of ['types','skillIds'])if(q[name]!==undefined){cvArray(q[name],2000);if(new Set(q[name]).size!==q[name].length)cvDataError();}if(q.types?.some(type=>!recordTypes.has(type))||q.skillIds?.some(id=>byID.get(id)?.type!=='Skill'))cvDataError();const terms=norm(q.query??'').split(' ').filter(Boolean),matches=index.records.filter(row=>(!q.types?.length||q.types.includes(row.type))&&(!q.skillIds?.length||q.skillIds.some(id=>row.skillIds.includes(id)))&&terms.every(term=>row.termIds.some(id=>index.dictionary[id].includes(term))));return freezeCVData({version:1,status:'complete',modelSha256:index.modelSha256,ids:matches.map(row=>row.id),totalMatches:matches.length,coverage:{scope:'complete-declared-public-index',exhaustiveWithinIndex:true,detailsLoaded:false},qualification:index.qualification});}
 async function loadBundle(name,options,state){ensure(options);if(cache.has(name))return cache.get(name);const descriptor=bundles.get(name);if(!descriptor)cvDataError();const url=new URL(name,base).href;if(new URL(url).origin!==base.origin)cvDataError();const response=await fetchImpl(url,{signal:options.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store'});ensure(options);if(!response?.ok||response.redirected||response.url!==url||!response.body||!/^application\/json(?:\s*;|$)/iu.test(response.headers.get('content-type')??''))fail('cv-delivery-bundle-unavailable');const reader=response.body.getReader(),parts=[];let size=0;try{for(;;){ensure(options);const{done,value}=await reader.read();ensure(options);if(done)break;if(!(value instanceof Uint8Array))cvDataError();size+=value.length;state.bytes+=value.length;if(size>descriptor.bytes||state.bytes>CV_DELIVERY_LIMITS.transferBytes)fail('cv-delivery-transfer-budget');parts.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}if(size!==descriptor.bytes)fail('cv-delivery-bundle-mismatch');const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}if(await hashBytes(bytes,cryptoObject)!==descriptor.sha256)fail('cv-delivery-bundle-mismatch');ensure(options);let packet;try{packet=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('cv-delivery-bundle-invalid');}packet=copied(packet);cvFields(packet,['version','kind','modelSha256','records']);if(packet.version!==1||packet.kind!=='cv-public-record-bundle'||packet.modelSha256!==index.modelSha256)cvDataError();cvArray(packet.records,2000);if(canonical(packet.records.map(row=>row.id))!==canonical(descriptor.ids))cvDataError();for(const record of packet.records){const row=byID.get(record.id);if(!row||await hashCVData(record,{cryptoObject})!==row.recordSha256)fail('cv-delivery-record-mismatch');for(const key of ['id','type','title','url','qualification','publicationReview'])if(canonical(record[key])!==canonical(row[key]))fail('cv-delivery-record-mismatch');ensure(options);}const result=freezeCVData(packet.records);cache.set(name,result);return result;}
 async function loadRecords(ids,options={}){const selected=copied(ids);cvArray(selected,2000);if(new Set(selected).size!==selected.length||selected.some(id=>!byID.has(id)))cvDataError();ensure(options);const available=new Map(),unknown=new Set(),state={bytes:0};for(const name of new Set(selected.map(id=>byID.get(id).bundle))){try{for(const record of await loadBundle(name,options,state))available.set(record.id,record);}catch(error){ensure(options);if(!String(error.code??'').startsWith('cv-delivery-')&&error.code!=='invalid-cv-feature'&&!(error instanceof TypeError))throw error;for(const id of selected)if(byID.get(id).bundle===name)unknown.add(id);}}ensure(options);return freezeCVData({version:1,status:unknown.size?'incomplete':'complete',modelSha256:index.modelSha256,records:selected.filter(id=>available.has(id)).map(id=>available.get(id)),unknownIds:selected.filter(id=>unknown.has(id)),coverage:{scope:'explicit-record-request',requested:selected.length,loaded:selected.length-unknown.size,exhaustiveWithinRequest:!unknown.size,wholeModelVerified:false},qualification:'Exact index-bound public record bytes only. This partial detail result is not an authoritative public-model v1 export; unloaded or failed details remain unknown.'});}
 async function loadCompleteModel(options={}){const result=await loadRecords(index.records.map(row=>row.id),options);if(result.status!=='complete')return result;const model=validatePublicModel({version:1,asOf:index.asOf,records:result.records});if(await hashCVData(model,{cryptoObject})!==index.modelSha256)fail('cv-delivery-model-mismatch');ensure(options);return freezeCVData({version:1,status:'complete',model,modelSha256:index.modelSha256,coverage:{scope:'complete-declared-public-model',wholeModelVerified:true},qualification:'Full original public model reassembled and hash-checked; existing export and GW professional APIs can now consume it unchanged.'});}
 const client=Object.freeze({version:1,index,query,loadRecords,loadCompleteModel,dispose(){disposed=true;cache.clear();}});return client;
}

return {CV_DELIVERY_LIMITS,buildCVDelivery,openCVDelivery};
})();

const temporal_rules = (() => {
// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// PRIVATE R6 DRAFT. Finite declared calendar rules, never a temporal reasoner.
const {validatePublicModel,copyCVData,cvFields,cvArray,cvID,cvText,cvDay,cvDataError,freezeCVData,hashCVData,canonicalCVData,validateTemporalSidecar,parseTemporalEndpoint,describeTemporalEndpoint,consistentTemporalBounds} = temporal;
const pairOperations=['before','after','overlap','during'];
const names=value=>{cvText(value,128);if(!/^[A-Za-z][A-Za-z0-9._-]*$/u.test(value))cvDataError();return value;};
const compare=(yes,no)=>yes?'true':no?'false':'unknown';
function possibleChain(ranges){let value=-Infinity;for(const[lo,hi]of ranges){value=Math.max(value,lo);if(value>hi)return false;}return true;}
function pairValue(a,b,operation,same){
 if(a.basis==='missing'||b.basis==='missing')return{value:'unknown',reason:'no-declared-period'};
 if(same)return{value:['overlap','during'].includes(operation)?'true':'false',reason:'same-declared-interval-identity'};
 const A=a.bounds,B=b.bounds;let value;
 if(operation==='before')value=compare(A.endHi<B.lo,A.endLo>=B.hi);
 else if(operation==='after')value=compare(A.lo>B.endHi,A.hi<=B.endLo);
 else if(operation==='overlap')value=compare(A.hi<=B.endLo&&B.hi<=A.endLo,A.lo>B.endHi||B.lo>A.endHi);
 else{
  const every=A.lo>=B.hi&&A.endHi<=B.endLo;
  // A date is one event variable, not two independently chosen endpoints.
  const possible=b.basis==='date'?Math.max(A.lo,A.endLo,B.lo)<=Math.min(A.hi,A.endHi,B.hi):possibleChain([[B.lo,B.hi],[A.lo,A.hi],[A.endLo,A.endHi],[B.endLo,B.endHi]]);
  value=compare(every,!possible);
 }
 return{value,reason:value==='true'?'every-consistent-declared-interval-pair':value==='false'?'no-consistent-declared-interval-pair':'depends-on-unknown-or-imprecise-declarations'};
}
function rowBounds(row,asOf){const start=row.basis==='date'?row.date:row.start,end=row.basis==='date'?row.date:row.end;return{...row,bounds:consistentTemporalBounds(start,end,asOf)};}
async function queryTemporalRules(model,sidecar,rules,options={}){
 const snapshot=validatePublicModel(model),request=copyCVData(rules);cvArray(request,128);const bound=await validateTemporalSidecar(snapshot,sidecar,options),byID=new Map(bound.records.map(row=>[row.id,rowBounds(row,snapshot.asOf)])),seen=new Set(),results=[];
 for(const rule of request){cvFields(rule,['id','operation','left','right']);names(rule.id);cvID(rule.left);cvID(rule.right);if(seen.has(rule.id)||!pairOperations.includes(rule.operation)||!byID.has(rule.left)||!byID.has(rule.right))cvDataError();seen.add(rule.id);const a=byID.get(rule.left),b=byID.get(rule.right),answer=pairValue(a,b,rule.operation,rule.left===rule.right);results.push({...rule,...answer,leftRecordSha256:a.recordSha256,rightRecordSha256:b.recordSha256});}
 return freezeCVData({version:1,kind:'cv-declared-temporal-rules',status:'complete',modelSha256:bound.modelSha256,requestSha256:await hashCVData(request,options),asOf:snapshot.asOf,results,coverage:{scope:'explicit-rule-list-and-public-model',unknownIsNotFalse:true,exhaustiveWithinRules:true},qualification:'Conditional finite calendar relations over declared possible intervals; no employment, skill, completion, current truth or causal relationship is inferred. Before/after are strict; overlap/during are inclusive.'});
}
function validityDefinitions(model,definitions){
 const byID=new Map(model.records.map(record=>[record.id,record])),seen=new Set(),rows=[];cvArray(definitions,128);
 for(const raw of definitions){cvFields(raw,['id','from','through'],['id']);cvID(raw.id);if(seen.has(raw.id)||byID.get(raw.id)?.type!=='Assertion'||raw.from===undefined&&raw.through===undefined)cvDataError();seen.add(raw.id);const start=parseTemporalEndpoint(raw.from,'start',model.asOf),end=parseTemporalEndpoint(raw.through,'end',model.asOf);consistentTemporalBounds(start,end,model.asOf);const declaration=copyCVData(raw),facts=[];for(const[key,position]of [['from','start'],['through','end']])if(raw[key]!==undefined)facts.push({label:'Declared claim validity '+key,value:describeTemporalEndpoint(raw[key],position,model.asOf)});rows.push({id:raw.id,declaration,start,end,facts});}
 return rows;
}
function deriveClaimValidityFacts(model,definitions=[]){const snapshot=validatePublicModel(model),rows=validityDefinitions(snapshot,copyCVData(definitions));return freezeCVData({version:1,records:rows.map(({id,facts})=>({id,facts}))});}
async function buildClaimValiditySidecar(model,definitions=[],options={}){
 const snapshot=validatePublicModel(model),rows=validityDefinitions(snapshot,copyCVData(definitions)),byID=new Map(snapshot.records.map(record=>[record.id,record]));
 for(const row of rows)for(const fact of row.facts){const matching=(byID.get(row.id).facts??[]).filter(value=>value.label===fact.label);if(matching.length!==1||matching[0].value!==fact.value)cvDataError();}
 const records=[];for(const row of rows)records.push({id:row.id,recordSha256:await hashCVData(byID.get(row.id),options),start:row.start,end:row.end});
 return freezeCVData({version:1,kind:'cv-claim-validity',modelSha256:await hashCVData(snapshot,options),asOf:snapshot.asOf,declarations:rows.map(row=>row.declaration),records,scope:'explicit-public-assertion-validity-only',qualification:'Authored claim-validity dates are distinct from event, publication and review dates. Calendar inclusion does not verify the claim or establish current truth.'});
}
async function queryClaimValidity(model,sidecar,request={},options={}){
 const snapshot=validatePublicModel(model),packet=copyCVData(sidecar),query=copyCVData(request);cvFields(query,['at','recordIds'],[]);cvFields(packet,['version','kind','modelSha256','asOf','declarations','records','scope','qualification']);const regenerated=await buildClaimValiditySidecar(snapshot,packet.declarations,options);if(canonicalCVData(regenerated)!==canonicalCVData(packet))cvDataError();const at=cvDay(query.at??snapshot.asOf),instant=parseTemporalEndpoint(at,'date',snapshot.asOf).lower,byID=new Map(snapshot.records.map(record=>[record.id,record])),chosen=query.recordIds===undefined?snapshot.records.filter(record=>record.type==='Assertion').map(record=>record.id):query.recordIds;cvArray(chosen,2000);if(new Set(chosen).size!==chosen.length||chosen.some(id=>byID.get(id)?.type!=='Assertion'))cvDataError();const rows=new Map(packet.records.map(row=>[row.id,row])),results=[];
 for(const id of chosen){const row=rows.get(id);let value='unknown',reason='no-separate-claim-validity-declared';if(row){const bounds=consistentTemporalBounds(row.start,row.end,snapshot.asOf);value=compare(bounds.hi<=instant&&bounds.endLo>=instant,bounds.lo>instant||bounds.endHi<instant);reason=value==='true'?'every-consistent-validity-interval-includes-day':value==='false'?'no-consistent-validity-interval-includes-day':'validity-depends-on-unknown-or-imprecise-declarations';}results.push({id,value,reason});}
 return freezeCVData({version:1,kind:'cv-claim-validity-query',status:'complete',modelSha256:packet.modelSha256,requestSha256:await hashCVData({at,recordIds:chosen},options),at,results,coverage:{scope:'selected-public-assertions',unknownIsNotFalse:true},qualification:packet.qualification});
}

return {queryTemporalRules,deriveClaimValidityFacts,buildClaimValiditySidecar,queryClaimValidity};
})();

const professional_narrative = (() => {
// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// PRIVATE R6 DRAFT. Original CV glue; no GW/LA implementation is embedded.
const {validatePublicModel,copyCVData,canonicalCVData,freezeCVData,hashCVData,cvFields,cvArray,cvText,cvDataError} = temporal;
const NARRATIVE_LIMITS=Object.freeze({bytes:4194304,records:2000,evidenceRecords:4,sourceCharacters:4000,evidenceCharacters:12000});
const encoder=new TextEncoder(),hashPattern=/^[a-f0-9]{64}$/u;
const fail=code=>{const error=Error(code);error.code=code;throw error;};
const check=({signal,isCurrent}={})=>{if(signal?.aborted)throw signal.reason??new DOMException('Cancelled','AbortError');if(isCurrent&&isCurrent()!==true)fail('cv-narrative-stale');};
const canonical=value=>canonicalCVData(value,0,new Set(),{nodes:0,bytes:0,maxBytes:NARRATIVE_LIMITS.bytes,maxNodes:300000,maxDepth:24});
const copy=value=>copyCVData(value,{maxBytes:NARRATIVE_LIMITS.bytes,maxNodes:300000,maxDepth:24});
async function sha(value,cryptoObject){if(!cryptoObject?.subtle?.digest)cvDataError();const digest=await cryptoObject.subtle.digest('SHA-256',encoder.encode(canonical(value)));if(!(digest instanceof ArrayBuffer)||digest.byteLength!==32)cvDataError();return BufferlessHex(new Uint8Array(digest));}
function BufferlessHex(bytes){return[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function descriptor(value,id,version){const result=copy(value);cvFields(result,['id','version','sha256']);if(result.id!==id||result.version!==version||!hashPattern.test(result.sha256))cvDataError();return result;}
function requestFor(value){const request=copy(value);cvFields(request,['purpose','selection','question'],['purpose','selection']);if(!['cv-summary','cover-letter','application-answer'].includes(request.purpose))cvDataError();cvFields(request.selection,['query','skillIds','projectIds','types','detail','includeEvidence'],[]);if(request.question!==undefined)cvText(request.question,1500);return request;}
function normalizedSelection(value){return{query:value.query??'',skillIds:value.skillIds??[],projectIds:value.projectIds??[],types:value.types??[],detail:value.detail??'summary',includeEvidence:value.includeEvidence??true};}
/** Readable, deterministic extraction of the complete unchanged record. Labels
 * identify declared data; they do not turn review or evidence into authority. */
function professionalRecordText(record){
 const lines=[record.type+': '+record.title,record.summary,'Record: '+record.id,'Published source: '+record.url,'Publication review (declared): '+record.publicationReview,'Qualifications (declared):'];
 for(const key of Object.keys(record.qualification).sort())lines.push(key+': '+record.qualification[key]);
 for(const key of ['start','end','date'])if(record[key]!==undefined&&record[key]!==null)lines.push('Declared '+key+': '+record[key]);
 for(const fact of [...(record.scalarFacts??[]),...(record.facts??[])])lines.push(fact.label+': '+fact.value);
 for(const link of record.relations??[])lines.push('Declared '+link.predicate+': '+link.title+' ('+link.target+'; '+link.url+')');
 return lines.join('\n');
}
/** The caller's native/discovery layer supplies an observed, pinned original GW
 * module and its function. This glue checks returned data identity, not module
 * authenticity or the truth of the producer's review declarations. */
async function createNarrativePlan(model,request,options={}){
 cvFields(options,['professional','cryptoObject','signal','isCurrent'],['professional']);const snapshot=validatePublicModel(model),chosen=requestFor(request),cryptoObject=options.cryptoObject??globalThis.crypto;check(options);
 cvFields(options.professional,['descriptor','select'],['descriptor','select']);const provider=descriptor(options.professional.descriptor,'generative-websites','gw-professional-view-v1');if(typeof options.professional.select!=='function')cvDataError();
 const raw=await options.professional.select(snapshot,chosen.selection,{cryptoObject});check(options);const selected=copy(raw);cvFields(selected,['version','kind','providerVersion','asOf','request','primaryIds','selectionIds','reasons','records','hashes','coverage','reviewStatus','sourceQualification']);
 if(selected.version!==1||selected.kind!=='gw-professional-view'||selected.providerVersion!==provider.version||selected.asOf!==snapshot.asOf||selected.reviewStatus!=='unchanged-source-declarations'||canonical(selected.request)!==canonical(normalizedSelection(chosen.selection)))fail('cv-narrative-provider-mismatch');
 cvArray(selected.primaryIds);cvArray(selected.selectionIds);cvArray(selected.records);cvArray(selected.reasons);cvFields(selected.hashes,['modelSha256','requestSha256','selectedFactsSha256','records']);const sourceRows=new Map(snapshot.records.map(row=>[row.id,row])),ids=new Set(selected.selectionIds);
 if(ids.size!==selected.selectionIds.length||new Set(selected.primaryIds).size!==selected.primaryIds.length||selected.primaryIds.some(id=>!ids.has(id))||selected.selectionIds.some(id=>!sourceRows.has(id)))fail('cv-narrative-provider-mismatch');
 const expected=snapshot.records.filter(row=>ids.has(row.id));if(canonical(expected)!==canonical(selected.records)||canonical(expected.map(row=>row.id))!==canonical(selected.selectionIds)||canonical(selected.reasons.map(row=>row.id))!==canonical(selected.selectionIds))fail('cv-narrative-provider-mismatch');
 const modelSha256=await hashCVData(snapshot,{cryptoObject});check(options);if(selected.hashes.modelSha256!==modelSha256||selected.hashes.requestSha256!==await sha(selected.request,cryptoObject)||selected.hashes.selectedFactsSha256!==await sha(expected,cryptoObject))fail('cv-narrative-provider-mismatch');check(options);
 const recordHashes=[];for(const row of expected){recordHashes.push({id:row.id,sha256:await hashCVData(row,{cryptoObject})});check(options);}if(canonical(recordHashes)!==canonical(selected.hashes.records))fail('cv-narrative-provider-mismatch');
 cvFields(selected.coverage,['scope','graphScope','exhaustiveWithinModel','totalRecords','matchedRecords','selectedRecords']);if(selected.coverage.scope!=='declared-public-model-only'||selected.coverage.graphScope!=='caller-selected-model'||selected.coverage.exhaustiveWithinModel!==true||selected.coverage.totalRecords!==snapshot.records.length||selected.coverage.matchedRecords!==selected.primaryIds.length||selected.coverage.selectedRecords!==expected.length)fail('cv-narrative-provider-mismatch');
 const body={version:1,kind:'cv-professional-narrative-plan',status:'extractive-unreviewed',asOf:snapshot.asOf,request:chosen,provider,primaryIds:selected.primaryIds,selectionIds:selected.selectionIds,reasons:selected.reasons,records:expected,extractiveText:expected.map(professionalRecordText).join('\n\n'),hashes:{modelSha256,requestSha256:await sha(chosen,cryptoObject),providerRequestSha256:selected.hashes.requestSha256,selectionSha256:selected.hashes.selectedFactsSha256,records:recordHashes},coverage:selected.coverage,qualification:'Exact selected public wording and all selected context, qualifications, assertions and evidence are retained. Selection uses the observed original GW provider. This extractive draft adds no achievement, skill, causal impact, translation, consent, authenticated review or claim of truth.'};
 const planSha256=await sha(body,cryptoObject);check(options);return freezeCVData({...body,planSha256});
}
async function validateNarrativePlan(value,model,options={}){
 const plan=copy(value);cvFields(plan,['version','kind','status','asOf','request','provider','primaryIds','selectionIds','reasons','records','extractiveText','hashes','coverage','qualification','planSha256']);const rebuilt=await createNarrativePlan(model,plan.request,options);check(options);if(canonical(plan)!==canonical(rebuilt))fail('cv-narrative-plan-mismatch');return rebuilt;
}
function proposalOptions(options){cvFields(options,['professional','proposal','baseURL','cryptoObject','signal','isCurrent'],['professional','proposal','baseURL']);cvFields(options.proposal,['descriptor','buildRequest','validateOutput']);const provider=descriptor(options.proposal.descriptor,'local-ai-websites','source-bound-quote-proposal-v1');if(typeof options.proposal.buildRequest!=='function'||typeof options.proposal.validateOutput!=='function')cvDataError();return provider;}
/** This prepares data only. It never starts a model, downloads assets or sends
 * an endpoint request. Every selected record must fit in the existing LA quote
 * protocol, including contrary/qualifying evidence. Nothing is silently clipped
 * or omitted to squeeze a larger professional selection into that protocol. */
async function prepareNarrativeProposal(model,value,options={}){
 const proposalProvider=proposalOptions(options),cryptoObject=options.cryptoObject??globalThis.crypto,plan=await validateNarrativePlan(value,model,{professional:options.professional,cryptoObject,signal:options.signal,isCurrent:options.isCurrent});check(options);
 let base;try{base=new URL(options.baseURL);}catch{cvDataError();}if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)cvDataError();
 const texts=plan.records.map(professionalRecordText),total=texts.reduce((sum,text)=>sum+text.length,0);if(!texts.length||texts.length>NARRATIVE_LIMITS.evidenceRecords||texts.some(text=>text.length>NARRATIVE_LIMITS.sourceCharacters)||total>NARRATIVE_LIMITS.evidenceCharacters)return freezeCVData({version:1,status:'unavailable',reason:'complete-selection-exceeds-existing-quote-protocol',planSha256:plan.planSha256,modelSha256:plan.hashes.modelSha256,coverage:{selectedRecords:plan.records.length,providedRecords:0,omittedRecords:plan.records.length,maximumRecords:4,maximumSourceCharacters:4000,maximumTotalCharacters:12000},qualification:'The extractive plan remains available. No context, qualifier, contrary evidence or condition was dropped to prepare a model request.'});
 const evidence=plan.records.map((row,index)=>{const url=new URL(row.url,base);if(url.origin!==base.origin||!['http:','https:'].includes(url.protocol)||url.username||url.password)fail('cv-narrative-source-url');return{id:'cv-record-'+plan.hashes.records[index].sha256,text:texts[index],url:url.href};});
 const question=plan.request.question??'Prepare an unreviewed '+plan.request.purpose+' using only the supplied public wording. Preserve every condition, uncertainty and qualification.';
 const context={snapshotId:plan.hashes.modelSha256,querySha256:plan.hashes.requestSha256,providerSha256:proposalProvider.sha256,resultSha256:plan.planSha256};
 const packet=copy(await options.proposal.buildRequest({question,evidence,snapshot:plan.planSha256,context},{cryptoObject,format:'source-bound-quote-proposal-v1'}));check(options);
 if(packet.version!==1||packet.kind!=='source-bound-proposal-request'||packet.format!=='source-bound-quote-proposal-v1'||packet.question!==question||canonical(packet.evidence)!==canonical(evidence)||canonical(packet.context)!==canonical(context)||canonical(packet.generation)!==canonical({question,evidence,snapshot:plan.planSha256,outputFormat:'source-bound-quote-proposal-v1',context}))fail('cv-narrative-proposal-provider-mismatch');
 // A real LA validator rebuilds the packet at output acceptance. This wrapper
 // also binds its exact supplied module descriptor and native source selection.
 return freezeCVData({version:1,status:'ready',kind:'cv-professional-narrative-proposal',plan,proposalProvider,baseURL:base.href,packet,qualification:'A bounded unreviewed proposal request, not generated text. Exact quotation is not evidence support or professional endorsement. Model execution and reader review remain separate explicit actions.'});
}
async function validateNarrativeProposalOutput(raw,prepared,model,options={}){
 proposalOptions(options);const saved=copy(prepared);cvFields(saved,['version','status','kind','plan','proposalProvider','baseURL','packet','qualification']);if(saved.version!==1||saved.status!=='ready'||saved.kind!=='cv-professional-narrative-proposal')cvDataError();
 const rebuilt=await prepareNarrativeProposal(model,saved.plan,options);check(options);if(rebuilt.status!=='ready'||canonical(saved)!==canonical(rebuilt))fail('cv-narrative-proposal-mismatch');
 const result=await options.proposal.validateOutput(raw,rebuilt.packet,{cryptoObject:options.cryptoObject??globalThis.crypto});check(options);
 return freezeCVData({version:1,kind:'cv-professional-narrative-output',status:'unreviewed-proposal',planSha256:rebuilt.plan.planSha256,modelSha256:rebuilt.plan.hashes.modelSha256,selectionSha256:rebuilt.plan.hashes.selectionSha256,proposalProvider:rebuilt.proposalProvider,result:copy(result),qualification:'Original LA quote validation succeeded for this exact selected public snapshot. Claim support, completeness, professional suitability, human review and causal attribution remain unestablished.'});
}

return {NARRATIVE_LIMITS,createNarrativePlan,validateNarrativePlan,prepareNarrativeProposal,validateNarrativeProposalOutput};
})();

const professional_generation = (() => {
// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Original CV consumer glue. It owns no model, consent or provider registry.
const {copyCVData,canonicalCVData,freezeCVData,cvFields,cvArray,cvText,cvURL,cvDataError} = temporal;
const {prepareNarrativeProposal,validateNarrativeProposalOutput} = professional_narrative;
const CV_GENERATION_VERSION='cv-ready-professional-proposal-v1';
const format='source-bound-quote-proposal-v1',hex=/^[a-f0-9]{64}$/u;
const copy=value=>copyCVData(value,{maxBytes:4194304,maxNodes:300000,maxDepth:24});
const canonical=value=>canonicalCVData(value,0,new Set(),{nodes:0,bytes:0,maxBytes:4194304,maxNodes:300000,maxDepth:24});
const fail=code=>{const error=Error(code);error.code=code;throw error;};
function current(options){if(options.signal?.aborted)fail('cv-generation-cancelled');if(options.isCurrent&&options.isCurrent()!==true)fail('cv-generation-stale');}
/** Builds only delivery provenance. Call the original LA request builder with
 * this delivered root; never patch a canonical prepared request in place. */
function resolveNarrativeDelivery(sourceURLs,canonicalBaseURL,deliveredBaseURL){
 cvArray(sourceURLs,2000);const root=value=>{cvText(value,4096);let url;try{url=new URL(value);}catch{cvDataError();}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/'))cvDataError();return url;},canonical=root(canonicalBaseURL),delivered=root(deliveredBaseURL);
 for(const value of sourceURLs){cvURL(value);const url=new URL(value,delivered);if(url.origin!==delivered.origin||url.username||url.password||!url.pathname.startsWith(delivered.pathname)||/%(?:2f|5c)/iu.test(url.pathname))fail('cv-generation-source-not-portable');}
 return freezeCVData({version:1,canonicalBaseURL:canonical.href,deliveredBaseURL:delivered.href,selectedRecords:sourceURLs.length,sourcePolicy:'unchanged-declared-URLs-confined-to-current-delivered-root',qualification:'Canonical publication and current HTTP(S) delivery are distinct. Relative declared URLs resolve inside the captured reader root; external or escaping absolute URLs are not silently rewritten. The original model and plan remain unchanged.'});
}
/** The main module owns a private document registry: query/fragment variants
 * are distinct module identities. Keep its exact delivered URL for import.
 * Fetch sends no fragment; the pure quote module is a deliberate sibling. */
function localAIProviderURLs(deliveredSrc,fileName,{baseURL,origin}={}){
 cvText(deliveredSrc,4096);cvText(baseURL,4096);cvText(origin,512);if(!['local-ai-websites.js','proposal.js'].includes(fileName))cvDataError();
 let delivered,url;try{delivered=new URL(deliveredSrc,baseURL);url=fileName==='local-ai-websites.js'?new URL(delivered.href):new URL(fileName,delivered);}catch{cvDataError();}
 if(delivered.origin!==origin||delivered.username||delivered.password||!['http:','https:'].includes(delivered.protocol)||!delivered.pathname.endsWith('/local-ai-websites.js')||url.origin!==origin)cvDataError();
 const request=new URL(url.href);request.hash='';return freezeCVData({importURL:url.href,requestURL:request.href});
}
function validateGenerationDescriptor(value){
 const result=copy(value);cvFields(result,['version','module','bytes','sha256','format']);
 if(result.version!==1||result.module!=='local-ai-websites.js'||result.format!==format||!Number.isSafeInteger(result.bytes)||result.bytes<1||result.bytes>262144||!hex.test(result.sha256))cvDataError();
 return freezeCVData(result);
}
/** Data-only snapshots; a consumer cannot register or load a provider. The
 * caller must first bind the actual delivered module to the native descriptor. */
function inspectGenerationProviders(api){
 if(!api||!['GENERATION_PROVIDER_VERSION','getLocalGenerationProviders','focusLocalGenerationProvider','generateWithLocalProvider'].every(key=>{const field=Object.getOwnPropertyDescriptor(api,key);return field&&Object.hasOwn(field,'value');})||api.GENERATION_PROVIDER_VERSION!==1||typeof api.getLocalGenerationProviders!=='function'||typeof api.focusLocalGenerationProvider!=='function'||typeof api.generateWithLocalProvider!=='function')fail('cv-generation-provider-incompatible');
 const rows=copy(api.getLocalGenerationProviders());if(!Array.isArray(rows)||rows.length>64)cvDataError();const ids=new Set();
 for(const row of rows){cvFields(row,['version','id','status','format']);cvText(row.id,128);if(row.version!==1||row.format!==format||!['ready','not-ready','busy'].includes(row.status)||ids.has(row.id))cvDataError();ids.add(row.id);}
 return freezeCVData(rows);
}
/** Explicit action only. Rebuilds the complete original CV/LA packet before
 * borrowing an already-ready document-owned engine and reuses the original
 * output validator afterwards. No selection is clipped to fit model budgets. */
async function generateNarrativeProposal(model,prepared,options={}){
 cvFields(options,['professional','proposal','baseURL','generation','cryptoObject','signal','isCurrent'],['professional','proposal','baseURL','generation']);
 cvFields(options.generation,['descriptor','api','id']);const descriptor=validateGenerationDescriptor(options.generation.descriptor),api=options.generation.api,id=options.generation.id;cvText(id,128);current(options);
 const context={professional:options.professional,proposal:options.proposal,baseURL:options.baseURL,...(options.cryptoObject?{cryptoObject:options.cryptoObject}:{}),...(options.signal?{signal:options.signal}:{}),...(options.isCurrent?{isCurrent:options.isCurrent}:{})};
 const saved=copy(prepared);if(saved.status!=='ready'||saved.kind!=='cv-professional-narrative-proposal')fail('cv-generation-preparation-unavailable');
 const rebuilt=await prepareNarrativeProposal(model,saved.plan,context);current(options);if(rebuilt.status!=='ready'||canonical(rebuilt)!==canonical(saved))fail('cv-generation-preparation-mismatch');
 const selected=inspectGenerationProviders(api).find(row=>row.id===id);if(!selected||selected.status!=='ready')fail('cv-generation-provider-not-ready');
 const input=copy(rebuilt.packet.generation);if(input.outputFormat!==format)fail('cv-generation-request-mismatch');delete input.outputFormat;
 const response=copy(await api.generateWithLocalProvider(id,input,{...(options.signal?{signal:options.signal}:{}),...(options.isCurrent?{isCurrent:options.isCurrent}:{})}));current(options);
 cvFields(response,['proposal','provenance','rawProposal','proposalRequest']);
 if(canonical(response.proposalRequest)!==canonical(rebuilt.packet))fail('cv-generation-request-mismatch');
 if(!inspectGenerationProviders(api).some(row=>row.id===id&&row.status==='ready'))fail('cv-generation-provider-stale');
 const validation=await validateNarrativeProposalOutput(response.rawProposal,rebuilt,model,context);current(options);
 if(canonical(response.proposal)!==canonical(validation.result))fail('cv-generation-output-mismatch');
 return freezeCVData({version:1,kind:CV_GENERATION_VERSION,status:'unreviewed-proposal',planSha256:rebuilt.plan.planSha256,modelSha256:rebuilt.plan.hashes.modelSha256,selectionSha256:rebuilt.plan.hashes.selectionSha256,generationProvider:{descriptor,id},originalResponse:response,validation,qualification:'An explicitly requested proposal from the existing ready, consented page widget. Original request, raw response, model provenance and CV quote validation are retained. Exact quotation does not establish support, complete coverage, suitable writing, human approval, consent authenticity or causal impact. The unchanged full source extract and qualifications remain authoritative.'});
}

return {CV_GENERATION_VERSION,resolveNarrativeDelivery,localAIProviderURLs,validateGenerationDescriptor,inspectGenerationProviders,generateNarrativeProposal};
})();

globalThis.InteractiveCVFeatures=Object.freeze({protocolVersion:1,...temporal,...services,...reader_selection,...delivery,...temporal_rules,...professional_narrative,...professional_generation});
})();
