-- Copyright 2026 Kai Prince. SPDX-License-Identifier: Apache-2.0
-- PRIVATE native glue. All declarations come from ordinary selected metadata.
local M={}
function M.request(options,plain,fail,html)
  local value={}
  local active=false
  for author,wire in pairs({['temporal-rules']='temporalRules',['claim-validity']='claimValidity',['professional-narratives']='narratives'}) do
    if options[author]~=nil then value[wire]=plain(options[author]);active=true end
  end
  if options.delivery~=nil and options.delivery~=false then
    local raw=plain(options.delivery)
    if type(raw)~='table' then fail('delivery requires false or a closed mapping with mode lazy') end
    for key in pairs(raw) do if key~='mode' and key~='bundle-bytes' then fail('delivery has an unsupported field') end end
    value.delivery={mode=raw.mode}
    if raw['bundle-bytes']~=nil then
      local bytes=raw['bundle-bytes']
      if type(bytes)=='string' and bytes:match('^%d+$') then bytes=tonumber(bytes) end
      if type(bytes)~='number' or bytes%1~=0 then fail('delivery.bundle-bytes requires a bounded integer') end
      value.delivery.bundleBytes=bytes
    end
    if not html then value.delivery=nil end
    active=true
  elseif options.delivery==false and html then value.delivery=false;active=true
  end
  return active and value or nil
end
function M.static(value,pandoc,link,fail)
  if type(value)~='table' then return nil end
  local blocks=pandoc.List()
  local function para(s) if type(s)~='string' or #s>4194304 or s:find('%z') then fail('invalid prepared CV source text') end;return pandoc.Para({pandoc.Str(s)}) end
  local function heading(s) blocks:insert(pandoc.Header(2,{pandoc.Str(s)})) end
  if type(value.temporalRules)=='table' then
    heading('Declared calendar relationships')
    blocks:insert(para(value.temporalRules.qualification))
    for _,row in ipairs(value.temporalRules.results) do blocks:insert(pandoc.Para({pandoc.Str(row.id..': '..row.value..' — '..row.operation..' between '),link(row.left),pandoc.Str(' and '),link(row.right),pandoc.Str('. '..row.reason)})) end
  end
  if type(value.claimValidityQuery)=='table' then
    heading('Declared assertion validity at the public snapshot')
    blocks:insert(para(value.claimValidityQuery.qualification))
    for _,row in ipairs(value.claimValidityQuery.results) do blocks:insert(pandoc.Para({link(row.id),pandoc.Str(': '..row.value..'. '..row.reason)})) end
  end
  if type(value.narratives)=='table' and #value.narratives>0 then
    heading('Source-bound professional extracts')
    for _,row in ipairs(value.narratives) do
      blocks:insert(pandoc.Header(3,{pandoc.Str(row.label)}))
      if row.status=='extractive-unreviewed' and type(row.plan)=='table' then
        blocks:insert(para(row.plan.qualification))
        local quoted=pandoc.List()
        for line in (row.plan.extractiveText..'\n'):gmatch('(.-)\n') do if line~='' then quoted:insert(para(line)) end end
        blocks:insert(pandoc.BlockQuote(quoted))
      elseif row.deferred then blocks:insert(para('The source-bound extract is available after an explicit full-detail load in the HTML page. The compact native index and ordinary source destinations remain available without JavaScript.'))
      else blocks:insert(para('This optional professional extract is unavailable. Install a compatible Generative Websites provider; the ordinary public CV remains available.')) end
    end
  end
  if #blocks==0 then return nil end
  return pandoc.Div(blocks,pandoc.Attr('',{'cv-r6-native'}))
end
return M
