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

  function enhanceIndex(index, suffix, document, view) {
    if (index.dataset.cvEnhanced === "true") return;
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
    // Exports use the projected structured model, never the live filtered DOM.
    if (index.dataset.cvExports === "true") {
      const exportStatus=makeElement(document,"p","cv-export-status");
      exportStatus.setAttribute("role","status");
      const previewButton=makeElement(document,"button","cv-export-preview","Preview matching records for download");
      previewButton.type="button";controls.appendChild(previewButton);controls.appendChild(exportStatus);
      let model=null;
      const exportBase=new URL(index.dataset.cvRoot||'./',document.baseURI).href;
      try {
        const script=index.querySelector("script.interactive-cv-model");
        if (!script || new TextEncoder().encode(script.textContent).length>2097152 || !global.InteractiveCVExport) throw new Error("Public export model is unavailable.");
        model=JSON.parse(script.textContent);
        const ids=records.map(function(r){return r.id;});
        const validated=global.InteractiveCVExport.selectRecords(model,ids);
        if (validated.length!==records.length || model.records.length!==records.length) throw new Error("Public export model does not match this complete index.");
      } catch(error) {previewButton.disabled=true;exportStatus.textContent="Selected exports unavailable: "+error.message;}
      previewButton.addEventListener("click",function(){
        if (!model) return;
        const filter=compileFilter({query:query.value,type:type.value,skill:skill.value});
        const ids=records.filter(function(r){return matchesFilter(r,filter);}).map(function(r){return r.id;});
        try {
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

    function apply(writeUrl, keepOpenedRecord) {
      if (!keepOpenedRecord) openedRecord = null;
      const state = { query: query.value, type: type.value, skill: skill.value };
      const filter = compileFilter(state);
      let matching = 0;
      let exception = null;
      for (const record of records) {
        const matches = matchesFilter(record, filter);
        const hidden = !matches && record !== openedRecord;
        if (record.element.classList.contains("cv-filtered-out") !== hidden) record.element.classList.toggle("cv-filtered-out", hidden);
        if (matches) matching += 1;
        else if (record === openedRecord) exception = record;
      }
      const message = "Showing " + matching + " matching records of " + records.length + " public records in this index." +
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
      const state = readState(view && view.location ? view.location.search : "", types, skills, suffix);
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
      apply(false, true);
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

  function initialize(document) {
    const view = document.defaultView || global;
    Array.from(document.querySelectorAll(".cv-index")).forEach(function (index, number) {
      enhanceIndex(index, number === 0 ? "" : String(number + 1), document, view);
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
    initialize: initialize
  });
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { initialize(document); });
    else initialize(document);
  }
})(globalThis);
