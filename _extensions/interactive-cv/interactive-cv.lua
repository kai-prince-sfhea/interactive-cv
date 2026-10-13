-- Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
-- Explicit public records become ordinary Pandoc blocks; no inference or IO.
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
  for k in pairs(v) do if not allowed[k] then fail(field .. ' has unknown field ' .. tostring(k)) end end
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
local public_fields=set({'title','summary','url','qualification','start','end','date','name','company','organization','grade','description','cv','hours','cpdHours','scope','contact','audience','availability','aliases','categories','assertions','relations','facts','anchor'})
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
local function literal_catalogue(value)
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
  data=map(data,'catalogue envelope');keys(data,set({'interactive-cv'}),'catalogue envelope')
  if data['interactive-cv']==nil then fail('catalogue requires an interactive-cv envelope') end
  local catalogue=map(data['interactive-cv'],'catalogue value');keys(catalogue,set({'as-of','records'}),'catalogue value')
  return catalogue
end
local function process(doc)
  local raw=doc.meta['interactive-cv']
  if raw==nil then
    doc:walk({Div=function(el)
      if el.classes:includes('cv-index') or el.classes:includes('cv-record') then fail('CV placeholder requires interactive-cv metadata; load the authoritative catalogue') end
    end})
    return doc
  end
  local o=map(raw,'configuration')
  if not boolean(o.enabled,true,'enabled') then return doc end
  keys(o,set({'enabled','as-of','services','records','record-id','exports','catalogue'}),'configuration')
  if o.catalogue~=nil then
    if o.records~=nil or o['as-of']~=nil then fail('catalogue conflicts with inline records/as-of; use one authoritative source') end
    local c=literal_catalogue(o.catalogue);local resolved={}
    for k,v in pairs(o) do resolved[k]=v end
    resolved.records=c.records;resolved['as-of']=c['as-of'];o=resolved
  end
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
  for _,input in ipairs(list(o.records,'records')) do
    input=map(input,'record'); keys(input,set({'id','type','publication','public','private'}),'record')
    local id=text(input.id,'record.id'); if not id:match('^[%a][%w+.-]*:%S+$') then fail('record.id requires a stable URI/URN with a nonempty suffix') end
    if allids[id] then fail('duplicate record.id '..id) end; allids[id]=true
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
  for _,r in ipairs(records) do
    local evidence=false
    for _,rel in ipairs(r.relations) do
      local target=byid[rel.target]; if not target then fail('relation references unavailable/non-public record from '..r.id) end
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
  local function entry(r)
    local b={pandoc.Header(2,{plain(r.title)},pandoc.Attr('',{'cv-record-title'})),field('Type',r.type),para(r.summary)}
    local q=r.qualification
    for _,k in ipairs(qualifier_fields) do if q[k] then b[#b+1]=field(k,q[k]) end end
    b[#b+1]=field('Publication review',r.publication.review)
    -- Permission provenance may be sensitive. Only the reviewed status enum and
    -- a fixed consent marker are public; exact decisions stay author-side.
    if r.type=='Person' then b[#b+1]=para('Consent declaration recorded by the author; not independently verified.') end
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
    return pandoc.Div(b,pandoc.Attr(r.anchor,{'cv-entry'},{['data-cv-id']=r.id,['data-cv-type']=r.type,['data-cv-search']=table.concat(search,' '),['data-cv-skills']=table.concat(ids,' '),['data-cv-groups']=table.concat(r.categories,' ')}))
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
  local encoded=pandoc.json.encode(public_model)
  if #encoded>2097152 then fail('projected public catalogue exceeds the 2 MiB page-model limit; split the author-reviewed scope') end
  local safe_encoded=encoded:gsub('<','\\u003c'):gsub('>','\\u003e'):gsub('&','\\u0026'):gsub(utf8.char(0x2028),'\\u2028'):gsub(utf8.char(0x2029),'\\u2029')
  if #safe_encoded>2097152 then fail('escaped public catalogue exceeds the 2 MiB delivered model limit; split the author-reviewed scope') end
  local bound=text(o['record-id'],'record-id',true)
  if bound then
    if not byid[bound] then fail('record-id refers to unavailable/non-public record') end
    if doc.meta.title and pandoc.utils.stringify(doc.meta.title)~=byid[bound].title then fail('page title conflicts with authoritative record title') end
  end
  local used,seen=false,{}
  local function authored_id(el)
    if el.identifier and el.identifier~='' then seen[el.identifier]=true end
  end
  doc:walk({Header=authored_id,Div=authored_id,Span=authored_id,CodeBlock=authored_id,Table=authored_id,Figure=authored_id,Image=authored_id})
  doc=doc:walk({Div=function(el)
    if el.classes:includes('cv-index') then
      if #el.content>0 then fail('cv-index must be empty; write surrounding context outside the placeholder') end
      local b={para('Public CV snapshot as of '..asof..'. Complete declared public catalogue; services '..(services and 'enabled' or 'off')..'. Missing end dates do not mean current appointments.')}
      local rows={}
      for _,r in ipairs(records) do rows[#rows+1]={pandoc.Plain({link(r.id),plain(' — '..r.type)})} end
      if #rows>0 then b[#b+1]=pandoc.BulletList(rows) else b[#b+1]=para('No public records selected in this declared catalogue.') end
      for _,r in ipairs(records) do
        if seen[r.anchor] then fail('duplicate rendered record anchor; use one index or distinct detail records per page') end
        seen[r.anchor]=true; b[#b+1]=entry(r)
      end
      if FORMAT=='html' and quarto.doc.is_format('html:js') then
        b[#b+1]=pandoc.RawBlock('html','<script type="application/json" class="interactive-cv-model">'..safe_encoded..'</script>')
        el.attributes['data-cv-exports']=exports and 'true' or 'false'
        el.attributes['data-cv-root']=root_prefix=='' and './' or root_prefix
      end
      used=true; el.content=b; return el
    elseif el.classes:includes('cv-record') then
      local id=el.attributes['record-id'] or bound
      if not id or not byid[id] then fail('cv-record requires a public record-id') end
      if #el.content>0 then fail('cv-record must be empty; write page narrative outside the placeholder') end
      local r=byid[id]
      if el.attributes.title and el.attributes.title~=r.title then fail('detail title conflicts with authoritative record title') end
      if seen[r.anchor] then fail('duplicate rendered record anchor') end
      seen[r.anchor]=true; el.content={entry(r)}; return el
    end
  end})
  -- Native DOCX/EPUB/other writers keep the same Pandoc text and links.
  -- html:js also contains revealjs/email; only plain HTML is enhanced here.
  if used and FORMAT=='html' and quarto.doc.is_format('html:js') then
    quarto.doc.add_html_dependency({name='interactive-cv',version='0.0.3',scripts=exports and {'export.js','reader.js'} or {'reader.js'},stylesheets={'reader.css'}})
  end
  -- Public data is rendered deliberately; exclude author metadata from writer
  -- templates. This is not a boundary for other filters or referenced resources.
  doc.meta['interactive-cv']=nil
  return doc
end
return {{Pandoc=process}}
