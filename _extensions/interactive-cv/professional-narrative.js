// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// PRIVATE R6 DRAFT. Original CV glue; no GW/LA implementation is embedded.
import {validatePublicModel,copyCVData,canonicalCVData,freezeCVData,hashCVData,cvFields,cvArray,cvText,cvDataError} from './temporal.js';
export const NARRATIVE_LIMITS=Object.freeze({bytes:4194304,records:2000,evidenceRecords:4,sourceCharacters:4000,evidenceCharacters:12000});
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
export async function createNarrativePlan(model,request,options={}){
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
export async function validateNarrativePlan(value,model,options={}){
 const plan=copy(value);cvFields(plan,['version','kind','status','asOf','request','provider','primaryIds','selectionIds','reasons','records','extractiveText','hashes','coverage','qualification','planSha256']);const rebuilt=await createNarrativePlan(model,plan.request,options);check(options);if(canonical(plan)!==canonical(rebuilt))fail('cv-narrative-plan-mismatch');return rebuilt;
}
function proposalOptions(options){cvFields(options,['professional','proposal','baseURL','cryptoObject','signal','isCurrent'],['professional','proposal','baseURL']);cvFields(options.proposal,['descriptor','buildRequest','validateOutput']);const provider=descriptor(options.proposal.descriptor,'local-ai-websites','source-bound-quote-proposal-v1');if(typeof options.proposal.buildRequest!=='function'||typeof options.proposal.validateOutput!=='function')cvDataError();return provider;}
/** This prepares data only. It never starts a model, downloads assets or sends
 * an endpoint request. Every selected record must fit in the existing LA quote
 * protocol, including contrary/qualifying evidence. Nothing is silently clipped
 * or omitted to squeeze a larger professional selection into that protocol. */
export async function prepareNarrativeProposal(model,value,options={}){
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
export async function validateNarrativeProposalOutput(raw,prepared,model,options={}){
 proposalOptions(options);const saved=copy(prepared);cvFields(saved,['version','status','kind','plan','proposalProvider','baseURL','packet','qualification']);if(saved.version!==1||saved.status!=='ready'||saved.kind!=='cv-professional-narrative-proposal')cvDataError();
 const rebuilt=await prepareNarrativeProposal(model,saved.plan,options);check(options);if(rebuilt.status!=='ready'||canonical(saved)!==canonical(rebuilt))fail('cv-narrative-proposal-mismatch');
 const result=await options.proposal.validateOutput(raw,rebuilt.packet,{cryptoObject:options.cryptoObject??globalThis.crypto});check(options);
 return freezeCVData({version:1,kind:'cv-professional-narrative-output',status:'unreviewed-proposal',planSha256:rebuilt.plan.planSha256,modelSha256:rebuilt.plan.hashes.modelSha256,selectionSha256:rebuilt.plan.hashes.selectionSha256,proposalProvider:rebuilt.proposalProvider,result:copy(result),qualification:'Original LA quote validation succeeded for this exact selected public snapshot. Claim support, completeness, professional suitability, human review and causal attribution remain unestablished.'});
}
