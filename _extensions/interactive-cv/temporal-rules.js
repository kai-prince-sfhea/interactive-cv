// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// PRIVATE R6 DRAFT. Finite declared calendar rules, never a temporal reasoner.
import {validatePublicModel,copyCVData,cvFields,cvArray,cvID,cvText,cvDay,cvDataError,freezeCVData,hashCVData,canonicalCVData,validateTemporalSidecar,parseTemporalEndpoint,describeTemporalEndpoint,consistentTemporalBounds} from './temporal.js';
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
export async function queryTemporalRules(model,sidecar,rules,options={}){
 const snapshot=validatePublicModel(model),request=copyCVData(rules);cvArray(request,128);const bound=await validateTemporalSidecar(snapshot,sidecar,options),byID=new Map(bound.records.map(row=>[row.id,rowBounds(row,snapshot.asOf)])),seen=new Set(),results=[];
 for(const rule of request){cvFields(rule,['id','operation','left','right']);names(rule.id);cvID(rule.left);cvID(rule.right);if(seen.has(rule.id)||!pairOperations.includes(rule.operation)||!byID.has(rule.left)||!byID.has(rule.right))cvDataError();seen.add(rule.id);const a=byID.get(rule.left),b=byID.get(rule.right),answer=pairValue(a,b,rule.operation,rule.left===rule.right);results.push({...rule,...answer,leftRecordSha256:a.recordSha256,rightRecordSha256:b.recordSha256});}
 return freezeCVData({version:1,kind:'cv-declared-temporal-rules',status:'complete',modelSha256:bound.modelSha256,requestSha256:await hashCVData(request,options),asOf:snapshot.asOf,results,coverage:{scope:'explicit-rule-list-and-public-model',unknownIsNotFalse:true,exhaustiveWithinRules:true},qualification:'Conditional finite calendar relations over declared possible intervals; no employment, skill, completion, current truth or causal relationship is inferred. Before/after are strict; overlap/during are inclusive.'});
}
function validityDefinitions(model,definitions){
 const byID=new Map(model.records.map(record=>[record.id,record])),seen=new Set(),rows=[];cvArray(definitions,128);
 for(const raw of definitions){cvFields(raw,['id','from','through'],['id']);cvID(raw.id);if(seen.has(raw.id)||byID.get(raw.id)?.type!=='Assertion'||raw.from===undefined&&raw.through===undefined)cvDataError();seen.add(raw.id);const start=parseTemporalEndpoint(raw.from,'start',model.asOf),end=parseTemporalEndpoint(raw.through,'end',model.asOf);consistentTemporalBounds(start,end,model.asOf);const declaration=copyCVData(raw),facts=[];for(const[key,position]of [['from','start'],['through','end']])if(raw[key]!==undefined)facts.push({label:'Declared claim validity '+key,value:describeTemporalEndpoint(raw[key],position,model.asOf)});rows.push({id:raw.id,declaration,start,end,facts});}
 return rows;
}
export function deriveClaimValidityFacts(model,definitions=[]){const snapshot=validatePublicModel(model),rows=validityDefinitions(snapshot,copyCVData(definitions));return freezeCVData({version:1,records:rows.map(({id,facts})=>({id,facts}))});}
export async function buildClaimValiditySidecar(model,definitions=[],options={}){
 const snapshot=validatePublicModel(model),rows=validityDefinitions(snapshot,copyCVData(definitions)),byID=new Map(snapshot.records.map(record=>[record.id,record]));
 for(const row of rows)for(const fact of row.facts){const matching=(byID.get(row.id).facts??[]).filter(value=>value.label===fact.label);if(matching.length!==1||matching[0].value!==fact.value)cvDataError();}
 const records=[];for(const row of rows)records.push({id:row.id,recordSha256:await hashCVData(byID.get(row.id),options),start:row.start,end:row.end});
 return freezeCVData({version:1,kind:'cv-claim-validity',modelSha256:await hashCVData(snapshot,options),asOf:snapshot.asOf,declarations:rows.map(row=>row.declaration),records,scope:'explicit-public-assertion-validity-only',qualification:'Authored claim-validity dates are distinct from event, publication and review dates. Calendar inclusion does not verify the claim or establish current truth.'});
}
export async function queryClaimValidity(model,sidecar,request={},options={}){
 const snapshot=validatePublicModel(model),packet=copyCVData(sidecar),query=copyCVData(request);cvFields(query,['at','recordIds'],[]);cvFields(packet,['version','kind','modelSha256','asOf','declarations','records','scope','qualification']);const regenerated=await buildClaimValiditySidecar(snapshot,packet.declarations,options);if(canonicalCVData(regenerated)!==canonicalCVData(packet))cvDataError();const at=cvDay(query.at??snapshot.asOf),instant=parseTemporalEndpoint(at,'date',snapshot.asOf).lower,byID=new Map(snapshot.records.map(record=>[record.id,record])),chosen=query.recordIds===undefined?snapshot.records.filter(record=>record.type==='Assertion').map(record=>record.id):query.recordIds;cvArray(chosen,2000);if(new Set(chosen).size!==chosen.length||chosen.some(id=>byID.get(id)?.type!=='Assertion'))cvDataError();const rows=new Map(packet.records.map(row=>[row.id,row])),results=[];
 for(const id of chosen){const row=rows.get(id);let value='unknown',reason='no-separate-claim-validity-declared';if(row){const bounds=consistentTemporalBounds(row.start,row.end,snapshot.asOf);value=compare(bounds.hi<=instant&&bounds.endLo>=instant,bounds.lo>instant||bounds.endHi<instant);reason=value==='true'?'every-consistent-validity-interval-includes-day':value==='false'?'no-consistent-validity-interval-includes-day':'validity-depends-on-unknown-or-imprecise-declarations';}results.push({id,value,reason});}
 return freezeCVData({version:1,kind:'cv-claim-validity-query',status:'complete',modelSha256:packet.modelSha256,requestSha256:await hashCVData({at,recordIds:chosen},options),at,results,coverage:{scope:'selected-public-assertions',unknownIsNotFalse:true},qualification:packet.qualification});
}
