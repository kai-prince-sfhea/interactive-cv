// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Original CV consumer glue. It owns no model, consent or provider registry.
import {copyCVData,canonicalCVData,freezeCVData,cvFields,cvArray,cvText,cvURL,cvDataError} from './temporal.js';
import {prepareNarrativeProposal,validateNarrativeProposalOutput} from './professional-narrative.js';
export const CV_GENERATION_VERSION='cv-ready-professional-proposal-v1';
const format='source-bound-quote-proposal-v1',hex=/^[a-f0-9]{64}$/u;
const copy=value=>copyCVData(value,{maxBytes:4194304,maxNodes:300000,maxDepth:24});
const canonical=value=>canonicalCVData(value,0,new Set(),{nodes:0,bytes:0,maxBytes:4194304,maxNodes:300000,maxDepth:24});
const fail=code=>{const error=Error(code);error.code=code;throw error;};
function current(options){if(options.signal?.aborted)fail('cv-generation-cancelled');if(options.isCurrent&&options.isCurrent()!==true)fail('cv-generation-stale');}
/** Builds only delivery provenance. Call the original LA request builder with
 * this delivered root; never patch a canonical prepared request in place. */
export function resolveNarrativeDelivery(sourceURLs,canonicalBaseURL,deliveredBaseURL){
 cvArray(sourceURLs,2000);const root=value=>{cvText(value,4096);let url;try{url=new URL(value);}catch{cvDataError();}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/'))cvDataError();return url;},canonical=root(canonicalBaseURL),delivered=root(deliveredBaseURL);
 for(const value of sourceURLs){cvURL(value);const url=new URL(value,delivered);if(url.origin!==delivered.origin||url.username||url.password||!url.pathname.startsWith(delivered.pathname)||/%(?:2f|5c)/iu.test(url.pathname))fail('cv-generation-source-not-portable');}
 return freezeCVData({version:1,canonicalBaseURL:canonical.href,deliveredBaseURL:delivered.href,selectedRecords:sourceURLs.length,sourcePolicy:'unchanged-declared-URLs-confined-to-current-delivered-root',qualification:'Canonical publication and current HTTP(S) delivery are distinct. Relative declared URLs resolve inside the captured reader root; external or escaping absolute URLs are not silently rewritten. The original model and plan remain unchanged.'});
}
/** The main module owns a private document registry: query/fragment variants
 * are distinct module identities. Keep its exact delivered URL for import.
 * Fetch sends no fragment; the pure quote module is a deliberate sibling. */
export function localAIProviderURLs(deliveredSrc,fileName,{baseURL,origin}={}){
 cvText(deliveredSrc,4096);cvText(baseURL,4096);cvText(origin,512);if(!['local-ai-websites.js','proposal.js'].includes(fileName))cvDataError();
 let delivered,url;try{delivered=new URL(deliveredSrc,baseURL);url=fileName==='local-ai-websites.js'?new URL(delivered.href):new URL(fileName,delivered);}catch{cvDataError();}
 if(delivered.origin!==origin||delivered.username||delivered.password||!['http:','https:'].includes(delivered.protocol)||!delivered.pathname.endsWith('/local-ai-websites.js')||url.origin!==origin)cvDataError();
 const request=new URL(url.href);request.hash='';return freezeCVData({importURL:url.href,requestURL:request.href});
}
export function validateGenerationDescriptor(value){
 const result=copy(value);cvFields(result,['version','module','bytes','sha256','format']);
 if(result.version!==1||result.module!=='local-ai-websites.js'||result.format!==format||!Number.isSafeInteger(result.bytes)||result.bytes<1||result.bytes>262144||!hex.test(result.sha256))cvDataError();
 return freezeCVData(result);
}
/** Data-only snapshots; a consumer cannot register or load a provider. The
 * caller must first bind the actual delivered module to the native descriptor. */
export function inspectGenerationProviders(api){
 if(!api||!['GENERATION_PROVIDER_VERSION','getLocalGenerationProviders','focusLocalGenerationProvider','generateWithLocalProvider'].every(key=>{const field=Object.getOwnPropertyDescriptor(api,key);return field&&Object.hasOwn(field,'value');})||api.GENERATION_PROVIDER_VERSION!==1||typeof api.getLocalGenerationProviders!=='function'||typeof api.focusLocalGenerationProvider!=='function'||typeof api.generateWithLocalProvider!=='function')fail('cv-generation-provider-incompatible');
 const rows=copy(api.getLocalGenerationProviders());if(!Array.isArray(rows)||rows.length>64)cvDataError();const ids=new Set();
 for(const row of rows){cvFields(row,['version','id','status','format']);cvText(row.id,128);if(row.version!==1||row.format!==format||!['ready','not-ready','busy'].includes(row.status)||ids.has(row.id))cvDataError();ids.add(row.id);}
 return freezeCVData(rows);
}
/** Explicit action only. Rebuilds the complete original CV/LA packet before
 * borrowing an already-ready document-owned engine and reuses the original
 * output validator afterwards. No selection is clipped to fit model budgets. */
export async function generateNarrativeProposal(model,prepared,options={}){
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
