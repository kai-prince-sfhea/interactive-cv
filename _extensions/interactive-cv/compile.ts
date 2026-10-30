// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Installed finite CV compiler. A render never runs an AI or downloads a model.
import {isAbsolute,resolve,relative,sep} from 'node:path';
import {validatePublicModel,hashPublicModel,copyCVData,freezeCVData,cvFields,cvText,cvArray,cvDay,cvDataError} from './temporal.js';
import {deriveTemporalFacts,buildTemporalSidecar,auditActivityOutputOrdering} from './temporal.js';
import {deriveServiceFacts,buildServiceSidecar,buildServiceStructuredData} from './services.js';
import {buildLanguageIdentity,planLanguagePages} from './language.js';
import {buildCVReports} from './reports.js';
import {deriveClaimValidityFacts} from './temporal-rules.js';
import {normalizeR6,compileR6} from './r6-native.ts';

function projectPath(value){cvText(value,8192);if(!isAbsolute(value)||/[\u0000-\u001f]/u.test(value))cvDataError();return resolve(value);}
function pagePath(value){cvText(value,2048);if(!/^[A-Za-z0-9_./-]+\.html$/u.test(value)||value.startsWith('/')||value.split('/').some(part=>!part||part==='.'||part==='..'))cvDataError();return value;}
function siteRoot(value){if(value===undefined)return undefined;cvText(value,2048);let url;try{url=new URL(value);}catch{cvDataError();}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||/[\\%\u0000-\u0020]/u.test(value)||value.split('/').some(part=>part==='.'||part==='..'))cvDataError();url.pathname=url.pathname.replace(/\/*$/u,'/');return url.href;}

async function effectiveSiteURL(root){
 // Quarto 1.11.5 does not expose every effective website setting to Pandoc.
 // Consult native inspection only when a requested publication feature needs
 // it. Never parse project YAML ourselves or print the inspected configuration.
 if(typeof Deno==='undefined')cvDataError();
 const result=await new Deno.Command(Deno.env.get('QUARTO_BIN')||'quarto',{args:['inspect',root],stdin:'null',stdout:'piped',stderr:'null',signal:AbortSignal.timeout(30000)}).output();
 if(!result.success||result.stdout.length>2097152)cvDataError();const config=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(result.stdout));return siteRoot(config?.config?.website?.['site-url']);
}
function appendFacts(model,derived){
 const byID=new Map(model.records.map(record=>[record.id,record]));
 for(const row of derived.records){const record=byID.get(row.id);if(!record)cvDataError();record.facts??=[];for(const fact of row.facts){const same=record.facts.filter(item=>item.label===fact.label);if(same.length>1||same.length===1&&same[0].value!==fact.value)cvDataError();if(!same.length)record.facts.push(copyCVData(fact));}}
}

/** Internal deterministic test seam. Native callers cannot set evaluatedOn or
 * inject inspection: the CLI below captures one actual UTC publication day. */
export async function compile(value,{cryptoObject=globalThis.crypto,evaluatedOn=new Date().toISOString().slice(0,10),inspectSiteURL=effectiveSiteURL}={}){
 const request=copyCVData(value,{maxBytes:4194304,maxNodes:300000,maxDepth:24});cvFields(request,['version','model','authoring','consentingPersonIds','root','inputDir','pageURL','language','pageRevision','siteURL','languagePages','reports','r6','htmlOutput','outputRoot'],['version','model','authoring','consentingPersonIds','root','inputDir','pageURL','language']);if(request.version!==1)cvDataError();cvFields(request.authoring,['temporal','services']);cvArray(request.authoring.temporal);cvArray(request.authoring.services);cvArray(request.consentingPersonIds);const root=projectPath(request.root),inputDir=projectPath(request.inputDir),local=relative(root,inputDir);if(isAbsolute(local)||local==='..'||local.startsWith('..'+sep))cvDataError();pagePath(request.pageURL);cvText(request.language,80);try{Intl.getCanonicalLocales(request.language);}catch{cvDataError();}if(request.pageRevision!==undefined)cvText(request.pageRevision,128);const day=cvDay(evaluatedOn),options={cryptoObject};
 if(request.htmlOutput!==undefined&&typeof request.htmlOutput!=='boolean')cvDataError();
 const r6Config=normalizeR6(request.r6);
 const original=validatePublicModel(request.model),model=copyCVData(original),serviceOptions={...options,consentingPersonIds:request.consentingPersonIds,evaluatedOn:day};
 // Only literal authored facts enter the authoritative model. Publication-day
 // availability and the builder's evaluation day remain separate receipts.
 appendFacts(model,deriveTemporalFacts(original,request.authoring.temporal));appendFacts(model,deriveServiceFacts(original,request.authoring.services,serviceOptions));
 if(r6Config)appendFacts(model,deriveClaimValidityFacts(original,r6Config.claimValidity));
 for(const record of model.records)record.facts??=[];const finalModel=validatePublicModel(model);
 const temporal=await buildTemporalSidecar(finalModel,request.authoring.temporal,options),services=await buildServiceSidecar(finalModel,request.authoring.services,serviceOptions),modelSha256=await hashPublicModel(finalModel,options),activityOutputOrdering=await auditActivityOutputOrdering(finalModel,temporal,options);
 let siteURL=siteRoot(request.siteURL);const needsSite=services.records.some(row=>row.jsonld&&row.currentOffer==='true')||request.languagePages!==undefined||!!r6Config?.narratives.some(row=>row.proposal===true);if(siteURL===undefined&&needsSite)siteURL=siteRoot(await inspectSiteURL(root));
 const structured=await buildServiceStructuredData(finalModel,services,{...options,...(siteURL===undefined?{}:{siteURL})}),languageIdentity=await buildLanguageIdentity(finalModel,options);
 const languageLinks=request.languagePages===undefined?null:planLanguagePages(request.languagePages,{identity:languageIdentity,currentPage:{url:request.pageURL,language:request.language,revision:request.pageRevision},...(siteURL===undefined?{}:{siteURL})});
 const reportBundle=await buildCVReports(finalModel,temporal,request.reports??[],{root,cryptoObject});
 let outputRoot=request.outputRoot===undefined?(typeof Deno!=='undefined'?Deno.env.get('QUARTO_PROJECT_OUTPUT_DIR'):globalThis.process?.env?.QUARTO_PROJECT_OUTPUT_DIR):projectPath(request.outputRoot);if(outputRoot){if(!isAbsolute(outputRoot))outputRoot=resolve(root,outputRoot);const outputRelative=relative(root,outputRoot);if(isAbsolute(outputRelative)||outputRelative==='..'||outputRelative.startsWith('..'+sep))cvDataError();}
 const r6=await compileR6(finalModel,temporal,request.r6,{root,pageURL:request.pageURL,outputRoot,siteURL,htmlOutput:request.htmlOutput===true,cryptoObject});
 return freezeCVData({version:1,model:finalModel,featureData:{version:1,modelSha256,asOf:finalModel.asOf,temporal,services},jsonld:structured.jsonld,servicePublication:structured.receipt,evaluatedOn:day,languageIdentity,languageLinks,activityOutputOrdering,reportBundle,...(r6?{r6}:{})});
}

if(typeof Deno!=='undefined'&&import.meta.main){
 try{
  const reader=Deno.stdin.readable.getReader(),parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4194304)cvDataError();parts.push(value);}reader.releaseLock();const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  const request=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),result=await compile(request),text=JSON.stringify(result);if(new TextEncoder().encode(text).length>4194304)cvDataError();console.log(text);
 }catch{console.error('interactive-cv: public feature declarations are invalid, stale, conflicting or outside the installed reference limits; check the source, review, provider consent and publication configuration');Deno.exit(1);}
}
