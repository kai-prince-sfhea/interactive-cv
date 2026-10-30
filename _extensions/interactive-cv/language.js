// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Reviewed native page mappings. Matching data is not translation verification.
import {validatePublicModel,hashCVData,cvFields,cvArray,cvText,canonicalCVData,copyCVData,freezeCVData,cvDataError} from './temporal.js';
const identities=new WeakSet();
function token(value){cvText(value,128);if(!/^[A-Za-z][A-Za-z0-9._-]*$/u.test(value)||['constructor','prototype','__proto__'].includes(value))cvDataError();return value;}
function language(value){cvText(value,80);try{const result=Intl.getCanonicalLocales(value);if(result.length!==1)cvDataError();return result[0];}catch{cvDataError();}}
function path(value){cvText(value,2048);if(!/^[A-Za-z0-9_./-]+\.html$/u.test(value)||value.startsWith('/')||value.split('/').some(part=>!part||part==='.'||part==='..'))cvDataError();return value;}
function digest(value){if(typeof value!=='string'||!/^sha256:[a-f0-9]{64}$/u.test(value))cvDataError();return value;}
function rootURL(value){cvText(value,2048);let url;try{url=new URL(value);}catch{cvDataError();}if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||/[\\%\u0000-\u0020]/u.test(value))cvDataError();url.pathname=url.pathname.replace(/\/*$/u,'/');return url;}
function relative(source,target){const first=source.split('/');first.pop();const other=target.split('/');while(first.length&&other.length&&first[0]===other[0]){first.shift();other.shift();}return '../'.repeat(first.length)+other.join('/');}

/** Hash the exact complete public model and a conservative non-display view.
 * Text facts and qualifications remain exact. Only translated titles/summaries,
 * page destinations and relation display labels/destinations are omitted from
 * the second fingerprint; stable IDs/types/ordered roles never disappear. */
export async function buildLanguageIdentity(model,options={}){
  const snapshot=validatePublicModel(model),records=snapshot.records.map(record=>({id:record.id,type:record.type,qualification:record.qualification,
    publicationReview:record.publicationReview,scalarFacts:record.scalarFacts||[],facts:record.facts||[],
    ...(record.start===undefined?{}:{start:record.start}),...(record.end===undefined?{}:{end:record.end}),...(record.date===undefined?{}:{date:record.date}),
    relations:(record.relations||[]).map(link=>({predicate:link.predicate,target:link.target}))})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const result=freezeCVData({version:1,modelSha256:await hashCVData(snapshot,options),semanticSha256:await hashCVData({version:1,asOf:snapshot.asOf,records},options),
    scope:'exact-public-model-and-conservative-declared-facts',qualification:'Matching declared facts, identities, ordered relations and qualifications do not establish prose translation fidelity.'});
  identities.add(result);return result;
}

/** All non-current pages remain reviewed declarations until independently
 * rendered/inspected. Only this actual current projection is observed here. */
export function planLanguagePages(value,{identity,currentPage,siteURL}={}){
  if(!identities.has(identity))cvDataError();cvFields(currentPage,['url','language','revision']);const currentURL=path(currentPage.url),currentLanguage=language(currentPage.language);cvText(currentPage.revision,128);
  cvFields(value,['version','primary','pages']);canonicalCVData(value);const config=copyCVData(value);if(config.version!==1)cvDataError();token(config.primary);
  cvArray(config.pages,16);if(config.pages.length<2)cvDataError();const ids=new Set(),urls=new Set(),languages=new Set();
  for(const page of config.pages){
    cvFields(page,['id','url','language','revision','modelDigest','semanticDigest','review','reviewedBy','basedOn'],['id','url','language','revision','modelDigest','semanticDigest','review','reviewedBy']);
    token(page.id);path(page.url);const tag=language(page.language);cvText(page.revision,128);digest(page.modelDigest);digest(page.semanticDigest);cvText(page.reviewedBy,256);
    if(page.review!=='author-reviewed'||ids.has(page.id)||urls.has(page.url)||languages.has(tag)||page.semanticDigest!=='sha256:'+identity.semanticSha256)cvDataError();
    ids.add(page.id);urls.add(page.url);languages.add(tag);page.language=tag;
    if(page.basedOn!==undefined){cvFields(page.basedOn,['id','revision','modelDigest']);token(page.basedOn.id);cvText(page.basedOn.revision,128);digest(page.basedOn.modelDigest);}
  }
  const primary=config.pages.find(page=>page.id===config.primary),current=config.pages.find(page=>page.url===currentURL);
  if(!primary||!current||primary.basedOn!==undefined||current.language!==currentLanguage||current.revision!==currentPage.revision||current.modelDigest!=='sha256:'+identity.modelSha256)cvDataError();
  for(const page of config.pages)if(page!==primary){const basis=page.basedOn;if(!basis||basis.id!==primary.id||basis.revision!==primary.revision||basis.modelDigest!==primary.modelDigest)cvDataError();}
  const root=siteURL===undefined?null:rootURL(siteURL);
  const links=config.pages.map(page=>({id:page.id,url:page.url,href:root?new URL(page.url,root).href:relative(currentURL,page.url),language:page.language,
    revision:page.revision,modelDigest:page.modelDigest,semanticDigest:page.semanticDigest,review:page.review,reviewedBy:page.reviewedBy}));
  return freezeCVData({version:1,kind:'cv-language-publication',modelSha256:identity.modelSha256,semanticSha256:identity.semanticSha256,currentPage:{id:current.id,url:current.url,language:current.language,revision:current.revision},
    links,...(root?{canonical:new URL(currentURL,root).href}:{}),scope:'selected-reviewed-native-page-declarations',actualCurrentPageBound:true,otherPagesObserved:false,
    qualification:'The current native public projection matches its digest. Other pages and source bindings are authored declarations; matching facts are not proof of prose translation fidelity or search indexing.'});
}
