-- Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
-- Data-only CV graph import and the optional KG producer protocol. No inference.
local M={}
local function fail(s) assert(false,'interactive-cv: '..s) end
local function mapping(v,field)
  if type(v)~='table' or pandoc.utils.type(v)=='List' then fail(field..' requires a mapping') end
  return v
end
local function keys(v,allowed,field)
  for k in pairs(v) do if not allowed[k] then fail(field..' contains unsupported fields; use the installed graph schema') end end
end
local function sequence(v,field)
  if type(v)~='table' or pandoc.utils.type(v)~='List' or #v>2000 then fail(field..' requires a sequence of at most 2000 entries') end
  return v
end
local function text(v,field)
  local kind=pandoc.utils.type(v)
  if type(v)~='string' and kind~='Inlines' and kind~='MetaInlines' and kind~='MetaString' then fail(field..' requires text') end
  if type(v)~='string' then v=pandoc.utils.stringify(v) end
  if #v==0 or #v>8192 or v:match('^%s*$') or v:find('[%z\1-\31\127]') then fail(field..' requires bounded text') end
  return v
end
local function root()
  local value=pandoc.system.get_working_directory()
  for part in (quarto.project.offset or '.'):gsub('\\','/'):gmatch('[^/]+') do
    if part=='..' then value=pandoc.path.directory(value)
    elseif part~='.' then fail('unexpected project offset') end
  end
  return value
end
function M.project_root() return root() end
local function relative(path,base)
  return pandoc.path.make_relative(path:gsub('\\','/'),base:gsub('\\','/')):gsub('\\','/')
end
local function confined(value,field)
  if type(value)~='string' or value=='' or value:find('[%z\1-\31\\:]') or value:sub(1,1)=='/' or value:find('//',1,true) then fail(field..' must stay within the project') end
  for part in value:gmatch('[^/]+') do if part=='.' or part=='..' then fail(field..' contains traversal') end end
  return value
end
local function io_path(path)
  if package.config:sub(1,1)=='\\' and not path:match('^\\\\%?\\') then
    path=path:gsub('/','\\')
    if path:match('^\\\\') then return '\\\\?\\UNC\\'..path:sub(3) end
    return '\\\\?\\'..path
  end
  return path
end
function M.options(value)
  if value==false then return nil end
  local o={id='cv',label='Interactive CV',navigation=true,search=true,placement='append'}
  if value~=nil and value~=true then
    value=mapping(value,'graph')
    keys(value,{id=true,label=true,navigation=true,search=true,placement=true,language=true},'graph')
    for k,v in pairs(value) do
      if k=='navigation' or k=='search' then
        if type(v)~='boolean' then fail('graph flag requires a Boolean') end
        o[k]=v
      else o[k]=text(v,'graph.'..k) end
    end
  end
  if #o.id>64 or not o.id:match('^[a-z][a-z0-9-]*$') then fail('graph.id requires a lowercase name of at most 64 ASCII letters, digits or hyphens') end
  if o.id=='website' or o.id=='constructor' or o.id=='prototype' then fail('graph.id is reserved; choose a separate CV graph name') end
  if #o.label>256 then fail('graph.label exceeds 256 bytes') end
  if o.language then
    local first=o.language:match('^[^%-]+')
    if #o.language>80 or not first or #first<2 or #first>8 or not first:match('^[A-Za-z]+$') or not o.language:match('^[A-Za-z][A-Za-z0-9%-]*$') or o.language:sub(-1)=='-' or o.language:find('--',1,true) then fail('graph.language requires a supported BCP47 language tag') end
    for part in o.language:gmatch('[^%-]+') do if #part>8 then fail('graph.language requires a BCP47 language tag') end end
  end
  if o.placement~='append' and o.placement~='placeholder' then fail('graph.placement requires append or placeholder') end
  if o.placement=='placeholder' and not o.navigation then fail('graph.placement placeholder requires graph.navigation true') end
  return o
end
local function project_output_root()
  local base=root():gsub('\\','/')
  local directory=quarto.project.output_directory
  if directory then
    directory=directory:gsub('\\','/')
    if not pandoc.path.is_absolute(directory) then directory=pandoc.path.join({base,directory})
    elseif quarto.project.directory then
      -- On the tested Windows host Quarto's project metadata can use the
      -- system encoding, while native document paths use UTF-8. Derive only
      -- the output suffix from the matching metadata root, then anchor it to
      -- the actual input/offset root. Never guess or replace path characters.
      local reported_root=pandoc.path.normalize(quarto.project.directory):gsub('\\','/')
      local suffix=relative(directory,reported_root)
      if suffix~='..' and not suffix:match('^%.%./') and not pandoc.path.is_absolute(suffix) then
        directory=pandoc.path.join({base,suffix})
      end
    end
    directory=pandoc.path.normalize(directory):gsub('\\','/')
    local root_relative=relative(directory,base)
    if root_relative~='.' and root_relative~='' then confined(root_relative,'project output directory') end
    return directory
  end
  return nil
end
function M.project_output_root() return project_output_root() end
local function output_location()
  local field='generated graph destination'
  local base=root():gsub('\\','/')
  local output=text(quarto.doc.output_file,field):gsub('\\','/')
  for part in output:gmatch('[^/]+') do if part=='..' then fail(field..' contains traversal') end end
  if not pandoc.path.is_absolute(output) then output=pandoc.path.join({pandoc.path.directory(quarto.doc.input_file),output}):gsub('\\','/') end
  output=pandoc.path.normalize(output):gsub('\\','/')
  -- The native output may already be under output_directory, or may be the
  -- explicit output-file intermediate beside the QMD that Quarto moves later.
  -- Both must be inside the project before a public destination is derived.
  local project_path=confined(relative(output,base),field)
  local directory=project_output_root()
  if directory then
    local result=relative(output,directory)
    if result~='..' and not result:match('^%.%./') then return project_path,confined(result,field) end
  end
  return project_path,project_path
end
function M.default_destination()
  local _,page=output_location()
  -- A static writer keeps the canonical HTML-link convention. This does not
  -- claim that an HTML counterpart was rendered, and never publishes a graph.
  if FORMAT~='html' and not page:match('%.html$') then page=page:gsub('%.[^./]+$','')..'.html' end
  if not page:match('%.html$') then fail('generated graph destination requires a supported .html output filename') end
  return page
end
function M.import(data)
  data=mapping(data,'graph-file')
  keys(data,{version=true,graph=true,['as-of']=true,nodes=true,edges=true},'graph-file')
  if data.version~=1 then fail('graph-file requires supported version 1') end
  if data.graph==nil then fail('graph-file requires graph identity metadata') end
  mapping(data.graph,'graph-file.graph')
  if data.graph.id==nil or data.graph.label==nil then fail('graph-file.graph requires id and label') end
  local options=M.options(data.graph)
  if not options then fail('graph-file.graph must describe a graph') end
  local nodes=sequence(data.nodes,'graph-file.nodes')
  local records,byid=pandoc.List(),{}
  local page
  for _,node in ipairs(nodes) do
    node=mapping(node,'graph node')
    if type(node.id)~='string' or byid[node.id] then fail('graph nodes require unique stable identifiers') end
    local copy={};for k,v in pairs(node) do copy[k]=v end
    if type(copy.public)=='table' then
      copy.public={};for k,v in pairs(node.public) do copy.public[k]=v end
      if copy.public.url==nil then
        page=page or M.default_destination()
        copy.public.url=page..'#'..(copy.public.anchor or ('cv-'..pandoc.utils.sha1(node.id):sub(1,12)))
      end
    end
    records:insert(copy);byid[node.id]=copy
  end
  for _,edge in ipairs(sequence(data.edges or pandoc.List(),'graph-file.edges')) do
    edge=mapping(edge,'graph edge');keys(edge,{from=true,predicate=true,to=true},'graph edge')
    local from=text(edge.from,'edge.from');local to=text(edge.to,'edge.to');local predicate=text(edge.predicate,'edge.predicate')
    if not byid[from] or not byid[to] then fail('graph edge requires declared endpoints') end
    local node=byid[from]
    if node.publication and node.publication.audience=='public' then
      node.public=mapping(node.public,'graph node.public')
      if predicate=='hasAssertion' then
        local assertions=pandoc.List();local found=false
        for _,id in ipairs(sequence(node.public.assertions or pandoc.List(),'graph node assertions')) do assertions:insert(id);if id==to then found=true end end
        if not found then assertions:insert(to) end;node.public.assertions=assertions
      else
        local relations=pandoc.List();local found=false
        for _,r in ipairs(sequence(node.public.relations or pandoc.List(),'graph node relations')) do relations:insert(r);if r.predicate==predicate and r.target==to then found=true end end
        if not found then relations:insert({predicate=predicate,target=to}) end;node.public.relations=relations
      end
    end
  end
  return {['as-of']=data['as-of'],records=records,graph=options}
end
function M.publish(model,options,dependencies,metadata,catalogue_digest)
  if not options or not quarto.project.directory or FORMAT~='html' then return false end
  local settings=metadata['knowledge-graph']
  if settings==false or (type(settings)=='table' and settings.enabled==false) then return false end
  local base=root()
  local handle=io.open(io_path(pandoc.path.join({base,'.quarto','knowledge-graph','run.json'})),'rb')
  if not handle then return false end -- Standalone CV remains useful.
  local raw=handle:read(8388609);handle:close()
  if #raw>8388608 then fail('prepared graph run exceeds its 8 MiB limit') end
  local ok,run=pcall(pandoc.json.decode,raw)
  if not ok or type(run)~='table' or type(run.runId)~='string' or not run.runId:match('^[A-Za-z0-9_-]+$') or #run.runId>100 then fail('invalid prepared graph run; render the project again') end
  if run.compositionVersion~=1 then fail('graph integration requires Knowledge Graph Extraction 0.0.9 or later; update the companion, or set interactive-cv.graph to false') end
  local producer_fields={}
  if type(run.producerPropertyFields)=='table' then
    for _,name in ipairs(run.producerPropertyFields) do
      if name=='start' or name=='end' or name=='date' or name=='as-of' then producer_fields[name]=true end
    end
  end
  local state=confined(run.stateDir,'graph state directory')
  local source=confined(relative(quarto.doc.input_file,base),'graph producer source')
  local output=output_location()
  local envelope={producerVersion=1,producer='interactive-cv',runId=run.runId,source=source,output=output,
    graph={id=options.id,label=options.label,navigation=options.navigation,search=options.search},objects=pandoc.List(),relations=pandoc.List(),dependencies=pandoc.List(),dependencyDigests=pandoc.List()}
  for _,dep in ipairs(dependencies or {}) do
    local path=pandoc.path.directory(quarto.doc.input_file)
    for part in dep:gsub('\\','/'):gmatch('[^/]+') do
      if part=='..' then path=pandoc.path.directory(path)
      elseif part~='.' then path=pandoc.path.join({path,part}) end
    end
    local dependency=confined(relative(path,base),'graph catalogue dependency')
    envelope.dependencies:insert(dependency)
    if type(catalogue_digest)~='string' or #catalogue_digest~=40 or catalogue_digest:find('[^a-f0-9]') then fail('graph catalogue byte receipt is missing; update the installed CV filter') end
    -- A native byte-change receipt, not an authenticity or signature claim.
    -- Hash the original reader bytes, never a later reread after projection.
    envelope.dependencyDigests:insert({path=dependency,algorithm='sha1',digest=catalogue_digest})
  end
  local included={};for _,record in ipairs(model.records) do included[record.id]=true end
  for _,record in ipairs(model.records) do
    local evidence=pandoc.List()
    for _,r in ipairs(record.relations) do if r.predicate=='supportedByEvidence' or r.predicate=='contradictedByEvidence' or r.predicate=='qualifiedByEvidence' then evidence:insert(r.target) end end
    local language=options.language or model.language or 'en'
    -- Preserve every deliberately public qualifier, including verification
    -- scope, attribution and contrary-evidence qualifications. Canonical JSON
    -- text keeps the narrow producer schema without losing field boundaries.
    local qualifier_keys,qualifier_parts={},{}
    for key in pairs(record.qualification) do qualifier_keys[#qualifier_keys+1]=key end
    table.sort(qualifier_keys)
    for _,key in ipairs(qualifier_keys) do qualifier_parts[#qualifier_parts+1]=pandoc.json.encode(key)..':'..pandoc.json.encode(record.qualification[key]) end
    local qualification='{'..table.concat(qualifier_parts,',')..'}'
    if #qualification>2048 then fail('public graph qualifications exceed the companion limit; reduce this graph scope or set graph false, without truncating the CV source') end
    local object={id=record.id,type=record.type,scope=options.id,labels={[language]=record.title},summary=record.summary,
      source={path=source,anchor=record.anchor,precision='anchor'},review='declared',origin='author-declared',
      provenance={qualification=qualification,review=record.publicationReview,evidence=evidence}}
    if record.aliases and #record.aliases>0 then object.aliases={[language]=record.aliases} end
    local dates={}
    for _,name in ipairs({'start','end','date'}) do
      if producer_fields[name] and type(record[name])=='string' then dates[name]=record[name] end
    end
    if producer_fields['as-of'] and type(model.asOf)=='string' then dates['as-of']=model.asOf end
    if next(dates)~=nil then object.properties=dates end
    envelope.objects:insert(object)
    for i,relation in ipairs(record.relations) do if included[relation.target] then
      envelope.relations:insert({id='urn:cv:relation:'..pandoc.utils.sha1(record.id..'\0'..relation.predicate..'\0'..relation.target),
        type=relation.predicate,from=record.id,to=relation.target,scope=options.id,
        source={path=source,anchor=record.anchor,precision='anchor'},review='declared',origin='author-declared',weight=1})
    end end
  end
  local directory=pandoc.path.join({base,state,'runs',run.runId,'producers'})
  pandoc.system.make_directory(directory,true)
  local encoded=(source:gsub('[^A-Za-z0-9._~-]',function(byte) return string.format('%%%02X',string.byte(byte)) end))
  local path=pandoc.path.join({directory,encoded..'.interactive-cv.json'})
  local bytes=pandoc.json.encode(envelope)
  if #bytes>4194304 then fail('projected graph producer exceeds 4 MiB') end
  local temp=path..'.tmp'
  local file=io.open(io_path(temp),'wb');if not file then fail('cannot write graph producer observation') end
  local written=file:write(bytes);local closed=file:close()
  if not written or not closed then fail('cannot finish graph producer observation') end
  os.remove(io_path(path))
  if not os.rename(io_path(temp),io_path(path)) then fail('cannot commit graph producer observation') end
  return true
end
return M
