// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Author-declared service windows. No live availability, consent authentication,
// commercial terms or source/external review are inferred by these utilities.
import {validatePublicModel,hashCVData,canonicalCVData,copyCVData,freezeCVData,cvFields,cvArray,cvText,cvID,cvDay,cvDataError} from './temporal.js';
export const SERVICE_VERSION='cv-services-v1';
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
export function deriveServiceFacts(model,definitions=[],{consentingPersonIds=[]}={}){const value=prepare(model,definitions,consentingPersonIds);return freezeCVData({version:1,records:value.rows});}
function availability(declaration,at){
 if(declaration.status!=='offered')return{value:'false',reasons:['declared-status-is-not-offered']};
 if(declaration.validFrom!==undefined&&at<declaration.validFrom||declaration.validThrough!==undefined&&at>declaration.validThrough)return{value:'false',reasons:['outside-declared-offer-window']};
 if(declaration.validFrom===undefined||declaration.validThrough===undefined)return{value:'unknown',reasons:['complete-declared-offer-window-missing']};
 return{value:'true',reasons:['offered-within-declared-calendar-window','live-availability-not-verified']};
}
function requireFacts(record,facts){for(const fact of facts){const matches=(record.facts||[]).filter(item=>item.label===fact.label);if(matches.length!==1||matches[0].value!==fact.value)cvDataError();}}
export async function buildServiceSidecar(model,definitions=[],{consentingPersonIds=[],evaluatedOn,cryptoObject=globalThis.crypto}={}){
 const prepared=prepare(model,definitions,consentingPersonIds),snapshot=prepared.snapshot,day=cvDay(evaluatedOn===undefined?snapshot.asOf:evaluatedOn),rows=[],options={cryptoObject};
 for(const entry of prepared.rows){const record=prepared.byID.get(entry.id),provider=prepared.byID.get(entry.declaration.provider);requireFacts(record,entry.facts);const current=availability(entry.declaration,day);rows.push({id:entry.id,recordSha256:await hashCVData(record,options),providerSha256:await hashCVData(provider,options),...entry.declaration,currentOffer:current.value,reasons:current.reasons});}
 const result={version:1,kind:'cv-service-sidecar',providerVersion:SERVICE_VERSION,modelSha256:await hashCVData(snapshot,options),asOf:snapshot.asOf,evaluatedOn:day,consentingPersonIds:prepared.consentingPersonIds,declarations:prepared.rows.map(row=>row.declaration),records:rows,scope:'declared-public-service-offerings-only',qualification};canonicalCVData(result);return freezeCVData(result);
}
/** Replay the receipt's explicit evaluation day and consent declarations, never
 * the browser clock. A valid hash is identity, not proof of permission or truth. */
export async function validateServiceSidecar(model,value,{cryptoObject=globalThis.crypto}={}){
 const packet=copyCVData(value);cvFields(packet,['version','kind','providerVersion','modelSha256','asOf','evaluatedOn','consentingPersonIds','declarations','records','scope','qualification']);const result=await buildServiceSidecar(model,packet.declarations,{consentingPersonIds:packet.consentingPersonIds,evaluatedOn:packet.evaluatedOn,cryptoObject});if(canonicalCVData(packet)!==canonicalCVData(result))cvDataError();return result;
}
export async function queryServices(model,sidecar,request={},options={}){
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
export async function buildServiceStructuredData(model,sidecar,{siteURL,cryptoObject=globalThis.crypto}={}){
 const snapshot=validatePublicModel(model),bound=await validateServiceSidecar(snapshot,sidecar,{cryptoObject}),selected=bound.records.filter(row=>row.jsonld&&row.currentOffer==='true'),byID=new Map(snapshot.records.map(row=>[row.id,row]));
 const receipt={version:1,modelSha256:bound.modelSha256,sourceAsOf:bound.asOf,evaluatedOn:bound.evaluatedOn,status:selected.length?'eligible-author-declarations':'no-current-opted-in-author-declarations',serviceIds:selected.map(row=>row.id),qualification};if(!selected.length)return freezeCVData({jsonld:null,receipt});
 const base=siteRoot(siteURL),graph=[],groups=new Map();for(const row of selected){const service=byID.get(row.id),provider=byID.get(row.provider);if(!groups.has(row.provider))groups.set(row.provider,{provider,offers:[]});const group=groups.get(row.provider),offerID='_:cvOffer'+graph.length,url=nativeURL(service.url,base),qualifiers=Object.keys(service.qualification).sort().map(key=>key+': '+service.qualification[key]).join('; ');group.offers.push({'@id':offerID});graph.push({'@type':'Service','@id':service.id,name:service.title,description:service.summary,disambiguatingDescription:'Declared public qualifications — '+qualifiers+'; publication-review: '+service.publicationReview+'. '+qualification,url,provider:{'@id':provider.id},offers:{'@id':offerID}},{'@type':'Offer','@id':offerID,itemOffered:{'@id':service.id},offeredBy:{'@id':provider.id},url,validFrom:row.validFrom,validThrough:row.validThrough});}
 let index=0;for(const {provider,offers}of groups.values()){const catalogueID='_:cvCatalogue'+index++;graph.push({'@type':'Person','@id':provider.id,name:provider.title,url:nativeURL(provider.url,base),hasOfferCatalog:{'@id':catalogueID}},{'@type':'OfferCatalog','@id':catalogueID,name:'Declared services from '+provider.title,itemListElement:offers});}
 return freezeCVData({jsonld:{'@context':'https://schema.org','@graph':graph},receipt});
}
