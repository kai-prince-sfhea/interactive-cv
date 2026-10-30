// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Original finite public-record selection. No inference or source rewriting.
import {validatePublicModel,hashPublicModel,copyCVData} from './temporal.js';
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
export async function validateFeatureData(model,value,{cryptoObject=globalThis.crypto}={}){
 const snapshot=validatePublicModel(model),packet=copyCVData(value,{maxBytes:4194304,maxNodes:300000,maxDepth:24});fields(packet,['version','modelSha256','asOf','temporal','services']);if(packet.version!==1||packet.asOf!==snapshot.asOf||!/^[a-f0-9]{64}$/u.test(packet.modelSha256)||packet.modelSha256!==await hashPublicModel(snapshot,{cryptoObject}))fail();
 for(const sidecar of [packet.temporal,packet.services])if(!sidecar||typeof sidecar!=='object'||sidecar.modelSha256!==packet.modelSha256)fail();
 return freeze(packet);
}

/** Classify only declared public evidence links. Unknown availability remains
 * separate; no missing public link proves that evidence does not exist. */
export async function queryEvidence(model,{mode='linked',recordIds}={}, {cryptoObject=globalThis.crypto}={}){
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
export async function selectPublicRecords(model,primaryIds,{includeAssociatedEvidence=true,cryptoObject=globalThis.crypto}={}){
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
