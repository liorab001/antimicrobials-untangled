/* BEGIN bundled treatment guidance */
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
/* END bundled treatment guidance */
/* AMU modular integration. Database-only growth uses the existing interpreter protocol.
 * UI state, hypothetical inputs and fetched labels live in memory only. */
(function (root) {
  'use strict';
  const byId = id => document.getElementById(id);
  const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seed = root.AMU_FEATURE_DEFAULTS;
  const bundleVersion='1.2.1';
  const pageFields = new Set(['age','weight','crcl','egfr','gestational_age','postnatal_age','dialysis','pregnancy','hepatic_class']);
  let engine = null, generation = 0, loadAttempt = 0, modulesLoaded = false;
  let overrides = Object.create(null), fieldErrors = new Map(), analyses = new Map(), jobs = [], activeJobs = 0, renderFrame = 0;
  const sourceIds = new WeakMap(), sourceLabels = new WeakMap();
  let nextSourceId = 0;
  let calculationState = {key:null,status:'inactive',result:null}, calculationJob = 0;
  const calculationSources = new Map();
  let automaticDemand={scope:null,required:[],renalFields:[]};
  let liveSnapshot=null, drainTimer=null;
  const runningJobs=new Set(),formatIndexes=new WeakMap();
  const appRuleIndexes=new WeakMap();
  // Reuse only this synchronous draw's inputs. Drop them before returning to
  // the browser, so changes and calculations always start from current values.
  let renderState=null;
  function withRenderState(draw) {
    if(renderState)return draw();
    renderState={};
    try{return draw();}finally{renderState=null;}
  }
  function formatById(id){const db=engine.database;if(!formatIndexes.has(db))formatIndexes.set(db,new Map(db.formats.map(format=>[format.id,format])));return formatIndexes.get(db).get(id);}
  let calculationAbort=null;
  function cancelRunning(){for(const job of runningJobs)job.controller.abort();clearTimeout(drainTimer);drainTimer=null;}

  function revive(value) {
    if (Array.isArray(value)) return value.map(revive);
    if (value && typeof value === 'object') {
      if (own(value, '$regex')) return new RegExp(value.$regex, value.$flags || '');
      return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,revive(v)]));
    }
    return value;
  }
  function reference(name) {
    const collection = engine?.database.referenceCollections?.[name];
    const value = collection && own(collection, 'records') ? collection.records : (collection ?? seed.references[name]);
    const result = revive(clone(value));
    if (name === 'legacySourceRegistry') for (const [id, source] of Object.entries(engine?.database.sourceRegistry || {})) result[id] = {label: source.displayName || id, hosts: source.officialHosts || []};
    return result;
  }
  function lexicon(name) {
    const value = engine?.database.lexicons?.[name] ?? seed.lexicons[name];
    if (name === 'wordingEquivalents') return value.map(rule => Array.isArray(rule) ? revive(rule) : [new RegExp(rule.pattern.pattern, rule.pattern.flags || ''), rule.replacement]);
    if (name === 'retrievalExpansions') return clone(value.rules || value);
    return revive(clone(value));
  }
  function arithmetic(expr, values) {
    if (typeof expr === 'number') return expr;
    if (expr && own(expr,'field')) return values[expr.field];
    const args = (expr?.args || []).map(x => arithmetic(x,values));
    if (!args.length || args.some(x => !Number.isFinite(x))) return NaN;
    switch (expr.op) {
      case 'multiply': return args.reduce((a,b) => a*b,1);
      case 'add': return args.reduce((a,b) => a+b,0);
      case 'subtract': return args[0]-args[1];
      case 'divide': return args[1] ? args[0]/args[1] : NaN;
      case 'min': return Math.min(...args);
      case 'max': return Math.max(...args);
      default: return NaN;
    }
  }
  function pediatricDoseFunctions() {
    const records = reference('legacyPediatricTemplates') || {};
    return Object.fromEntries(Object.entries(records).map(([name, recipe]) => [name,(weight,age) => {
      const values={weight,age};
      const choice=recipe.cases ? recipe.cases.find(c => !c.when || (own(c.when,'lt') && values[c.when.field] < c.when.lt)) : recipe;
      if (!choice) return 'No legacy app reference for these inputs.';
      const calculations=Object.fromEntries(Object.entries(choice.calculations || {}).map(([k,v]) => [k,arithmetic(v,values)]));
      return String(choice.template || '').replace(/\{(\w+)\}/g,(_,key) => Number.isFinite(calculations[key]) ? Math.round(calculations[key]).toLocaleString() : 'unknown');
    }]));
  }
  function setStatus(text, error=false) {
    byId('amuDatabaseStatus').textContent=text;
    byId('amuDatabaseBar').style.background=error ? '#fff7ed' : '#e2e8f0';
    byId('amuDatabaseBar').hidden=!error&&modulesLoaded&&root.location.protocol!=='file:';
  }
  function loadScript(path) {
    return new Promise((resolve,reject) => {
      const script=document.createElement('script');
      script.src=new URL(path,document.baseURI).href;
      script.onload=resolve;
      script.onerror=() => reject(new Error('Could not load '+path+'. Keep all prototype files in the same folder.'));
      document.body.append(script);
    });
  }
  async function loadDatabase(source='./amu-database.json') {
    const attempt=++loadAttempt, previousEngine=engine;let candidateEngine=null;
    setStatus('Validating database…');
    try {
      if (!root.AMUEngine) throw new Error('amu-engine.js is missing. Keep every bundle file together.');
      const next=candidateEngine=await root.AMUEngine.load(source);
      if (attempt!==loadAttempt) {next.dispose();return;}
      const collections=next.database.referenceCollections || {};
      for (const [name,baseline] of Object.entries(seed.references)) {
        const c=collections[name], value=c && own(c,'records') ? c.records : (c ?? baseline);
        if (Array.isArray(baseline) !== Array.isArray(value) || typeof value !== typeof baseline || value===null) throw new Error('Invalid application reference collection: '+name);
      }
      if (next.database.referenceCollections?.firstLineGuidance && !root.AMUTreatmentGuidance) throw new Error('amu-treatment-guidance.js is missing. Keep every bundle file together.');
      root.AMUTreatmentGuidance?.validate(next.database);
      cancelRunning();previousEngine?.cancelAnalyses();engine=next; generation++; analyses.clear(); jobs=[]; overrides=Object.create(null); fieldErrors.clear();
      calculationJob++; calculationState={key:null,status:'inactive',result:null};automaticDemand={scope:null,required:[],renalFields:[]};
      if (!modulesLoaded) {
        await loadScript('./amu-ui.js?v=1.2.0');
        await loadScript('./amu-resistance.js');
        modulesLoaded=true;
        root.AMU_legacyDebugRegimens=root.AMU_debugRegimens;
        root.AMU_debugRegimens=name => {
          const drug=currentFetchedDrugs.find(d => d.id===String(name))||currentFetchedDrugs.find(d => d.genericName.toLowerCase().includes(String(name).toLowerCase()));
          const result=drug ? entryFor(drug)?.result || {status:'pending'} : {status:'not_in_current_results'};
          return clone(result);
        };
        init(); setPtInputs(); updatePtNote(); updateRenalState(); syncRenalMetric();
      } else {
        AMU_refreshDatabaseReferences();
        // Keep current retrieved labels and hypothetical page values; refresh dynamic navigation.
        if (!own(directoryTaxonomy,activeSystem)) activeSystem=Object.keys(directoryTaxonomy)[0] || 'Pathogens';
        if (activePathogenProfile) activePathogenProfile=pathogenKnowledgeGraph.find(p => p.canonical===activePathogenProfile.canonical) || activePathogenProfile;
        renderSystemTabs(); renderSyndromeList();
        if (currentSearchLevel==='PATHOGEN') renderPathogenDiseaseFilterBar();
        if (currentSearchLevel==='SYNDROME') renderSyndromePathogenFilterBar();
        lastDailyPollDate=null;
      }
      renderFields(); refreshResistanceControls();
      byId('amuAppShell').inert=false;
      setStatus('Database '+engine.database.databaseVersion+' · '+engine.database.formats.length+' formats · engine '+root.AMUEngine.version);
      reFilterCurrentResults();
      if(previousEngine&&previousEngine!==engine)previousEngine.dispose();
      if (!byId('pageResistances').classList.contains('hidden')) runDailyResistancePoll(false);
    } catch (error) {
      if(candidateEngine&&candidateEngine!==engine)candidateEngine.dispose();
      if (attempt!==loadAttempt) return;
      if (previousEngine && engine!==previousEngine && modulesLoaded) {
        cancelRunning();engine?.dispose();engine=previousEngine; generation++; analyses.clear(); jobs=[];
        AMU_refreshDatabaseReferences(); renderFields(); refreshResistanceControls(); reFilterCurrentResults();
      }
      const prefix=previousEngine && modulesLoaded ? 'Previous database remains active. ' : '';
      setStatus(prefix+(error.code==='LOCAL_IMPORT_REQUIRED' ? 'Local preview: choose amu-database.json above.' : 'Database not activated: '+error.message),true);
    }
  }
  function pagePatient() {
    if (!modulesLoaded) return {};
    const p=getActiveDosingPhysiology();
    return {age:p.age,weight:p.weightKg,crcl:p.crcl,egfr:p.egfr,gestational_age:p.gestationalAgeWeeks,postnatal_age:p.postnatalAgeDays,dialysis:p.dialysis,pregnancy:p.pregnancy,hepatic_class:p.hepaticClass};
  }
  function basePatient() {
    if(renderState?.basePatient)return renderState.basePatient;
    const base=pagePatient(), result={};
    for (const name of Object.keys(engine.database.fieldDefinitions)) result[name]=own(overrides,name) ? clone(overrides[name]) : (own(base,name) ? base[name] : null);
    if(renderState)renderState.basePatient=result;
    return result;
  }
  function calculationScope() {
    if(renderState?.scope)return renderState.scope;
    const scope=JSON.stringify([generation,context(),(typeof currentFetchedDrugs==='undefined'?[]:currentFetchedDrugs).map(drug=>[drug.id,drug.labelProvenance?.labelId,drug.labelProvenance?.effectiveTime])]);
    if(renderState)renderState.scope=scope;
    return scope;
  }
  function normalRenalDefaults(values=basePatient()) {
    const policy=engine?.database.policies.quantity?.physiologicalRenalAssumption;
    return !!policy?.enabled&&engine.database.policies.quantity.assumeNormalRenalFunction===true&&Number.isFinite(values[policy.screenField])&&values[policy.screenField]>=policy.minimumScreenValue&&values[policy.noDialysisField]===policy.noDialysisValue&&!Object.entries(policy.normalMinimums||{}).some(([field,minimum])=>Number.isFinite(values[field])&&values[field]<minimum);
  }
  function updateCalculationDemand() {
    const scope=calculationScope(),required=new Set(),renalFields=new Set();
    for(const entry of analyses.values())if(entry.scope===scope&&entry.result){
      for(const field of entry.result.renalFields||[])renalFields.add(field);
      if(!(entry.result.regimens||[]).length)for(const record of entry.result.unresolved||[])for(const field of record.missingFields||[])required.add(field);
    }
    automaticDemand={scope,required:[...required],renalFields:[...renalFields]};
  }
  function activeCalculation(values=basePatient()) {
    const policy=engine?.database.policies.sourceCalculations;
    if(!policy?.enabled||!policy.automatic?.enabled||automaticDemand.scope!==calculationScope())return null;
    const wanted=new Set(automaticDemand.required);
    if(values.serum_creatinine!=null)for(const field of automaticDemand.renalFields)wanted.add(field);
    for(const definition of policy.definitions||[]){
      if(!wanted.has(definition.output.field)||!definition.automaticEligibility)continue;
      if(normalRenalDefaults(values)&&values.serum_creatinine==null&&values[definition.output.field]==null)continue;
      if(ruleCondition(definition.automaticEligibility,values)!==true)continue;
      if(definition.automaticDrugNames?.length&&!currentFetchedDrugs.some(drug=>definition.automaticDrugNames.some(name=>drugMatchesCuratedAgent(drug,name))))continue;
      return definition;
    }
    return null;
  }
  function calculationKey(def,values) {
    return JSON.stringify([generation,def.id,values,context(),calculationScope()]);
  }
  function patient() {
    const values={...basePatient()},def=activeCalculation(values),result=calculationState.result;
    if(def&&result?.status==='resolved'&&calculationState.key===calculationKey(def,values)&&values[def.output.field]==null)values[def.output.field]=result.value;
    if(def&&values[def.output.field]==null)values[def.activation.field]=def.activation.value;
    return values;
  }
  function calculation() {
    const values=basePatient(),def=activeCalculation(values);
    return def&&calculationState.key===calculationKey(def,values) ? clone(calculationState) : !def&&Number.isFinite(values.crcl)?{status:'provided',result:{value:values.crcl,field:'crcl',unit:'mL/min'}}:{status:def?'pending':'inactive',result:null};
  }
  function renderCalculationStatus() {
    const node=byId('amuRenalCalculationStatus');if(!node)return;
    const state=calculation(),result=state.result,defs=engine.database.fieldDefinitions;
    if(state.status==='inactive'){node.textContent='Equations run automatically when a selected source branch needs a missing metric. Existing filter values are reused; no patient values are saved.';return;}
    if(state.status==='provided'){node.textContent='Entered CrCl takes precedence; the estimator is not used.';return;}
    if(state.status==='pending'){node.textContent='Checking equation inputs and source…';return;}
    if(state.status==='needs_inputs'){node.textContent=(activeCalculation()?.label||'Source equation')+' requires: '+(result.missingFields||[]).map(name=>defs[name]?.label||name).join(', ')+'. Complete those filters to resolve the dose.';return;}
    if(state.status!=='resolved'){node.textContent=result?.message||'No verified equation is available for these inputs. Enter CrCl separately.';return;}
    const url=result.sourceIdentity?.sourceUrl||'';
    node.innerHTML='<strong>Estimated CrCl: '+escape(result.value.toFixed(2))+' '+escape(result.unit)+'</strong> · '+escape(result.label)+'<details class="mt-1"><summary class="cursor-pointer underline">Equation, inputs and source</summary><p class="mt-1">'+escape(result.equation)+'</p><p>'+escape(Object.entries(result.inputs).map(([name,value])=>name+': '+value).join(' · '))+'</p><p>The full-precision estimate selects the label row. Display rounding does not change the selection.</p><a href="'+escape(url)+'" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline">FDA equation source ↗</a></details>';
  }
  async function calculationSource(def) {
    const reference=def.source?.referenceUrl;
    const existing=currentFetchedDrugs.find(drug=>drug._amuLabel?.id===def.source?.referenceLabelId&&hasRetrievedOpenFdaLabel(drug));
    if(existing)return {label:existing._amuLabel,provenance:{...existing.labelProvenance,sourceId:'openfda',retrievalStatus:'retrieved'}};
    if(calculationSources.has(reference))return calculationSources.get(reference);
    const url=new URL(reference),registry=Object.entries(engine.database.sourceRegistry).find(([,source])=>url.protocol==='https:'&&!url.username&&!url.password&&(source.officialHosts||[]).some(host=>url.hostname===host||url.hostname.endsWith('.'+host)));
    if(!registry)throw new Error('Equation reference must use an official source host.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{
      // Only the database's static source URL is requested; profile values stay local.
      const response=await fetch(url.href,{credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error('Equation source could not be retrieved.');
      const body=await response.json(),label=body.results?.[0]||body;
      const source={label,provenance:{sourceId:registry[0],source:registry[0],status:'retrieved',retrievalStatus:'retrieved',sourceUrl:url.href,labelId:label.id,setId:label.set_id}};
      calculationSources.set(reference,source);return source;
    }finally{clearTimeout(timer);}
  }
  function ensureCalculation() {
    const values=basePatient(),def=activeCalculation(values);
    if(!def){if(calculationState.status!=='inactive'){calculationAbort?.abort();calculationJob++;calculationState={key:null,status:'inactive',result:null};}renderCalculationStatus();return;}
    const key=calculationKey(def,values);if(calculationState.key===key){renderCalculationStatus();return;}
    calculationAbort?.abort();calculationAbort=new AbortController();
    const signal=calculationAbort.signal,job=++calculationJob,jobEngine=engine;
    if(Number.isFinite(values[def.output.field])){calculationState={key,status:'provided',result:{status:'provided',field:def.output.field,value:values[def.output.field]}};renderCalculationStatus();return;}
    calculationState={key,status:'pending',result:null};renderCalculationStatus();
    (async()=>{
      let result=await jobEngine.calculate({calculationId:def.id,patient:values},{signal});
      if(result.status==='needs_source'){
        const source=await calculationSource(def);
        result=await jobEngine.calculate({calculationId:def.id,patient:values,...source},{signal});
      }
      if(job!==calculationJob||jobEngine!==engine)return;
      calculationState={key,status:result.status,result};renderCalculationStatus();
      if(typeof updateRenalState==='function')updateRenalState();scheduleRender();
    })().catch(error=>{if(error.code==='CANCELLED'||job!==calculationJob||jobEngine!==engine)return;calculationState={key,status:'unavailable',result:{status:'unavailable',message:error.message}};renderCalculationStatus();scheduleRender();});
  }
  function context() {
    if(renderState?.context)return renderState.context;
    const c=getActiveClinicalDosingContext();
    const manual=byId('amuContextIndication')?.value.trim() || '';
    const indication=manual || c?.label || '';
    const explicit=basePatient().treatment_intent;
    // The selected treatment/prophylaxis workflow is already an explicit UI choice.
    // With no disease selected, browse label options without inventing an indication.
    const selected=manual ? {label:manual,keywords:[]} : c;
    const intent=explicit || (selected ? amuContextTreatmentIntent(selected) : null);
    const value={indication,label:indication,indicationTerms:manual ? [] : c?.keywords || [],browse:!indication,organism:c?.pathogen || (currentSearchLevel==='PATHOGEN' ? activePathogenProfile?.canonical || '' : ''),treatment_intent:intent};
    if(renderState)renderState.context=value;
    return value;
  }
  function changed() {
    if (modulesLoaded) reFilterCurrentResults();
  }
  function renderFields() {
    const panel=byId('amuFieldControls'); panel.replaceChildren();
    const defs=engine.database.fieldDefinitions;
    byId('amuRenalCalculator')?.remove();
    let calculationPanel=null;
    if(Object.values(defs).some(def=>def.ui?.group==='renal_calculation')){
      const details=document.createElement('details');details.id='amuRenalCalculator';details.className='p-2 rounded-lg bg-white text-slate-800 border border-purple-300 text-[11px]';
      const summary=document.createElement('summary');summary.className='cursor-pointer font-bold text-purple-900';summary.textContent='Renal equation inputs — automatic when needed';
      const note=document.createElement('p');note.className='mt-2';note.textContent='Age and weight come from the filters above. Add the equation inputs here; a compatible entered measurement takes precedence. Values stay in this page only.';
      calculationPanel=document.createElement('div');calculationPanel.className='grid grid-cols-1 gap-2 mt-2';
      const status=document.createElement('div');status.id='amuRenalCalculationStatus';status.className='mt-2 leading-relaxed';status.setAttribute('role','status');
      details.append(summary,note,calculationPanel,status);byId('renalMetricStatus').insertAdjacentElement('afterend',details);
    }
    byId('amuFieldCount').textContent='('+Object.keys(defs).length+')';
    const indicationBox=document.createElement('label');
    indicationBox.className='block p-2 border rounded bg-slate-50';
    const title=document.createElement('span'); title.textContent='Optional exact label indication';
    const indication=document.createElement('input'); indication.id='amuContextIndication'; indication.type='text'; indication.placeholder='Uses the selected presentation when blank'; indication.className='block w-full border rounded p-1.5 mt-1';
    indication.addEventListener('change',changed); indicationBox.append(title,indication); panel.append(indicationBox);
    for (const [name,def] of Object.entries(defs)) {
      if(name==='renal_estimation_method')continue;
      const box=document.createElement('div'); box.className='p-2 border rounded bg-slate-50';
      const label=document.createElement('label'); label.textContent=(def.label || name)+(def.unit ? ' ('+def.unit+')' : '');
      const control=(def.type==='enum' || def.type==='boolean') ? document.createElement('select') : (['number','integer','string'].includes(def.type) ? document.createElement('input') : document.createElement('textarea'));
      control.setAttribute('autocomplete','off');control.id='amuField_'+name; label.htmlFor=control.id; control.dataset.amuField=name;
      control.className='block w-full border rounded p-1.5 mt-1 text-slate-800';
      if (def.type==='enum' || def.type==='boolean') {
        control.add(new Option(def.ui?.unknownLabel||(name==='treatment_intent' ? 'Use selected treatment / prophylaxis view' : 'Unknown / not supplied'),''));
        const values=def.type==='boolean' ? [true,false] : (def.values || def.enum || []);
        for (const value of values) control.add(new Option(def.ui?.optionLabels?.[String(value)]||String(value),String(value)));
      } else if (['number','integer'].includes(def.type)) {
        control.type='number'; control.step=def.type==='integer' ? '1' : 'any';
        if (def.minimum!=null) control.min=def.minimum;
        if (def.maximum!=null) control.max=def.maximum;
      } else if (def.type==='string') control.type='text';
      else control.placeholder=def.type==='string_array' ? 'Comma-separated values or a JSON array' : 'JSON value';
      const error=document.createElement('span'); error.className='text-rose-700 text-[10px]'; error.setAttribute('role','alert');
      control.addEventListener(def.ui?.group==='renal_calculation'&&def.type==='number'?'input':'change',() => {
        let value=control.value.trim();
        try {
          if (!value) value=null;
          else if (def.type==='number' || def.type==='integer') {
            value=Number(value);
            if (!Number.isFinite(value) || (def.type==='integer' && !Number.isInteger(value)) || (def.minimum!=null && value<def.minimum) || (def.maximum!=null && value>def.maximum)) throw new Error('Enter a value within the declared range.');
          } else if (def.type==='boolean') value=value==='true';
          else if (def.type==='string_array') {
            value=value.startsWith('[') ? JSON.parse(value) : value.split(',').map(x => x.trim()).filter(Boolean);
            if (!Array.isArray(value) || value.some(x => typeof x!=='string')) throw new Error('Enter a list of strings.');
          } else if (!['string','enum'].includes(def.type)) value=JSON.parse(value);
          overrides[name]=value; fieldErrors.delete(name); error.textContent='';
        } catch (e) { overrides[name]=null; fieldErrors.set(name,e.message); error.textContent=e.message; }
        changed();
      });
      box.append(label,control,error);
      if (pageFields.has(name)) {
        const toggleLabel=document.createElement('label'); toggleLabel.className='block mt-1 text-[10px] text-slate-600';
        const toggle=document.createElement('input'); toggle.type='checkbox'; toggle.id='amuOverride_'+name; control.disabled=true;
        toggle.addEventListener('change',() => {
          control.disabled=!toggle.checked;
          if (toggle.checked) control.dispatchEvent(new Event('change'));
          else { delete overrides[name]; fieldErrors.delete(name); error.textContent=''; changed(); }
        });
        toggleLabel.append(toggle,document.createTextNode(' Override page value (empty = unknown)')); box.append(toggleLabel);
      }
      (def.ui?.group==='renal_calculation'&&calculationPanel?calculationPanel:panel).append(box);
    }
    renderCalculationStatus();
  }
  function regimenReference(drug) {
    const c=context(),words=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),indication=words(c.indication);
    return (engine.database.referenceCollections.regimenReferences?.records||[]).find(item=>(!item.routes?.length||item.routes.some(route=>(' '+words(drug.route)+' ').includes(' '+words(route)+' ')))&&item.drugNames.some(name=>drugMatchesCuratedAgent(drug,name))&&item.treatmentIntent===c.treatment_intent&&item.organisms.some(name=>words(name)===words(c.organism))&&item.indicationTerms.some(term=>term.length<4?indication.split(' ').includes(words(term)):indication.includes(words(term))));
  }
  function requestFor(drug) {
    const external=regimenReference(drug),source=external?.label||drug._amuLabel;
    if(!sourceLabels.has(source)){
      const fields=['id','set_id','effective_time','openfda','identity','testOnly','indications_and_usage','microbiology','dosage_and_administration','dosage_and_administration_table','use_in_specific_populations','contraindications','warnings_and_cautions','warnings','boxed_warning','nodes'];
      sourceLabels.set(source,Object.fromEntries(fields.filter(key=>own(source,key)).map(key=>[key,source[key]])));
      sourceIds.set(source,++nextSourceId);
    }
    const derived=calculation(),allergy=getAllergyState();
    const safetyFilters={productAllergyStatus:evaluateDrugAllergyStatus(drug,allergy).status,allergies:{penicillin:allergy.pcn!=='none',...Object.fromEntries(['cephalosporin','macrolide','quinolone','tetracycline','sulfa','aminoglycoside','glycopeptide','lincosamide'].map(name=>[name,!!allergy[name]]))}};
    return {safetyFilters,label:sourceLabels.get(source),provenance:external?external.provenance:{...drug.labelProvenance,sourceId:'openfda',retrievalStatus:'retrieved'},patient:patient(),clinicalContext:context(),calculations:derived.status==='resolved'?[derived.result]:[]};
  }
  function keyFor(drug,request) {
    return JSON.stringify([generation,request.provenance.sourceId,request.provenance.sourceUrl,drug.id,drug.labelProvenance?.labelId,drug.labelProvenance?.effectiveTime,request.patient,request.clinicalContext,request.safetyFilters,[...fieldErrors]]);
  }
  function scheduleRender() {
    if (!renderFrame) renderFrame=requestAnimationFrame(() => {renderFrame=0;reFilterCurrentResults();});
  }
  function drain() {
    while(activeJobs<2&&jobs.length){
      const job=jobs.shift();
      if(job.generation!==generation||job.snapshot!==liveSnapshot){analyses.delete(job.key);continue;}
      activeJobs++;job.entry.phase='running';job.controller=new AbortController();runningJobs.add(job);
      job.engine.analyze(job.request,{signal:job.controller.signal}).then(result=>{
        if(job.controller.signal.aborted||job.generation!==generation||job.snapshot!==liveSnapshot)return;
        job.entry.result=result;job.entry.pending=false;job.entry.phase='done';
      },error=>{
        if(error.code==='CANCELLED'||job.controller.signal.aborted)return;
        job.entry.result={status:'unresolved',regimens:[],pendingRegimens:[],unresolved:[],diagnostics:[{code:error.code||'ANALYSIS_ERROR',message:error.message}]};job.entry.pending=false;job.entry.phase='done';
      }).finally(()=>{
        runningJobs.delete(job);activeJobs--;
        if(!job.controller.signal.aborted&&job.generation===generation&&job.snapshot===liveSnapshot){updateCalculationDemand();ensureCalculation();scheduleRender();}
        if(drainTimer==null)drain();
      });
    }
  }
  function scheduleDrain(){if(drainTimer==null)drainTimer=setTimeout(()=>{drainTimer=null;drain();},80);}
  function queueAnalysis(drugs) {
    if (!engine) return;
    document.querySelectorAll?.('input,select,textarea').forEach(control=>control.setAttribute('autocomplete','off'));
    const snapshot=JSON.stringify([basePatient(),context(),calculationScope(),getAllergyState()]);
    if(snapshot!==liveSnapshot){cancelRunning();liveSnapshot=snapshot;analyses.clear();jobs=[];}
    ensureCalculation();
    const wanted=new Set(),allergy=getAllergyState();
    const visible=drugs.filter(drug=>doesDrugMatchDiseaseSubfilter(drug)).filter(drug=>drug.forceShowEvenIfAllergic || evaluateDrugAllergyStatus(drug,allergy).status!=='BLOCKED');
    visible.sort((a,b)=>Number(!!b.isSelectedPinned)-Number(!!a.isSelectedPinned)||(typeof contraAssess==='function'?contraAssess(a,allergy.renalFlag).s-contraAssess(b,allergy.renalFlag).s:0));
    for (const drug of visible) {
      if (!drug._amuLabel || !hasRetrievedOpenFdaLabel(drug) || fieldErrors.size) continue;
      const request=requestFor(drug),key=keyFor(drug,request); wanted.add(key);
      if(analyses.has(key))continue;
      const entry={pending:true,phase:'queued',result:null,scope:calculationScope()};analyses.set(key,entry);
      jobs.push({engine,entry,request,generation,key,snapshot:liveSnapshot});
    }
    jobs=jobs.filter(job=>{if(wanted.has(job.key))return true;analyses.delete(job.key);return false;});
    const priority=new Map([...wanted].map((key,index)=>[key,index]));jobs.sort((a,b)=>priority.get(a.key)-priority.get(b.key));
    for(const job of runningJobs)if(!wanted.has(job.key))job.controller.abort();
    for(const [key]of analyses)if(!wanted.has(key))analyses.delete(key);
    // Never evict completed results belonging to the visible snapshot: doing so
    // requeued them on every render and could leave other cards waiting forever.
    if(analyses.size>300)for(const [key,entry] of analyses){if(!wanted.has(key)&&!entry.pending&&analyses.size>200)analyses.delete(key);}
    scheduleDrain();
  }
  function entryFor(drug) {
    if (!engine || !drug._amuLabel) return null;
    const request=requestFor(drug); return analyses.get(keyFor(drug,request));
  }
  function sourceText(value) {
    if (value==null) return '';
    if (typeof value==='string') return value;
    if (Array.isArray(value)) return [...new Set(value.map(sourceText).filter(Boolean))].join(' | ');
    if (typeof value==='object' && typeof value.sourceText==='string') {
      const text=value.feature==='baseline_option' ? 'Baseline before renal adjustment: '+value.sourceText : value.sourceText;
      return value.unit && !text.toLowerCase().includes(String(value.unit).toLowerCase()) ? text+' '+value.unit : text;
    }
    return typeof value==='object' ? JSON.stringify(value) : String(value);
  }
  function evidenceFor(record) {
    const spans=(record.evidence||[]).map(ev=>({...ev,sourceText:ev.quote||ev.sourceText||'',sourceField:ev.source_field||ev.sourceField||'',sourceType:ev.table_id?'table':'prose'}));
    for(const condition of record.conditions||[]){
      if(!condition.sourceText)continue;
      const source=condition.sourceSpans?.[0]||{};
      spans.push({...source,sourceText:condition.sourceText,sourceField:source.source_field||'source_conditions',sourceType:'condition',sourceSpans:condition.sourceSpans||[]});
    }
    return [...new Map(spans.map(item=>[JSON.stringify(item),item])).values()];
  }
  function bulletsFor(drug,options={}) {
    const normal=options.normal===true;
    const notice=(tag,text)=>[{color:'amber',tag,text}];
    if (!drug._amuLabel || !hasRetrievedOpenFdaLabel(drug)) {
      const external=(drug.dosingBullets || []).filter(b=>b.regimenProvenance&&regimenSourceDescriptor(b.regimenProvenance,b.evidence)&&externalRegimenFitsPatient(b,drug,getActiveClinicalDosingContext(),getActiveDosingPhysiology()));
      return normal?[]:external.length?external:notice('Regimen source unavailable','No verified product-label dosing passage was retrieved.');
    }
    if(fieldErrors.size)return normal?[]:notice('Branch inputs need correction','Correct the highlighted database-defined input before interpreting a regimen.');
    const entry=entryFor(drug);
    if(!entry||entry.pending){
      if(normal)return [];
      const request=requestFor(drug),key=keyFor(drug,request),position=jobs.findIndex(job=>job.key===key);
      return [{color:'blue',tag:'Label interpreter',text:entry?.phase==='queued'?'Waiting for label analysis'+(position>=0?' (queue position '+(position+1)+')':'')+'…':'Matching the retrieved label to the active filters…'}];
    }
    const result=entry.result,bullets=[],definitions=engine.database.fieldDefinitions,groups=new Map();
    const fieldLabel=name=>definitions[name]?.label || name;
    const activeContext=context(),values=patient(),policy=engine.database.policies.quantity?.physiologicalRenalAssumption;
    const needsMeasuredRenal=policy&&values[policy.missingField]==null&&Number.isFinite(values[policy.screenField])&&values[policy.screenField]<policy.minimumScreenValue;
    const physiologicalDefault=normalRenalDefaults(values)&&!activeCalculation();
    const normalized=value=>String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
    function append(record,index,pending){
      if(!pending&&record.status!==(normal?'reference_only':'resolved'))return;
      const missing=(record.missingFields||[]).filter(name=>own(definitions,name));
      if(pending&&(needsMeasuredRenal||physiologicalDefault)&&missing.some(name=>(policy.fields||['crcl']).includes(name)))return;
      let presentation;
      for(const id of record.formatMatches||[]){const format=formatById(id);const candidate=engine.database.presentations[format?.output?.presentationRef];if(candidate?.summaryFields){presentation=candidate;break;}}
      const concisePhase=values.antiviral_phase&&record.steps?.length===1&&record.steps[0].sequenceVerbatim&&record.dose?.tokens?.length===1&&record.schedule?.tokens?.length===1;
      const fieldValue=name=>{
        if(concisePhase&&name==='steps')return '';
        if(concisePhase&&name==='dose')return record.dose.tokens[0].text;
        if(concisePhase&&name==='schedule')return record.schedule.tokens[0].text;
        if(name==='steps'&&Array.isArray(record.steps))return record.steps.map((step,i)=>(i+1)+'. '+sourceText(step)).join(' → ');
        let value=sourceText(record[name]);
        if(name==='dose'&&record.dose?.quantityKind==='total_daily'){
          if(!/(?:\/\s*day|per\s+(?:day|24\s*hours?))\b/i.test(value))value+=' per day';
          if(record.dose.quantityComponent)value+=' ('+record.dose.quantityComponent+' component)';
        }
        const route=sourceText(record.route);
        if(name==='dose'&&route&&normalized(value).endsWith(' '+normalized(route)))value=value.slice(0,value.length-route.length).trim();
        return presentation?.summaryValueAliases?.[name]?.[normalized(value)] ?? value;
      };
      const summaryGroups=presentation?.summaryGroups || (presentation?.summaryFields||['dose','route','schedule','duration','steps','components','alternatives']).map(name=>[name]);
      const pieces=summaryGroups.map(names=>names.map(fieldValue).filter(Boolean).join(' ')).filter(Boolean);
      if(activeContext.browse){for(const name of ['indication','population']){const value=fieldValue(name);if(value&&!pieces.includes(value))pieces.push(value);}}
      const qualifiers=[...new Set((record.summaryQualifiers||[]).map(sourceText).filter(Boolean))];
      pieces.push(...qualifiers.filter(value=>!pieces.some(piece=>normalized(piece).includes(normalized(value)))));
      const text=[...new Set(pieces)].join(' — ');
      const assumptions=record.assumptions||[];
      const assumed=assumptions.some(assumption=>assumption.type==='physiological_renal');
      // Merge equivalent displayed schedules while retaining every contributing source.
      const constraints=(record.sourceStructure?.constraints||[]).filter(constraint=>pending||!presentation?.summaryConstraintFields||presentation.summaryConstraintFields.includes(constraint.field)).map(constraint=>({kind:constraint.kind,field:constraint.field,metric:constraint.metric,unit:constraint.unit,range:constraint.range,allowedValues:constraint.allowedValues})).sort((a,b)=>String(a.field).localeCompare(String(b.field)));
      const baseline=(record.conditions||[]).filter(condition=>condition.feature==='baseline_option').map(condition=>normalized(condition.sourceText)).sort();
      const key=JSON.stringify([normalized(text),pending,missing.slice().sort(),constraints,baseline,assumed]);
      const evidence=evidenceFor(record);
      if(groups.has(key)){
        const previous=groups.get(key),seen=new Set(previous.evidence.map(item=>JSON.stringify(item)));
        for(const item of evidence){const signature=JSON.stringify(item);if(!seen.has(signature)){previous.evidence.push(item);seen.add(signature);}}
        return;
      }
      const phenotypeReference=assumptions.some(item=>item.type==='label_phenotype_reference'),referenceSource=record.sourceIdentity?.status==='reference';
      const bullet={color:pending?'amber':'blue',tag:normal?'Normal dose — replaced by renal regimen':pending?'Source option — '+missing.map(fieldLabel).join(', ')+' needed':referenceSource?'Guideline reference — normal renal function':phenotypeReference?'Label dose — AST not supplied':assumed?'Dose — physiological renal function assumed':'Dose',text:text+(phenotypeReference?' · Isolate susceptibility not supplied; labelled phenotype/site reference only.':''),evidence,superseded:normal,labelProvenance:record.sourceIdentity||drug.labelProvenance,engineSource:engine.getSourceBadge(record)};
      groups.set(key,bullet);bullets.push(bullet);
    }
    (normal?result.normalRegimens||[]:result.regimens||[]).forEach((record,index)=>append(record,index,false));
    if(!normal&&!(result.regimens||[]).length)(result.pendingRegimens||[]).forEach((record,index)=>append(record,index,true));
    if(!bullets.length){
      if(normal)return [];
      const sourceMissing=[...new Set((result.unresolved || []).flatMap(record=>record.missingFields || []).filter(name=>own(definitions,name)))];
      const missing=sourceMissing.filter(name=>!(physiologicalDefault&&(policy.fields||['crcl']).includes(name)));
      const timedOut=(result.diagnostics || []).some(d=>['ANALYSIS_TIMEOUT','REGEX_DEADLINE','WORKER_START_TIMEOUT'].includes(d.code));
      const derived=calculation(),equation=activeCalculation();
      if(equation&&derived.status==='needs_inputs'&&sourceMissing.includes(equation.output.field))return notice('Equation inputs needed','To resolve this dose, complete '+(derived.result.missingFields||[]).map(fieldLabel).join(', ')+' for '+equation.label+'. Existing age and weight filters are reused.');
      if(equation&&derived.status==='unavailable'&&sourceMissing.includes(equation.output.field))return notice('Equation not applicable',derived.result?.message||'Enter a compatible measured '+fieldLabel(equation.output.field)+'.');
      const metricNeeded=needsMeasuredRenal&&missing.includes(policy.missingField);
      if(physiologicalDefault&&sourceMissing.some(name=>(policy.fields||['crcl']).includes(name))&&!missing.length&&!timedOut)return notice('Source matching incomplete','Physiological renal function is assumed. No complete normal-function regimen matched these filters; review the source structure and applicable indication.');
      if(!timedOut&&!missing.length&&result.excluded?.some(item=>item.reason==='ACTIVE_ALLERGY_FILTER'))return notice('Blocked by allergy filters','The selected product is blocked by the current allergy filters.');
      if(!timedOut&&!missing.length&&result.roi?.status==='context_not_found')return notice('No source region for this context','No dosing region establishes the selected disease and organism. Review the label ROI details below.');
      if(!timedOut&&!missing.length&&result.roi?.status==='unsupported_pattern')return notice('Label pattern needs review','A relevant source region was found, but no complete applicable regimen was extracted. Open Label ROI and patterns below to inspect or download the unmatched pattern.');
      return notice(timedOut?'Label matching timed out':metricNeeded?'CrCl required':'No matching label regimen',timedOut?'This label could not be matched within the processing deadline. Change a filter or reload the database to retry.':metricNeeded?'eGFR is below '+policy.minimumScreenValue+'; a compatible measured value or eligible source equation is required for this renal branch.':derived.status!=='inactive'&&derived.status!=='provided'&&derived.status!=='resolved'?'Complete the CrCl calculator or enter CrCl to select this label’s renal dose.':missing.length?'Enter '+missing.map(fieldLabel).join(', ')+' to match the applicable source branch.':'No complete source dose matched these filters. The full label and interpreter details are available for review.');
    }
    return bullets;
  }
  function renalView(drug) {
    const entry=entryFor(drug),result=entry?.result;
    if(!result?.renalSelection?.adjusted||entry.pending||fieldErrors.size)return {adjusted:false};
    const adjusted=bulletsFor(drug),normal=bulletsFor(drug,{normal:true});
    if(!adjusted.length)return {adjusted:false};
    return {adjusted:true,bullets:adjusted,normal,metrics:result.renalSelection.metrics||[],calculation:calculation().status==='resolved'?calculation().result:null};
  }
  function renderRenalPanel(drug,view=renalView(drug)) {
    if(!view.adjusted)return '';
    const fields=engine.database.fieldDefinitions,derived=view.calculation;
    const metrics=view.metrics.map(metric=>{
      const range=metric.range;
      const band=range?.lowerUnbounded?(range.upperInclusive?'≤':'<')+range.upper:range?.upperUnbounded?(range.lowerInclusive?'≥':'>')+range.lower:range.lower+'–'+range.upper;
      return escape(fields[metric.field]?.label||metric.field)+': '+escape(Number(metric.value.toFixed(2)))+' '+escape(metric.unit)+' · matched label band '+escape(band)+' '+escape(metric.unit);
    });
    return '<section data-renal-adjustment="matched" class="renal-vibrant-box text-white p-4 rounded-xl border border-white/20 space-y-2"><div class="font-extrabold text-sm">Renal-adjusted label regimen</div><p class="text-[11px]">'+metrics.join('<br>')+(derived?' · estimated with '+escape(derived.label):'')+'</p><ul class="space-y-2">'+view.bullets.map(b=>renderBulletItem({...b,tag:'Adjusted dose'},false,true)).join('')+'</ul>'+(derived?'<details class="text-[11px]"><summary class="cursor-pointer underline">CrCl calculation</summary><p class="mt-1">'+escape(derived.equation)+'</p><p>'+escape(Object.entries(derived.inputs).map(([name,value])=>name+': '+value).join(' · '))+'</p><a href="'+escape(derived.sourceIdentity.sourceUrl)+'" target="_blank" rel="noopener noreferrer" class="underline">FDA equation source ↗</a></details>':'')+'</section>';
  }
  function renderAnalysisDetails(drug) {
    const entry=entryFor(drug);
    if (!entry || entry.pending) return '';
    const result=entry.result;
    return (result.roi?'<details data-amu-roi="'+escape(drug.id)+'" class="mt-2 text-[11px] text-slate-700"><summary class="cursor-pointer font-semibold">Label ROI and patterns · '+escape(result.roi.status)+' · '+result.roi.selectedRegionCount+' selected regions</summary><div data-amu-roi-content></div></details>':'') + '<details data-amu-analysis="'+escape(drug.id)+'" class="mt-2 text-[10px] text-slate-600"><summary class="cursor-pointer font-semibold">Full interpreter result · '+escape(result.status)+' · database '+escape(result.databaseVersion || engine.database.databaseVersion)+'</summary><p class="mt-1">Includes all fields, source structure, ordered steps, alternatives, conditions, unresolved branches, exclusions, annotations and diagnostics.</p><div data-amu-analysis-content></div></details>';
  }
  function patternReport(drugId) {
    const drug=(typeof currentFetchedDrugs==='undefined'?[]:currentFetchedDrugs).find(item=>String(item.id)===String(drugId)),entry=drug&&entryFor(drug);
    if(!entry?.result?.roi||entry.pending)return null;
    return {reportType:'amu-roi-pattern-review/1',databaseVersion:engine.database.databaseVersion,engineVersion:root.AMUEngine.version,unmatchedPatterns:clone(entry.result.roi.unmatchedPatterns),notes:'Source passages and disabled format drafts only. No patient inputs are included. Review extraction rules and run source/boundary/exclusion tests before enabling a draft.'};
  }
  function downloadPatternReport(drugId) {
    const report=patternReport(drugId);if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');
    link.href=url;link.download='amu-unmatched-label-patterns.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  function renderRoiInspection(content,drug,result) {
    const roi=result.roi;if(!roi)return;
    const intro=document.createElement('p');intro.className='mt-2';intro.textContent='Clinical context → source region → reusable pattern → physiological conditions → patient filters → sourced bullet.';content.append(intro);
    for(const region of roi.regions){
      const box=document.createElement('details');box.className='mt-2 p-2 border rounded bg-white';const summary=document.createElement('summary');summary.className='cursor-pointer font-semibold';summary.textContent=(region.indication||region.kind)+' · '+region.status;box.append(summary);
      const info=document.createElement('p');info.className='mt-1';info.textContent='Patterns: '+(region.matchedFormats.join(', ')||'none')+'. Physiological keywords: '+([...new Set(region.physiology.map(m=>m.sourceText))].join(', ')||'none')+'. Linked passages: '+region.relationships.length+'.';box.append(info);
      const passage=document.createElement('pre');passage.className='mt-1 whitespace-pre-wrap max-h-64 overflow-auto';passage.textContent=region.sourceText;box.append(passage);
      if(region.constraints?.length){const constraints=document.createElement('pre');constraints.className='mt-1 whitespace-pre-wrap max-h-48 overflow-auto';constraints.textContent=JSON.stringify(region.constraints,null,2);box.append(constraints);}
      content.append(box);
    }
    if(roi.unmatchedPatterns.length){const button=document.createElement('button');button.type='button';button.className='mt-2 px-3 py-1 border rounded text-indigo-800 font-semibold';button.textContent='Download unmatched label patterns';button.addEventListener('click',()=>downloadPatternReport(drug.id));content.append(button);}
  }
  document.addEventListener('toggle',event=>{
    const details=event.target;
    if(!details.matches?.('details[data-amu-analysis],details[data-amu-roi]')||!details.isConnected)return;
    const content=details.querySelector('[data-amu-analysis-content],[data-amu-roi-content]');
    content.replaceChildren();
    if(!details.open)return;
    const drug=(typeof currentFetchedDrugs==='undefined'?[]:currentFetchedDrugs).find(item=>String(item.id)===(details.dataset.amuAnalysis||details.dataset.amuRoi));
    const entry=drug&&entryFor(drug);
    if(!entry||entry.pending){content.textContent='Analysis has changed. Wait for the current filters to finish matching.';return;}
    if(details.hasAttribute('data-amu-roi')){renderRoiInspection(content,drug,entry.result);return;}
    const pre=document.createElement('pre');
    pre.className='mt-2 p-2 bg-white border rounded max-h-80 overflow-auto whitespace-pre-wrap';
    pre.textContent=JSON.stringify(entry.result,null,2);
    content.append(pre);
  },true);
  function ruleCondition(condition, values) {
    if (!condition) return true;
    if (Array.isArray(condition.all)) {const results=condition.all.map(c => ruleCondition(c,values));return results.includes(false) ? false : results.includes(null) ? null : true;}
    if (Array.isArray(condition.any)) {const results=condition.any.map(c => ruleCondition(c,values));return results.includes(true) ? true : results.includes(null) ? null : false;}
    if (condition.not) {const value=ruleCondition(condition.not,values);return value===null ? null : !value;}
    const value=values[condition.field];
    if (value==null || condition.value==null) return null;
    switch (condition.op) {
      case 'eq':return value===condition.value;
      case 'ne':return value!==condition.value;
      case 'lt':return typeof value==='number' && typeof condition.value==='number' ? value<condition.value : null;
      case 'lte':return typeof value==='number' && typeof condition.value==='number' ? value<=condition.value : null;
      case 'gt':return typeof value==='number' && typeof condition.value==='number' ? value>condition.value : null;
      case 'gte':return typeof value==='number' && typeof condition.value==='number' ? value>=condition.value : null;
      case 'in':return Array.isArray(condition.value) ? condition.value.includes(value) : null;
      case 'contains':return Array.isArray(value) ? value.includes(condition.value) : typeof value==='string' ? value.includes(String(condition.value)) : null;
      default:return null;
    }
  }
  function matchingAppRules(collection, drug) {
    const values=patient();
    const db=engine?.database;
    let records;
    if(db){
      if(!appRuleIndexes.has(db))appRuleIndexes.set(db,new Map());
      const index=appRuleIndexes.get(db);
      if(!index.has(collection))index.set(collection,reference(collection)||[]);
      records=index.get(collection);
    }else records=reference(collection)||[];
    return records.filter(rule => {
      if (rule.enabled===false) return false;
      if (rule.drugNames?.length && !rule.drugNames.some(name => drugMatchesCuratedAgent(drug,name))) return false;
      if (rule.classTerms?.length && !rule.classTerms.some(term => (drug.epcClasses || []).some(text => text.toLowerCase().includes(String(term).toLowerCase())))) return false;
      return ruleCondition(rule.when,values)===true;
    });
  }
  function appRuleText(rule) {
    const values=patient();
    return String(rule.text || rule.label || '').replace(/\{([a-zA-Z0-9_]+)\}/g,(_,key) => values[key]==null ? 'unknown' : String(values[key]));
  }
  function additionalPatientFlags(drug) {
    return matchingAppRules('patientAlertRules',drug).map(rule => ({l:['red','amber','blue','emerald'].includes(rule.color) ? rule.color : 'amber',t:'<span class="font-semibold">Additional app reference:</span> '+escape(appRuleText(rule)),src:rule.src || 'age',evidenceSource:'app_reference'}));
  }
  function additionalRiskBadges(drug) {
    return matchingAppRules('riskBadgeRules',drug).map(rule => ({label:'App reference: '+appRuleText(rule),color:'bg-amber-100 text-amber-900 border-amber-300',icon:'fa-triangle-exclamation'}));
  }
  function refreshResistanceControls() {
    if (typeof resistanceSurveillanceDB==='undefined') return;
    const settings=reference('resistanceSettings') || {};
    const regions={...(settings.regions || {})}, grams={...(settings.gramFilters || {all:'All bacteria'})};
    for (const pathogen of resistanceSurveillanceDB) {
      if (pathogen.gram && !own(grams,pathogen.gram)) grams[pathogen.gram]=pathogen.gram;
      for (const drug of pathogen.drugs || []) for (const region of Object.keys(drug.rates || {})) if(!own(regions,region))regions[region]=region;
    }
    for (const [id,values] of [['regionSelect',regions],['gramSelect',grams]]) {
      const select=byId(id), previous=select.value;
      select.replaceChildren(...Object.entries(values).map(([value,label]) => new Option(label,value)));
      if (own(values,previous)) select.value=previous;
    }
    renderResistanceDashboard();
  }
  function resetBranchFields() {
    overrides=Object.create(null); fieldErrors.clear(); renderFields(); changed();
  }
  function clearPageOverride(name) {
    delete overrides[name];fieldErrors.delete(name);
    const toggle=byId('amuOverride_'+name),control=byId('amuField_'+name);
    if(toggle)toggle.checked=false;
    if(control){control.value='';control.disabled=true;}
  }
  function eraseTransientPatientState() {
    cancelRunning();calculationAbort?.abort();engine?.clearTransientState();renderState=null;
    document.querySelectorAll?.('[data-amu-analysis-content]').forEach(node=>node.replaceChildren());
    generation++;calculationJob++;liveSnapshot=null;overrides=Object.create(null);fieldErrors.clear();analyses.clear();jobs=[];automaticDemand={scope:null,required:[],renalFields:[]};calculationState={key:null,status:'inactive',result:null};
    if(typeof ptAge!=='undefined')ptAge=40;if(typeof ptKg!=='undefined')ptKg=70;if(typeof egfr!=='undefined')egfr=100;if(typeof crcl!=='undefined')crcl=null;if(typeof ptGaWeeks!=='undefined')ptGaWeeks=null;if(typeof ptPnaDays!=='undefined')ptPnaDays=null;
    document.querySelectorAll?.('input,select,textarea').forEach(control=>{control.setAttribute('autocomplete','off');if(control.type==='checkbox'||control.type==='radio')control.checked=control.defaultChecked||false;else if(control.type==='range')control.value=control.getAttribute('value')||control.min||'0';else if(control.tagName==='SELECT')control.selectedIndex=0;else if(control.type!=='file')control.value='';});
  }
  root.addEventListener?.('pagehide',eraseTransientPatientState);
  root.addEventListener?.('pageshow',event=>{if(event.persisted){eraseTransientPatientState();root.location?.reload();}});
  root.AMUApp=Object.freeze({bundleVersion,reference,lexicon,pediatricDoseFunctions,loadDatabase,queueAnalysis,bulletsFor,patternReport,downloadPatternReport,renalView,renderRenalPanel,renderAnalysisDetails,withRenderState,patient,context,calculation,isRenalCalculationActive:()=>!!activeCalculation(),normalRenalDefaults,eraseTransientPatientState,additionalPatientFlags,additionalRiskBadges,resetBranchFields,clearPageOverride,get engine(){return engine;},get database(){return engine?.database;},refreshResistanceControls});
  root.acceptLegalGate=() => byId('legalGateModal').classList.add('hidden');
  byId('amuDatabaseImport').addEventListener('change',event => {const file=event.target.files[0];if(file)loadDatabase(file);event.target.value='';});
  byId('amuReloadDatabase').addEventListener('click',() => loadDatabase());
  byId('amuResetFields').addEventListener('click',resetBranchFields);
  byId('amuLocalDatabaseTools').hidden=root.location.protocol!=='file:';
  loadDatabase();
})(window);
