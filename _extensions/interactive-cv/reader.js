/* Interactive CV: optional enhancement of the complete, static public index. */
(function (global) {
  "use strict";

  function normalizeText(value) {
    return String(value == null ? "" : value).normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
  }

  function normalizeQuery(value) {
    return String(value == null ? "" : value).replace(/\s+/gu, " ").trim().slice(0, 512);
  }

  function parameterNames(suffix) {
    const token = suffix == null ? "" : String(suffix);
    return { query: "cvq" + token, type: "cvt" + token, skill: "cvs" + token };
  }

  function readState(search, types, skills, suffix) {
    const parameters = new URLSearchParams(search);
    const keys = parameterNames(suffix);
    const type = parameters.get(keys.type) || "";
    const skill = parameters.get(keys.skill) || "";
    return {
      query: normalizeQuery(parameters.get(keys.query)),
      type: new Set(types).has(type) ? type : "",
      skill: new Set(skills).has(skill) ? skill : ""
    };
  }

  function updateUrl(href, state, suffix) {
    const url = new URL(href);
    const keys = parameterNames(suffix);
    for (const field of ["query", "type", "skill"]) {
      const value = field === "query" ? normalizeQuery(state[field]) : String(state[field] || "");
      if (value) url.searchParams.set(keys[field], value);
      else url.searchParams.delete(keys[field]);
    }
    return url.href;
  }

  function anchorId(hash) {
    if (!hash || hash === "#") return "";
    try { return decodeURIComponent(hash.slice(1)); }
    catch (_) { return ""; }
  }

  function linkedTargetUrl(currentHref, destination) {
    const current = new URL(currentHref);
    let target;
    try { target = new URL(destination, current); }
    catch (_) { return null; }
    // Native Quarto website code canonicalizes /index.html to its directory.
    // Only this exact index alias is equivalent; other documents stay native.
    const documentPath = function (path) { return path.replace(/\/index\.html$/u, "/"); };
    if (!anchorId(target.hash) || target.origin !== current.origin || documentPath(target.pathname) !== documentPath(current.pathname)) return null;
    // An explicit different query may identify another document view; leave it native.
    if (target.search && target.search !== current.search) return null;
    current.hash = target.hash;
    return current.href;
  }

  function compileFilter(state) {
    return { type: state.type, skill: state.skill, words: normalizeText(state.query).split(" ").filter(Boolean) };
  }

  function matchesFilter(record, filter) {
    if (filter.type && record.type !== filter.type) return false;
    if (filter.skill && !record.skills.includes(filter.skill)) return false;
    const haystack = record.search;
    return filter.words.every(function (word) {
      return haystack.includes(word);
    });
  }

  function matchesRecord(record, state) {
    return matchesFilter(record, compileFilter(state));
  }

  // A bounded owner for optional asynchronous selectors. The complete static
  // index remains readable if a provider is absent, cancelled or superseded.
  function createSelectionController(options) {
    let epoch=0, abort=null, disposed=false;
    const notify=typeof options.onState==='function'?options.onState:function(){};
    const current=typeof options.isCurrent==='function'?options.isCurrent:function(){return true;};
    const operation=options.operation===undefined?'selection':options.operation,ceiling=operation==='generation'?180000:30000;
    const timeout=options.timeoutMs===undefined?ceiling:options.timeoutMs;
    if(!['selection','generation'].includes(operation)||typeof options.compute!=='function'||!Number.isSafeInteger(timeout)||timeout<1||timeout>ceiling)throw new TypeError('Invalid optional CV selector.');
    function cancel(announce) {epoch++;abort?.abort();abort=null;if(announce&&!disposed)notify({status:'cancelled'});}
    return Object.freeze({
      async run(input) {
        if(disposed)return null;cancel(false);const token=epoch,own=new AbortController();abort=own;const timer=setTimeout(function(){own.abort();},timeout);notify({status:'loading'});
        try{const cancelled=new Promise(function(_resolve,reject){own.signal.addEventListener('abort',function(){reject(new Error('Optional CV selection cancelled.'));},{once:true});});const value=await Promise.race([Promise.resolve().then(function(){return options.compute(input,{signal:own.signal});}),cancelled]);if(disposed||token!==epoch||own.signal.aborted)return null;if(!current(input)){notify({status:'unavailable'});return null;}notify({status:'ready',value});return value;}
        catch(error){if(!disposed&&token===epoch&&!own.signal.aborted)notify({status:'unavailable'});return null;}
        finally{clearTimeout(timer);if(token===epoch){abort=null;if(own.signal.aborted&&!disposed)notify({status:'cancelled'});}}
      },
      cancel:function(){cancel(true);},
      dispose:function(){disposed=true;cancel(false);}
    });
  }

  function makeElement(document, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function labelledControl(document, parent, labelText, control) {
    const label = makeElement(document, "label", "cv-filter-label");
    label.appendChild(makeElement(document, "span", "", labelText));
    label.appendChild(control);
    parent.appendChild(label);
  }

  function addOption(document, select, value, label) {
    const option = makeElement(document, "option", "", label);
    option.value = value;
    select.appendChild(option);
  }
  function ownScript(index,selector){const matches=Array.from(index.querySelectorAll(selector)).filter(script=>script.closest('.cv-index')===index);return matches.length===1?matches[0]:null;}

  function advancedFilters(index,controls,document,view,model,records,callbacks) {
    const feature=global.InteractiveCVFeatures;
    const marker=ownScript(index,'script.cv-feature-data'),modelMarker=ownScript(index,'script.interactive-cv-model');
    if(!feature||!marker||!modelMarker||!model)return null;
    const admittedModelText=modelMarker.textContent,admittedFeatureText=marker.textContent;
    const details=makeElement(document,'details','cv-advanced'),summary=makeElement(document,'summary','','Project, evidence and date filters');details.appendChild(summary);
    const fields=makeElement(document,'div','cv-filter-fields');
    function choice(label,entries,className){const el=makeElement(document,'select',className);for(const [value,title]of entries)addOption(document,el,value,title);labelledControl(document,fields,label,el);return el;}
    function day(label,className){const el=makeElement(document,'input',className);el.type='date';el.value=model.asOf;labelledControl(document,fields,label,el);return el;}
    const project=choice('Project context',[['','All projects'],...model.records.filter(record=>record.type==='Project').map(record=>[record.id,record.title])],'cv-project');
    const evidence=choice('Declared public evidence',[['','Do not filter evidence'],['linked','Has a published evidence link'],['support','Has a supporting evidence link'],['contrary','Has a contrary evidence link'],['qualifying','Has a qualifying evidence link']],'cv-evidence');
    const operation=choice('Date relation',[['','Do not filter dates'],['as-of','Active on a stated day'],['overlap','Overlaps a stated date window'],['before','Ends strictly before a stated date window'],['after','Starts strictly after a stated date window'],['during','Entirely within a stated date window']],'cv-temporal-operation');
    const at=day('As-of day','cv-as-of'),from=day('Window begins','cv-from'),through=day('Window ends','cv-through');
    const service=choice('Consultancy offers',[['','Do not filter consultancy offers'],['offered','Offered on the as-of day'],['proposed','Declared proposed'],['paused','Declared paused'],['withdrawn','Declared withdrawn']],'cv-service');
    const unknown=choice('Unresolved dates or evidence',[['exclude','Show separately; exclude from selection'],['include','Explicitly include unknown matches']],'cv-unknown-policy');
    const status=makeElement(document,'p','cv-advanced-status','These filters use the complete declared public snapshot. Missing public information remains unknown.');status.setAttribute('role','status');
    const note=makeElement(document,'p','cv-provider-note'),output=makeElement(document,'div','cv-selection-reasons'),actions=makeElement(document,'div','cv-export-actions');
    const apply=makeElement(document,'button','cv-advanced-apply','Apply compound filters'),cancel=makeElement(document,'button','cv-advanced-cancel','Cancel optional selection'),reset=makeElement(document,'button','cv-advanced-reset','Clear advanced filters'),download=makeElement(document,'button','cv-selection-download','Download selection receipt');for(const button of [apply,cancel,reset,download])button.type='button';download.disabled=true;
    actions.appendChild(apply);actions.appendChild(reset);actions.appendChild(download);details.appendChild(fields);details.appendChild(actions);details.appendChild(note);controls.appendChild(details);controls.appendChild(cancel);controls.appendChild(status);controls.appendChild(output);
    let selected=null,receipt=null;
    // Capture ownership before removing old result nodes. Inputs and Apply stay untouched.
    function replaceOwnedOutput(){let owns=false;for(let node=document.activeElement;node;node=node.parentElement){if(node===output){owns=true;break;}}output.replaceChildren();if(owns){status.setAttribute('tabindex','-1');status.focus();}}
    const provider=()=>{const value=view.QuartoGenerative||global.QuartoGenerative;return value?.protocolVersion===1&&typeof value.selectProfessionalView==='function'?value:null;};
    function providerReady(){project.disabled=!provider();note.textContent=provider()?'Generative Websites is connected for declared project/context selection. No AI or claim rewriting is used.':'Install Generative Websites alongside Interactive CV to enable project/context professional views. Evidence and date filters remain available.';}
    function active(){return !!(project.value||evidence.value||operation.value||service.value);}
    function state(){return{project:project.value,evidence:evidence.value,operation:operation.value,at:at.value,from:from.value,through:through.value,service:service.value,unknown:unknown.value};}
    function identity(input){return input.modelText===admittedModelText&&input.featureText===admittedFeatureText&&modelMarker.textContent===input.modelText&&marker.textContent===input.featureText&&JSON.stringify(state())===JSON.stringify(input.state)&&JSON.stringify(callbacks.basicRequest())===JSON.stringify(input.basicRequest)&&JSON.stringify(callbacks.basicIds())===JSON.stringify(input.basicIds)&&provider()===input.provider;}
    function showUnknown(rows){replaceOwnedOutput();if(!rows.length)return;output.appendChild(makeElement(document,'p','','Unknown results are listed separately. They do not establish current appointments, absent evidence or unavailable services.'));const list=makeElement(document,'ul');for(const row of rows){const record=model.records.find(record=>record.id===row.id),li=makeElement(document,'li'),link=makeElement(document,'a','',record.title);link.href=new URL(record.url,new URL(index.dataset.cvRoot||'./',document.baseURI)).href;li.appendChild(link);li.appendChild(makeElement(document,'span','',' — '+row.reasons.map(reason=>reason.replaceAll('-',' ')).join('; ')));list.appendChild(li);}output.appendChild(list);}
    function showOrdering(audit){const inspection=makeElement(document,'details','cv-ordering-inspection');inspection.appendChild(makeElement(document,'summary','','Inspect declared activity and output date ordering'));const counts={true:0,false:0,unknown:0};for(const row of audit.results)counts[row.value]++;inspection.appendChild(makeElement(document,'p','',audit.status+': '+audit.coverage.assessedRelations+' of '+audit.coverage.relations+' explicit public output/activity associations assessed; '+counts.true+' date-consistent, '+counts.false+' date-inconsistent and '+counts.unknown+' unknown. '+audit.coverage.omittedRelations+' omitted by the bounded audit.'));inspection.appendChild(makeElement(document,'p','',audit.qualification));const list=makeElement(document,'ul'),byId=new Map(model.records.map(record=>[record.id,record]));for(const row of audit.results){const item=makeElement(document,'li');for(const [position,id]of [row.outputId,row.activityId].entries()){if(position)item.appendChild(makeElement(document,'span','',' → '));const record=byId.get(id),link=makeElement(document,'a','',record.title);link.href=new URL(record.url,new URL(index.dataset.cvRoot||'./',document.baseURI)).href;item.appendChild(link);}item.appendChild(makeElement(document,'span','',' — '+row.value+': '+row.reasons.map(reason=>reason.replaceAll('-',' ')).join('; ')));list.appendChild(item);}inspection.appendChild(list);output.appendChild(inspection);}
    const controller=createSelectionController({
      isCurrent:identity,
      compute:async function(input,{signal}){
        const check=()=>{if(signal.aborted||!identity(input))throw new Error('Cancelled or changed public snapshot.');};check();
        if(new TextEncoder().encode(input.featureText).length>4194304)throw new Error('Public feature catalogue exceeds its bounded scope.');const data=await feature.validateFeatureData(model,JSON.parse(input.featureText));check();
        await feature.validateTemporalSidecar(model,data.temporal);check();await feature.validateServiceSidecar(model,data.services);check();
        let ids=input.basicIds.slice(),professional=null;
        if(input.provider){professional=await input.provider.selectProfessionalView(model,{query:'',projectIds:input.state.project?[input.state.project]:[],skillIds:[],types:[],detail:'full',includeEvidence:true});check();if(professional?.hashes?.modelSha256!==data.modelSha256||professional.coverage?.exhaustiveWithinModel!==true||professional.coverage.totalRecords!==model.records.length||!Array.isArray(professional.primaryIds)||professional.primaryIds.length>model.records.length)throw new Error('Professional source mismatch.');const known=new Set(model.records.map(record=>record.id)),admitted=new Set(professional.primaryIds);if(admitted.size!==professional.primaryIds.length||professional.primaryIds.some(id=>typeof id!=='string'||!known.has(id)))throw new Error('Professional scope mismatch.');ids=ids.filter(id=>admitted.has(id));}
        else if(input.state.project)throw new Error('The professional view companion is unavailable.');
        const tests=[];
        if(input.state.operation){tests.push(await feature.queryTemporal(model,data.temporal,input.state.operation==='as-of'?{operation:'as-of',at:input.state.at,recordIds:ids}:{operation:input.state.operation,from:input.state.from,through:input.state.through,recordIds:ids}));check();}
        if(input.state.evidence){tests.push(await feature.queryEvidence(model,{mode:input.state.evidence,recordIds:ids}));check();}
        if(input.state.service){const serviceIds=new Set(model.records.filter(record=>record.type==='ServiceOffering').map(record=>record.id));ids=ids.filter(id=>serviceIds.has(id));tests.push(await feature.queryServices(model,data.services,{status:input.state.service,...(input.state.service==='offered'?{at:input.state.at}:{}),recordIds:ids}));check();}
        const rows=ids.map(id=>{const results=tests.map(test=>{if(test.modelSha256!==data.modelSha256)throw new Error('Feature source mismatch.');return test.results.find(row=>row.id===id);});if(results.some(row=>!row))throw new Error('Incomplete selected scope.');const value=results.some(row=>row.value==='false')?'false':results.some(row=>row.value==='unknown')?'unknown':'true';return{id,value,reasons:results.flatMap(row=>row.reasons)};});
        const trueIds=rows.filter(row=>row.value==='true').map(row=>row.id),unknownRows=rows.filter(row=>row.value==='unknown'),chosen=trueIds.concat(input.state.unknown==='include'?unknownRows.map(row=>row.id):[]);
        const selection=await feature.selectPublicRecords(model,chosen);check();if(selection.modelSha256!==data.modelSha256)throw new Error('Selection source mismatch.');
        const activityOutputOrdering=await feature.auditActivityOutputOrdering(model,data.temporal);check();if(activityOutputOrdering.modelSha256!==data.modelSha256)throw new Error('Ordering source mismatch.');
        const request={literal:input.basicRequest,advanced:input.state,literalPrimaryIds:input.basicIds},requestSha256=await feature.hashCVData(request);check();return{selection,trueIds,unknownRows,falseIds:rows.filter(row=>row.value==='false').map(row=>row.id),request,requestSha256,professional,temporalOrEvidence:tests,activityOutputOrdering};
      },
      onState:function(update){if(update.status==='loading'){download.disabled=true;status.textContent='Checking the selected public snapshot. The literal index remains available.';}else if(update.status==='ready'){receipt=update.value;selected=new Set(receipt.selection.selectionIds);download.disabled=false;status.textContent=receipt.trueIds.length+' true matches; '+receipt.unknownRows.length+' unknown; '+receipt.falseIds.length+' false within the selected public scope. '+(selected.size-receipt.selection.primaryIds.length)+' additional records preserve context and evidence.';showUnknown(receipt.unknownRows);const inspection=makeElement(document,'details','cv-source-inspection'),list=makeElement(document,'dl');inspection.appendChild(makeElement(document,'summary','','Inspect selection scope and source identity'));for(const [label,value]of [['Public snapshot as of',model.asOf],['Published model SHA-256',receipt.selection.modelSha256],['Selection SHA-256',receipt.selection.selectionSha256],['Scope',receipt.selection.qualification]]){list.appendChild(makeElement(document,'dt','',label));list.appendChild(makeElement(document,'dd','',value));}inspection.appendChild(list);output.appendChild(inspection);showOrdering(receipt.activityOutputOrdering);callbacks.apply();}else{selected=null;receipt=null;download.disabled=true;replaceOwnedOutput();status.textContent=update.status==='cancelled'?'Optional selection cancelled. Literal filters and authored records remain available.':'Optional selection is unavailable or stale. Literal filters and authored records remain available.';callbacks.apply();}}
    });
    function run(){selected=null;receipt=null;download.disabled=true;if(!active()){controller.cancel();return;}const input={state:state(),basicRequest:callbacks.basicRequest(),basicIds:callbacks.basicIds(),modelText:modelMarker.textContent,featureText:marker.textContent,provider:provider()};controller.run(input);}
    function clear(){controller.cancel();for(const control of [project,evidence,operation,service])control.value='';unknown.value='exclude';selected=null;receipt=null;download.disabled=true;replaceOwnedOutput();visibility();callbacks.apply();}
    function visibility(){at.parentElement.hidden=!(operation.value==='as-of'||service.value==='offered');from.parentElement.hidden=through.parentElement.hidden=!operation.value||operation.value==='as-of';}
    apply.addEventListener('click',run);cancel.addEventListener('click',()=>controller.cancel());reset.addEventListener('click',clear);operation.addEventListener('change',visibility);service.addEventListener('change',visibility);
    for(const control of [project,evidence,operation,at,from,through,service,unknown])control.addEventListener('change',function(){controller.cancel();selected=null;receipt=null;download.disabled=true;callbacks.apply();});
    download.addEventListener('click',function(){if(!receipt)return;const blob=new Blob([JSON.stringify({version:1,kind:'cv-compound-selection-receipt',...receipt},null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=makeElement(document,'a');link.href=url;link.download='cv-selection-receipt.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    view.addEventListener('generative-websites:ready',function(){providerReady();if(active())run();});view.addEventListener('pagehide',function(){controller.cancel();});view.addEventListener('pageshow',function(){providerReady();if(active())run();});
    providerReady();visibility();return{selectedIds:()=>selected?[...selected]:null,active,run,clear,cancel:()=>controller.cancel()};
  }

  function enhanceIndex(index, suffix, document, view, initialState) {
    if (index.dataset.cvEnhanced === "true" || index.dataset.cvLazy === "true") return;
    // Nested indexes own their entries; a filter must never hide another index.
    const elements = Array.from(index.querySelectorAll(".cv-entry")).filter(function (entry) {
      return entry.closest(".cv-index") === index;
    });
    if (!elements.length) return;

    const records = elements.map(function (element) {
      const heading = element.querySelector("h2, h3, h4, h5, h6");
      return {
        element: element,
        id: element.dataset.cvId || "",
        title: (heading ? heading.textContent : element.dataset.cvId || "Linked record").trim(),
        type: element.dataset.cvType || "",
        search: normalizeText(element.dataset.cvSearch || element.textContent),
        skills: (element.dataset.cvSkills || "").split(/\s+/u).filter(Boolean)
      };
    });
    let publicModel=null;
    try{const script=ownScript(index,'script.interactive-cv-model');if(script&&new TextEncoder().encode(script.textContent).length<=2097152){const parsed=JSON.parse(script.textContent);if(parsed.version!==1||!Array.isArray(parsed.records)||parsed.records.length!==records.length||parsed.records.some((record,position)=>record.id!==records[position].id))throw new Error('Incomplete public index.');publicModel=global.InteractiveCVFeatures?global.InteractiveCVFeatures.validatePublicModel(parsed):parsed;}}catch{}
    const types = Array.from(new Set(records.map(function (record) { return record.type; }).filter(Boolean))).sort();
    const skillLabels = new Map();
    for (const record of records) {
      if (record.type !== "Skill" || !record.id || skillLabels.has(record.id)) continue;
      skillLabels.set(record.id, record.title);
    }
    const skills = Array.from(skillLabels.keys()).sort(function (left, right) {
      return skillLabels.get(left).localeCompare(skillLabels.get(right)) || left.localeCompare(right);
    });

    const controls = makeElement(document, "form", "cv-controls");
    controls.setAttribute("role", "search");
    controls.setAttribute("aria-label", "Filter the public CV index" + (suffix ? " " + suffix : ""));
    const fields = makeElement(document, "div", "cv-filter-fields");
    const query = makeElement(document, "input", "cv-query");
    query.type = "search";
    query.maxLength = 512;
    query.autocomplete = "off";
    labelledControl(document, fields, "Search public CV", query);
    const type = makeElement(document, "select", "cv-type");
    addOption(document, type, "", "All record types");
    for (const value of types) addOption(document, type, value, value);
    labelledControl(document, fields, "Record type", type);
    const skill = makeElement(document, "select", "cv-skill");
    addOption(document, skill, "", "All skills");
    for (const value of skills) addOption(document, skill, value, skillLabels.get(value));
    labelledControl(document, fields, "Skill, including descendants", skill);
    const reset = makeElement(document, "button", "cv-reset", "Reset filters");
    reset.type = "button";
    fields.appendChild(reset);
    controls.appendChild(fields);
    controls.appendChild(makeElement(document, "p", "cv-filter-note", "Filters apply to this page's complete public index. Printing includes all public records."));
    const count = makeElement(document, "p", "cv-result-count");
    count.setAttribute("role", "status");
    count.setAttribute("aria-live", "polite");
    count.setAttribute("aria-atomic", "true");
    controls.appendChild(count);

    let previewDialog=null;
    let advanced=null;
    const advancedTools=makeElement(document,'section','cv-advanced-tools');advancedTools.setAttribute('aria-label','Optional compound CV filters');
    advanced=advancedFilters(index,advancedTools,document,view,publicModel,records,{basicRequest:function(){return{query:query.value,type:type.value,skill:skill.value};},basicIds:function(){const filter=compileFilter({query:query.value,type:type.value,skill:skill.value});return records.filter(record=>matchesFilter(record,filter)).map(record=>record.id);},apply:function(){apply(false,true,true);}});
    if(advanced)index.appendChild(advancedTools);
    // Exports use the projected structured model, never the live filtered DOM.
    if (index.dataset.cvExports === "true") {
      const exportStatus=makeElement(document,"p","cv-export-status");
      exportStatus.setAttribute("role","status");
      const previewButton=makeElement(document,"button","cv-export-preview cv-export-trigger","Preview matching records for download");
      previewButton.type="button";controls.appendChild(previewButton);controls.appendChild(exportStatus);
      let model=null;
      const exportBase=new URL(index.dataset.cvRoot||'./',document.baseURI).href;
      try {
        if (!publicModel || !global.InteractiveCVExport) throw new Error("Public export model is unavailable.");
        model=publicModel;
        const ids=records.map(function(r){return r.id;});
        const validated=global.InteractiveCVExport.selectRecords(model,ids);
        if (validated.length!==records.length || model.records.length!==records.length) throw new Error("Public export model does not match this complete index.");
      } catch(error) {previewButton.disabled=true;exportStatus.textContent="Selected exports unavailable: "+error.message;}
      previewButton.addEventListener("click",function(){
        if (!model) return;
        const filter=compileFilter({query:query.value,type:type.value,skill:skill.value});
        const selected=advanced?.selectedIds(),ids=selected??records.filter(function(r){return matchesFilter(r,filter);}).map(function(r){return r.id;});
        try {
          if(advanced?.active()&&selected===null)throw new Error('Apply the current compound filters before exporting their selection.');
          if (!ids.length) throw new Error("No matching public records are selected.");
          if (previewDialog) previewDialog.remove();
          const dialog=makeElement(document,"dialog","cv-export-dialog");previewDialog=dialog;
          dialog.setAttribute("aria-label","Selected public CV preview");
          const note=makeElement(document,"p","","Review the exact matching records below. A linked record opened outside the filters is not included. Word downloads this selection; PDF uses the browser print preview.");
          dialog.appendChild(note);
          const actions=makeElement(document,"div","cv-export-actions");
          const word=makeElement(document,"button","","Download selected Word");word.type="button";
          const pdf=makeElement(document,"button","","Open selected PDF print preview");pdf.type="button";
          const close=makeElement(document,"button","","Close selected preview");close.type="button";
          const status=makeElement(document,"p","cv-download-status");status.setAttribute("role","status");
          function action(fn) {try {const result=fn();status.textContent=result.ok?"Selected document prepared from "+ids.length+" public records.":result.reason;} catch(error){status.textContent="Export refused: "+error.message;}}
          word.addEventListener("click",function(){action(function(){return global.InteractiveCVExport.downloadDocx(view,model,ids,{baseUrl:exportBase});});});
          pdf.addEventListener("click",function(){action(function(){return global.InteractiveCVExport.printSelected(view,model,ids,{baseUrl:exportBase});});});
          close.addEventListener("click",function(){if(dialog.close)dialog.close();else{dialog.remove();previewButton.focus();}});
          dialog.addEventListener("close",function(){if(dialog.dataset.cvReturnFocus!=="false")previewButton.focus();});
          actions.appendChild(word);actions.appendChild(pdf);actions.appendChild(close);dialog.appendChild(actions);dialog.appendChild(status);
          dialog.appendChild(global.InteractiveCVExport.makePreview(document,model,ids,{baseUrl:exportBase,embedded:true}));
          index.appendChild(dialog);
          if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");
          close.focus();exportStatus.textContent="";
        } catch(error){exportStatus.textContent="Selected preview refused: "+error.message;}
      });
    }

    let openedRecord = null;
    const recordsByElement = new Map(records.map(function (record) { return [record.element, record]; }));

    function recordForHash(hash) {
      const id = anchorId(hash);
      const target = id && document.getElementById(id);
      return target ? recordsByElement.get(target.closest(".cv-entry")) || null : null;
    }

    function apply(writeUrl, keepOpenedRecord, skipAdvanced) {
      if (!keepOpenedRecord) openedRecord = null;
      if(advanced&&!skipAdvanced&&advanced.active())advanced.run();
      const state = { query: query.value, type: type.value, skill: skill.value };
      const filter = compileFilter(state);
      const advancedIds=advanced?.selectedIds(),selection=advancedIds===null||advancedIds===undefined?null:new Set(advancedIds);
      let matching = 0;
      let exception = null;
      for (const record of records) {
        const matches = selection?selection.has(record.id):matchesFilter(record, filter);
        const hidden = !matches && record !== openedRecord;
        if (record.element.classList.contains("cv-filtered-out") !== hidden) record.element.classList.toggle("cv-filtered-out", hidden);
        if (matches) matching += 1;
        else if (record === openedRecord) exception = record;
      }
      const message = "Showing " + matching + (selection?' selected records, including required context, of ':' matching records of ') + records.length + " public records in this index." +
        (exception ? " Opened linked record outside current filters: " + exception.title + "." : "");
      if (count.textContent !== message) count.textContent = message;
      if (writeUrl && view && view.location && view.history) {
        try {
          const nextUrl = updateUrl(view.location.href, state, suffix);
          if (nextUrl !== view.location.href) view.history.replaceState(view.history.state, "", nextUrl);
        } catch (_) {
          // Sandboxed/file previews may deny history changes; filtering still works.
        }
      }
    }

    function restore() {
      const state = readState(initialState ? new URL(updateUrl(view.location.href, initialState, suffix)).search : view && view.location ? view.location.search : "", types, skills, suffix);
      initialState = null;
      query.value = state.query;
      type.value = state.type;
      skill.value = state.skill;
      openedRecord = recordForHash(view && view.location ? view.location.hash : "");
      apply(false, true);
    }

    function openHash(hash, scroll) {
      const record = recordForHash(hash);
      if (!record) return false;
      openedRecord = record;
      apply(false, true, true);
      if (scroll && record.element.focus) {
        record.element.setAttribute("tabindex", "-1");
        record.element.focus({ preventScroll: true });
      }
      if (scroll && record.element.scrollIntoView) record.element.scrollIntoView({ block: "start" });
      return true;
    }

    controls.addEventListener("submit", function (event) { event.preventDefault(); apply(true); });
    query.addEventListener("input", function () { apply(true); });
    type.addEventListener("change", function () { apply(true); });
    skill.addEventListener("change", function () { apply(true); });
    reset.addEventListener("click", function () {
      query.value = "";
      type.value = "";
      skill.value = "";
      if(advanced)advanced.clear();
      apply(true);
    });
    if (view && view.addEventListener) {
      view.addEventListener("popstate", restore);
      view.addEventListener("pageshow", restore);
      view.addEventListener("hashchange", function () { openHash(view.location.hash, true); });
    }
    if (view && view.location && view.history && document.addEventListener) {
      document.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
        if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
        let destination;
        try { destination = new URL(link.getAttribute("href"), document.baseURI || view.location.href).href; }
        catch (_) { return; }
        const targetHref = linkedTargetUrl(view.location.href, destination);
        if (!targetHref || !recordForHash(new URL(targetHref).hash)) return;
        try {
          if (targetHref !== view.location.href) view.history.pushState(view.history.state, "", targetHref);
        } catch (_) { return; }
        event.preventDefault();
        const dialog=link.closest(".cv-export-dialog");
        if(dialog && dialog===previewDialog) {
          dialog.dataset.cvReturnFocus="false";
          if(dialog.close)dialog.close();else dialog.remove();
        }
        openHash(new URL(targetHref).hash, true);
      });
    }
    index.insertBefore(controls, index.firstChild);
    index.dataset.cvEnhanced = "true";
    restore();
  }

  function initialize(document, initial) {
    const view = document.defaultView || global;
    Array.from(document.querySelectorAll(".cv-index")).forEach(function (index, number) {
      enhanceIndex(index, number === 0 ? "" : String(number + 1), document, view, initial && initial.index === index ? initial.state : null);
    });
  }

  global.InteractiveCVReader = Object.freeze({
    normalizeText: normalizeText,
    normalizeQuery: normalizeQuery,
    readState: readState,
    updateUrl: updateUrl,
    anchorId: anchorId,
    linkedTargetUrl: linkedTargetUrl,
    compileFilter: compileFilter,
    matchesFilter: matchesFilter,
    matchesRecord: matchesRecord,
    createSelectionController: createSelectionController,
    initialize: initialize
  });
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { initialize(document); });
    else initialize(document);
  }
})(globalThis);
