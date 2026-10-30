# Interactive CV

An experimental Quarto filter for an evidence-linked CV, using ordinary pages
and one authoritative YAML or literal JSON catalogue. It works without models or a graph
database. **0.0.10 is experimental development source**, adding explicit ready-model professional
proposal controls alongside source-bound date,
evidence and service queries, optional professional views and reviewed native
language-page mappings to the deterministic CV core and selected exports.
Source publication is separate from a supported release, real-data use or deployment.
The current follow-up keeps period-report headings fully opaque under native
Quarto themes. Individual theme choices still need contrast and human review.

## Install and try the example

Use Quarto **1.11.5 pre-release** for the tested workflow. Install from your
project folder:

```powershell
quarto add kai-prince-sfhea/interactive-cv --no-prompt
```

Follow [example.qmd](example.qmd) as the hands-on tutorial, keeping
[example-cv.yml](example-cv.yml) beside it. The tutorial covers a first render,
what to expect, filtering, a small QMD/YAML edit and Word output. Installation
copies the runtime only; download/copy these two author files separately. This
README is the advanced configuration and integration reference. The GitHub
command follows the experimental `main` branch, not a supported tagged release.
For a local checkout or extracted source, use
`quarto add "C:/path/to/interactive-cv" --no-prompt` with its local source folder,
then follow the same tutorial and YAML workflow.

### Use your existing project

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
For the standalone example's Word output, run `quarto render example.qmd --to docx`.

### List, update, disable and remove

Run lifecycle commands from the consuming project:

```powershell
quarto list extensions
quarto update extension kai-prince-sfhea/interactive-cv --no-prompt
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

Generated controls and status messages currently use English. Author-written
record labels and prose keep their supplied text; document `lang` does not
translate the CV interface. The companion graph has its own English interface.

## Standalone and cross-extension behaviour

| Activated extensions | Behaviour |
|---|---|
| Interactive CV alone | Native CV pages, evidence/relationship lists, filters and optional selected exports. No graph database, AI or author JavaScript is needed. |
| CV + Knowledge Graph Extraction | An index automatically contributes a **separate `cv` graph**, an embedded force-layout navigator with an equivalent textual route, and public records to website search. The website graph stays separate. KG 0.0.12 additionally negotiates exact date-property transfer. |
| Local AI Websites 0.0.12 | Its configured public-graph search can retrieve eligible CV records. An explicit professional draft may borrow a consented, already-ready language-model widget on the same page; no CV control loads a model. Installing a model on the author's computer does not load one in a visitor's browser. Bounded functional observations and failed model-run health are recorded below. |
| Generative Websites 0.0.6 | Its original professional-selection provider enables declared project/context views. Optional CV `reports` use its separately installed period-report provider without duplicating records. Both preserve public wording, qualifications and mandatory context/evidence. This uses no AI. Learning journeys/Sandbox remain separate interfaces. |

The companion navigator provides type labels, neighbour highlighting, fit/pan/zoom
and force controls. Dragging temporarily holds a node; releasing it resumes an
active layout. Pause and reduced-motion choices take precedence. The searchable
list and static report remain available independently of the diagram. These
controls belong to Knowledge Graph Extraction and need no extra CV configuration.
Its optional project `knowledge-graph.view` mapping sets the initial colour
scheme, paused/automatic motion, diagram height and forces for this navigator
as well as other graphs. Keep CV record/graph options under `interactive-cv`;
do not duplicate graph-view policy inside the CV catalogue.

The composed workflow requires both filters to be activated; installation alone
does not activate them. Start with Render Project for whole-site graph exploration. Follow KG's README
for the tested Windows prerelease's direct-HTML preview-cache defect and its
supported static-preview workaround; `--render all` alone does not avoid it. KG owns
preparation/finalisation and validates the public CV observations against actual
rendered anchors; CV owns record validation and publication projection. No second
CV relationship catalogue or manual conversion script is needed. The current
development-source installation includes these connections.

```yaml
filters:
  - kai-prince-sfhea/interactive-cv
  - kai-prince-sfhea/knowledge-graph-extraction
interactive-cv:
  catalogue: cv.json
  graph:
    id: cv
    label: Professional experience
```

For local `quarto add` installations use the unqualified selectors instead;
retain your existing project type, theme, hooks and navigation. Keep the full
CV namespace together under normal metadata precedence. Independent CV
catalogues on one site need different `graph.id` values; matching records from
multiple index pages may share a graph. Conflicting records are refused rather
than silently merged. Detail pages contribute only their actually rendered
records; they do not invent occurrences for the rest of the catalogue. A site may contain only `.cv-record` detail pages: with active KG preparation, their observed nodes form the default `cv` graph. Detail-only pages do not receive an index navigator or index JavaScript. Relationships are contributed only when both endpoints are actually rendered together on a page.

For several native-language pages displaying the **same catalogue wording** in
one graph, set `graph.language: en` (or that catalogue's supported BCP47 tag).
This fixes the language of graph labels/aliases; it does not translate the page
or records. The default remains the document's `lang`. The supported subset is
2–8 ASCII letters, then optional 1–8 letter/digit subtags. Actually translated
titles/summaries with the same IDs are conflicting graph records: use separate
explicit graph IDs or publish one canonical catalogue to that graph. Merely
changing `graph.language` does not reconcile different wording.

Graph provenance retains every deliberately public qualification as canonical
JSON text, including verification scope and causal attribution. Permission
decisions remain private. The companion allows a bounded qualification field;
if its 2 KiB projection is exceeded, rendering refuses rather than truncating
the source. Reduce the selected public scope or use `graph: false` for that CV.

`graph: false` disables CV graph production. `graph.navigation: false` disables
the embedded navigator while `graph.search: false` explicitly excludes that
graph from aggregated search. Navigation-off alone does not remove public search
records. Removing/disabling KG leaves the normal CV index usable; removing CV
does not turn its retained source files into public graph input. A rebuild is
needed after withdrawal; already downloaded material cannot be recalled.
The navigator defaults to appending after the index document's content.
`knowledge-graph.view` styles the inner diagram; the outer frame's height uses
`--cv-graph-height`. To choose its position, set `graph.placement: placeholder`
and put exactly one empty `.cv-graph` Div on the same page as one `.cv-index`:

```markdown
## Explore the CV graph

::: {.cv-graph}
:::
```

Keep `navigation: true` in that graph mapping. Missing/duplicate slots, content
inside the slot, or a slot under `placement: append` are refused. Detail pages
without an index do not require a slot. Without active KG, the slot explains the
static record alternative; Word keeps a readable fallback. Disabling navigation
does not change graph search or record publication.
Search controls are discovery settings: ordinary Quarto website search can
still index public page text when graph search is disabled. Do not use them to
hide private data. A CV index observes both ends of its public relationships;
detail-only pages contribute their observed nodes, but do not reconstruct
relationships whose endpoints are never observed together on a page.
After a partial render, previously observed pages whose catalogue/dependencies
changed may be replaced with a clear unavailable page and removed from search
until rebuilt. This prevents stale public CV material remaining available after
a known withdrawal. Author QMD/catalogues are preserved; a normal full render
reconstructs eligible pages. Changes only to catalogue files may require an
explicit normal Render Project rather than automatic preview watching.
After updating a companion extension, run a normal full Render Project before
relying on retained pages or graph caches. Partial-render freshness checks bind
author inputs; they do not establish that every installed producer runtime byte
has remained unchanged.
Preview can render pages on demand, reducing aggregate graph coverage with
companion filters. The tested Windows Quarto prerelease can do this even after
`--render all`. KG's README documents a supported YAML static-preview workaround
using Python's standard server. Render Project refreshes that view after edits;
the default CV graph remains separate from aggregate coverage status.

### One JSON file for an imported CV graph

Select `interactive-cv.graph-file: cv-graph.json` instead of `catalogue` or inline
records. The installed filter validates and adapts the file during ordinary
rendering. The input is not copied to the website. See the installed
[graph schema](_extensions/interactive-cv/graph-v1.schema.json) and the
[fictional example](example-graph.json).

The format is version 1 with `graph: {id, label}`, quoted `as-of`, `nodes` using
the normal CV record/publication fields, and optional `edges` containing
`{from, predicate, to}`. Existing nested public relations also work. Each node
can link an Outcome/Impact to an Assertion with a `hasAssertion` edge; the
adapter fills the native assertion field without requiring a duplicate list.
Each node
retains explicit publication review, rights and evidence qualification; Person
still requires a consent declaration. Missing `public.url` values receive
anchors in the containing index page, including its explicit Quarto
`output-file` name and nested source directory. Native intermediate HTML files
beside a QMD and files already moved under the output directory resolve to the
same project-local public destination; paths outside the project or containing
traversal are refused. Supported destinations retain the existing ASCII `.html`
URL contract. For a non-HTML writer, omitted URLs use the corresponding `.html`
filename convention; this does not establish that an HTML counterpart exists.
Set explicit public URLs when format-specific filenames differ.
Optional `public.temporal` and `public.service` use the same finite authoring
contracts as inline YAML. The native one-file adapter retains them; no extra
converter is needed. The older generic interchange importer instead preserves
unsupported source temporal/language structures as exact labelled source facts;
it does not guess native endpoints or translation approval from them.
Do not expose private input as a project
resource. Unknown versions, duplicate IDs, private endpoints and incompatible
edges are refused; an imported approval label is not independent verification.

For authors presenting varied professional experience, it provides readable
public records linked to skills, projects and evidence. Readers can browse the
ordinary pages or use optional filters and selected exports. It does not infer
competence, independently verify a career claim or publish consultancy services
without explicit author choices.

## Options and effective metadata

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
| `graph-file` | Local version-1 `.json` path, absent by default | Single-file graph alternative to `catalogue` and inline records; see the supplied fictional example |
| `graph` | Mapping or `false`; `{id: cv, label: Interactive CV, navigation: true, search: true, placement: append}` | Separate graph defaults; `placement: placeholder` selects one empty `.cv-graph` on an index page |
| `graph.language` | Supported BCP47 text, document `lang` by default | Explicit catalogue label language for several pages sharing unchanged records |
| `services` | Boolean, `false` | Include separately approved ServiceOffering records |
| `exports` | Boolean, `false` | Add selected Word/print-PDF controls to an HTML index |
| `record-id` | Stable URI/URN text, absent by default | Bind a detail page to one record; check its title |
| `page-revision` | Bounded text, absent by default | Current authored page revision; required with `language-pages` |
| `language-pages` | Version-1 reviewed page registry, absent by default | Explicit language/source mappings and native alternate links; see below |
| `reports` | Up to 12 `{period, start, review?}` mappings, absent/off by default | Native daily/ISO-week reports from the existing public CV; requires one separately installed compatible Generative Websites provider |

Unknown active options are refused without echoing their supplied names. Import
prevalidation reports structural field/array positions instead of arbitrary
nested keys or sidecar record IDs; these positions are not source line numbers. `catalogue` cannot be combined with inline
`as-of`/`records`; `services` and `exports` stay in document/project options,
outside the data-only JSON file. Quarto supplies Lua/Pandoc and automatically runs
the installed finite Deno helper for actual CV placeholders. No author helper
script, generated dependency lock, model or extra preview command is required. Node.js
20+ is an additional prerequisite only for the explicit importer/auditor commands;
Python, browser-test tooling and developer packages are not consumer prerequisites.

Use ordinary `quarto render` and `quarto preview`; there is no additional author
build command. After changing a literal JSON catalogue, explicitly render again.
Catalogue-only filesystem watching is not established by the preview check.

Quarto `--quiet` can suppress diagnostic text while retaining a nonzero failure status. Re-run with `--log-level error` to see the extension's safe contract message; ordinary render logs remain author material.

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
`contact`, `audience`, `availability`, `temporal`, `service`, `aliases`, `categories`, `assertions` and
`relations`, `facts` and `anchor`. `facts` is a list of `{label, value}` pairs with
literal text values (maximum 256). `anchor` optionally gives a unique ASCII
identifier starting with a letter, at most 128 characters, to avoid calculating
the default hash anchor. Dates retain ISO year/month/day precision; `Unknown` and an explicitly
authored `Present` are supported. A missing end date stays missing. Quote dates
and numerical listing fields. Contradictory `hours`/`cpdHours` and reversed dates
at equal precision fail. Uncertain interpretation belongs in an exact `scope`
statement. The optional finite date queries below preserve unknown and stated
precision; they are not a general temporal-logic or career-verification engine.

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

For example, in a record rendered on `cv.qmd`, use `anchor: teaching` and
`url: cv.html#teaching` together inside its existing `public` mapping. This
gives you a readable link without calculating a hash. Keep that anchor unique
on the page and update the URL when changing the rendered filename.

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

## Customise the presentation

Write the surrounding introduction, headings and contact links in ordinary
QMD around the empty `.cv-index` or `.cv-record` block. Use your usual Quarto
theme, page layout, navigation and `format.html.css` for the CV page. Record
titles, summaries, categories, aliases, labelled facts and relationships stay
in the authoritative catalogue so the static page, filters and selected exports
use the same reviewed wording.

Optional CSS variables adjust the CV controls and the outer graph frame. In a
normal stylesheet selected through `format: {html: {css: styles.css}}`, for
example:

```css
:root {
  --cv-graph-height: 42rem;
  --cv-control-padding: 1rem;
  --cv-control-gap: 0.75rem;
  --cv-control-radius: 0.5rem;
}
```

All variables are optional and preserve current defaults when omitted. The
embedded graph has its own document and cannot inherit parent-page CSS; use
the companion's `knowledge-graph.view` YAML for its initial presentation. Its
textual source list and direct full-page link remain available if a compact
embed is less convenient. Preserve visible focus, readable contrast and usable
control sizes when customising your stylesheet.

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
slides/email/EPUB. The companion graph and optional professional provider have
their own declared interfaces; unavailable companions leave the literal index
usable. No AI inference, free-prose translation or automatic competency
assessment is part of these controls.

### Compound selection, dates and evidence

Open **Project, evidence and date filters** to combine the basic literal/type/
skill selection with declared evidence, a date/window or a consultancy status.
Choose **Apply compound filters**. Project context becomes available when
Generative Websites supplies its compatible provider; the other finite queries
work standalone. Cancel or clear optional selection to return to literal filters.

Results distinguish **true**, **false** and **unknown** within the complete
declared public model. Unknown dates or non-public evidence remain separate;
including them requires an explicit reader choice. A current appointment,
verified skill or absent evidence is never inferred from missing fields.
Supporting, contrary and qualifying evidence retain their different meanings.
Selected records also retain required context, assertions and associated evidence;
those extra records are identified separately from primary matches. The full
original public model remains the export source, with selected IDs, rather than
an incomplete copied subgraph with broken references.

**Download selection receipt** records source/selection hashes, requests, scope
and reasons. It is an inspection record, not a new approved CV or proof. Static
public records and their qualifications stay readable if an asynchronous query
is cancelled, fails validation or encounters a changed model/provider.

### Authored date uncertainty

Legacy `start`, `end` and `date` strings continue to work: quote ISO years,
months or days, `Unknown`, or an explicitly authored `Present`. Add a
`temporal` map inside the same record's existing `public` map for a bounded
uncertain endpoint, for example:

```yaml
temporal:
  start: {earliest: "2024-01", latest: "2024-06"}
  end: "Unknown"
```

Each endpoint may be an existing date string or exactly `{earliest, latest}`.
Use one authority per endpoint; contradictory typed/legacy values refuse the
render. Calendar validity, impossible chronology and source bindings are checked.
Readable fixed facts are added to the same native/exported public model; a
separate hash-bound catalogue supplies query bounds. No JSON data block is
presented as the CV narrative.

Queries use closed inclusive calendar intervals and the authored snapshot day.
Year/month precision becomes a range for the calculation, without changing its
original precision or claiming an exact day. Missing/`Unknown` endpoints remain
unknown. An authored `Present` end is bounded only through the snapshot's
`as-of`; it does not establish later employment. An as-of query asks about the
stated interval, not whether someone was actually working, qualified or employed.
Open-boundary/general temporal logic remains outside this finite contract.

The date controls also support **Ends strictly before window**, **Starts strictly
after window** and **Entirely within window**. Before/after are strict;
within/overlap boundaries are inclusive. Every consistent declared interval must
satisfy a predicate for `true`, none for `false`; otherwise it is `unknown`.
An explicit `Output --producedBy--> Activity` can also be inspected in the
collapsed **Declared activity/output date ordering** section and reader receipt.
It compares the output's explicit event date (or explicit start) with the
activity's explicit start. Missing/imprecise dates may remain unknown. No end
date, completion, causal relationship or achievement is inferred; this derived
receipt is separate from authoritative CV facts.

With KG 0.0.12, exact original string `start`, `end`, `date` and dataset `as-of`
can transfer when the prepared producer contract advertises those fields.
Uncertain ranges are not flattened into invented graph dates. Older compatible
KG versions keep ordinary graph navigation; CV's sidecar still supports the
uncertainty queries. KG's existing day-only time query treats partial dates,
`Present` and `Unknown` as undetermined rather than borrowing CV's interval rules.

### Daily/weekly reports from the public CV

Install Generative Websites normally alongside this extension. CV reports need
its installed report module; activating the GW filter is needed only when using
GW's own authoring features. Keep a single installation under `_extensions`,
either unqualified or owner-qualified. No copying of its code, author JavaScript,
duplicate activity catalogue or model is needed.

Add this to the same complete `interactive-cv` mapping as your catalogue and
render a page containing the ordinary empty `.cv-index`:

```yaml
interactive-cv:
  catalogue: cv.json
  reports:
    - period: day
      start: "2026-10-25"
    - period: iso-week
      start: "2026-10-19"
```

Native HTML and Word gain **Public CV period reports**. Only an explicitly
declared exact event `date` selects Activity, Output, Outcome, Impact, Evidence
or PersonalReflection records; `temporal.date` and legacy `date` agree on one
authority. A role/activity interval's start never becomes an event date. Partial,
uncertain, unknown or missing dates and unsupported source bounds have visible
omission codes. No wording is shortened to meet the provider's bounds. A literal
HTML destination with an explicit anchor is required for a dated source; automatic
destinations from a `graph-file` supply those native anchors.

**Supporting context — not events assigned to this period** retains complete
source-bound public records for projects/roles, assertions and supporting,
contrary or qualifying evidence. Explicit public `reflectsOn` chains from that
initial context are included without inventing reflection dates. Qualifications,
facts, IDs and original links remain unchanged. The source hash binds the exact
published CV record, not an original QMD span or native prose hash. The complete
public model, period, supporting selection, omissions and exact installed
provider bytes bind a separate report fingerprint; a module hash does not attest
safe execution or authorship.

Reports are drafts. Inspect the complete output, then optionally add to that
report `review: {reviewer: "Your name", date: "2026-10-25", sourceDigest: "…"}`
using its displayed **Complete CV/report source digest** (64 lowercase hex
digits), not the provider grouping digest. A changed public source, supporting
record, period or provider makes that declaration stale. This is an
unauthenticated authored review declaration, not independent verification or
proof of impact. Empty `reports: []` does not discover/load a companion. Missing,
ambiguous, linked or incompatible provider installations refuse requested
reports rather than silently changing their meaning. The report bundle is
bounded to 1.5 MiB; reduce the selected scope/number of reports if necessary.

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

### Typed consultancy status and optional discovery

Keep those four existing literal fields. Add this `service` map inside an
approved ServiceOffering's `public` map to make its status/date queryable:

```yaml
service:
  status: proposed
  provider: "urn:my-cv:person"
  validFrom: "2026-11-01"
  validThrough: "2027-03-31"
  jsonld: false
```

The provider must name a selected public Person with an explicit consent
declaration. Status is exactly `proposed`, `offered`, `paused` or `withdrawn`.
Validity fields are optional, independently, and require exact ISO days when
supplied. An incomplete window stays unknown unless a known bound already rules
the requested day out; missing dates never advertise a current offer. Fixed
authored status/provider/validity facts stay in native pages and Word exports.

`jsonld` defaults to `false`. To request search-engine structured data, separately
enable services, review the complete offering and set its `jsonld: true`.
A real `website.site-url`, a consenting public provider, `status: offered` and
a complete validity window containing the actual UTC publication day are all
required. The HTML index can then include a bounded schema.org `Service`,
`Offer` and provider-specific `OfferCatalog` projection. No prices, stock levels,
bookable capacity, past results or external verification are invented. Source
qualification and publication review remain declared, including in discovery.

The actual publication evaluation day is separate from the author's snapshot
`as-of`; a readable notice distinguishes them. Structured data is static and
must be rebuilt after expiry, withdrawal or changed consent. It does not prove
live booking availability, indexing or rich-result eligibility. Proposed,
paused, withdrawn, expired and incompletely dated records retain their native
wording but do not become current offers. The reader's stated-day query is also
a query of declarations, not a live service lookup.

### Reviewed native language pages

Ordinary `lang: en`, `lang: fr` or another valid BCP47 tag works without an
extra registry. Write translations in separate normal QMD/catalogue sources;
keep stable record IDs, exact qualifications, typed dates, source/evidence facts
and relation roles. Generated control labels currently remain English. No AI
translation or inferred consent is involved.

To add reviewed native alternate links, first render both language drafts
privately without `language-pages`. On each HTML index, open **Source/review
fingerprints for authors**. Copy the actual **Public model** and **Shared facts**
fingerprints after reviewing the exact native content. The shared fingerprint
conservatively retains all stated facts/qualifications and role associations;
only display titles/summaries and page/relationship display destinations differ.
It is an equality check over declared data, not a semantic proof about prose.

Add the same registry to both pages' complete effective CV options. The
following is a template: replace every `PASTE_...` token with the actual
64-character lowercase hash from those drafts before rendering it:

```yaml
interactive-cv:
  catalogue: cv-en.json
  page-revision: en-v1
  language-pages:
    version: 1
    primary: cv-en
    pages:
      - id: cv-en
        url: cv/en.html
        language: en
        revision: en-v1
        modelDigest: "sha256:PASTE_EN_PUBLIC_MODEL_HASH"
        semanticDigest: "sha256:PASTE_SHARED_FACTS_HASH"
        review: author-reviewed
        reviewedBy: Your reviewer
      - id: cv-fr
        url: cv/fr.html
        language: fr
        revision: fr-v1
        modelDigest: "sha256:PASTE_FR_PUBLIC_MODEL_HASH"
        semanticDigest: "sha256:PASTE_SHARED_FACTS_HASH"
        review: author-reviewed
        reviewedBy: Your reviewer
        basedOn:
          id: cv-en
          revision: en-v1
          modelDigest: "sha256:PASTE_EN_PUBLIC_MODEL_HASH"
```

Use each actual output path. The French page selects its own catalogue,
`page-revision: fr-v1` and `lang: fr`; its registry is otherwise identical.
The selected set is bounded to 2–16 distinct pages/languages. Every translated
realisation names the primary source's exact revision/model hash. The current
native public projection must match its URL, language, revision and hash, and
the declared shared-facts fingerprints must agree. Changing a record's role,
date, qualification or evidence cannot silently inherit an earlier binding.

Native pages gain visible alternate links and reciprocal/self `hreflang` links.
With a genuine site URL each has its own canonical URL; one language is not
canonicalised to another. Without it, ordinary relative alternates still work.
Only the current projection is observed in that render: other page bindings are
reviewed declarations until separately rendered/inspected. Render all selected
pages, check destinations and review prose fidelity before publication; no
crawler acceptance is implied. For revisions, render a private draft without
the registry to inspect new fingerprints, then review and update the bindings.
Preserve the original source and translation credit. The language projection is
an original finite CV contract; installing Generative Websites is not required.

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

Version 0.0.4 changes diagnostic messages without changing catalogue, import or
export data contracts; no migration is required from 0.0.3.
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

The earlier local **0.0.9** runtime passes its complete source-bound `npm test`
regression (`roadmap-cv-full-20261027-3bBDuX`) and a separate Preview check
(`roadmap-cv-preview-20261027-hDGnKI`). Both retain unchanged source inventories
for the twenty-eight-file runtime. Ten affected pure/package/schema command
entrypoints also pass (`d5-pure-mmUrG0`), including actual-widget/original-runtime
checks with a synthetic worker and a delivered Preview origin different from
the canonical website origin. These are protocol and lifecycle checks, not
actual model inference or evidence of writing quality.

The local **0.0.10** detail-only producer follow-up passes fifteen focused native
commands/eight checks (`candidate-Qh5knc`), separately from that earlier full
regression. Two ordinary detail pages contribute exactly their two observed
nodes to the default `cv` graph, without inventing an edge between endpoints
that were never rendered together. Actual anchors and native site search are
checked, alongside graph opt-out, disabled/absent KG and native Word/Pandoc
readback controls. Index navigation and index enhancement remain index-only.
No model, actual browser interaction, Office or human acceptance is implied.

On **29 October 2026**, the current CV path with Local AI Websites **0.0.12**
passed five actual file/source/validator workflow checks, including their
observed health check (`workflow-de9737bf`). These covered the unchanged complete
source/request, valid file import, invalid replacement/refusal and recovery,
and replacement during the original validator-module fetch without stale output.

A separate real ready-model run passed four functional checks
(`workflow-5dc59a38`): complete-source/request preservation, discovery of an
unready provider, explicit consented loading through LA controls, and a fresh
two-claim unreviewed proposal with exact quotations and original raw/source
binding. The accepted response used LA12's declared whole lowercase `json`
fence with an unchanged payload. Its strict health check **failed** on an
unexplained model-loading request abort; this is not a clean overall run.
These observations do not establish entailment, meaning, suitable professional
writing, human approval or general model quality. The failed LA11 bare-JSON-only
observation remains historical evidence, not a current LA12 refusal of a valid
declared envelope.

The earlier targeted combined CV snapshot is retained as historical quarantine
evidence; fresh complete-project composition is checked separately and is not
a reader UI pass. Its earlier unverified ready-generation/dynamic-import status
is superseded by the bounded observations above. No final complete-site or
general reader acceptance is inferred from them. These receipt identifiers refer
to private development evidence described below, not files bundled in this
repository.

Earlier recorded development checks cover native installed lifecycle/HTML/DOCX,
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

Use [GitHub Issues](https://github.com/kai-prince-sfhea/interactive-cv/issues) for reproducible, non-sensitive
bugs, preferably with a small synthetic example and version information. Do not
post credentials, confidential career/evidence data or unmitigated vulnerability
details in public issues. No dedicated confidential reporting channel is
currently advertised; request a private reporting route without disclosing the
vulnerability itself. Git ignore rules are housekeeping, not a publication or
privacy boundary: inspect the actual candidate and final website outputs.

## Optional progressive CV tools (0.0.8)

These progressive tools are included in the development source. Native/browser observations retain their separately recorded scopes; source availability is not acceptance.

### First exercise: lazy details using one existing catalogue

In a normal Quarto website, use a full `interactive-cv` mapping in a metadata file. Select optional lazy delivery with:

```yaml
interactive-cv:
  graph-file: fictional-public-career.json
  exports: true
  delivery:
    mode: lazy
    bundle-bytes: 262144
```

The QMD page remains an empty ordinary placeholder:

```markdown
::: {.cv-index}
:::
```

Render Project as usual. The HTML page retains every public title, summary, qualifier and static destination, plus a complete compact discovery index. Basic literal/type/skill discovery includes linked and inherited Skill titles/aliases before detail transfer. A reader chooses **Load declared details** for an individual record or **Load complete public catalogue for advanced filters and exports**. Missing/bad bundles are unknown; they do not make discovery records disappear. Partial details are never accepted as a public v1 model. Full reassembly and the original complete-model hash must pass before existing compound/export APIs run.

Native DOCX retains the full original source records. The existing selected Word download and structured browser print/PDF continue after full loading. This stage adds no direct PDF generator or PDF/UA guarantee. Without JavaScript, compact source summaries and ordinary native record destinations remain available; use an existing `.cv-record` page for complete native detail. A lazy print made before full loading is a compact index, not a complete CV export.

Lazy mode publishes SHA256-addressed public bundles into a page-specific `cv-public-data` directory under the actual native project output. A private exact-file receipt owns retirement of the preceding same-page generation. It never scans/deletes arbitrary output trees. Changing permissions or disabling delivery on that HTML page retires only its recorded files. Bounded native tests verify retained resources, selected-page retirement and excluded-data refusal; final complete-site checks separately verify the generated graph and ordinary destinations. This is not an atomic deployment mechanism or a statement about unrelated stale HTML. Lazy mode currently requires an ordinary project output directory inside the project; the default full workflow remains available elsewhere.

## Advanced declared temporal relationships

```yaml
interactive-cv:
  graph-file: fictional-public-career.json
  temporal-rules:
    - id: activity-before-output
      operation: before
      left: urn:r6:activity
      right: urn:r6:output
  claim-validity:
    - id: urn:r6:claim
      from: '2026-01'
      through: '2026-12'
```

Keep all namespace settings together; native Quarto document mappings replace project mappings. Do not duplicate records to configure a page. Rules are explicit record pairs: strict before/after, inclusive overlap/during, at most 128. True means all consistent declared dates satisfy the relation; false means none; uncertainty/missing dates remain unknown. Event date is one point variable. This adds no arbitrary temporal logic or inferred causality.

Claim-validity is separate Assertion-only authoring. It adds readable **Declared claim validity from/through** facts, preserving month/year/uncertain precision. It never borrows an event date, review date or publication clock. Static native results and HTML day controls bind the same final public model. Calendar inclusion does not verify a claim, current appointment or skill.

## Professional source tools

Install the compatible original Generative Websites companion, then add:

```yaml
interactive-cv:
  graph-file: fictional-public-career.json
  professional-narratives:
    - id: declared-contribution
      label: Extract declared project wording
      purpose: application-answer
      selection:
        projectIds: [urn:r6:project]
        detail: summary
        includeEvidence: false
      question: Describe the declared contribution and its qualifications.
```

The native helper calls the actually installed original professional selector. Summary is a display hint, not permission to drop qualifiers. Context, mandatory assertions, contrary/qualifying evidence and source records remain unchanged. The browser offers **Prepare unchanged public wording** and a plain-text download. Preparing this unchanged extract invokes no model and adds no achievement, skill or causal claim. The explicit optional draft action below remains unreviewed. Missing companions produce a readable explanation while the normal CV stays available. Lazy pages defer full extract text until an explicit complete-model load.

An optional `proposal: true` can prepare the existing original Local AI Websites exact-quote request when that companion and `website.site-url` exist. Every selected record and qualifier must fit the existing protocol (at most four complete sources, 4,000 characters each/12,000 total); otherwise preparation is unavailable and the extract remains. No clipping, dropped contrary evidence or automatic model load occurs. The source request can be downloaded, and a reader may explicitly choose a bounded candidate JSON file to validate against the same current source using the actual delivered LA quote validator. Exact alignment is not entailment, source support, suitable writing or human approval. No invented LA endpoint/global function, corpus brand or second reviewer authority is used. The original LA support-review controls require a genuinely observed corpus selection; this CV record packet does not pretend to be one.


### Draft with an already-ready page model

With Local AI Websites **0.0.10** and Generative Websites installed and activated,
the same `proposal: true` declaration also offers an explicit draft action.
It uses the complete declared professional extract, rather than transient basic
CV filters. No extra graph, record store or author JavaScript is required.

Follow Local AI Websites' [optional model setup](https://github.com/kai-prince-sfhea/local-ai-websites#prepare-optional-local-model-assets),
including its generation profile, prepared same-origin asset pack and normal
reader consent. The model on the author's computer is not a visitor runtime.
Keep existing project settings and add the companion filters/configuration to
that same project, for example:

```yaml
filters:
  - kai-prince-sfhea/interactive-cv
  - kai-prince-sfhea/generative-websites
  - kai-prince-sfhea/local-ai-websites
website:
  site-url: https://example.org/
local-ai:
  manifest: /local-ai-assets/models.json
  publish-assets: true
```

Retain the existing authoritative catalogue and set `proposal: true` on the
chosen entry under `interactive-cv.professional-narratives`. Place a normal
Local AI panel on the **same CV page**:

```markdown
::: {.local-ai}
Optional local language-model controls for this page.
:::
```

Render Project, then use the HTTP(S) preview. In **Source-bound professional
writing tools**, choose the declared extract and **Prepare unchanged public
wording**. Choose **Check this page's language-model controls** and explicitly
select a provider. **Review language model setup** focuses the existing page
widget's review button; it does not click it or start anything. Review the file
sizes/licences, consent and load the language model in that widget. Check the
page controls again and choose **Draft an unreviewed proposal with the ready
model**. A source-search-only panel, absent manifest or unready/busy model
cannot draft. The deterministic extract and candidate-file workflow remain.

The CV action borrows only the existing, consented, already-ready runtime. It
never acquires models, creates another runtime, changes its settings or shares
private prompt history. The original request, raw response, model provenance and
original CV/LA quote validation remain inspectable and downloadable. The whole
unchanged source extract, including mandatory context, qualifications and
contrary evidence, stays beside every model or imported candidate. A quote need
not support a generated claim: inspect those sources before relying on it.

Cache-busting queries and fragments on an already delivered main-module script
are supported within the bounded same-origin URL policy. The CV imports that
exact URL to reuse its private widget registry; byte verification uses the same
query with the fragment removed from the network request. The pure quote
validator remains a separately verified sibling module. A matching byte hash is
not a claim of execution attestation against an author-controlled host or worker.

Preview may run on a different origin or subpath from `website.site-url`.
Browser actions build a **new original** LA packet against the captured delivered
CV root; they never patch the canonical request in place. The complete model,
selected plan and source wording stay unchanged. Both roots remain visible and
the AI receipt retains their delivery provenance. Use project-relative record
URLs for portability. Absolute sources on another origin, paths escaping the
delivered root and encoded path separators refuse; no source URL is silently
rewritten. Changing the page/root/base URL while work runs invalidates it.

The four-complete-source / 4,000-characters-each / 12,000-total protocol limits
still apply. Empty, larger or overlong selections retain the extract; no source,
condition or contrary evidence is clipped to make generation possible. Lazy
pages verify their complete public model only after the explicit action.
Changing the selected declaration/provider/source, cancelling, removing or
adopting controls into another document, or leaving the page invalidates work.
Drafting has a three-minute bound; the other optional source/selection actions
retain their thirty-second bound. Cancel remains available throughout.
No proposal silently updates the canonical CV, graph, a publication decision or
an achievement. This experimental connection is distinct from actual model
quality, source support, suitable writing, human accessibility and approval.


### Progressive source boundaries

Use one complete `interactive-cv` namespace in the ordinary metadata file.
Quarto document namespace mappings replace project mappings; merge nothing by
guessing at raw YAML. Keep the existing single JSON `graph-file` authoritative.

`delivery: false` opts out on an HTML index and withdraws its recorded managed
details. Absence follows the original full workflow. Lazy delivery is a normal
website/output feature, not standalone `file://`, a persistent cache, a shared
site build or an offline service worker. A missing bundle leaves its records
discoverable with unknown details. Changing permission should be followed by
Render Project and the existing final-output audit. The new exact-file
retirement receipt does not claim to quarantine unrelated old HTML or guarantee
an interrupted failed render/deployment is free of previously public bytes.

Declared pair rules accept only before/after/overlap/during and exact public
record IDs. There are at most 128 rules and 128 separately authored Assertion
validity declarations. Year/month precision and uncertainty ranges use the
existing endpoint grammar. Missing endpoints and snapshot-relative `Present`
remain unknown where dates do not decide a relation. Native static rows and
reader controls expose true/false/unknown with reasons and exact model hashes;
they do not rewrite public facts or infer causality/current employment.

Professional tools call the installed GW public selector rather than implement
another project/evidence algorithm. Its unchanged mandatory context includes
Person, relevant Role/Project/Skill and assertions with support, contrary and
qualifying evidence. The native descriptor binds observed module bytes. It does
not authenticate a caller-supplied function, author, consent or security. The
reader recreates the exact configured extract against the current complete
public model; same-ID text changes invalidate old plan/candidate identities.

The deterministic part of the optional LA path prepares data and validates
exact-quote output using the actual installed/delivered original provider.
The separate [ready-model action](#draft-with-an-already-ready-page-model)
can explicitly borrow an existing, consented, already-ready page widget; it
never loads a model or assumes that a reader has consented. Explicit validator
loading transfers and hashes bounded same-origin
module bytes before importing that immutable native URL. This is an observed
transfer/execution boundary, not an execution-security attestation. No separate
support-review authority is fabricated: existing LA review controls require a
real branded corpus observation, which a CV v1 record plan does not claim.


Follow the ordinary local-candidate project exercise in [examples/lazy/index.qmd](examples/lazy/index.qmd). Its three QMD pages and literal JSON/YAML are author-maintained sources; installing the runtime does not copy or render them automatically.
