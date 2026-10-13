/* Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0 */
/* Structured public records, never arbitrary page HTML, are the export source. */
(function (global) {
  "use strict";
  const RECORD_KEYS = new Set(["id", "type", "title", "summary", "url", "qualification", "publicationReview", "start", "end", "date", "scalarFacts", "relations", "facts"]);
  const QUALIFIER_KEYS = new Set(["origin", "review", "verification", "evidence-availability", "reviewer", "reviewed-at", "verifier", "verified-at", "method", "scope", "source-verification", "source-status", "source-scope", "rights", "contribution", "causal-attribution"]);
  const TYPES = new Set(["Person", "Role", "Project", "Skill", "Activity", "Output", "Outcome", "Impact", "PersonalReflection", "Evidence", "Time", "Assertion", "ServiceOffering", "EvidenceSource", "Relation"]);
  const UTF8 = new TextEncoder();

  function fail(message) { throw new Error("interactive-cv export: " + message); }
  function keys(value, allowed, field) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(field + " must be an object");
    for (const key of Object.keys(value)) if (!allowed.has(key)) fail(field + " has unknown field " + key);
  }
  function text(value, field) {
    if (typeof value !== "string" || !value.trim() || value.length > 8192 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(value)) fail(field + " must be bounded nonblank XML-safe text");
    for (let i = 0; i < value.length; i += 1) {
      const unit = value.charCodeAt(i);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = value.charCodeAt(++i);
        if (!(next >= 0xdc00 && next <= 0xdfff)) fail(field + " contains an invalid Unicode surrogate");
      } else if (unit >= 0xdc00 && unit <= 0xdfff) fail(field + " contains an invalid Unicode surrogate");
    }
    return value;
  }
  function list(value, field) {
    if (!Array.isArray(value) || value.length > 2000) fail(field + " must be a bounded array");
    return value;
  }
  function optionalList(value, field) {
    return list(value === undefined ? [] : value, field);
  }
  function decisionDate(value, field) {
    const date = text(value, field);
    if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/u.test(date) || /\s/u.test(date)) fail(field + " requires an ISO year/month/day decision date");
    const [year, month, day] = date.split("-").map(Number);
    if (month !== undefined && (month < 1 || month > 12)) fail(field + " has an invalid calendar month");
    if (day !== undefined) {
      const leap = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
      const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
      if (day < 1 || day > days) fail(field + " has an invalid calendar day");
    }
    return date;
  }
  function safeUrl(value, baseUrl) {
    const url = text(value, "url");
    if (/^(?:javascript|data|file|blob|vbscript):/iu.test(url) || /[\u0000-\u0020\\]/u.test(url)) fail("unsafe export link");
    if (/^[a-z][a-z0-9+.-]*:/iu.test(url) && !/^https?:\/\//iu.test(url)) fail("export links require HTTP(S) or relative public destinations");
    if (url.startsWith("//")) fail("protocol-relative export link is not allowed");
    if (baseUrl) {
      const base = new URL(baseUrl);
      // Browser filter/query state is not part of an author's public URL.
      base.search = ""; base.hash = "";
      const result = new URL(url, base);
      if (result.protocol !== "https:" && result.protocol !== "http:") fail("export links require an HTTP(S) base URL");
      if (result.username || result.password) fail("export links cannot include credentials");
      return result.href;
    }
    return url;
  }
  function selectRecords(model, selectedIds) {
    keys(model, new Set(["version", "asOf", "records"]), "model");
    if (model.version !== 1) fail("unsupported public model version");
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(text(model.asOf, "asOf"))) fail("asOf requires an ISO day");
    const calendarDate = new Date(model.asOf + "T00:00:00Z");
    if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== model.asOf) fail("asOf requires a valid calendar day");
    const all = new Map();
    for (const record of list(model.records, "records")) {
      keys(record, RECORD_KEYS, "record");
      for (const key of ["id", "type", "title", "summary", "url", "publicationReview"]) text(record[key], "record." + key);
      if (!/^[a-z][a-z0-9+.-]*:\S+$/iu.test(record.id) || /\s/u.test(record.id)) fail("record.id requires a stable URI/URN with a nonempty suffix");
      if (!TYPES.has(record.type)) fail("unsupported record type");
      if (!["unreviewed", "author-reviewed", "independently-reviewed"].includes(record.publicationReview)) fail("unsupported publication review");
      if (all.has(record.id)) fail("duplicate record ID");
      safeUrl(record.url);
      keys(record.qualification, QUALIFIER_KEYS, "qualification");
      for (const [key, value] of Object.entries(record.qualification)) text(value, "qualification." + key);
      for (const key of ["origin", "review", "verification", "evidence-availability"]) text(record.qualification[key], "qualification." + key);
      const choices = { origin: ["author-declared", "extracted-candidate", "inferred-proposal"], review: ["unreviewed", "author-reviewed", "independently-reviewed"], verification: ["unassessed", "self-reported", "externally-verified"], "evidence-availability": ["public", "restricted", "unavailable", "awaiting-permission"] };
      for (const [key, values] of Object.entries(choices)) if (!values.includes(record.qualification[key])) fail("unsupported qualification." + key);
      if (record.qualification.verification === "externally-verified") for (const key of ["verifier", "verified-at", "method", "scope"]) text(record.qualification[key], "external verification " + key);
      if (record.qualification.review === "independently-reviewed") text(record.qualification.reviewer, "independent reviewer");
      for (const key of ["reviewed-at", "verified-at"]) if (record.qualification[key] !== undefined) decisionDate(record.qualification[key], "qualification." + key);
      for (const key of ["start", "end", "date"]) if (record[key] != null) text(record[key], key);
      for (const key of ["scalarFacts", "facts"]) for (const fact of optionalList(record[key], key)) {
        keys(fact, new Set(["label", "value"]), key);
        text(fact.label, "fact label"); text(fact.value, "fact value");
      }
      for (const relation of optionalList(record.relations, "relations")) {
        keys(relation, new Set(["predicate", "target", "title", "url"]), "relation");
        for (const key of ["predicate", "target", "title", "url"]) text(relation[key], "relation." + key);
        safeUrl(relation.url);
      }
      all.set(record.id, record);
    }
    // References describe this complete public snapshot even when the reader
    // downloads only a subset. Validate after collecting all records so order
    // does not affect forward references or the selected record count.
    for (const record of all.values()) for (const relation of optionalList(record.relations, "relations")) {
      const target = all.get(relation.target);
      if (!target) fail("relation target is absent from this complete public snapshot");
      if (relation.title !== target.title || relation.url !== target.url) fail("relation title/url conflicts with its authoritative public target");
    }
    const selected = [], seen = new Set();
    for (const id of list(selectedIds, "selected IDs")) {
      text(id, "selected ID");
      if (seen.has(id)) fail("duplicate selected ID");
      if (!all.has(id)) fail("selected ID is absent from this public snapshot");
      selected.push(all.get(id)); seen.add(id);
    }
    if (!selected.length) fail("select at least one public record");
    return selected;
  }
  function recordFacts(record) {
    const facts = [{ label: "Type", value: record.type }, { label: "Stable ID", value: record.id }];
    for (const [label, value] of Object.entries(record.qualification)) facts.push({ label: label, value: value });
    facts.push({ label: "Publication review", value: record.publicationReview });
    for (const key of ["start", "end", "date"]) if (record[key] != null) facts.push({ label: key, value: record[key] });
    return facts.concat(record.scalarFacts || [], record.facts || []);
  }
  function element(document, tag, content) {
    const node = document.createElement(tag);
    if (content != null) node.textContent = content;
    return node;
  }
  function makePreview(document, model, selectedIds, options) {
    const selected = selectRecords(model, selectedIds), baseUrl = options && options.baseUrl;
    // A modal is inside the native page's main landmark; a standalone print
    // document owns its own main. Keep the structured public content identical.
    const main = element(document, options && options.embedded === true ? "section" : "main"); main.className = "cv-export-preview";
    main.appendChild(element(document, "h1", "Selected CV records"));
    main.appendChild(element(document, "p", "Public snapshot as of " + model.asOf + ". " + selected.length + " selected record(s)."));
    main.appendChild(element(document, "p", "Wording and stated review/evidence qualifiers are retained. Missing end dates do not mean current appointments. This selection is not the complete CV."));
    for (const record of selected) {
      const section = element(document, "section");
      section.appendChild(element(document, "h2", record.title));
      section.appendChild(element(document, "p", record.summary));
      const facts = element(document, "dl");
      for (const fact of recordFacts(record)) {
        facts.appendChild(element(document, "dt", fact.label)); facts.appendChild(element(document, "dd", fact.value));
      }
      section.appendChild(facts);
      if ((record.relations || []).length) {
        const relations = element(document, "ul");
        for (const relation of record.relations) {
          const item = element(document, "li", relation.predicate + ": ");
          const link = element(document, "a", relation.title + " (" + relation.target + ")");
          link.href = safeUrl(relation.url, baseUrl); item.appendChild(link); relations.appendChild(item);
        }
        section.appendChild(relations);
      }
      const link = element(document, "a", "Public destination"); link.href = safeUrl(record.url, baseUrl);
      section.appendChild(link); main.appendChild(section);
    }
    return main;
  }
  function xml(value) { return String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&apos;"); }
  function run(value) {
    return "<w:r><w:t xml:space=\"preserve\">" + xml(value) + "</w:t></w:r>";
  }
  function paragraph(value, style) {
    return "<w:p>" + (style ? "<w:pPr><w:pStyle w:val=\"" + style + "\"/></w:pPr>" : "") + run(value) + "</w:p>";
  }
  const CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    CRC_TABLE[n] = value >>> 0;
  }
  function crc32(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  }
  function zip(entries) {
    const chunks = [], directory = []; let offset = 0, directorySize = 0;
    for (const [name, source] of entries) {
      const filename = UTF8.encode(name), bytes = UTF8.encode(source), crc = crc32(bytes);
      const local = new Uint8Array(30 + filename.length), view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
      view.setUint16(12, 33, true); view.setUint32(14, crc, true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true); view.setUint16(26, filename.length, true); local.set(filename, 30);
      const central = new Uint8Array(46 + filename.length), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true); cv.setUint32(16, crc, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true); cv.setUint16(28, filename.length, true); cv.setUint32(42, offset, true); central.set(filename, 46);
      chunks.push(local, bytes); directory.push(central); offset += local.length + bytes.length; directorySize += central.length;
    }
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
    const output = new Uint8Array(offset + directorySize + end.length); let at = 0;
    for (const chunk of chunks.concat(directory, [end])) { output.set(chunk, at); at += chunk.length; }
    return output;
  }
  function buildDocx(model, selectedIds, options) {
    const selected = selectRecords(model, selectedIds), baseUrl = options && options.baseUrl;
    const relationships = ["<Relationship Id=\"rIdStyles\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>"];
    let nextId = 1;
    function linkParagraph(label, href, listStyle) {
      const id = "rIdLink" + nextId++;
      relationships.push("<Relationship Id=\"" + id + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink\" Target=\"" + xml(safeUrl(href, baseUrl)) + "\" TargetMode=\"External\"/>");
      return "<w:p>" + (listStyle ? "<w:pPr><w:pStyle w:val=\"ListParagraph\"/><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr></w:pPr>" : "") + "<w:hyperlink r:id=\"" + id + "\">" + run(label) + "</w:hyperlink></w:p>";
    }
    let body = paragraph("Selected CV records", "Title") + paragraph("Public snapshot as of " + model.asOf + ". " + selected.length + " selected record(s).") + paragraph("Wording and stated review/evidence qualifiers are retained. Missing end dates do not mean current appointments. This selection is not the complete CV.");
    for (const record of selected) {
      body += paragraph(record.title, "Heading1") + paragraph(record.summary);
      for (const fact of recordFacts(record)) body += paragraph(fact.label + ": " + fact.value);
      for (const relation of record.relations || []) body += linkParagraph(relation.predicate + ": " + relation.title + " (" + relation.target + ")", relation.url, true);
      body += linkParagraph("Public destination: " + safeUrl(record.url, baseUrl), record.url, false);
    }
    relationships.push("<Relationship Id=\"rIdNumbering\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering\" Target=\"numbering.xml\"/>");
    const declaration = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>";
    return zip([
      ["[Content_Types].xml", declaration + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/><Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/><Override PartName=\"/word/numbering.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml\"/></Types>"],
      ["_rels/.rels", declaration + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rIdDocument\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>"],
      ["word/document.xml", declaration + "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><w:body>" + body + "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1134\" w:right=\"1134\" w:bottom=\"1134\" w:left=\"1134\"/></w:sectPr></w:body></w:document>"],
      ["word/_rels/document.xml.rels", declaration + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" + relationships.join("") + "</Relationships>"],
      ["word/styles.xml", declaration + "<w:styles xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\"><w:name w:val=\"Normal\"/></w:style><w:style w:type=\"paragraph\" w:styleId=\"Title\"><w:name w:val=\"Title\"/><w:basedOn w:val=\"Normal\"/><w:rPr><w:b/><w:sz w:val=\"36\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"Heading1\"><w:name w:val=\"heading 1\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:pPr><w:keepNext/><w:outlineLvl w:val=\"0\"/></w:pPr><w:rPr><w:b/><w:sz w:val=\"28\"/></w:rPr></w:style><w:style w:type=\"paragraph\" w:styleId=\"ListParagraph\"><w:name w:val=\"List Paragraph\"/><w:basedOn w:val=\"Normal\"/></w:style></w:styles>"],
      ["word/numbering.xml", declaration + "<w:numbering xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:abstractNum w:abstractNumId=\"0\"><w:multiLevelType w:val=\"singleLevel\"/><w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"•\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:tabs><w:tab w:val=\"num\" w:pos=\"720\"/></w:tabs><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId=\"1\"><w:abstractNumId w:val=\"0\"/></w:num></w:numbering>"]
    ]);
  }
  function downloadDocx(view, model, selectedIds, options) {
    const bytes = buildDocx(model, selectedIds, { baseUrl: options && options.baseUrl || view.location.href });
    const url = view.URL.createObjectURL(new view.Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
    const link = view.document.createElement("a");
    link.href = url; link.download = "selected-cv.docx"; link.hidden = true;
    try { view.document.body.appendChild(link); link.click(); }
    finally { link.remove(); view.setTimeout(function () { view.URL.revokeObjectURL(url); }, 1000); }
    return { ok: true, filename: link.download, recordCount: selectedIds.length };
  }
  function printSelected(view, model, selectedIds, options) {
    selectRecords(model, selectedIds);
    const baseUrl = options && options.baseUrl || view.location.href;
    const popup = view.open("", "_blank");
    if (!popup) return { ok: false, reason: "The browser blocked the selected print preview. Allow this preview or use the Word download." };
    popup.opener = null;
    const document = popup.document;
    document.documentElement.lang = view.document.documentElement.lang || "en";
    document.title = "Selected CV records";
    const meta = document.createElement("meta"); meta.charset = "utf-8"; document.head.appendChild(meta);
    const style = document.createElement("style");
    style.textContent = "body{font-family:system-ui,sans-serif;max-width:55rem;margin:2rem auto;padding:0 1rem;line-height:1.5}dt{font-weight:700}dd{margin-left:1rem;overflow-wrap:anywhere}section{margin-block:2rem}a{overflow-wrap:anywhere}button{font:inherit;padding:.5rem 1rem;margin-right:.5rem}h2{break-after:avoid}@media print{.cv-print-controls{display:none}body{margin:0;max-width:none}a{color:inherit}}";
    document.head.appendChild(style);
    const controls = element(document, "div"); controls.className = "cv-print-controls";
    controls.appendChild(element(document, "p", "Use the browser print dialog and choose Save as PDF where available. PDF tagging, font coverage and page layout depend on your browser; this is not a PDF/UA guarantee. Print headers/footers may include the browser URL; review the preview before saving."));
    const print = element(document, "button", "Print / Save as PDF"); print.type = "button"; print.addEventListener("click", function () { popup.print(); });
    const close = element(document, "button", "Close preview"); close.type = "button"; close.addEventListener("click", function () { popup.close(); });
    controls.appendChild(print); controls.appendChild(close); document.body.appendChild(controls);
    document.body.appendChild(makePreview(document, model, selectedIds, { baseUrl: baseUrl }));
    popup.focus(); print.focus();
    return { ok: true, window: popup, recordCount: selectedIds.length };
  }
  global.InteractiveCVExport = Object.freeze({ selectRecords: selectRecords, makePreview: makePreview, buildDocx: buildDocx, downloadDocx: downloadDocx, printSelected: printSelected });
})(globalThis);
