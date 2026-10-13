# Interactive CV

An experimental Quarto filter for an evidence-linked CV, using ordinary pages
and one authoritative YAML or literal JSON catalogue. It works without models or a graph
database. **0.0.3 is experimental source**, with a deterministic CV core,
public interchange import, selected document previews and a whole-output audit.
Source publication is separate from a supported release, real-data use or deployment.

For authors presenting varied professional experience, it provides readable
public records linked to skills, projects and evidence. Readers can browse the
ordinary pages or use optional filters and selected exports. It does not infer
competence, independently verify a career claim or publish consultancy services
without explicit author choices.

## Install and try the example

Use Quarto **1.11.5 pre-release** for the tested workflow. In an empty working
directory, copy the distributed [example.qmd](example.qmd) and
[example-cv.yml](example-cv.yml), then run:

```powershell
quarto add kai-prince-sfhea/interactive-cv --no-prompt
quarto render example.qmd --to html
quarto render example.qmd --to docx
```

For an existing project, run the same `quarto add` command from that project.
Installation copies only the runtime under `_extensions`; copy the two example
files separately when trying the supplied example. This does not replace your
website configuration.

Copy `example-cv.yml` as an author-maintained input. In `_quarto.yml` (or document
front matter), activate the locally installed filter and load that file:

```yaml
filters:
  - kai-prince-sfhea/interactive-cv
metadata-files:
  - example-cv.yml
```

Keep inline data and its options together in that file's complete
`interactive-cv` namespace. For example, add `exports: true` beside `as-of` and
`records` there. A partial namespace elsewhere can replace the metadata-file
value. For project/directory/document configuration, a complete literal JSON
catalogue namespace is shorter to repeat than the inline records; see below.

Place an empty index in a normal QMD page:

```markdown
::: {.cv-index}
:::
```

Render with native `quarto render`. Keep normal website navigation, listings,
about pages and search; this filter does not replace the project type or require
hooks. Quarto reads the YAML through its own metadata system. These examples use the GitHub installation namespace. The metadata key remains
`interactive-cv`; it is separate from the owner-qualified filter selector. [Official filter authoring and activation](https://quarto.org/docs/extensions/filters.html).

For a website declaring both HTML and DOCX, build both formats together with
`quarto render --to all` to retain the Word download behind Quarto's native
alternate-format link. A full HTML-only rebuild can clean earlier Word files.

### List, update, disable and remove

Run lifecycle commands from the consuming project:

```powershell
quarto list extensions
quarto update kai-prince-sfhea/interactive-cv --no-prompt
```

Temporarily disable the filter at the effective document/project metadata layer:

```yaml
interactive-cv:
  enabled: false
```

Disabling skips CV validation and generation, including stale extension-only
options. It leaves authored source files intact. Remove the filter entry before
rendering after uninstalling, then run:

```powershell
quarto remove kai-prince-sfhea/interactive-cv --no-prompt
```

Keep your author-maintained catalogue and pages. Empty CV placeholders require
the filter to generate their content. Installing into an existing website does
not create or replace its project configuration. For local-source development, `quarto add "C:/path/to/interactive-cv" --no-prompt`
installs the unqualified `interactive-cv` selector instead. Change the example
filter selector and installed CLI paths to that local namespace for this separate
route; the source folder does not contain an owner-qualified installation. [Official extension lifecycle](https://quarto.org/docs/extensions/managing.html).

### Options and effective metadata

All options belong to `interactive-cv`. Quarto resolves project, directory,
profile, document and metadata-file values before this filter validates the
effective namespace. A higher-priority namespace can replace the whole mapping,
including an inherited catalogue path or inline records. Keep the complete
configuration at the selected layer: for a literal JSON source, repeat its
`catalogue` path alongside changed options; for inline YAML, keep data/options
together in the loaded file. `enabled: false` can stand alone because it skips
processing. Use one authoritative records source and check the effective result
when composing profiles. The extension does not reparse
`_quarto.yml` or define a separate precedence system.

| Option | Type and default | Use |
|---|---|---|
| `enabled` | Boolean, `true` | `false` skips the extension's processing |
| `as-of` | Quoted complete ISO day, required for inline records | Public snapshot date |
| `records` | Sequence, required for inline data; explicit `[]` allowed | Authoritative selected records |
| `catalogue` | Local `.json` path, absent by default | Alternative to both inline `as-of` and `records` |
| `services` | Boolean, `false` | Include separately approved ServiceOffering records |
| `exports` | Boolean, `false` | Add selected Word/print-PDF controls to an HTML index |
| `record-id` | Stable URI/URN text, absent by default | Bind a detail page to one record; check its title |

Unknown active options are refused. `catalogue` cannot be combined with inline
`as-of`/`records`; `services` and `exports` stay in document/project options,
outside the data-only JSON file. Quarto supplies the Lua/Pandoc runtimes. Node.js
20+ is an additional prerequisite only for the explicit importer/auditor commands;
Python, browser-test tooling and developer packages are not consumer prerequisites.

Use ordinary `quarto render` and `quarto preview`; there is no additional author
build command. After changing a literal JSON catalogue, explicitly render again.
Catalogue-only filesystem watching is not established by the preview check.

## Authoritative records

The synthetic `example-cv.yml` is the copyable full example. The `interactive-cv`
namespace requires `as-of` as a quoted ISO day and a `records` list. Each record
has a stable URI/URN `id`, a `type`, a `publication` decision and a `public` map.
`private` maps and records whose audience is `private` or `excluded` are omitted
from this filter's generated content. Only the documented public field allowlist
is rendered, alongside the publication review status and a fixed Person consent
marker; unknown public fields fail validation. Exact consent text, publication
reviewer/date and rights-decision text remain author-side.

The eleven primary types are Person, Role, Project, Skill, Activity, Output,
Outcome, Impact, PersonalReflection, Evidence and Time. Assertion and
ServiceOffering, EvidenceSource and Relation are supporting types. A Person needs an explicit publication
`consent` declaration. This records an author decision; it does not verify legal
consent. For real data, decide each public field, evidence right and permission
before adding it to `public`. This prototype uses fictional data only.

Every public map requires `title`, `summary`, `url` and `qualification`.
Qualification requires `origin`, `review`, `verification` and
`evidence-availability`; source review is separate from `publication.review`.
Unreviewed sources can remain labelled unreviewed even when their exact public
wording has been approved. External verification additionally requires `verifier`,
`verified-at`, `method` and `scope`. Independently reviewed qualifications require
a `reviewer`. No status is inferred from nearby evidence or a public repository.
Optional `reviewed-at` and `verified-at` values use quoted ISO year/month/day
precision; a publication labelled independently reviewed also needs its reviewer.
Optional qualification text fields are `source-verification`, `source-status`,
`source-scope`, `rights`, `contribution` and `causal-attribution`. They preserve
source descriptions without promoting their review or verification status.

Optional public fields are `start`, `end`, `date`, `name`, `company`,
`organization`, `grade`, `description`, `cv`, `hours`, `cpdHours`, `scope`,
`contact`, `audience`, `availability`, `aliases`, `categories`, `assertions` and
`relations`, `facts` and `anchor`. `facts` is a list of `{label, value}` pairs with
literal text values (maximum 256). `anchor` optionally gives a unique ASCII
identifier starting with a letter, at most 128 characters, to avoid calculating
the default hash anchor. Dates retain ISO year/month/day precision; `Unknown` and an explicitly
authored `Present` are supported. A missing end date stays missing. Quote dates
and numerical listing fields. Contradictory `hours`/`cpdHours` and reversed dates
at equal precision fail. Uncertain interpretation belongs in an exact `scope`
statement; no temporal reasoning or precision conversion runs.

Relations use `{predicate, target}` with stable target IDs. `broader` links only
Skills and permits multiple parents; cycles fail. Skill ancestry is limited to
64 `broader` edges on any path, independently of record order. An Assertion needs
an explicit Evidence target through `supportedByEvidence`,
`contradictedByEvidence` or `qualifiedByEvidence`. Outcome/Impact records reference public Assertion IDs in
`assertions`. State limitations in exact wording; these links never establish
causality, mastery or independent verification.
Incoming relationships are also displayed, labelled with their original
predicate and source, so a role can lead to its projects, activities and evidence
without inventing inverse assertions.

`url` is a safe project-output-root-relative `.html` destination with an optional simple
anchor, without empty path components such as `cv//role.html`. The anchor generated for an ID is `cv-` plus its first twelve SHA-1
hex characters (an identifier, not a security signature). Update example URLs
when renaming the rendered page. Normal nested website sections are supported:
keep canonical paths such as `cv/person.html`; page links and browser export
bases account for the containing directory. Moving output to a different
directory with custom `output-file`, or using a custom format, needs a separate
compatibility check. Confirm actual destinations in the rendered
site; this filter checks URL syntax and reference closure, not a project-wide
release inventory.

For a labelled detail page, reference the same record instead of re-entering it:

```markdown
::: {.cv-record record-id="urn:synthetic:cv:project"}
:::
```

Write narrative outside the empty placeholder. Optional `record-id` in the
complete effective `interactive-cv` namespace also binds the page and requires
its document title to match the authoritative record title. Prefer the placeholder
attribute above when sharing a catalogue, to avoid a partial metadata override. A `title`
attribute on the detail placeholder is checked for conflict. One index or unique
detail records per page avoids duplicated anchors. Narrative remains authored
content: the filter cannot validate every claim made outside its placeholders.

## Reader controls and exports

Plain HTML optionally adds labelled search, type and multi-parent skill filters.
Filters cover the complete public catalogue on that page, including ancestor
labels and skill aliases. URL parameters `cvq`, `cvt` and `cvs` preserve the
filter selection when following a detail link and returning; they can disclose
reader choices if the URL is shared or recorded by a host. No telemetry, model
download, network request or persistent storage is added by the extension.
Same-page links from a selected preview close the dialog and focus the
destination while retaining filters. Query normalization runs once per filter
pass; unchanged counts and URLs are left alone to avoid repeated work and live
announcements.

Without JavaScript, every record and relationship remains ordinary text and
links. Native Word output uses the same Pandoc blocks. Ordinary page printing
includes all public records. Browser controls target plain HTML, not
slides/email/EPUB. Graph layout, temporal reasoning, multilingual adaptation and
Generative Websites/AI integration remain separate experiments. No extension
dependency is declared before a real integration needs and verifies one.

### Selected Word and PDF preview

Opt in with `exports: true` beside the catalogue/data in the complete effective
`interactive-cv` namespace. Filter
the index, choose **Preview matching records for download**, and review its exact
wording, dates and source statuses. A linked record revealed outside the filters
is excluded from that selection. **Download selected Word** builds an original
OOXML document in the browser; it does not export the live page DOM. Public links
need an HTTP(S) preview/website; file:// export refuses local-path disclosure.

**Open selected PDF print preview** opens a separate document with the same
selection. Choose **Print / Save as PDF**, then the browser's PDF destination.
It preserves Unicode text using browser fonts. This is a browser print workflow,
not a direct PDF download or a PDF/UA guarantee. Review font coverage, pagination,
reading order and headers/footers in your browser. Popup blocking is reported;
Word and the static native content remain available. Export controls use Blob
URLs for Word, revoke them afterwards, and use a separate same-origin print
window with inline print styles. Test these capabilities against your host CSP.

### Literal JSON catalogue and public interchange import

Quarto parses YAML metadata text as Markdown. Use a literal JSON catalogue when
exact Markdown/TeX/HTML-looking punctuation must survive unchanged:

```yaml
filters: [kai-prince-sfhea/interactive-cv]
interactive-cv:
  catalogue: cv-import.json
  exports: true
```

The file contains only `{"interactive-cv":{"as-of":"2026-10-13","records":[...]}}`.
`[...]` here is explanatory, not executable JSON; the installed importer produces
a complete file. File paths follow Quarto's configuration-relative metadata
handling; inherited paths are rebased to the input and normalized within the
project root (or standalone document directory). Prefer declaring shared
catalogues in `_quarto.yml`. A complete override in a nested document can use a
relative parent path such as `../cv-import.json`; the runtime normalizes it and
refuses escape above the document/project root. The structural schema cannot
prove filesystem confinement. Do not combine `catalogue` with inline `records`/`as-of`.
Keep `services`/`exports` in document/project options. Empty `records: []` must be
explicit. File/model limits are 2 MiB, including delivered JSON escaping; JSON
duplicates, excessive depth, joined labels over 8 KiB and over 2,000 combined
relation/assertion links per record fail before browser controls are offered.
This is a trusted local authoring input with lexical path checks, not a sandbox
for untrusted source files or symlink targets. Never add it to published resources.

With Node.js 20+ installed, explicitly convert a public `kai-cv-interchange/1`
projection (never a private export):

```powershell
node _extensions/kai-prince-sfhea/interactive-cv/import.mjs --input synthetic-public.json --decisions private/consent-and-destinations.json --output cv-import.json
```

Use `--help` for the sidecar contract. It binds the producer snapshot digest to
explicit Person consent and every safe destination. Source qualification remains
separate from publication review. Supporting, contrary and qualifying evidence,
unknown dates, exact source facts and shared-credit limits are preserved. The
importer refuses unsupported verifier/reviewer states instead of inventing
details. It is a strict supported subset, not a general producer-schema
validator. Existing output is not overwritten. No real career import or automatic
publication is implied. `config-v1.schema.json` is an installed structural
reference; it is not automatically registered in the Quarto editor.

Services default off. Setting `interactive-cv.services: true` includes explicitly
approved ServiceOffering records; each also needs `scope`, `contact`, `audience`
and `availability`. A proposed service must not imply historical results. This
does not authorize publishing Kai's consultancy or contacting anyone.

## Privacy, security and accessibility

The public map is deliberate field selection, not an access-control system.
Never put private data in page narrative, listing inputs, images, referenced
resources or unrelated metadata expecting this filter to protect it. Other
filters can access metadata before this filter removes its namespace. Inspect
the whole output directory, search index, downloaded files and stale artifacts
before publication, especially after withdrawing permission. Keep private source
exports outside the public project. Quarto can print author metadata in render
logs; treat those logs as private developer artifacts too. Use trusted local
author input.

Before publishing, run the explicit installed whole-output audit with Node:

```powershell
node _extensions/kai-prince-sfhea/interactive-cv/audit.mjs --output-dir _site --policy private/cv-policy.json --manifest private/current-audit.json --previous private/previous-audit.json
```

Omit `--previous` for the first inventory. The policy requires `version: 1`,
`asOf`, `expectedIds` from the intended current public catalogue, and optional
`forbidden` exact strings; `expectedModelSha256` can additionally bind exact
projected wording. Keep policy and manifests outside published output. `--help`
describes the shape. New manifest paths are required; the scan never deletes,
changes or uploads site files. It detects unexpected/missing records, missing
static facts, exposed author sources, forbidden markers and retained withdrawn
pages/search/Word content. Missing catalogue scope is unknown, not an empty CV.
Its limits are 10,000 files, 32 MiB per file, 128 MiB total and bounded DOCX XML.
It refuses symlink inventories. This is detection against explicit inputs, not
proof that all private information is absent or permission/authenticity is valid.
HTML, JSON and DOCX receive text/structure decoding. PDF, image and font content
receives byte scanning only, without PDF text extraction, semantic analysis or
OCR; review those assets separately before publication.
After withdrawal, rebuild every output in a fresh staging directory and audit it
against the previous inventory; incremental rendering alone is insufficient.

Native headings, lists, links and labelled controls provide the initial access
route. Automated checks cannot establish WCAG conformance or screen-reader/office
compatibility. Keep placeholders in ordinary visible page content. Automatic
reveal through authored closed disclosures, tab panels or hidden ancestors is
not a supported integration. Manual accessibility and author acceptance remain
open. Native Quarto listing/navigation findings and incomplete automated results
in the synthetic evaluation also remain for review; zero new extension findings
does not mean a whole page is free of accessibility issues.

## Compatibility and updates

| Target | Tested or declared boundary |
|---|---|
| Quarto/Pandoc/Lua | Windows, Quarto 1.11.5 pre-release, Pandoc 3.10 and Lua 5.4; `quarto-required: >=1.11.5` is an admission constraint, not evidence for every later version or an established stable-version floor |
| Plain HTML | Ordinary document/website pages, static records and optional local reader controls; default nested section paths |
| Native DOCX | Public headings, text and links; independently reopened as ZIP/XML, with actual Office/AT review pending |
| Browser | Edge/Chromium 155.0.4283.45 on Windows; no-JS, keyboard/focus, narrow/reduced-motion and print tasks checked |
| Selected documents | Actual Word download and structured browser print/PDF preview; OS Save dialog, Office, font coverage, reading order and PDF/UA remain separate |
| Paths/configuration | Spaces and Latin-1 project/input names on the tested Windows host, default nested paths, a custom project output directory and complete project/directory/document/profile namespaces; arbitrary Unicode paths and custom output-file relocation remain separate targets. Canonical record destinations/explicit anchors are restricted ASCII paths/identifiers |
| Other outputs/platforms | Slides, email, custom formats/output-file relocation, native PDF engines, EPUB readers and other OS/browser/Quarto versions need separate checks |
| Execution | Native render suites run serially; concurrent render/deployment coordination is not provided |

Version 0.x contracts remain experimental. Preserve authoritative source inputs
and stable IDs before updating. Review the changelog, compare rebuilt public
wording/statuses/destinations and rerun the whole-output audit, especially after
withdrawal. Incompatible authoring/schema changes require documented replacement
syntax or an explicit refusal/migration policy. No automatic data migration or
compatibility promise for an old saved audit inventory is provided.

Git text normalization uses LF through `.gitattributes`. This software's Apache
licence does not authorize publication of a consumer's data, evidence or services.

## Verification and AI transparency

Kai Prince directed the project and selected its aims. **OpenAI Codex materially
assisted** research interpretation, architecture, implementation, tests,
expected-result design, synthetic fixtures and documentation. Automated checks
written with the implementation are not independent human, semantic or
accessibility evaluation. Example review, consent and rights labels are fictional;
they do not attest actual human approval or permission. No AI inference runs
during ordinary rendering or reader use.

Authors remain responsible for reviewing content, rights, public-field decisions
and the institutional rules applicable to their use, including the University of
Manchester's Responsible AI guidance where relevant. AI assistance and local
execution do not establish University approval, legal consent, originality of
every contribution, truthful career claims or accessibility conformance.

Recorded development checks cover native installed lifecycle/HTML/DOCX,
public-data import, independent schema/XML checks, output/withdrawal auditing,
actual browser tasks and stateful bundled-axe detection. Their versions and
scope are bounded by the matrix above. Independent author, office-reader,
assistive-technology and real-data acceptance remain open.

Developer tests, fixtures, benchmarks, plans and raw receipts deliberately live
outside this lean source folder and are not available from this distribution.
This checkout alone cannot reproduce the full internal suite or performance
measurements. You can reproduce the documented GitHub installation and supplied
`example.qmd` workflow using the distributed files and Quarto. Full external
reproduction requires a separately shared, versioned developer workspace and its
recorded tools/evidence; no bundled test runner is advertised.

## Rights and reporting problems

Original code is Apache 2.0; see `LICENSE` and `NOTICE`. Quarto/Pandoc are external
prerequisites; optional Node.js and the browser are also external. No third-party
runtime library, model, SDK or Argumentation Sandbox source is bundled. The
original importer, auditor, reader and OOXML exporter retain the installed
licence/notices. CV content and evidence require their own rights
and consent decisions; Apache licensing does not make them open data or OER.

Use the repository's issue tracker once available for reproducible, non-sensitive
bugs, preferably with a small synthetic example and version information. Do not
post credentials, confidential career/evidence data or unmitigated vulnerability
details in public issues. No dedicated confidential reporting channel is
currently advertised; request a private reporting route without disclosing the
vulnerability itself. Git ignore rules are housekeeping, not a publication or
privacy boundary: inspect the actual candidate and final website outputs.
