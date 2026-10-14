// Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
// Explicit, public-only interchange conversion. No model, network or source lookup.
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_RECORDS = 2000;
const MAX_TEXT = 8192;
const requiredRoot = ['schema', 'schema_version', 'projection', 'graph_id', 'as_of', 'source_snapshot_sha256', 'record_count', 'records', 'completeness'];
const common = ['id', 'type', 'destination', 'language', 'qualification', 'publication'];
const entity = ['label', 'source_id', 'temporal', 'aliases', 'assertion_refs', 'lifecycle'];
const fields = {
  Person: entity, Role: entity, Project: entity, Skill: entity, Output: entity,
  Outcome: entity, Impact: entity,
  Activity: ['label', 'source_id', 'temporal', 'text', 'assertion_refs', 'lifecycle'],
  PersonalReflection: ['label', 'source_id', 'temporal', 'text', 'assertion_refs'],
  Time: ['source_id', 'temporal'],
  EvidenceSource: ['label', 'uri', 'source_date', 'retrieved_date'],
  Evidence: ['locator', 'source_id', 'text'],
  Assertion: ['claim_type', 'source_id', 'temporal', 'text', 'predicate', 'evidence_links', 'subject_id', 'object_id'],
  Relation: ['evidence_id', 'source_id', 'from_id', 'to_id', 'predicate']
};
const qualificationFields = ['origin', 'review', 'verification', 'source_verification', 'source_status', 'source_scope', 'evidence_availability', 'rights', 'contribution', 'causal_attribution'];
const fail = (message) => { throw new Error(`interactive-cv import: ${message}`); };
const own = (value, key) => Object.hasOwn(value, key);
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${name} must be an object`);
  return value;
}
function keys(value, allowed, name, required = []) {
  object(value, name);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${name} has unknown field; remove unsupported keys and use the documented field allowlist`);
  for (const key of required) if (!own(value, key)) fail(`${name} requires ${key}`);
}
function text(value, name, max = MAX_TEXT) {
  if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value) > max || /[\u0000-\u001f\u007f]/u.test(value)) fail(`${name} must be bounded nonblank single-line text`);
  return value;
}
function choice(value, allowed, name) {
  text(value, name);
  if (!allowed.includes(value)) fail(`${name} has an unsupported value; choose a documented enum value`);
  return value;
}
function array(value, name) {
  if (!Array.isArray(value) || value.length > MAX_RECORDS) fail(`${name} must be a bounded array`);
  return value;
}
function urn(value, name) {
  text(value, name, 512);
  if (!/^urn:[A-Za-z0-9][A-Za-z0-9:._~!$&'()*+,;=@%/-]*$/u.test(value) || /%(?![0-9A-Fa-f]{2})/u.test(value)) fail(`${name} requires a stable public URN`);
  return value;
}
function digest(value, name) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) fail(`${name} requires a lowercase SHA-256 digest`);
  return value;
}
function isoDay(value, name) {
  text(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) fail(`${name} requires a complete ISO day`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) fail(`${name} has an invalid date`);
  return value;
}
function destination(value, name) {
  text(value, name, 2048);
  if (!/^[A-Za-z0-9_./-]+\.html(?:#[A-Za-z0-9_-]+)?$/u.test(value) || value.startsWith('/') || value.split('/').some((part) => !part || part === '.' || part === '..')) fail(`${name} requires a safe relative static .html destination`);
  return value;
}
function bound(value, name, depth = 0, count = { value: 0 }, maxFields = 100) {
  if (depth > 24 || ++count.value > 150000) fail(`${name} exceeds structural limits`);
  if (typeof value === 'string') {
    if (Buffer.byteLength(value) > MAX_TEXT || /[\u0000\u0008\u000b\u000c\u007f]/u.test(value)) fail(`${name} has excessive text or control characters`);
    if (/(?:\bfile:\/|\b[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/u.test(value)) fail(`${name} contains a local file reference`);
  } else if (Array.isArray(value)) {
    array(value, name);
    for (const [index, entry] of value.entries()) bound(entry, `${name}[${index}]`, depth + 1, count);
  } else if (value && typeof value === 'object') {
    object(value, name);
    if (Object.keys(value).length > maxFields) fail(`${name} has excessive object fields`);
    for (const [index, [key, entry]] of Object.entries(value).entries()) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail(`${name} has an unsafe key`);
      // Arbitrary source keys and sidecar record IDs can be private. Positions
      // locate this structural traversal without putting their text in errors.
      const childLimit=depth===0 && name==='decisions' && ['destinations','persons'].includes(key) ? MAX_RECORDS : 100;
      bound(entry, `${name}.field[${index}]`, depth + 1, count, childLimit);
    }
  } else if (value !== null && typeof value !== 'boolean' && (typeof value !== 'number' || !Number.isFinite(value))) fail(`${name} is not JSON data`);
}
function validateTemporal(value) {
  if (value === null) return;
  keys(value, ['start', 'end', 'source_date_qualification', 'boundary_semantics', 'open_end_means_current'], 'temporal');
  for (const endpoint of ['start', 'end']) if (own(value, endpoint) && value[endpoint] !== null) {
    keys(value[endpoint], ['value', 'precision'], `temporal.${endpoint}`, ['value', 'precision']);
    const date = value[endpoint];
    text(date.precision, `temporal.${endpoint}.precision`);
    if (date.value !== null) text(date.value, `temporal.${endpoint}.value`);
  }
  if (own(value, 'open_end_means_current') && typeof value.open_end_means_current !== 'boolean') fail('temporal.open_end_means_current must be Boolean');
  for (const key of ['source_date_qualification', 'boundary_semantics']) if (own(value, key) && value[key] !== null) text(value[key], `temporal.${key}`);
}
function validateRecord(record) {
  object(record, 'record');
  if (!own(fields, record.type)) fail('unsupported public record type; choose a documented type');
  keys(record, [...common, ...fields[record.type]], 'record', common);
  urn(record.id, 'record.id');
  // Producer destinations are retained as literal facts. Every actual consumer
  // destination is explicitly chosen and validated in the separate sidecar.
  text(record.destination, 'record.destination', 2048);
  text(record.language, 'record.language', 80);
  keys(record.qualification, qualificationFields, 'qualification', qualificationFields);
  for (const key of qualificationFields) if (record.qualification[key] !== null) {
    if (typeof record.qualification[key] !== 'string') fail(`qualification.${key} must be string or null`);
    if (record.qualification[key] !== '') text(record.qualification[key], `qualification.${key}`);
  }
  choice(record.qualification.origin, ['author-declared', 'extracted-candidate', 'inferred-proposal'], 'qualification.origin');
  choice(record.qualification.review, ['unreviewed', 'author-reviewed', 'independently-reviewed'], 'qualification.review');
  choice(record.qualification.verification, ['unassessed', 'self-reported', 'externally-verified'], 'qualification.verification');
  choice(record.qualification.evidence_availability, ['public', 'restricted', 'unavailable', 'awaiting-permission'], 'qualification.evidence_availability');
  if (record.qualification.verification === 'externally-verified' || record.qualification.review === 'independently-reviewed') fail('source review/verification requires supporting reviewer or verification fields absent from interchange v1; preserve it in an explicitly authored catalogue instead');
  keys(record.publication, ['review', 'reviewer', 'reviewed_at', 'rights_basis'], 'publication', ['review', 'reviewer', 'reviewed_at', 'rights_basis']);
  choice(record.publication.review, ['author-reviewed', 'independently-reviewed'], 'publication.review');
  text(record.publication.reviewer, 'publication.reviewer');
  isoDay(record.publication.reviewed_at, 'publication.reviewed_at');
  text(record.publication.rights_basis, 'publication.rights_basis');
  for (const key of ['label', 'text', 'source_id', 'claim_type', 'predicate', 'subject_id', 'object_id', 'locator', 'uri', 'source_date', 'retrieved_date', 'from_id', 'to_id', 'evidence_id']) if (own(record, key) && record[key] !== null) text(record[key], `record.${key}`);
  if (own(record, 'temporal')) validateTemporal(record.temporal);
  if (own(record, 'lifecycle') && record.lifecycle !== null) {
    keys(record.lifecycle, ['state', 'as_of', 'source_status'], 'lifecycle');
    for (const value of Object.values(record.lifecycle)) if (value !== null) text(value, 'lifecycle field');
  }
  for (const key of ['aliases', 'assertion_refs']) if (own(record, key) && record[key] !== null) for (const value of array(record[key], key)) text(value, key);
  if (own(record, 'uri') && record.uri !== null) {
    let uri; try { uri = new URL(record.uri); } catch { fail('EvidenceSource.uri requires an HTTP(S) public source URL'); }
    if (!['https:', 'http:'].includes(uri.protocol) || uri.username || uri.password) fail('EvidenceSource.uri requires an HTTP(S) public source URL without credentials');
  }
  if (own(record, 'evidence_links')) for (const link of array(record.evidence_links, 'evidence_links')) {
    keys(link, ['evidence_id', 'stance', 'note', 'link_id'], 'evidence link', ['evidence_id', 'stance', 'note', 'link_id']);
    urn(link.evidence_id, 'evidence link.evidence_id'); urn(link.link_id, 'evidence link.link_id');
    choice(link.stance, ['supports', 'contradicts', 'qualifies'], 'evidence link.stance');
    if (link.note !== null) text(link.note, 'evidence link.note');
  }
}

/** Convert a validated, public producer projection using explicit destinations
 * and per-Person consent. Returns a JSON catalogue for the filter's raw reader.
 * No field-selection, privacy declassification or factual inference is performed.
 */
export function convertPublicInterchange(input, decisions) {
  bound(input, 'input'); bound(decisions, 'decisions');
  if (Buffer.byteLength(JSON.stringify(input)) > MAX_BYTES || Buffer.byteLength(JSON.stringify(decisions)) > MAX_BYTES) fail('input exceeds 2 MiB');
  keys(input, requiredRoot, 'input', requiredRoot);
  if (input.schema !== 'kai-cv-interchange/1' || input.schema_version !== 1 || input.projection !== 'public') fail('only public kai-cv-interchange/1 schema_version 1 is accepted');
  text(input.graph_id, 'graph_id'); isoDay(input.as_of, 'as_of'); digest(input.source_snapshot_sha256, 'source_snapshot_sha256');
  const records = array(input.records, 'records');
  if (!Number.isSafeInteger(input.record_count) || input.record_count !== records.length) fail('record_count does not match records');
  keys(input.completeness, ['approved_selected_records', 'excluded_count', 'destination_validation', 'consumer_runtime'], 'completeness', ['approved_selected_records', 'excluded_count', 'destination_validation', 'consumer_runtime']);
  if (input.completeness.approved_selected_records !== records.length || !Number.isSafeInteger(input.completeness.excluded_count) || input.completeness.excluded_count < 0) fail('completeness counts are invalid');
  text(input.completeness.destination_validation, 'completeness.destination_validation'); text(input.completeness.consumer_runtime, 'completeness.consumer_runtime');
  const byId = new Map();
  for (const record of records) {
    validateRecord(record);
    if (byId.has(record.id)) fail('duplicate public record ID');
    byId.set(record.id, record);
  }
  keys(decisions, ['source_snapshot_sha256', 'persons', 'destinations'], 'decisions', ['source_snapshot_sha256', 'persons', 'destinations']);
  if (digest(decisions.source_snapshot_sha256, 'decisions.source_snapshot_sha256') !== input.source_snapshot_sha256) fail('decisions snapshot is stale');
  object(decisions.persons, 'decisions.persons'); object(decisions.destinations, 'decisions.destinations');
  const people = records.filter((record) => record.type === 'Person').map((record) => record.id);
  if (Object.keys(decisions.persons).length !== people.length || Object.keys(decisions.persons).some((id) => !people.includes(id))) fail('decisions.persons must cover exactly the public Person IDs');
  for (const id of people) text(decisions.persons[id], 'Person consent');
  if (Object.keys(decisions.destinations).length !== records.length || Object.keys(decisions.destinations).some((id) => !byId.has(id))) fail('decisions.destinations must cover exactly every public record ID');
  const selectedDestinations = new Set();
  for (const id of byId.keys()) {
    const selected = destination(decisions.destinations[id], 'decisions.destination');
    if (selectedDestinations.has(selected)) fail('decisions.destinations requires unique record destinations');
    selectedDestinations.add(selected);
  }
  const context = Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'records'));
  function target(id, expected, name) {
    urn(id, name);
    const found = byId.get(id);
    if (!found || (expected && found.type !== expected)) fail(`${name} references unavailable or incorrectly typed public record`);
    return id;
  }
  const linkIds = new Set();
  const converted = records.map((record) => {
    const q = {};
    for (const key of qualificationFields) if (record.qualification[key] !== null && record.qualification[key] !== '') q[key.replaceAll('_', '-')] = record.qualification[key];
    const relations = [];
    for (const [key, predicate, expected] of [['source_id', 'source', 'EvidenceSource'], ['subject_id', 'subject', null], ['object_id', 'object', null], ['from_id', 'from', null], ['to_id', 'to', null], ['evidence_id', 'evidence', 'Evidence']]) if (record[key] !== undefined && record[key] !== null) relations.push({ predicate, target: target(record[key], expected, key) });
    for (const link of record.evidence_links ?? []) {
      if (linkIds.has(link.link_id) || byId.has(link.link_id)) fail('duplicate evidence link ID');
      linkIds.add(link.link_id);
      relations.push({ predicate: { supports: 'supportedByEvidence', contradicts: 'contradictedByEvidence', qualifies: 'qualifiedByEvidence' }[link.stance], target: target(link.evidence_id, 'Evidence', 'evidence_links') });
    }
    const assertions = (record.assertion_refs ?? []).map((id) => target(id, 'Assertion', 'assertion_refs'));
    if (record.type === 'Assertion' && !relations.some((relation) => ['supportedByEvidence', 'contradictedByEvidence', 'qualifiedByEvidence'].includes(relation.predicate))) fail('Assertion requires explicit evidence_links');
    if (['Outcome', 'Impact'].includes(record.type) && !assertions.length) fail(`${record.type} requires explicit public assertion_refs`);
    const exactText = record.label || record.text || record.type;
    text(exactText, 'display text');
    const facts = [{ label: 'Interchange context', value: JSON.stringify(context) }];
    // Keep exact source values (including null, uncertain dates, contrary notes,
    // source IDs and shared credit), even where a native field also presents them.
    for (const [key, value] of Object.entries(record)) if (!['id', 'type', 'publication'].includes(key)) facts.push({ label: `Source ${key}`, value: JSON.stringify(value) });
    for (const fact of facts) text(fact.value, `fact ${fact.label}`);
    const publication = { audience: 'public', review: record.publication.review, rights: record.publication.rights_basis, reviewer: record.publication.reviewer, 'reviewed-at': record.publication.reviewed_at };
    if (record.type === 'Person') publication.consent = decisions.persons[record.id];
    const publicRecord = { title: exactText, summary: record.text || record.label || record.type, url: decisions.destinations[record.id], qualification: q, aliases: record.aliases ?? [], assertions, relations, facts };
    const anchor = publicRecord.url.split('#')[1];
    if (anchor) {
      if (anchor.length > 128) fail('selected destination anchor exceeds 128 characters');
      publicRecord.anchor = anchor;
    }
    return { id: record.id, type: record.type, publication, public: publicRecord };
  });
  const catalogue = { 'interactive-cv': { 'as-of': input.as_of, records: converted } };
  if (Buffer.byteLength(JSON.stringify(catalogue, null, 2)) + 1 > MAX_BYTES) fail('converted catalogue exceeds 2 MiB');
  return catalogue;
}

function noDuplicateKeys(json, name) {
  // JSON.parse has already checked grammar. Track object keys in the original
  // lexical input so duplicate decisions cannot silently replace earlier ones.
  const stack = [];
  for (let i = 0; i < json.length; i++) {
    const character = json[i];
    if (character === '{') stack.push(new Set());
    else if (character === '[') stack.push(null);
    else if (character === '}' || character === ']') stack.pop();
    else if (character === '"') {
      const start = i;
      for (i++; i < json.length; i++) {
        if (json[i] === '\\') i++;
        else if (json[i] === '"') break;
      }
      let after = i + 1;
      while (/\s/u.test(json[after] ?? '') && after < json.length) after++;
      if (json[after] === ':') {
        const key = JSON.parse(json.slice(start, i + 1));
        const seen = stack.at(-1);
        if (seen.has(key)) fail(`${name} contains a duplicate JSON key`);
        seen.add(key);
      }
    }
  }
}

async function loadJson(path, name) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_BYTES) fail(`${name} requires a regular JSON file of at most 2 MiB`);
  const bytes = await readFile(path);
  if (bytes.byteLength > MAX_BYTES) fail(`${name} exceeds 2 MiB`);
  const json = bytes.toString('utf8');
  let value;
  try { value = JSON.parse(json); } catch { fail(`${name} is not valid JSON`); }
  noDuplicateKeys(json, name);
  return value;
}
async function cli(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    process.stdout.write('Usage: node import.mjs --input public.json --decisions consent-and-destinations.json --output cv-import.json\nSidecar: {source_snapshot_sha256, persons: {URN: "explicit consent"}, destinations: {URN: "index.html#safe-anchor"}}. Existing output is never overwritten. Load the JSON file with interactive-cv.catalogue to preserve literal source wording.\n');
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--input', '--decisions', '--output'].includes(key) || own(options, key) || !args[i + 1] || args[i + 1].startsWith('--')) fail('requires exactly --input, --decisions and --output');
    options[key] = resolve(args[i + 1]);
  }
  if (Object.keys(options).length !== 3) fail('requires exactly --input, --decisions and --output');
  if (options['--output'] === options['--input'] || options['--output'] === options['--decisions']) fail('output must differ from inputs');
  const input = await loadJson(options['--input'], 'input');
  const decisions = await loadJson(options['--decisions'], 'decisions');
  const output = convertPublicInterchange(input, decisions);
  await writeFile(options['--output'], `${JSON.stringify(output, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`Wrote ${output['interactive-cv'].records.length} public records. Validate static destinations in the rendered site before publication.\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  cli(process.argv.slice(2)).catch((error) => {
    // Native filesystem errors can contain private source/decision paths.
    // Preserve our bounded contract diagnostics, not arbitrary exception text.
    const message=typeof error?.message==='string' && error.message.startsWith('interactive-cv import: ')
      ? error.message : error?.code==='EEXIST'
        ? 'interactive-cv import: output already exists (EEXIST); choose a new output file'
        : 'interactive-cv import: input/output operation failed; check that input and decisions are readable local files and the new output directory is writable';
    process.stderr.write(`${message}\n`); process.exitCode = 1;
  });
}
