-- Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
-- Explicit public records become ordinary Pandoc blocks; no inference.
-- Capture Quarto's documented filter path before callbacks change context.
-- Relative native paths avoid the host's Latin-1 relative-require conversion.
local runtime=pandoc.path.directory(PANDOC_SCRIPT_FILE)
if not pandoc.path.is_absolute(runtime) then runtime=pandoc.path.normalize(pandoc.path.join({pandoc.system.get_working_directory(),runtime})) end
local graph=dofile(pandoc.path.join({runtime,'graph.lua'}))
local r6=dofile(pandoc.path.join({runtime,'r6-native.lua'}))
local function fail(s) assert(false, 'interactive-cv: ' .. s) end
local function map(v, field)
  if v == nil then return {} end
  if type(v) ~= 'table' or pandoc.utils.type(v) == 'List' or v.t == 'MetaList' then fail(field .. ' must be a mapping') end
  return v
end
local function list(v, field)
  if v == nil then return {} end
  if type(v) ~= 'table' or (pandoc.utils.type(v) ~= 'List' and v.t ~= 'MetaList') then fail(field .. ' must be a sequence') end
  if #v > 2000 then fail(field .. ' exceeds 2000 entries') end
  return v
end
local function text(v, field, optional)
  if v == nil and optional then return nil end
  local k = pandoc.utils.type(v)
  if type(v) ~= 'string' and k ~= 'Inlines' and k ~= 'MetaInlines' and k ~= 'MetaString' then fail(field .. ' must be text (quote dates and numeric fields)') end
  local s = type(v) == 'string' and v or pandoc.utils.stringify(v)
  if #s > 8192 or s:match('^%s*$') or s:find('[%z\1-\31\127]') then fail(field .. ' must be bounded nonblank single-line text without controls') end
  return s
end
local function keys(v, allowed, field)
  for k in pairs(v) do if not allowed[k] then fail(field .. ' has unknown field; remove unsupported keys and use the documented field allowlist') end end
end
local function set(t) local r={} for _,s in ipairs(t) do r[s]=true end return r end
local function choice(v, values, field)
  local s=text(v,field); if not values[s] then fail(field .. ' has an unsupported value; choose a documented enum value') end; return s
end
local function boolean(v, default, field)
  if v == nil then return default end
  if type(v) ~= 'boolean' then fail(field .. ' must be a YAML Boolean') end
  return v
end
local function destination(v)
  local s=text(v,'public.url')
  -- Canonical static destinations only. No encoded traversal or local paths.
  local static=s:match('^[%w_./%-]+%.html$') or s:match('^[%w_./%-]+%.html#[%w_%-]+$')
  if s:find('[%%\\:%s?]') or s:find('//',1,true) or s:sub(1,1)=='/' or not static then fail('public.url must be a relative static .html destination with optional simple anchor and no empty path components') end
  for p in s:gmatch('[^/]+') do if p=='..' or p=='.' then fail('public.url contains traversal') end end
  return s
end
local types=set({'Person','Role','Project','Skill','Activity','Output','Outcome','Impact','PersonalReflection','Evidence','Time','Assertion','ServiceOffering','EvidenceSource','Relation'})
local public_fields=set({'title','summary','url','qualification','start','end','date','temporal','service','name','company','organization','grade','description','cv','hours','cpdHours','scope','contact','audience','availability','aliases','categories','assertions','relations','facts','anchor'})
local scalar_fields={'start','end','date','name','company','organization','grade','description','cv','hours','cpdHours','scope','contact','audience','availability'}
local qualifier_fields={'origin','review','verification','evidence-availability','reviewer','reviewed-at','verifier','verified-at','method','scope','source-verification','source-status','source-scope','rights','contribution','causal-attribution'}
local qualifiers=set(qualifier_fields)
local date
local function decision_date(v,field)
  local s=date(v,field)
  if s=='Present' or s=='Unknown' then fail(field..' requires stated ISO date precision') end
  return s
end
local function qualify(v)
  v=map(v,'qualification'); keys(v,qualifiers,'qualification')
  local q={}
  q.origin=choice(v.origin,set({'author-declared','extracted-candidate','inferred-proposal'}),'qualification.origin')
  q.review=choice(v.review,set({'unreviewed','author-reviewed','independently-reviewed'}),'qualification.review')
  q.verification=choice(v.verification,set({'unassessed','self-reported','externally-verified'}),'qualification.verification')
  q['evidence-availability']=choice(v['evidence-availability'],set({'public','restricted','unavailable','awaiting-permission'}),'qualification.evidence-availability')
  for _,k in ipairs(qualifier_fields) do if q[k]==nil and v[k]~=nil then q[k]=text(v[k],'qualification.'..k) end end
  for _,k in ipairs({'reviewed-at','verified-at'}) do if q[k] then q[k]=decision_date(q[k],'qualification.'..k) end end
  if q.verification=='externally-verified' then
    for _,k in ipairs({'verifier','verified-at','method','scope'}) do if not q[k] then fail('external verification requires '..k) end end
  end
  if q.review=='independently-reviewed' and not q.reviewer then fail('independent review requires reviewer') end
  return q
end
local function strings(v,field)
  local a={} for _,x in ipairs(list(v,field)) do a[#a+1]=text(x,field) end; return a
end
date=function(v,field)
  if v==nil then return nil end
  local s=text(v,field)
  if not (s:match('^%d%d%d%d$') or s:match('^%d%d%d%d%-%d%d$') or s:match('^%d%d%d%d%-%d%d%-%d%d$') or s=='Present' or s=='Unknown') then fail(field..' requires ISO year/month/day, Present or Unknown; retain qualifications in scope') end
  local y,m,d=s:match('^(%d%d%d%d)%-(%d%d)%-?(%d*)$')
  if m then
    y,m,d=tonumber(y),tonumber(m),tonumber(d)
    if m<1 or m>12 then fail(field..' has invalid month') end
    local days=({31,28,31,30,31,30,31,31,30,31,30,31})[m]
    if m==2 and (y%400==0 or (y%4==0 and y%100~=0)) then days=29 end
    if d and (d<1 or d>days) then fail(field..' has invalid day') end
  end
  return s
end
local function plain(s) return pandoc.Str(s) end
local function para(s) return pandoc.Para({plain(s)}) end
local function field(label,s) return pandoc.Para({pandoc.Strong({plain(label..': ')}),plain(s)}) end
local function anchor(id) return 'cv-'..pandoc.utils.sha1(id):sub(1,12) end
local function project_depth()
  -- The documented offset avoids comparing differently encoded input/root
  -- API strings on Windows. A separate no-op native probe records that case.
  local depth=0
  for part in ((quarto.project.offset or '.'):gsub('\\','/')):gmatch('[^/]+') do
    if part=='..' then depth=depth+1 elseif part~='.' then fail('unsupported project offset; render within its document/project directory') end
  end
  return depth
end
local function metadata_plain(value,depth)
  depth=(depth or 0)+1;if depth>32 then fail('selected feature data exceeds 32 levels') end
  local kind=pandoc.utils.type(value)
  if type(value)=='boolean' or type(value)=='number' or type(value)=='string' then return value end
  if kind=='List' or kind=='MetaList' then local out=pandoc.List();for _,v in ipairs(value) do out:insert(metadata_plain(v,depth)) end;return out end
  if kind=='Inlines' or kind=='MetaInlines' or kind=='MetaString' then return pandoc.utils.stringify(value) end
  if type(value)=='table' then local out={};for k,v in pairs(value) do if type(k)~='string' then fail('selected feature mapping requires text keys') end;out[k]=metadata_plain(v,depth) end;return out end
  fail('selected feature data requires literal QMD/YAML values')
end
local function safe_json(value)
  return pandoc.json.encode(value):gsub('<','\\u003c'):gsub('>','\\u003e'):gsub('&','\\u0026'):gsub(utf8.char(0x2028),'\\u2028'):gsub(utf8.char(0x2029),'\\u2029')
end
local function html_attribute(value)
  return text(value,'public HTML attribute'):gsub('&','&amp;'):gsub('"','&quot;'):gsub('<','&lt;'):gsub('>','&gt;')
end
local function native_features(doc,model,records,options)
  local input=quarto.doc.input_file
  if not pandoc.path.is_absolute(input) then input=pandoc.path.join({pandoc.system.get_working_directory(),input}) end
  input=pandoc.path.normalize(input)
  local root=graph.project_root()
  local request={version=1,model=model,authoring={temporal=pandoc.List(),services=pandoc.List()},consentingPersonIds=pandoc.List(),
    root=pandoc.path.normalize(root),inputDir=pandoc.path.directory(input),pageURL=graph.default_destination(),language=doc.meta.lang and text(doc.meta.lang,'lang') or 'en'}
  for _,record in ipairs(records) do
    if record.temporal then local definition={id=record.id};for k,v in pairs(record.temporal) do definition[k]=v end;request.authoring.temporal:insert(definition) end
    if record.service then local definition={id=record.id};for k,v in pairs(record.service) do definition[k]=v end;request.authoring.services:insert(definition) end
    if record.type=='Person' then request.consentingPersonIds:insert(record.id) end
  end
  if options.reports~=nil then request.reports=metadata_plain(options.reports) end
  request.r6=r6.request(options,metadata_plain,fail,FORMAT=='html');request.htmlOutput=FORMAT=='html'
  if FORMAT=='html' then request.outputRoot=graph.project_output_root() end
  if options['language-pages']~=nil then
    request.languagePages=metadata_plain(options['language-pages'])
    if type(request.languagePages)=='table' and request.languagePages.version=='1' then request.languagePages.version=1 end
    request.pageRevision=text(options['page-revision'],'page-revision')
  elseif options['page-revision']~=nil then request.pageRevision=text(options['page-revision'],'page-revision') end
  local website=doc.meta.website
  local site_url=quarto.metadata.get('website.site-url')
  if site_url~=nil then request.siteURL=text(site_url,'website.site-url')
  elseif type(website)=='table' and website['site-url']~=nil then request.siteURL=text(website['site-url'],'website.site-url') end
  local ok,response=pcall(pandoc.pipe,os.getenv('QUARTO_BIN') or 'quarto',{'run',pandoc.path.join({runtime,'compile.ts'})},pandoc.json.encode(request))
  if not ok then fail('cannot prepare the selected public CV features; check the installed reference and exact source/review declarations') end
  local compiled;ok,compiled=pcall(pandoc.json.decode,response)
  if not ok or type(compiled)~='table' or compiled.version~=1 or type(compiled.model)~='table' or compiled.model.version~=1 or type(compiled.model.records)~='table' or #compiled.model.records~=#records then fail('invalid installed CV feature response') end
  for i,m in ipairs(compiled.model.records) do
    if type(m)~='table' or m.id~=records[i].id or type(m.facts)~='table' then fail('installed CV feature response does not match the public source') end
    records[i].facts=pandoc.List()
    for _,f in ipairs(m.facts) do
      if type(f)~='table' then fail('invalid installed CV feature fact') end
      records[i].facts:insert({label=text(f.label,'feature fact.label'),value=text(f.value,'feature fact.value')})
    end
  end
  return compiled
end
local function literal_catalogue(value,graph_input)
  local name=text(value,'catalogue')
  if not name:match('^[A-Za-z0-9_./%-]+%.json$') or name:sub(1,1)=='/' then fail('catalogue requires a relative local .json file') end
  if name:find('//',1,true) then fail('catalogue contains an empty path component') end
  -- Quarto rebases inherited file metadata to the current input directory.
  -- Fold effective relative depth, refusing escape above root, then read from
  -- the explicit input directory using Pandoc's native working-directory API.
  -- Like the original Schema/MK authoring path, this is lexical confinement
  -- for trusted local sources, not a real-path/symlink sandbox.
  local depth=project_depth()
  for part in name:gmatch('[^/]+') do
    if part=='..' then depth=depth-1;if depth<0 then fail('catalogue must stay within its document/project directory') end
    elseif part~='.' then depth=depth+1 end
  end
  local raw=pandoc.system.with_working_directory(pandoc.path.directory(quarto.doc.input_file),function()
    local file=io.open(pandoc.path.normalize(name),'rb')
    if not file then fail('cannot read catalogue; keep the literal JSON source local and outside published resources') end
    local bytes=file:read(2097153);file:close();return bytes
  end)
  if not raw or #raw>2097152 then fail('catalogue exceeds the 2 MiB limit') end
  local depth,quoted,escaped=0,false,false
  for i=1,#raw do
    local c=raw:byte(i)
    if quoted then if escaped then escaped=false elseif c==92 then escaped=true elseif c==34 then quoted=false end
    elseif c==34 then quoted=true
    elseif c==123 or c==91 then depth=depth+1;if depth>32 then fail('catalogue exceeds 32 levels') end
    elseif c==125 or c==93 then depth=depth-1 end
  end
  local ok,data=pcall(pandoc.json.decode,raw);if not ok then fail('catalogue must be valid literal JSON') end
  -- Reject duplicate decoded object keys after syntax validation, including
  -- escape-equivalent keys. Never silently replace a permission or record list.
  local pos=1
  local function ws() local _,e=raw:find('^%s*',pos);pos=(e or pos-1)+1 end
  local function str()
    local start=pos;pos=pos+1
    while pos<=#raw do local c=raw:byte(pos);pos=pos+(c==92 and 2 or 1);if c==34 then return raw:sub(start,pos-1) end end
    fail('catalogue string scan failed')
  end
  local scan
  scan=function()
    ws();local c=raw:sub(pos,pos)
    if c=='{' then
      pos=pos+1;ws();local seen={};if raw:sub(pos,pos)=='}' then pos=pos+1;return end
      while true do
        local k=pandoc.json.decode(str());if seen[k] then fail('catalogue has duplicate object keys') end;seen[k]=true
        ws();pos=pos+1;scan();ws();local close=raw:sub(pos,pos);pos=pos+1;if close=='}' then break end;ws()
      end
    elseif c=='[' then
      pos=pos+1;ws();if raw:sub(pos,pos)==']' then pos=pos+1;return end
      while true do scan();ws();local close=raw:sub(pos,pos);pos=pos+1;if close==']' then break end end
    elseif c=='"' then str()
    else local _,e=raw:find('^[^%s,%]%}]+',pos);if not e then fail('catalogue value scan failed') end;pos=e+1 end
  end
  scan()
  if graph_input then return graph.import(data),pandoc.utils.sha1(raw) end
  data=map(data,'catalogue envelope');keys(data,set({'interactive-cv'}),'catalogue envelope')
  if data['interactive-cv']==nil then fail('catalogue requires an interactive-cv envelope') end
  local catalogue=map(data['interactive-cv'],'catalogue value');keys(catalogue,set({'as-of','records'}),'catalogue value')
  return catalogue,pandoc.utils.sha1(raw)
end
local function process(doc)
  local raw=doc.meta['interactive-cv']
  if raw==nil then
    doc:walk({Div=function(el)
      if el.classes:includes('cv-index') or el.classes:includes('cv-record') or el.classes:includes('cv-graph') then fail('CV placeholder requires interactive-cv metadata; load the authoritative catalogue') end
    end})
    return doc
  end
  local o=map(raw,'configuration')
  if not boolean(o.enabled,true,'enabled') then return doc end
  keys(o,set({'enabled','as-of','services','records','record-id','exports','catalogue','graph','graph-file','language-pages','page-revision','reports','delivery','temporal-rules','claim-validity','professional-narratives'}),'configuration')
  if o.catalogue~=nil and o['graph-file']~=nil then fail('choose catalogue or graph-file, not both') end
  local catalogue_digest
  if o.catalogue~=nil or o['graph-file']~=nil then
    if o.records~=nil or o['as-of']~=nil then fail('catalogue/graph-file conflicts with inline records/as-of; use one authoritative source') end
    local c,observed_digest=literal_catalogue(o.catalogue or o['graph-file'],o['graph-file']~=nil);local resolved={}
    catalogue_digest=observed_digest
    for k,v in pairs(o) do resolved[k]=v end
    resolved.records=c.records;resolved['as-of']=c['as-of'];o=resolved
    if c.graph and o.graph==nil then o.graph=c.graph end
  end
  local graph_options=graph.options(o.graph)
  if o.records==nil then fail('records requires an explicitly declared sequence (empty is permitted); keep the complete metadata-file namespace together or use catalogue instead of partial overrides') end
  local asof=date(o['as-of'],'as-of')
  if not asof or not asof:match('^%d%d%d%d%-%d%d%-%d%d$') then fail('as-of requires a complete ISO day') end
  local services=boolean(o.services,false,'services')
  local exports=boolean(o.exports,false,'exports')
  -- Public destinations are project-output-root relative. Native links and
  -- reader export bases account for ordinary nested source/output directories.
  local root_prefix=string.rep('../',project_depth())
  local function doc_link(url) return root_prefix..url end
  local records,byid={},{}
  local allids={}
  for input_index,input in ipairs(list(o.records,'records')) do
    input=map(input,'record'); keys(input,set({'id','type','publication','public','private'}),'record')
    local id=text(input.id,'record.id'); if not id:match('^[%a][%w+.-]*:%S+$') then fail('record.id requires a stable URI/URN with a nonempty suffix') end
    if allids[id] then fail('record occurrence ' .. input_index .. '.id is duplicated; assign a unique stable URI/URN') end; allids[id]=true
    local kind=choice(input.type,types,'record.type')
    local pub=map(input.publication,'publication')
    keys(pub,set({'audience','review','rights','consent','reviewer','reviewed-at'}),'publication')
    local audience=choice(pub.audience,set({'public','excluded','private'}),'publication.audience')
    -- Never inspect or copy private maps or excluded public fields into artifacts.
    if audience=='public' and (kind~='ServiceOffering' or services) then
      local r={id=id,type=kind,anchor=anchor(id)}
      r.publication={review=choice(pub.review,set({'author-reviewed','independently-reviewed'}),'publication.review'),rights=text(pub.rights,'publication.rights')}
      for _,k in ipairs({'reviewer','reviewed-at','consent'}) do r.publication[k]=text(pub[k],'publication.'..k,true) end
      if r.publication['reviewed-at'] then r.publication['reviewed-at']=decision_date(r.publication['reviewed-at'],'publication.reviewed-at') end
      if r.publication.review=='independently-reviewed' and not r.publication.reviewer then fail('independent publication review requires reviewer') end
      if kind=='Person' and not r.publication.consent then fail('Person publication requires explicit consent') end
      local p=map(input.public,'public'); keys(p,public_fields,'public')
      r.title=text(p.title,'public.title'); r.summary=text(p.summary,'public.summary'); r.url=destination(p.url); r.qualification=qualify(p.qualification)
      if p.anchor~=nil then
        r.anchor=text(p.anchor,'public.anchor')
        if #r.anchor>128 or not r.anchor:match('^[A-Za-z][A-Za-z0-9_%-]*$') then fail('public.anchor requires a unique ASCII identifier starting with a letter, maximum 128 bytes') end
      end
      r.facts=pandoc.List()
      for _,f in ipairs(list(p.facts,'facts')) do
        if #r.facts>=256 then fail('facts exceeds 256 entries') end
        f=map(f,'fact');keys(f,set({'label','value'}),'fact')
        local label=text(f.label,'fact.label');if #label>80 then fail('fact.label exceeds 80 bytes') end
        r.facts:insert({label=label,value=text(f.value,'fact.value')})
      end
      for _,k in ipairs(scalar_fields) do r[k]=text(p[k],'public.'..k,true) end
      r.start=date(p.start,'public.start'); r['end']=date(p['end'],'public.end'); r.date=date(p.date,'public.date')
      if p.temporal~=nil then
        r.temporal=metadata_plain(map(p.temporal,'public.temporal'))
        keys(r.temporal,set({'start','end','date'}),'public.temporal')
        if next(r.temporal)==nil then fail('public.temporal requires at least one endpoint or date') end
        for _,k in ipairs({'start','end','date'}) do
          if r[k] and r.temporal[k]~=nil and r.temporal[k]~=r[k] then fail('typed temporal endpoint conflicts with its legacy date; keep one authoritative value') end
        end
      end
      if p.service~=nil then
        if kind~='ServiceOffering' then fail('public.service requires a ServiceOffering record') end
        r.service=metadata_plain(map(p.service,'public.service'))
      end
      if r.start and r['end'] and #r.start==#r['end'] and r.start:match('^%d') and r['end']:match('^%d') and r.start>r['end'] then fail('end precedes start') end
      if r.hours and r.cpdHours and r.hours~=r.cpdHours then fail('hours and cpdHours conflict; choose one authoritative value') end
      r.aliases=strings(p.aliases,'aliases'); r.categories=strings(p.categories,'categories'); r.assertions=strings(p.assertions,'assertions'); r.relations={}
      if #table.concat(r.aliases,', ')>8192 or #table.concat(r.categories,', ')>8192 then fail('joined aliases/categories exceeds the 8192-byte projected text limit') end
      for _,rel in ipairs(list(p.relations,'relations')) do
        rel=map(rel,'relation'); keys(rel,set({'predicate','target'}),'relation')
        local predicate=text(rel.predicate,'relation.predicate'); if #predicate>80 then fail('relation predicate exceeds 80 bytes') end
        r.relations[#r.relations+1]={predicate=predicate,target=text(rel.target,'relation.target')}
      end
      records[#records+1]=r; byid[id]=r
    end
  end
  for record_index,r in ipairs(records) do
    local evidence=false
    for relation_index,rel in ipairs(r.relations) do
      local target=byid[rel.target]; if not target then fail('public record occurrence ' .. record_index .. '.relations[' .. relation_index .. '] references an unavailable/non-public record; select an admitted public target') end
      if rel.predicate=='broader' and (r.type~='Skill' or target.type~='Skill') then fail('broader requires Skill endpoints') end
      if rel.predicate=='supportedByEvidence' or rel.predicate=='contradictedByEvidence' or rel.predicate=='qualifiedByEvidence' then
        if target.type~='Evidence' then fail('evidence relation requires Evidence target') end; evidence=true
      end
    end
    for _,id in ipairs(r.assertions) do if not byid[id] or byid[id].type~='Assertion' then fail('assertions requires public Assertion targets') end end
    if (r.type=='Outcome' or r.type=='Impact') and #r.assertions==0 then fail(r.type..' requires explicit assertions; graph proximity cannot demonstrate impact') end
    if r.type=='Assertion' and not evidence then fail('Assertion requires explicit supporting, contradicting or qualifying Evidence') end
    if r.type=='ServiceOffering' then
      for _,k in ipairs({'scope','contact','audience','availability'}) do if not r[k] then fail('ServiceOffering requires '..k) end end
    end
  end
  local incoming={}
  for _,r in ipairs(records) do
    for _,rel in ipairs(r.relations) do
      incoming[rel.target]=incoming[rel.target] or {}
      table.insert(incoming[rel.target],{predicate=rel.predicate,source=r.id})
    end
    for _,id in ipairs(r.assertions) do
      incoming[id]=incoming[id] or {}
      table.insert(incoming[id],{predicate='hasAssertion',source=r.id})
    end
  end
  local ancestry,heights,visiting={},{},{}
  local function ancestors(id,depth)
    depth=depth or 0
    if depth>64 then fail('Skill broader hierarchy exceeds 64 levels') end
    if visiting[id] then fail('Skill broader hierarchy contains a cycle') end
    if ancestry[id] then
      if depth+heights[id]>64 then fail('Skill broader hierarchy exceeds 64 levels') end
      return ancestry[id]
    end
    visiting[id]=true; local result,height={[id]=true},0
    for _,rel in ipairs(byid[id].relations) do if rel.predicate=='broader' then
      local parents=ancestors(rel.target,depth+1)
      height=math.max(height,1+heights[rel.target])
      for parent in pairs(parents) do result[parent]=true end
    end end
    if height>64 then fail('Skill broader hierarchy exceeds 64 levels') end
    visiting[id]=nil; ancestry[id]=result; heights[id]=height; return result
  end
  for _,r in ipairs(records) do if r.type=='Skill' then ancestors(r.id) end end
  local function link(id) local t=byid[id]; return pandoc.Link({plain(t.title)},doc_link(t.url)) end
  local function entry(r,compact)
    local b={pandoc.Header(2,{plain(r.title)},pandoc.Attr('',{'cv-record-title'})),field('Type',r.type),para(r.summary)}
    local q=r.qualification
    for _,k in ipairs(qualifier_fields) do if q[k] then b[#b+1]=field(k,q[k]) end end
    b[#b+1]=field('Publication review',r.publication.review)
    -- Permission provenance may be sensitive. Only the reviewed status enum and
    -- a fixed consent marker are public; exact decisions stay author-side.
    if r.type=='Person' then b[#b+1]=para('Consent declaration recorded by the author; not independently verified.') end
    if not compact then
    for _,k in ipairs(scalar_fields) do if r[k] then b[#b+1]=field(k,r[k]) end end
    for _,f in ipairs(r.facts) do b[#b+1]=field(f.label,f.value) end
    if #r.aliases>0 then b[#b+1]=field('Aliases',table.concat(r.aliases,', ')) end
    if #r.categories>0 then b[#b+1]=field('Categories',table.concat(r.categories,', ')) end
    local relations={}
    for _,rel in ipairs(r.relations) do relations[#relations+1]={pandoc.Plain({plain(rel.predicate..': '),link(rel.target)})} end
    for _,id in ipairs(r.assertions) do relations[#relations+1]={pandoc.Plain({plain('Assertion: '),link(id)})} end
    if #relations>0 then b[#b+1]=pandoc.BulletList(relations) end
    local backlinks={}
    for _,rel in ipairs(incoming[r.id] or {}) do
      backlinks[#backlinks+1]={pandoc.Plain({plain('Referenced by '..rel.predicate..' from '),link(rel.source)})}
    end
    if #backlinks>0 then b[#b+1]=pandoc.BulletList(backlinks) end
    end
    b[#b+1]=pandoc.Para({pandoc.Link({plain('Static destination')},doc_link(r.url))})
    local skills={}
    if r.type=='Skill' then for id in pairs(ancestry[r.id]) do skills[id]=true end end
    for _,rel in ipairs(r.relations) do if byid[rel.target].type=='Skill' then for id in pairs(ancestry[rel.target]) do skills[id]=true end end end
    local ids,search={},{r.title,r.summary,table.concat(r.aliases,' '),table.concat(r.categories,' ')}
    for _,k in ipairs(scalar_fields) do if r[k] then search[#search+1]=r[k] end end
    for _,k in ipairs(qualifier_fields) do if q[k] then search[#search+1]=q[k] end end
    for _,f in ipairs(r.facts) do search[#search+1]=f.label;search[#search+1]=f.value end
    for id in pairs(skills) do ids[#ids+1]=id end
    table.sort(ids)
    for _,id in ipairs(ids) do search[#search+1]=byid[id].title; search[#search+1]=table.concat(byid[id].aliases,' ') end
    return pandoc.Div(b,pandoc.Attr(r.anchor,{'cv-entry'},{['data-cv-id']=r.id,['data-cv-type']=r.type,['data-cv-search']=compact and '' or table.concat(search,' '),['data-cv-skills']=table.concat(ids,' '),['data-cv-groups']=table.concat(r.categories,' ')}))
  end
  -- One projected model is shared by optional reader exports and explicit
  -- author-side final-output auditing. Never serialize raw author metadata.
  local public_model={version=1,asOf=asof,records=pandoc.List()}
  for _,r in ipairs(records) do
    local m={id=r.id,type=r.type,title=r.title,summary=r.summary,url=r.url,qualification=r.qualification,
      publicationReview=r.publication.review,scalarFacts=pandoc.List(),facts=r.facts,relations=pandoc.List()}
    for _,k in ipairs(scalar_fields) do if r[k] then m.scalarFacts:insert({label=k,value=r[k]}) end end
    if #r.aliases>0 then m.scalarFacts:insert({label='Aliases',value=table.concat(r.aliases,', ')}) end
    if #r.categories>0 then m.scalarFacts:insert({label='Categories',value=table.concat(r.categories,', ')}) end
    if r.type=='Person' then m.scalarFacts:insert({label='Consent',value='Consent declaration recorded by the author; not independently verified.'}) end
    for _,rel in ipairs(r.relations) do
      local t=byid[rel.target];m.relations:insert({predicate=rel.predicate,target=t.id,title=t.title,url=t.url})
    end
    for _,id in ipairs(r.assertions) do local t=byid[id];m.relations:insert({predicate='hasAssertion',target=t.id,title=t.title,url=t.url}) end
    if #m.relations>2000 then fail('relations plus assertions exceeds the 2000-link projected limit') end
    public_model.records:insert(m)
  end
  local feature_needed,index_requested=false,false
  doc:walk({Div=function(el)
    if el.classes:includes('cv-index') then index_requested=true end
    if el.classes:includes('cv-index') or el.classes:includes('cv-record') or el.classes:includes('cv-graph') then feature_needed=true end
  end})
  local feature_options=o
  if not index_requested then
    -- Inherited index publication/report settings do not bind a detail URL or
    -- invoke an unused companion. Mandatory temporal/service facts still run.
    feature_options={};for key,value in pairs(o) do if key~='reports' and key~='language-pages' and key~='delivery' and key~='temporal-rules' and key~='professional-narratives' then feature_options[key]=value end end
  end
  local compiled=feature_needed and native_features(doc,public_model,records,feature_options) or {version=1,model=public_model}
  public_model=compiled.model
  local encoded=pandoc.json.encode(public_model)
  if #encoded>2097152 then fail('projected public catalogue exceeds the 2 MiB page-model limit; split the author-reviewed scope') end
  local safe_encoded=safe_json(public_model)
  if #safe_encoded>2097152 then fail('escaped public catalogue exceeds the 2 MiB delivered model limit; split the author-reviewed scope') end
  local bound=text(o['record-id'],'record-id',true)
  if bound then
    if not byid[bound] then fail('record-id refers to unavailable/non-public record') end
    if doc.meta.title and pandoc.utils.stringify(doc.meta.title)~=byid[bound].title then fail('page title conflicts with authoritative record title') end
  end
  local used,index_used,seen,rendered_records=false,false,{},{}
  local graph_placeholders,index_placeholders=0,0
  doc:walk({Div=function(el)
    if el.classes:includes('cv-index') then index_placeholders=index_placeholders+1 end
    if el.classes:includes('cv-graph') then
      graph_placeholders=graph_placeholders+1
      if #el.content>0 then fail('cv-graph must be empty; write its heading or explanation outside the placeholder') end
    end
  end})
  if graph_placeholders>1 then fail('use exactly one cv-graph placeholder') end
  if graph_options and graph_options.navigation and graph_options.placement=='placeholder' and (index_placeholders>0 or graph_placeholders>0) then
    if graph_placeholders~=1 or index_placeholders~=1 then fail('graph.placement placeholder requires exactly one empty cv-graph and one cv-index on this page') end
  elseif graph_placeholders>0 then fail('cv-graph requires graph.navigation true and graph.placement placeholder') end
  local function authored_id(el)
    if el.identifier and el.identifier~='' then seen[el.identifier]=true end
  end
  doc:walk({Header=authored_id,Div=authored_id,Span=authored_id,CodeBlock=authored_id,Table=authored_id,Figure=authored_id,Image=authored_id})
  doc=doc:walk({Div=function(el)
    if el.classes:includes('cv-index') then
      index_used=true
      if #el.content>0 then fail('cv-index must be empty; write surrounding context outside the placeholder') end
      local b={para('Public CV snapshot as of '..asof..'. Complete declared public catalogue; services '..(services and 'enabled' or 'off')..'. Missing end dates do not mean current appointments.')}
      local rows={}
      for _,r in ipairs(records) do rows[#rows+1]={pandoc.Plain({link(r.id),plain(' — '..r.type)})} end
      if #rows>0 then b[#b+1]=pandoc.BulletList(rows) else b[#b+1]=para('No public records selected in this declared catalogue.') end
      for _,r in ipairs(records) do
        if seen[r.anchor] then fail('duplicate rendered record anchor; use one index or distinct detail records per page') end
        seen[r.anchor]=true; rendered_records[r.id]=true; b[#b+1]=entry(r,FORMAT=='html' and compiled.r6 and type(compiled.r6.delivery)=='table')
      end
      if FORMAT=='html' and quarto.doc.is_format('html:js') then
        if compiled.r6 then local data=safe_json(compiled.r6);if #data>4194304 then fail('prepared CV additions exceed 4 MiB') end;b[#b+1]=pandoc.RawBlock('html','<script type="application/json" class="cv-r6-data">'..data..'</script>') end
        if compiled.r6 and type(compiled.r6.delivery)=='table' then el.attributes['data-cv-lazy']='true' else
        b[#b+1]=pandoc.RawBlock('html','<script type="application/json" class="interactive-cv-model">'..safe_encoded..'</script>')
        end
        if type(compiled.featureData)~='table' then fail('installed CV feature data is unavailable') end
        local feature_data=safe_json(compiled.featureData);if #feature_data>4194304 then fail('CV feature data exceeds 4 MiB; split the author-reviewed scope') end
        b[#b+1]=pandoc.RawBlock('html','<script type="application/json" class="cv-feature-data">'..feature_data..'</script>')
        local identity=compiled.languageIdentity
        if type(identity)=='table' and type(identity.modelSha256)=='string' and type(identity.semanticSha256)=='string' then
          for _,digest in ipairs({identity.modelSha256,identity.semanticSha256}) do if #digest~=64 or digest:find('[^a-f0-9]') then fail('invalid installed CV source fingerprint') end end
          b[#b+1]=pandoc.RawBlock('html','<details class="cv-source-review"><summary>Source/review fingerprints for authors</summary>')
          b[#b+1]=para('These fingerprints bind the complete declared public model and its conservative shared facts. They do not establish consent, truth or translation fidelity.')
          b[#b+1]=pandoc.Para({plain('Public model: '),pandoc.Code('sha256:'..identity.modelSha256)})
          b[#b+1]=pandoc.Para({plain('Shared facts: '),pandoc.Code('sha256:'..identity.semanticSha256)})
          b[#b+1]=pandoc.RawBlock('html','</details>')
        end
        el.attributes['data-cv-exports']=exports and 'true' or 'false'
        el.attributes['data-cv-root']=root_prefix=='' and './' or root_prefix
      end
      used=true; el.content=b; return el
    elseif el.classes:includes('cv-graph') then
      el.content={para('Graph navigation is available in the HTML page when Knowledge Graph Extraction is active. The public record list and its relationships remain available in this document.')}
      return el
    elseif el.classes:includes('cv-record') then
      local id=el.attributes['record-id'] or bound
      if not id or not byid[id] then fail('cv-record requires a public record-id') end
      if #el.content>0 then fail('cv-record must be empty; write page narrative outside the placeholder') end
      local r=byid[id]
      if el.attributes.title and el.attributes.title~=r.title then fail('detail title conflicts with authoritative record title') end
      if seen[r.anchor] then fail('duplicate rendered record anchor') end
      seen[r.anchor]=true; rendered_records[r.id]=true; el.content={entry(r)}; return el
    end
  end})
  if used and type(compiled.languageLinks)=='table' and type(compiled.languageLinks.links)=='table' then
    local links=pandoc.List()
    for _,alternative in ipairs(compiled.languageLinks.links) do
      if type(alternative)~='table' then fail('invalid installed CV language link') end
      links:insert(pandoc.Plain({pandoc.Link({plain(text(alternative.language,'language link.language'))},text(alternative.href,'language link.href'))}))
    end
    doc.blocks:insert(pandoc.Div({pandoc.Header(2,{plain('Reviewed language pages')}),pandoc.BulletList(links),para('Language and source-review declarations retain exact stated facts. Matching identifiers or facts do not establish translation fidelity.')},pandoc.Attr('',{'cv-language-pages'})))
    if FORMAT=='html' then
      local head=pandoc.List()
      for _,alternative in ipairs(compiled.languageLinks.links) do
        head:insert(pandoc.MetaBlocks({pandoc.RawBlock('html','<link rel="alternate" hreflang="'..html_attribute(alternative.language)..'" href="'..html_attribute(alternative.href)..'">')}))
      end
      if compiled.languageLinks.canonical~=nil then head:insert(pandoc.MetaBlocks({pandoc.RawBlock('html','<link rel="canonical" href="'..html_attribute(compiled.languageLinks.canonical)..'">')})) end
      local previous=doc.meta['header-includes']
      if previous~=nil then
        local kind=pandoc.utils.type(previous)
        if kind=='List' or kind=='MetaList' then for _,entry in ipairs(previous) do head:insert(entry) end else head:insert(previous) end
      end
      doc.meta['header-includes']=pandoc.MetaList(head)
    end
  end
  if index_used and FORMAT=='html' and type(compiled.jsonld)=='table' then
    local jsonld=safe_json(compiled.jsonld)
    if #jsonld>2097152 then fail('selected service structured data exceeds 2 MiB') end
    doc.blocks:insert(pandoc.RawBlock('html','<script type="application/ld+json" class="cv-service-jsonld">'..jsonld..'</script>'))
  end
  if index_used and services and type(compiled.servicePublication)=='table' and type(compiled.servicePublication.evaluatedOn)=='string' then
    doc.blocks:insert(para('Service availability was evaluated for publication on '..text(compiled.servicePublication.evaluatedOn,'service publication day')..'; the public CV snapshot remains as of '..asof..'. Unknown or expired validity does not establish a current offer.'))
  end
  if index_used then local extra=r6.static(compiled.r6,pandoc,link,fail);if extra then doc.blocks:insert(extra) end end
  if index_used and type(compiled.activityOutputOrdering)=='table' and type(compiled.activityOutputOrdering.results)=='table' and #compiled.activityOutputOrdering.results>0 then
    local audit=compiled.activityOutputOrdering
    local blocks={pandoc.Header(2,{plain('Declared activity/output date ordering')}),para(text(audit.qualification,'ordering qualification')),field('Coverage',text(audit.status,'ordering status'))}
    for _,row in ipairs(audit.results) do
      if not byid[row.outputId] or not byid[row.activityId] then fail('invalid installed activity/output receipt') end
      blocks[#blocks+1]=pandoc.Para({link(row.outputId),plain(' — producedBy — '),link(row.activityId),plain(': '..text(row.value,'ordering value')..' ('..text(row.basis,'ordering basis')..')')})
      for _,reason in ipairs(row.reasons or {}) do blocks[#blocks+1]=field('Reason',text(reason,'ordering reason')) end
    end
    if FORMAT=='html' then table.insert(blocks,1,pandoc.RawBlock('html','<details class="cv-activity-output-ordering"><summary>Inspect declared activity/output date ordering</summary>'));blocks[#blocks+1]=pandoc.RawBlock('html','</details>') end
    doc.blocks:insert(pandoc.Div(blocks,pandoc.Attr('',{'cv-activity-output-ordering-section'})))
  end
  if index_used and type(compiled.reportBundle)=='table' and type(compiled.reportBundle.reports)=='table' then
    local bundle=compiled.reportBundle
    local blocks={pandoc.Header(2,{plain('Public CV period reports')}),para(text(bundle.qualification,'report qualification'))}
    local function report_record(wrapper)
      local r=wrapper.record;if type(r)~='table' or not byid[r.id] then fail('invalid installed report source record') end
      local rows={pandoc.Header(4,{pandoc.Link({plain(text(r.title,'report title'))},doc_link(r.url))}),para(text(r.summary,'report summary')),field('Type',r.type),pandoc.Para({plain('Source ID: '),pandoc.Code(r.id)}),field('Publication review',r.publicationReview)}
      for _,name in ipairs(qualifier_fields) do if r.qualification[name] then rows[#rows+1]=field(name,r.qualification[name]) end end
      for _,name in ipairs({'start','end','date'}) do if type(r[name])=='string' then rows[#rows+1]=field(name,r[name]) end end
      for _,fact in ipairs(r.scalarFacts or {}) do rows[#rows+1]=field(fact.label,fact.value) end
      for _,fact in ipairs(r.facts or {}) do rows[#rows+1]=field(fact.label,fact.value) end
      for _,relation in ipairs(r.relations or {}) do rows[#rows+1]=pandoc.Para({plain(relation.predicate..': '),pandoc.Link({plain(relation.title)},doc_link(relation.url))}) end
      rows[#rows+1]=pandoc.Para({plain('Published record SHA-256: '),pandoc.Code(text(wrapper.recordSha256,'report record hash'))})
      return pandoc.Div(rows,pandoc.Attr('',{'cv-period-source-record'}))
    end
    for _,report in ipairs(bundle.reports) do
      local rows={pandoc.Header(3,{plain(text(report.title,'report title'))}),para(text(report.notice,'report notice')),field('Report review',report.status),pandoc.Para({plain('Complete CV/report source digest: '),pandoc.Code(text(report.sourceDigest,'report digest'))}),pandoc.Para({plain('Provider grouping source digest: '),pandoc.Code(text(report.providerSourceDigest,'provider report digest'))})}
      if type(report.review)=='table' then rows[#rows+1]=field('Declared reviewer',text(report.review.reviewer,'report reviewer'));rows[#rows+1]=field('Declared review date',text(report.review.date,'report review date')) end
      rows[#rows+1]=pandoc.Header(4,{plain('Events with exact declared dates in this period')})
      if #report.nativeRows==0 then rows[#rows+1]=para('No eligible exact event dates were declared in this period.') end
      for _,wrapper in ipairs(report.nativeRows) do rows[#rows+1]=report_record(wrapper) end
      if #report.contextRecords>0 then
        rows[#rows+1]=pandoc.Header(4,{plain('Supporting context — not events assigned to this period')})
        rows[#rows+1]=para('These records retain their own declared dates or lack of dates. They preserve project/role context, assertions and supporting, contrary or qualifying evidence; no event date has been invented.')
        for _,wrapper in ipairs(report.contextRecords) do rows[#rows+1]=report_record(wrapper) end
      end
      blocks[#blocks+1]=pandoc.Div(rows,pandoc.Attr(text(report.id,'report id'),{'cv-period-report'},{['data-cv-period']=report.period,['data-cv-period-start']=report.start}))
    end
    if #bundle.omissions>0 then
      blocks[#blocks+1]=pandoc.Header(3,{plain('Records omitted from dated event grouping')})
      local omissions={};for _,omission in ipairs(bundle.omissions) do
        if not byid[omission.id] then fail('invalid installed report omission') end
        omissions[#omissions+1]={pandoc.Plain({link(omission.id),plain(': '..text(omission.code,'report omission code'))})}
      end
      blocks[#blocks+1]=pandoc.BulletList(omissions)
    end
    doc.blocks:insert(pandoc.Div(blocks,pandoc.Attr('',{'cv-period-reports'})))
  end
  -- Native DOCX/EPUB/other writers keep the same Pandoc text and links.
  -- html:js also contains revealjs/email; only plain HTML is enhanced here.
  if used and FORMAT=='html' and quarto.doc.is_format('html:js') then
    quarto.doc.add_html_dependency({name='interactive-cv',version='0.0.11',scripts=exports and {'export.js','features-browser.js','reader.js','r6-reader.js'} or {'features-browser.js','reader.js','r6-reader.js'},stylesheets={'reader.css'}})
  end
  if FORMAT=='html' and next(rendered_records)~=nil then
    -- Detail-only pages contribute their observed records without index assets.
    -- Only records actually rendered by CV placeholders become observations.
    -- The publication model above has already excluded permissions/private maps.
    local producer_model={records=pandoc.List(),asOf=asof,language=doc.meta.lang and text(doc.meta.lang,'lang') or 'en'}
    for i,m in ipairs(public_model.records) do
      if rendered_records[m.id] then
        local copy={};for k,v in pairs(m) do copy[k]=v end
        copy.anchor=records[i].anchor;copy.aliases=records[i].aliases
        for _,k in ipairs({'start','end','date'}) do
          local exact=records[i][k] or (records[i].temporal and records[i].temporal[k])
          if type(exact)=='string' then copy[k]=exact end
        end
        producer_model.records:insert(copy)
      end
    end
    local deps={};if o.catalogue or o['graph-file'] then deps[1]=text(o.catalogue or o['graph-file'],'catalogue') end
    if graph.publish(producer_model,graph_options,deps,doc.meta,catalogue_digest) and graph_options.navigation and index_used then
      local navigator=pandoc.RawBlock('html','<div data-kg-graph="'..graph_options.id..'" data-kg-producer-placeholder="1"></div>')
      if graph_options.placement=='placeholder' then
        doc=doc:walk({Div=function(el) if el.classes:includes('cv-graph') then return navigator end end})
      else doc.blocks:insert(navigator) end
    end
  end
  -- Public data is rendered deliberately; exclude author metadata from writer
  -- templates. This is not a boundary for other filters or referenced resources.
  doc.meta['interactive-cv']=nil
  return doc
end
return {{Pandoc=process}}
