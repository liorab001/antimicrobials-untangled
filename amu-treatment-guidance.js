/* Treatment-choice metadata is independent of label-dose extraction. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AMUTreatmentGuidance=Object.freeze(api);})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const statuses=new Set(['standard','conditional','no_universal_standard','review_required','source_index','procedure_first']);
 const localRoutes=new Set(['TOPICAL','CUTANEOUS','VAGINAL','BUCCAL','OPHTHALMIC','AURICULAR (OTIC)','NASAL','RESPIRATORY (INHALATION)','INHALATION']);
 const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 function condition(rule,patient){
  if(!rule)return true;
  if(rule.all){const v=rule.all.map(r=>condition(r,patient));return v.includes(false)?false:v.includes(null)?null:true;}
  if(rule.any){const v=rule.any.map(r=>condition(r,patient));return v.includes(true)?true:v.includes(null)?null:false;}
  if(rule.not){const v=condition(rule.not,patient);return v==null?null:!v;}
  const v=patient[rule.field];if(v==null)return null;
  switch(rule.op){case'eq':return v===rule.value;case'ne':return v!==rule.value;case'in':return rule.value.includes(v);case'gte':return Number.isFinite(v)&&v>=rule.value;case'gt':return Number.isFinite(v)&&v>rule.value;case'lte':return Number.isFinite(v)&&v<=rule.value;case'lt':return Number.isFinite(v)&&v<rule.value;default:return null;}
 }
 function validate(database){
  const collection=database.referenceCollections?.firstLineGuidance;if(!collection)return {valid:true,available:false};
  const records=collection.records,sources=collection.sources,profiles=database.referenceCollections.pathogenProfiles.records,keys=new Set(profiles.flatMap(p=>(p.diseases||[]).map(d=>p.canonical+'|'+d.id)));
  if(!records||!sources)throw new Error('First-line guidance requires records and sources.');
  if(collection.maySupplyLabelDose!==false)throw new Error('Treatment preference cannot supply a product-label dose.');
  const checkCondition=rule=>{if(!rule)return;if(rule.all||rule.any){(rule.all||rule.any).forEach(checkCondition);return;}if(rule.not){checkCondition(rule.not);return;}if(!database.fieldDefinitions[rule.field]||!['eq','ne','in','gte','gt','lte','lt'].includes(rule.op))throw new Error('Unsupported first-line applicability condition.');};
  for(const [id,source]of Object.entries(sources)){let url;try{url=new URL(source.url);}catch{throw new Error('Invalid guideline URL: '+id);}if(url.protocol!=='https:'||!source.title)throw new Error('A first-line source must have an HTTPS URL and title.');}
  for(const [key,record]of Object.entries(records)){
   if(!keys.has(key)||!statuses.has(record.status))throw new Error('Invalid first-line context: '+key);
   if(record.status==='source_index'&&!key.endsWith('|all'))throw new Error('A clinical presentation requires its own first-line decision: '+key);
   if(!record.note||!Array.isArray(record.groups))throw new Error('Incomplete first-line guidance: '+key);
   if(!Array.isArray(record.sourceRefs)||record.sourceRefs.some(id=>!sources[id])||!key.endsWith('|all')&&!record.sourceRefs.length)throw new Error('Missing first-line context source: '+key);
   if(['standard','conditional','procedure_first'].includes(record.status)&&!record.groups.length)throw new Error('A standard must declare its choices: '+key);
   const groupIds=new Set();for(const group of record.groups){
    if(!sources[group.sourceRef]||!group.id||!group.title||!['alternatives','combination','sequence','procedure'].includes(group.kind))throw new Error('Incomplete first-line source or group: '+key);
    if((group.when||group.phenotype)&&!group.qualifier)throw new Error('Conditional choices must state their qualification: '+key);
    checkCondition(group.when);
    if(!Array.isArray(group.agents)||!group.agents.length&&group.kind!=='procedure')throw new Error('Missing first-line treatment choices: '+key);
    if(groupIds.has(group.id))throw new Error('Duplicate first-line group: '+key);groupIds.add(group.id);
    for(const agent of group.agents||[]){
     if(!agent.name||agent.routes&&(!Array.isArray(agent.routes)||agent.routes.some(route=>typeof route!=='string'||!route.trim())))throw new Error('Invalid first-line agent: '+key);
     for(const pattern of [agent.productPattern,agent.excludeProductPattern])if(pattern)new RegExp(pattern,'i');
    }
   }
  }
  if(collection.requireCompleteCoverage)for(const key of keys)if(!records[key])throw new Error('First-line classification is missing for '+key);
  return {valid:true,available:true,contextCount:Object.keys(records).length};
 }
 function create(database){
  validate(database);const collection=database.referenceCollections?.firstLineGuidance,records=collection?.records||{},sources=collection?.sources||{};
  const profiles=database.referenceCollections.pathogenProfiles.records;
  const record=(pathogen,presentation)=>records[pathogen+'|'+presentation]||null;
  function groups(pathogen,presentation,patient={}){
   const entry=record(pathogen,presentation);if(!entry)return [];
   const phenotypeText=[pathogen,patient.isolate_tested_organism].join(' ');
   const phenotype=/\bMRSA\b|methicillin[ -]resistant\s+Staphylococcus\s+aureus/i.test(phenotypeText)?'MRSA':/\bMSSA\b|methicillin[ -]susceptible\s+Staphylococcus\s+aureus/i.test(phenotypeText)?'MSSA':null;
   return entry.groups.flatMap(group=>{
    if(group.phenotype&&phenotype&&group.phenotype!==phenotype)return [];
    const applicable=condition(group.when,patient);if(applicable===false)return [];
    return [{...group,conditional:entry.status==='conditional'||applicable==null||!!group.phenotype&&!phenotype,source:sources[group.sourceRef]}];
   });
  }
  function matchesProduct(drug,agent,matchName){
   if(!matchName(drug,agent.name))return false;
   const route=normalize(drug.route),product=[drug.activeIngredientSource,drug.genericName,drug.brandName,drug.dosageForm].join(' ');
   if(agent.routes?.length&&!agent.routes.some(r=>(' '+route+' ').includes(' '+normalize(r)+' ')))return false;
   if(agent.productPattern&&!new RegExp(agent.productPattern,'i').test(product))return false;
   if(agent.excludeProductPattern&&new RegExp(agent.excludeProductPattern,'i').test(product))return false;
   return true;
  }
  function astAllows(drug,patient,matchName){
   const category=patient.isolate_susceptibility;
   if(!category||category==='not_tested')return true;
   if(!patient.isolate_tested_drug||!matchName(drug,patient.isolate_tested_drug))return true;
   return category==='susceptible';
  }
  function plan(pathogen,presentation,patient,cards,matchName,eligible){
   const entry=record(pathogen,presentation);if(!entry)return null;
   const used=new Set();
   return {entry,groups:groups(pathogen,presentation,patient).map(group=>{
    const agents=group.agents||[],available=group.choiceOnly?[]:cards.filter(card=>agents.some(agent=>matchesProduct(card,agent,matchName))&&eligible(card)&&astAllows(card,patient,matchName)),members=available.filter(card=>!used.has(card.id));
    const shared=available.filter(card=>used.has(card.id)).map(card=>card.genericName);
    members.forEach(card=>used.add(card.id));
    return {...group,members,shared,missing:agents.filter(agent=>!available.some(card=>matchesProduct(card,agent,matchName))).map(agent=>agent.name)};
   }),remaining:cards.filter(card=>!used.has(card.id))};
  }
  function overview(pathogen,patient={}){
   const profile=profiles.find(p=>p.canonical===pathogen);
   return (profile?.diseases||[]).filter(d=>d.id!=='all').map(d=>({id:d.id,label:d.label,entry:record(pathogen,d.id),groups:groups(pathogen,d.id,patient)}));
  }
  function fetchAgents(pathogen,presentation,patient={}){
   return [...new Set(groups(pathogen,presentation,patient).flatMap(g=>(g.agents||[]).filter(a=>a.fetch!==false).map(a=>a.name)))];
  }
  function preference(pathogen,presentation,agentName,patient={}){
   const candidates=groups(pathogen,presentation,patient).flatMap(g=>g.agents||[]).filter(a=>normalize(a.name)===normalize(agentName));
   if(!candidates.length)return null;
   return {routes:[...new Set(candidates.flatMap(a=>a.routes||[]))],productPatterns:[...new Set(candidates.map(a=>a.productPattern).filter(Boolean))],excludeProductPatterns:[...new Set(candidates.map(a=>a.excludeProductPattern).filter(Boolean))]};
  }
  function allowsLocalProduct(pathogen,presentation,drug,patient,matchName){return groups(pathogen,presentation,patient).some(g=>(g.agents||[]).some(a=>a.routes?.some(r=>localRoutes.has(r))&&matchesProduct(drug,a,matchName)));}
  return Object.freeze({record,groups,overview,plan,fetchAgents,preference,allowsLocalProduct});
 }
 return {create,validate,condition};
});
