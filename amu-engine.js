/* AMU Engine 1.1.2 — one-file interpreter for amu-database.json.
 * Browser: const engine = await AMUEngine.load('./amu-database.json');
 * Node: const { AMUEngine } = require('./amu-engine.js');
 * await engine.analyze({ label, patient, clinicalContext });
 * Formats, role rules, grammars, fields, pipelines and presentation definitions
 * are read from the database. No dispatch on format IDs or drug names exists.
 * Unknown operations/capabilities fail explicitly; unknown clinical facts never match.
 * Source adapters must retain provenance. No patient data is persisted or transmitted.
 */
function engineFactory(isolated) {
'use strict';
isolated = isolated === true;
const VERSION='1.1.2', PROTOCOL='amu-declarative-label-rules/1';
const OPERATIONS=new Set(['select','bind_roles','inherit_scope','tokenize','group','join','filter','require','project','attach_evidence','emit','annotate','exclude']);
const EXPRESSIONS=new Set(['all','any','not','eq','ne','gt','gte','lt','lte','exists','matches','in','contains','count','add','subtract','multiply','divide','minimum','maximum','coalesce','if','range_contains','quantity_compare']);
const FORBIDDEN=new Set(['__proto__','prototype','constructor']);
const own=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const arr=x=>Array.isArray(x)?x:[];
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const unique=a=>{const out=[],seen=new Set();for(const x of a){const k=JSON.stringify(x);if(!seen.has(k)){seen.add(k);out.push(x)}}return out};
const clean=x=>String(x==null?'':x).trim();
const canonicalRaw=s=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const canonicalMemo=new Map();
const canonical=x=>{const s=clean(x);if(s.length>256)return canonicalRaw(s);let v=canonicalMemo.get(s);if(v===undefined){v=canonicalRaw(s);if(canonicalMemo.size>=20000)canonicalMemo.clear();canonicalMemo.set(s,v);}return v;};
const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
class EngineError extends Error { constructor(code,message,details={}){super(message);this.name='AMUEngineError';this.code=code;this.details=details;} }
function fail(code,message,details){throw new EngineError(code,message,details)}
function get(o,p){if(typeof p!=='string')return undefined;let v=o;for(const k of p.split('.')){if(FORBIDDEN.has(k)||!own(v,k))return undefined;v=v[k]}return v}
function mergeInto(out,b){for(const[k,v]of Object.entries(b)){if(FORBIDDEN.has(k))fail('UNSAFE_KEY','Prototype keys are not permitted');if(obj(v)&&obj(out[k]))mergeInto(out[k],v);else out[k]=clone(v)}}
function mergeShared(a,b){if(!obj(b)||!obj(a))return b;const out={...a};for(const[k,v]of Object.entries(b)){if(FORBIDDEN.has(k))fail('UNSAFE_KEY','Prototype keys are not permitted');out[k]=obj(v)&&obj(a[k])?mergeShared(a[k],v):v}return out}
function merge(a,b){if(!obj(b))return clone(b);const out=obj(a)?clone(a):{};mergeInto(out,b);return out}
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);for(const v of Object.values(x))freeze(v)}return x}
function parameterize(x,params,depth=0,share=false){if(depth>64)fail('PARAMETER_DEPTH','Parameter nesting exceeds limit');if(Array.isArray(x))return x.map(v=>parameterize(v,params,depth+1,share));if(!obj(x))return x;if(Object.keys(x).length===1&&own(x,'parameter')){if(!own(params,x.parameter))fail('MISSING_PARAMETER','Missing pipeline parameter',{parameter:x.parameter});return share?params[x.parameter]:clone(params[x.parameter])}const out={};for(const[k,v]of Object.entries(x))out[k]=parameterize(v,params,depth+1,share);return out}
function walk(x,fn,depth=0){if(depth>96)fail('BUNDLE_DEPTH','Database nesting exceeds limit');fn(x);if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){if(FORBIDDEN.has(k))fail('UNSAFE_KEY','Prototype keys are not permitted');walk(v,fn,depth+1)}}
function versionParts(v){return String(v).split('.').map(x=>Number(x)||0)}
function versionAtLeast(a,b){const x=versionParts(a),y=versionParts(b);for(let i=0;i<3;i++){if(x[i]>y[i])return true;if(x[i]<y[i])return false}return true}
function validateBundle(input){
 if(!obj(input))fail('INVALID_DATABASE','Database must be a JSON object');
 if(String(input.schemaVersion||'').split('.')[0]!=='1')fail('SCHEMA_VERSION','Unsupported database schema version');
 const db=clone(input), required=['compatibility','contract','operationContract','roleRules','tokenGrammars','fieldDefinitions','pipelines','mappings','formats','policies','units','presentations'];
 for(const k of required)if(!own(db,k))fail('INVALID_DATABASE','Missing database member',{member:k});
 if(db.compatibility.protocol!==PROTOCOL||db.contract.protocol!==PROTOCOL)fail('PROTOCOL_MISMATCH','Unsupported database protocol');
 if(!versionAtLeast(VERSION,db.compatibility.minimumInterpreterVersion||'1.0.0'))fail('ENGINE_VERSION_REQUIRED','Database requires a newer interpreter');
 const capabilities=new Set([...OPERATIONS].map(x=>x+'/1').concat('regex_deadline/1','roi/1'));
 for(const c of arr(db.compatibility.requiresCapabilities))if(!capabilities.has(c))fail('UNSUPPORTED_CAPABILITY','Unknown required capability',{capability:c});
 if(!Array.isArray(db.formats)||!db.formats.length)fail('INVALID_DATABASE','Database has no formats');
 if(!obj(db.pipelines)||!obj(db.roleRules)||!obj(db.tokenGrammars)||!obj(db.fieldDefinitions))fail('INVALID_DATABASE','Invalid database collection type');
 if(db.formats.length>10000)fail('BUNDLE_LIMIT','Too many format definitions');
 const maxPattern=Math.min(16384,db.contract.expansion?.limits?.maximumPatternCharacters||4096);
 walk(db,x=>{if(obj(x)&&typeof x.pattern==='string'&&typeof x.flags==='string'){if(x.pattern.length>maxPattern||!/^[gimsu]*$/.test(x.flags)||new Set(x.flags).size!==x.flags.length)fail('INVALID_PATTERN','Invalid regex definition');try{new RegExp(x.pattern,x.flags)}catch(e){fail('INVALID_PATTERN',e.message)}}});
 const expressionCheck=x=>{if(obj(x)&&own(x,'op')&&!EXPRESSIONS.has(x.op))fail('UNKNOWN_EXPRESSION','Unknown expression operation',{operation:x.op});};
 walk({formats:db.formats,defaults:db.defaults,mappings:db.mappings,policies:db.policies.applicabilityRules||{},sourceCalculations:db.policies.sourceCalculations||{}},expressionCheck);
 if(db.schema){const errors=schemaErrors(db,db.schema);if(errors.length)fail('DATABASE_SCHEMA','Database structure violates its schema',{errors});}
 const ids=new Set(),validatedPipelines=new Set();
 for(const f of db.formats){
  if(!obj(f)||typeof f.id!=='string'||!f.id||ids.has(f.id))fail('DUPLICATE_FORMAT','Invalid or duplicate format ID',{id:f?.id});ids.add(f.id);
  if(!['extractor','overlay','exclusion'].includes(f.mode))fail('INVALID_FORMAT','Invalid format mode',{id:f.id});
  if(!obj(f.recognition)||!obj(f.processing)||!own(db.pipelines,f.processing.pipelineRef))fail('UNKNOWN_PIPELINE','Format pipeline does not exist',{id:f.id});
  if(!own(db.policies,f.evidencePolicyRef))fail('UNKNOWN_EVIDENCE_POLICY','Missing evidence policy',{id:f.id});
  if(!own(db.presentations,f.output?.presentationRef))fail('UNKNOWN_PRESENTATION','Missing presentation',{id:f.id});
  for(const k of arr(f.applicability?.fieldRefs))if(!own(db.fieldDefinitions,k))fail('UNKNOWN_FIELD','Unknown applicability field',{format:f.id,field:k});
  for(const binding of Object.values(f.bindings||{})){if(binding.roleRef&&!own(db.roleRules,binding.roleRef))fail('UNKNOWN_ROLE','Unknown role binding');if(binding.grammarRef&&!own(db.tokenGrammars,binding.grammarRef))fail('UNKNOWN_GRAMMAR','Unknown token grammar');}
  const pipelineKey=JSON.stringify([f.mode,f.processing.pipelineRef,f.processing.parameters||{}]);if(validatedPipelines.has(pipelineKey))continue;
  validatedPipelines.add(pipelineKey);
  const params=mergeShared(db.defaults?.processingParameters?.[f.mode]||{},f.processing.parameters||{}), seen=new Set(['label.nodes']);
  const pipeline=db.pipelines[f.processing.pipelineRef];if(!Array.isArray(pipeline.stages)||pipeline.stages.length>(db.contract.expansion?.limits?.maximumStagesPerPipeline||64))fail('INVALID_PIPELINE','Invalid pipeline stages');
  for(const s of pipeline.stages){
   if(!OPERATIONS.has(s.operation)||!own(db.operationContract,s.operation))fail('UNKNOWN_OPERATION','Unknown pipeline operation',{operation:s.operation});
   if(!seen.has(s.input)||seen.has(s.output)||typeof s.output!=='string')fail('PIPELINE_DEPENDENCY','Pipeline has invalid ordering or reused output',{stage:s.id});
   const a=parameterize(s.arguments||{},params,0,true);
   for(const k of arr(db.operationContract[s.operation].requiredArguments))if(!own(a,k))fail('MISSING_ARGUMENT','Missing operation argument',{stage:s.id,key:k});
   if(a.roleRulesRef&&!obj(get(db,a.roleRulesRef)))fail('UNKNOWN_REFERENCE','Role rules reference not found');
   for(const g of arr(a.grammarRefs))if(!own(db.tokenGrammars,g))fail('UNKNOWN_GRAMMAR','Pipeline grammar not found',{grammar:g});
   if(a.mappingRef&&!obj(get(db,a.mappingRef)))fail('UNKNOWN_REFERENCE','Output mapping not found');
   if(a.schemaRef&&!obj(get(db,a.schemaRef)))fail('UNKNOWN_REFERENCE','Output schema not found');
   if(a.presentationRef&&!own(db.presentations,a.presentationRef))fail('UNKNOWN_PRESENTATION','Output presentation not found');
   walk(a,expressionCheck);seen.add(s.output);
  }
 }
 validateRoiPolicy(db);
 return freeze(db);
}
function schemaErrors(value,schema,root=schema,depth=0,p='$',runtime=null){
 if(depth>64)return [p+': schema recursion limit'];if(!schema||typeof schema!=='object')return [];
 if(schema.$ref){if(!schema.$ref.startsWith('#/'))return [p+': external schemas are unsupported'];const ref=schema.$ref.slice(2).split('/').reduce((v,k)=>v&&own(v,k)?v[k]:undefined,root);return ref?schemaErrors(value,ref,root,depth+1,p,runtime):[p+': missing schema reference'];}
 if(schema.anyOf&&!schema.anyOf.some(s=>!schemaErrors(value,s,root,depth+1,p,runtime).length))return [p+': no schema branch matches'];
 if(schema.oneOf&&schema.oneOf.filter(s=>!schemaErrors(value,s,root,depth+1,p,runtime).length).length!==1)return [p+': oneOf must match once'];
 let errors=[];for(const s of arr(schema.allOf))errors.push(...schemaErrors(value,s,root,depth+1,p,runtime));
 const type=value===null?'null':Array.isArray(value)?'array':Number.isInteger(value)?'integer':typeof value;
 const types=Array.isArray(schema.type)?schema.type:[schema.type];if(schema.type&&!types.some(t=>t===type||(t==='number'&&type==='integer')))return [p+': incorrect type'];
 if(schema.enum&&!schema.enum.some(x=>JSON.stringify(x)===JSON.stringify(value)))errors.push(p+': value outside enum');
 if(own(schema,'const')&&JSON.stringify(schema.const)!==JSON.stringify(value))errors.push(p+': const differs');
 if(typeof value==='number'){if(!Number.isFinite(value))errors.push(p+': nonfinite number');if(own(schema,'minimum')&&value<schema.minimum)errors.push(p+': below minimum');if(own(schema,'maximum')&&value>schema.maximum)errors.push(p+': above maximum');}
 if(typeof value==='string'){if(own(schema,'minLength')&&value.length<schema.minLength)errors.push(p+': short string');if(schema.pattern&&runtime&&!runtime.match({pattern:schema.pattern,flags:''},value))errors.push(p+': invalid string pattern');}
 if(Array.isArray(value)){if(own(schema,'minItems')&&value.length<schema.minItems)errors.push(p+': too few items');if(own(schema,'maxItems')&&value.length>schema.maxItems)errors.push(p+': too many items');if(schema.items)value.forEach((v,i)=>errors.push(...schemaErrors(v,schema.items,root,depth+1,p+'.'+i,runtime)));}
 if(obj(value)){for(const k of arr(schema.required))if(!own(value,k))errors.push(p+': missing '+k);for(const[k,v]of Object.entries(value)){if(schema.properties&&own(schema.properties,k))errors.push(...schemaErrors(v,schema.properties[k],root,depth+1,p+'.'+k,runtime));else if(schema.additionalProperties===false)errors.push(p+': unexpected '+k);}}
 return errors;
}
const compiledDatabases=new WeakMap();
function compiledDatabase(db){
 if(compiledDatabases.has(db))return compiledDatabases.get(db);
 const compiled={regex:new Map(),byIdentity:new WeakMap(),stages:null,dispatch:new Map(),unrestricted:[],entries:[]},expandedPipelines=new Map();
 const kinds=expression=>{
  if(obj(expression)&&own(expression,'forEach'))return null;
  if(expression?.op==='eq')for(const [a,b]of [[expression.left,expression.right],[expression.right,expression.left]])if(a?.path==='scope.kind'&&typeof b==='string')return new Set([b]);
  if(expression?.op==='all'){let result=null;for(const child of arr(expression.args)){const found=kinds(child);if(found)result=result?new Set([...result].filter(kind=>found.has(kind))):found;}return result;}
  if(expression?.op==='any'){const parts=arr(expression.args).map(kinds);return parts.length&&parts.every(Boolean)?new Set(parts.flatMap(part=>[...part])):null;}
  return null;
 };
 const labelOnly=expression=>{let valid=true,found=false;walk(expression,item=>{if(obj(item)&&['forEach','keyFrom','metricFrom','unitFrom'].some(key=>own(item,key)))valid=false;if(obj(item)&&typeof item.path==='string'){found=true;if(!item.path.startsWith('label.identity.'))valid=false;}});return valid&&found;};
 const guards=expression=>obj(expression)&&own(expression,'forEach')?[]:expression?.op==='all'?arr(expression.args).flatMap(guards):labelOnly(expression)?[expression]:[];
 // Stages are expanded on first use: only formats that actually run need their parameters bound,
 // and every pipeline/parameter reference was already validated by validateBundle.
 const stageCache=new Map();
 compiled.stages={get(format){let stages=stageCache.get(format);if(stages)return stages;const pipelineKey=JSON.stringify([format.mode,format.processing.pipelineRef,format.processing.parameters||{}]);if(!expandedPipelines.has(pipelineKey)){const params=merge(db.defaults?.processingParameters?.[format.mode]||{},format.processing.parameters||{});expandedPipelines.set(pipelineKey,db.pipelines[format.processing.pipelineRef].stages.map(stage=>({...stage,arguments:parameterize(stage.arguments,params)})));}stages=expandedPipelines.get(pipelineKey);stageCache.set(format,stages);return stages;}};
 for(const format of db.formats){
  if(!format.enabled||inactiveRoiDraft(format))continue;
  const allowed=kinds(format.recognition),entry={format,order:compiled.entries.length,guards:guards(format.recognition),kinds:allowed};compiled.entries.push(entry);
  if(!allowed)compiled.unrestricted.push(entry);else for(const kind of allowed){if(!compiled.dispatch.has(kind))compiled.dispatch.set(kind,[]);compiled.dispatch.get(kind).push(entry);}
 }
 compiledDatabases.set(db,compiled);return compiled;
}
function regexRuntime(db){
 if(!isolated)fail('ISOLATION_REQUIRED','Database regex evaluation requires an isolated worker');
 const compiled=compiledDatabase(db),cache=compiled.regex,byIdentity=compiled.byIdentity;let started=now(),budget=Math.min(10000,Math.max(1,db.contract.expansion?.regexExecution?.maximumEvaluationMilliseconds||100));let ticks=0;
 const checkDeadline=()=>{if(now()-started>budget)fail('REGEX_DEADLINE','Database processing exceeded its deadline');};
 // One compiled entry per distinct pattern: the plain regex and its global twin are built once.
 const entryFor=p=>{
  const isObject=p!==null&&typeof p==='object';
  if(isObject){const hit=byIdentity.get(p);if(hit&&hit.pattern===p.pattern&&hit.flags===p.flags)return hit;}
  const key=p.pattern+'\0'+(p.flags||'');let entry=cache.get(key);
  if(!entry){entry={re:new RegExp(p.pattern,(p.flags||'').replace(/g/g,'')),g:null,pattern:p.pattern,flags:p.flags};cache.set(key,entry);}
  if(isObject)byIdentity.set(p,entry);
  return entry;
 };
 const compile=p=>{checkDeadline();return entryFor(p).re;};
 const copyGroups=g=>{const out={};if(g)for(const k of Object.keys(g)){const v=g[k];if(v!==undefined)out[k]=v;}return out;};
 return {checkDeadline,tick(){if((++ticks&63)===0)checkDeadline();},restart(milliseconds){started=now();budget=Math.min(10000,Math.max(1,milliseconds));},match(p,text){return compile(p).test(String(text??''));},captures(p,text){
  const input=String(text??'');if(input.length>(db.contract.expansion?.limits?.maximumMatchedTextCharacters||100000))fail('TEXT_LIMIT','Source text exceeds configured limit');
  checkDeadline();const entry=entryFor(p);
  if(!entry.g)entry.g=new RegExp(entry.re.source,unique((p.flags||'').replace(/g/g,'').split('').concat('g')).join(''));
  const re=entry.g;re.lastIndex=0;const out=[];let m;
  while((m=re.exec(input))!==null){out.push({text:m[0],index:m.index,end:m.index+m[0].length,groups:copyGroups(m.groups)});if(!m[0].length)re.lastIndex++;if(out.length>2000)fail('TOKEN_LIMIT','Too many source captures');checkDeadline();}
  return out;}};
}
function evidenceOf(x){return unique(arr(x?.sourceSpans).concat(arr(x?.evidence))).filter(s=>s&&s.document_id&&s.node_id&&s.source_field&&typeof s.quote==='string'&&s.quote.length>0);}
function field(text,spans,extra={}){return {sourceText:clean(text),sourceSpans:unique(spans),...extra};}
function normalizeMatchText(text,db,runtime){let out=canonical(text);for(const r of arr(db.lexicons?.wordingEquivalents)){if(r.pattern?.pattern){const re=new RegExp(r.pattern.pattern,(r.pattern.flags||'').includes('g')?r.pattern.flags:(r.pattern.flags||'')+'g');runtime.checkDeadline();out=out.replace(re,r.replacement);}}return out;}
function phrase(text,term){const h=' '+canonical(text)+' ',n=' '+canonical(term)+' ';return n.trim()!==''&&h.includes(n);}
function expandContext(value,db){const out=new Set([canonical(value)]);const a=db.lexicons?.abbreviations||{};for(const v of [...out])if(a[v])out.add(canonical(a[v]));for(const rule of arr(db.lexicons?.contextAliases)){if([...out].some(v=>arr(rule.triggers).some(t=>phrase(v,t))))for(const v of arr(rule.add))out.add(canonical(v));}return [...out].filter(Boolean);}
function sourceBadge(record,db){
 const p=record?.sourceIdentity||record?.identity||record?.labelProvenance||{};
 if(p.testOnly||record?.testOnly)return null;
 const sourceId=clean(p.sourceId||p.source).toLowerCase(),source=db.sourceRegistry?.[sourceId];
 if(!source||(p.retrievalStatus||p.status)!==(source.retrievalStatusRequired||'retrieved'))return null;
 let url;try{url=new URL(p.sourceUrl||p.url);if(url.protocol!=='https:'||!arr(source.officialHosts).some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))return null;}catch{return null;}
 const ev=arr(record?.dose?.sourceSpans).concat(arr(record?.evidence));if(!ev.some(s=>clean(s.quote||s.sourceText)))return null;
 const doc=p.document_id||p.documentId||p.labelId; if(doc&&ev.some(s=>s.document_id!==doc))return null;
 if(source.maySupplyFdaBadge&&(!(p.labelId||p.setId)||!ev.some(s=>/^dosage_and_administration(?:_table)?$/.test(s.source_field||s.sourceField||''))))return null;
 return {label:source.displayName,sourceId,url:url.href,verified:true};
}
function envFor(state,node,candidate=null,scope=null,features=null){return {label:state.label,patient:state.patient,clinicalContext:state.context,node,candidate:candidate||node?.candidate||node,scope:scope||node?.scope||node,features:features||node?.features||{},input:node};}
function evaluate(x,env,state){return evaluateExpression(x,env,state.db,state.runtime);}
function rolesFor(headers,db,runtime){
 const cache=runtime.roleCache||(runtime.roleCache=new Map()),key=JSON.stringify(headers);if(cache.has(key))return {...cache.get(key)};
 const out={};for(const[name,rule]of Object.entries(db.roleRules)){let yes=false;for(const rawHeader of headers){const h=String(rawHeader).split(' — ')[0];if(!runtime.match(rule.matches,h))continue;if(arr(rule.excludeHeaderPatterns).some(p=>runtime.match(p,h)))continue;yes=true;}out[name]=yes;}
 // Role exclusions depend on independently recognized roles, not object iteration order.
 const raw={...out};for(const[name,rule]of Object.entries(db.roleRules))if(out[name]&&arr(rule.excludeRoles).some(r=>raw[r]))out[name]=false;
 cache.set(key,{...out});return out;
}
function promoteSourceHeaders(state){
 const nodes=state.label.nodes,rt=state.runtime,db=state.db;
 for(const table of nodes.filter(node=>node.kind==='table')){
  if(arr(table.headers).some(clean))continue;
  const rows=nodes.filter(node=>node.kind==='table.row'&&node.table_id===table.id);
  const row=rows.slice(0,3).reverse().find(row=>{
   const cells=arr(row.cells);if(cells.length<2||new Set(cells.map(cell=>cell.id)).size<2)return false;
   if(cells.some(cell=>rt.match(db.tokenGrammars.mass_activity_amount,cell.text)))return false;
   const roles=cells.map(cell=>rolesFor([cell.text],db,rt));
   return (roles.some(role=>role.dose)||roles.some(role=>role.renal)&&rolesFor([table.caption||''],db,rt).dose||roles.filter(role=>role.population).length>=2&&rows.slice(0,rows.indexOf(row)).some(parent=>parent.cells.some(cell=>rolesFor([cell.text],db,rt).dose)))&&roles.filter(role=>Object.values(role).some(Boolean)).length>=2;
  });
  if(!row)continue;
  const headers=row.cells.map(cell=>{const ownRoles=rolesFor([cell.text],db,rt),parent=rows.slice(0,rows.indexOf(row)).map(r=>r.cells[cell.column_index]).reverse().find(c=>c&&rolesFor([c.text],db,rt).dose);return ownRoles.population&&parent?parent.text+' '+cell.text:cell.text;}),headerIds=row.cells.map(cell=>cell.id);
  table.headers=headers;table.inferredColumnHeaders=true;row.kind='table.header';
  for(const cell of row.cells){const header=nodes.find(node=>node.id===cell.id);if(header)header.kind='table.header';}
  let population=null;
  for(const body of rows){
   if(body.row_index<=row.row_index)continue;
   const nonempty=arr(body.cells).filter(cell=>clean(cell.text));
   if(nonempty.length===1&&rt.match(db.roleRules.population.matches,nonempty[0].text)&&!rt.match(db.tokenGrammars.mass_activity_amount,nonempty[0].text)){
    const id=body.id+':population';population={id,kind:'section.heading',text:nonempty[0].text,source_field:body.source_field,document_id:body.document_id,section_id:id,table_id:body.table_id,sourceSpans:evidenceOf(nonempty[0]),relations:{}};nodes.push(population);body.kind='table.header';continue;
   }
   body.headers=headers;body.inferredColumnHeaders=true;
   if(population)body.relations.section_parent=unique(arr(body.relations.section_parent).concat(population.id));
   for(const cell of arr(body.cells)){cell.headers=headers[cell.column_index]?[headers[cell.column_index]]:[];cell.relations.header_parent=[headerIds[cell.column_index]];}
  }
  for(const column of nodes.filter(node=>node.table_id===table.id&&node.kind==='table.column')){column.text=headers[column.column_index]||'';column.headers=[column.text];column.sourceSpans=evidenceOf(row.cells[column.column_index]);}
 }
}
function prepareTableSourceScopes(state){
 const rules=state.db.lexicons?.sourceScopeRules,nodes=state.label.nodes,rt=state.runtime,additions=[];
 if(!rules?.tablePopulationHeading&&!rules?.tablePrefaceQualification)return;
 const sources=nodes.filter(node=>node.kind==='section.heading'&&node.source_field==='dosage_and_administration'&&evidenceOf(node).some(span=>span.quote.length>node.text.length));
 for(const table of nodes.filter(node=>node.kind==='table')){
  if(arr(table.headers).filter(header=>rolesFor([header],state.db,rt).population).length>=2)continue;
  const rows=nodes.filter(node=>node.kind==='table.row'&&node.table_id===table.id),anchor=rows.find(row=>rt.match(state.db.tokenGrammars.mass_activity_amount,row.text));if(!anchor)continue;
  const needle=canonical(anchor.text).slice(0,180),matches=[];if(needle.length<35)continue;
  for(const section of sources)for(const span of evidenceOf(section)){
   const text=span.quote,normalized=canonical(text),position=normalized.indexOf(needle);
   if(position<0||normalized.indexOf(needle,position+1)>=0)continue;
   matches.push({section,span,text,position});
  }
  if(matches.length!==1)continue;
  const source=matches[0],heads=rules.tablePopulationHeading?rt.captures(rules.tablePopulationHeading,source.text).filter(match=>canonical(source.text.slice(0,match.index)).length<source.position):[];
  const localPopulation=arr(anchor.relations?.section_parent).some(id=>{const heading=nodes.find(node=>node.id===id);return (heading?.table_id===table.id||heading?.headingLevel!=null)&&sourceAxisConstraints(heading,state).some(axis=>axis.field==='age');});
  const selected=[];if(heads.length&&!localPopulation)selected.push(heads[heads.length-1]);
  if(rules.tablePrefaceQualification)for(const match of rt.captures(rules.tablePrefaceQualification,source.text)){
   const start=canonical(source.text.slice(0,match.index)).length,end=canonical(source.text.slice(0,match.end)).length;
   if(end<=source.position&&source.position-start<=(rules.tablePrefaceMaximumCharacters||700))selected.push(match);
  }
  for(const [index,match]of selected.entries()){
   const id=table.id+':source-scope:'+index,text=match.groups.scope||match.text;
   const heading={id,kind:'section.heading',text,source_field:source.section.source_field,document_id:table.document_id,section_id:id,table_id:table.id,sourceSpans:[{...source.span,node_id:id,quote:match.text,start:match.index,end:match.end}],relations:{}};
   additions.push(heading);for(const row of rows)row.relations.section_parent=unique(arr(row.relations.section_parent).concat(id));
  }
 }
 nodes.push(...additions);
}
function splitPopulationClauses(state){
 const rules=state.db.lexicons.sourceScopeRules,separator=rules.populationClauseSeparator,heading=rules.populationClauseHeading;if(!separator||!heading)return;
 const nodes=[];
 for(const node of state.label.nodes){
  if(node.kind!=='prose.clause'||state.runtime.captures(state.db.tokenGrammars.mass_activity_amount,node.text).length<2){nodes.push(node);continue;}
  const cuts=state.runtime.captures(separator,node.text),starts=[0,...cuts.map(c=>c.end)],ends=[...cuts.map(c=>c.index),node.text.length];
  const parts=starts.map((start,i)=>({start,text:node.text.slice(start,ends[i]).trim()}));
  if(parts.length<2||parts.some(part=>!state.runtime.match(heading,part.text))){nodes.push(node);continue;}
  for(const [i,part]of parts.entries()){const id=node.id+':population-part:'+i;nodes.push({...clone(node),id,text:part.text,sourceSpans:evidenceOf(node).map(span=>({...span,node_id:id,quote:part.text,start:(span.start||0)+part.start,end:(span.start||0)+part.start+part.text.length}))});}
 }
 state.label.nodes=nodes;
}
function prepareSourceNodes(state){
 splitPopulationClauses(state);
 const atomic=state.db.lexicons.sourceScopeRules.adultAtomicLeadIn;
 if(atomic)for(const node of state.label.nodes.filter(node=>node.kind==='prose.clause')){
  const found=state.runtime.captures(atomic,node.text)[0];
  if(!found||!state.runtime.match(atomic.prefixPattern,node.text.slice(0,found.index)))continue;
  node.sourceSpans=evidenceOf(node).map(span=>({...span,quote:found.text,start:(span.start||0)+found.index,end:(span.start||0)+found.end}));node.text=found.text;
 }
 promoteSourceHeaders(state);
 prepareSourceScopes(state);
 prepareTableSourceScopes(state);
 const db=state.db,rt=state.runtime,index=new Map(state.label.nodes.map(n=>[n.id,n]));
 state.index=index;
 for(const table of state.label.nodes.filter(node=>node.kind==='table')){
  const rule=db.lexicons.sourceScopeRules.tableDoseUnit,unit=rule&&rt.captures(rule,table.caption||'')[0];
  if(unit&&db.units[unit.groups.unit]?.dimension==='mass')table.declaredDoseUnit={unit:unit.groups.unit,evidence:state.label.nodes.filter(node=>node.table_id===table.id&&node.kind==='table.caption').flatMap(evidenceOf)};
 }
 for(const node of state.label.nodes){
  const cells=arr(node.cells);node.roles=rolesFor([node.kind==='table.header'||node.kind==='table.column'?node.text:''].concat(arr(node.headers)),db,rt);
  for(const c of cells)c.roles=rolesFor(arr(c.headers),db,rt);
  const owner=state.index.get(node.table_id);
  if(owner?.declaredDoseUnit)for(const cell of cells)if(!cell.roles.renal&&/^\s*\d/.test(cell.text)&&rt.match(db.tokenGrammars.frequency,cell.text)){
   cell.roles.dose=true;cell.roles.indication=false;cell.inheritedDoseUnit=owner.declaredDoseUnit;
  }
  if(db.roleRules.indication?.inferFromUnlabeledFirstColumn&&cells.length>1&&!clean(node.headers?.[0])&&cells.slice(1).some(cell=>cell.roles?.dose))cells[0].roles.indication=true;
 }
 expandIndicationColumns(state);
 expandPopulationColumns(state);
 splitCellRegimenOptions(state);
 splitProseRegimenOptions(state);
}
function finishNodes(state){
 const db=state.db,rt=state.runtime,index=state.index;
 expandRenalColumns(state);
 for(const node of state.label.nodes){
  const owner=node.kind==='table'?node:index.get(node.table_id),headers=owner?arr(owner.headers):arr(node.headers);
  const roleCounts={};for(const h of headers){const roles=rolesFor([h],db,rt);for(const[k,v]of Object.entries(roles))if(v)roleCounts[k]=(roleCounts[k]||0)+1;}
  if(owner?.declaredDoseUnit)roleCounts.dose=Math.max(roleCounts.dose||0,headers.length-1);
  const features={roles:Object.fromEntries(Object.keys(db.roleRules).map(k=>[k,{count:roleCounts[k]||0}])),inferredHeaderRoles:false,componentCount:0};
  if(owner&&headers.length===2&&headers.every(h=>!Object.values(rolesFor([h],db,rt)).some(Boolean))){
   const rows=state.label.nodes.filter(n=>n.kind==='table.row'&&n.table_id===owner.id);
   const doseGrammar=db.tokenGrammars.mass_activity_amount;
   if(rows.length&&rows.every(r=>r.cells?.length===2&&arr(db.lexicons?.indicationTerms).some(t=>phrase(r.cells[0].text,t))&&doseGrammar&&rt.match(doseGrammar,r.cells[1].text))){features.inferredHeaderRoles=true;features.roles.indication={count:1};features.roles.dose={count:1};node.inferredRoles=['indication','dose'];}
  }
  node.features=features;
 }
 state.scopes=state.label.nodes.filter(n=>['table','prose.clause','section.heading','table.header','table.column','table.caption','footnote'].includes(n.kind)).map(n=>({node:n,scope:{...n,kind:n.kind==='table'?'table':n.kind,text:n.text},features:n.features}));
}
// Source-scoped ROI planning precedes format recognition. The plan contains no
// patient values and is rebuilt for each clinical context, even on a source hit.
function inactiveRoiDraft(format){const status=format?.documentation?.roiPattern?.status;return typeof status==='string'&&status!=='validated';}
function shapeRoiDraft(reference,region,policy,sourceDocument){
 const draft=clone(reference),shape=region.shape,scopeKind=region.kind==='table.row'?'table':'prose.clause';
 draft.id=shape.fingerprint;draft.version=1;draft.enabled=false;draft.priority=60;
 draft.recognition={op:'all',args:[{op:'eq',left:{path:'scope.kind'},right:scopeKind},{op:'eq',left:{path:'features.roi.selected'},right:true},{op:'contains',left:{path:'features.roi.fingerprints'},right:shape.fingerprint}]};
 draft.applicability={fieldRefs:[],missingValue:'unresolved',conflictingValues:'unresolved'};
 draft.output={...draft.output,mayCreateRegimen:false};
 draft.documentation={summary:'Unmatched ROI pattern draft. Recognition is limited to this structural fingerprint and stays disabled until source review and executable tests.',observedShape:shape,sourceDocument:sourceDocument||null,roiPattern:{status:policy.patternDraft.activation||'disabled_until_source_review_and_executable_tests',fingerprint:shape.fingerprint,maySupplyLabelDose:false}};
 draft.processing={...draft.processing,parameters:{...draft.processing.parameters,selector:{nodeTypes:[region.kind],withinSourceFields:policy.sourceFields,roiFingerprint:shape.fingerprint}}};
 return draft;
}
function roiPolicy(db){return db.lexicons?.roi?.enabled===true?db.lexicons.roi:null;}
function validateRoiPolicy(db){
 const p=roiPolicy(db);if(!p)return;
 if(p.version!==1||!Array.isArray(p.sourceFields)||!Array.isArray(p.scopeRelations)||!p.sourceFields.length)fail('ROI_CONFIG','Invalid ROI configuration');
 if(!obj(p.vocabulary)||!obj(p.patternDraft)||!own(db.pipelines,p.patternDraft.pipelineRef))fail('ROI_CONFIG','Missing ROI vocabulary or draft pipeline');
 for(const term of arr(p.vocabulary.physiology))if(!term.id||!term.pattern?.pattern)fail('ROI_CONFIG','Invalid physiological vocabulary');
 for(const rule of arr(p.clinicalFilters))if(!rule.id||!rule.pattern?.pattern||!rule.filterPath||!Array.isArray(rule.allowedValues))fail('ROI_CONFIG','Invalid clinical filter rule');
}
function roiAncestors(node,state){
 const p=roiPolicy(state.db),out=[],seen=new Set(),queue=arr(node.relations?.section_parent).concat(arr(node.relations?.table_caption),arr(node.cells).flatMap(cell=>arr(cell.relations?.header_parent)));
 while(queue.length&&out.length<64){const id=queue.shift();if(seen.has(id))continue;seen.add(id);const next=state.index.get(id);if(!next||next.document_id!==node.document_id||next.product_id&&node.product_id&&next.product_id!==node.product_id)continue;out.push(next);for(const relation of p.scopeRelations)queue.push(...arr(next.relations?.[relation]));}
 return out;
}
function roiMentions(source,state){
 const p=roiPolicy(state.db),out=[];for(const term of p.vocabulary.physiology)for(const match of state.runtime.captures(term.pattern,source.text||''))out.push({concept:term.id,field:term.field||null,sourceText:match.text,offset:{start:match.index,end:match.end},sourceSpans:evidenceOf(source)});return out;
}
function roiShape(node,state){
 const grammars=roiPolicy(state.db).patternDraft.grammarRefs,counts={};
 for(const grammar of grammars){const g=state.db.tokenGrammars[grammar];if(g){const hits=state.runtime.captures(g,node.text);if(hits.length)counts[grammar]=hits.length;}}
 const columns=arr(node.cells).map(c=>Object.keys(c.roles||{}).filter(k=>c.roles[k]).sort());
 const descriptor={kind:node.kind,columns,captures:counts};return {fingerprint:'roi_'+normHash(JSON.stringify(descriptor)),...descriptor};
}
function roiIndicationLinks(state,terms){
 const p=roiPolicy(state.db),sources=state.label.nodes.filter(n=>n.kind==='prose.clause'&&n.source_field==='indications_and_usage'),out=[];
 for(const source of sources){
  const parts=p.indicationSeparator?String(source.text).split(new RegExp(p.indicationSeparator.pattern,p.indicationSeparator.flags)): [source.text];
  for(const text of parts){if(!terms.some(term=>phrase(text,term))&&!arr(p.indicationRelations).some(rule=>state.runtime.match(rule.target,[state.context.indication,...arr(state.context.indicationTerms)].join(' '))&&state.runtime.match(rule.source,text)))continue;const organisms=sourceOrganisms(text,state.db);out.push({sourceText:clean(text),organisms,sourceSpans:evidenceOf(source),nodeId:source.id,productId:source.product_id||null});}
 }
 if(!out.length&&terms.some(term=>phrase(state.label.identity.indications||'',term)))out.push({sourceText:state.label.identity.indications,organisms:[],sourceSpans:[],nodeId:null,identityOnly:true});
 return out;
}
function roiClinicalConstraints(source,state){
 const p=roiPolicy(state.db),out=[];
 for(const rule of arr(p.clinicalFilters)){
  if(rule.unless&&state.runtime.match(rule.unless,source.text))continue;
  const match=state.runtime.captures(rule.pattern,source.text)[0];if(match)out.push({kind:'clinical_filter',field:rule.id,filterPath:rule.filterPath,allowedValues:rule.allowedValues,sourceText:match.text,sourceSpans:evidenceOf(source)});
 }
 return out;
}
function roiLinkedPassages(node,state){
 const p=roiPolicy(state.db),linked=[],seen=new Set();
 for(const relation of p.scopeRelations)for(const id of arr(node.relations?.[relation])){
  const target=state.index.get(id);if(!target||seen.has(id)||target.document_id!==node.document_id||target.product_id&&node.product_id&&target.product_id!==node.product_id)continue;seen.add(id);linked.push({relation,nodeId:id,sourceText:target.text,sourceSpans:evidenceOf(target)});
 }
 // Cross-section references require an explicit source citation and exactly one
 // matching destination. Referenced sections provide conditions, never a dose join.
 if(p.sectionReference)for(const match of state.runtime.captures(p.sectionReference,node.text)){
  const ref=match.groups.section||match.groups.table;if(!ref)continue;
  const destinations=state.label.nodes.filter(n=>n.kind==='section.heading'&&new RegExp('^\\s*'+String(ref).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s|$)').test(n.text));
  if(destinations.length!==1)continue;const target=destinations[0];if(seen.has(target.id))continue;seen.add(target.id);linked.push({relation:'explicit_section_reference',nodeId:target.id,sourceText:target.text,sourceSpans:evidenceOf(target)});
 }
 return linked;
}
function roiLeadingLabel(node,state){
 if(node.kind!=='prose.clause'||node.fields?.indication?.sourceText||arr(node.cells).some(cell=>cell.roles?.indication))return '';
 const policy=roiPolicy(state.db);let earliest=null;
 for(const name of policy.patternDraft.grammarRefs){const grammar=state.db.tokenGrammars[name];if(!grammar)continue;const hit=state.runtime.captures(grammar,node.text)[0];if(hit&&(earliest==null||hit.index<earliest))earliest=hit.index;}
 if(earliest==null)return '';
 const prefix=node.text.slice(0,earliest),mark=prefix.lastIndexOf(':');if(mark<0)return '';
 const preceding=prefix.slice(0,mark),heading=clean(preceding.slice(preceding.lastIndexOf(':')+1));
 if(!heading||heading.length>160)return '';
 const generic=state.db.lexicons?.sourceScopeRules?.genericRegimenContext;
 if(generic&&state.runtime.match(generic,heading)||policy.nonClinicalHeading&&state.runtime.match(policy.nonClinicalHeading,heading))return '';
 // A weight, age, renal or severity label is a patient axis, not a sibling disease.
 for(const name of ['population','weight','renal','severity','surface_area']){const rule=state.db.roleRules[name];if(rule&&state.runtime.match(rule.matches,heading))return '';}
 for(const term of arr(policy.vocabulary?.physiology))if(term.pattern&&state.runtime.match(term.pattern,heading))return '';
 return heading;
}
function buildRoiPlan(state){
 const p=roiPolicy(state.db);if(!p)return;
 const context=state.context,terms=unique([context.indication||context.label||'',...arr(context.indicationTerms)].flatMap(t=>expandContext(t,state.db))),links=roiIndicationLinks(state,terms),wanted=sourceOrganisms(context.organism||context.pathogen||'',state.db);
 if(!wanted.length&&(context.organism||context.pathogen))wanted.push(context.organism||context.pathogen);
 const generic=state.db.lexicons?.sourceScopeRules?.genericRegimenContext,roots=[],byNode=new Map(),selected=new Set(),scopes=new Set(),patterns=new Map();
 const dosePattern=state.db.tokenGrammars.mass_activity_amount;
 for(const node of state.label.nodes){
  if(!['table.row','prose.clause'].includes(node.kind)||!p.sourceFields.includes(node.source_field))continue;
  state.runtime.checkDeadline();const ancestors=roiAncestors(node,state),indCells=arr(node.cells).filter(c=>c.roles?.indication),rawInd=node.fields?.indication?.sourceText||(indCells.length?indCells.map(c=>c.text).join(' | '):'')||roiLeadingLabel(node,state);
  const clinicalHead=ancestors.find(n=>['section.heading','table.caption'].includes(n.kind)&&n.text!==n.source_field?.replace(/_/g,' ')&&!(generic&&state.runtime.match(generic,n.text))&&!(p.nonClinicalHeading&&state.runtime.match(p.nonClinicalHeading,n.text)));
  const rawGeneral=!!(rawInd&&(generic&&state.runtime.match(generic,rawInd)||state.runtime.match(dosePattern,rawInd)||p.nonClinicalHeading&&state.runtime.match(p.nonClinicalHeading,rawInd))),indication=rawInd&&!rawGeneral?rawInd:clinicalHead?.text||rawInd||'',local=[node.text,...ancestors.map(n=>n.text)].join(' '),doseInd=indication&&state.runtime.match(dosePattern,indication),general=!!(indication&&(generic&&state.runtime.match(generic,indication)||doseInd||p.nonClinicalHeading&&state.runtime.match(p.nonClinicalHeading,indication)));
  const explicit=!!indication&&!general,blank=indCells.length>0&&!clean(rawInd),sourceText=explicit?indication:local;
  const productLinks=links.filter(link=>!link.productId||!node.product_id||link.productId===node.product_id);
  let applies=context.browse===true?'browse':terms.some(t=>phrase(sourceText,t))?'direct_context':!explicit&&!blank&&productLinks.length?'indication_link':null;
  if(!terms.length&&context.browse!==true)applies=null;
  const localOrganisms=sourceOrganisms(rawInd||local,state.db),usableLinks=productLinks.filter(link=>!wanted.length||!link.organisms.length||link.organisms.some(o=>wanted.some(w=>canonical(o)===canonical(w))));
  let organismMismatch=!!(wanted.length&&localOrganisms.length&&!localOrganisms.some(o=>wanted.some(w=>canonical(o)===canonical(w))));
  if(applies==='indication_link'&&productLinks.some(link=>link.organisms.length)&&!usableLinks.length)organismMismatch=true;
  if(applies==='direct_context'&&!localOrganisms.length&&productLinks.length&&productLinks.every(link=>link.organisms.length)&&!usableLinks.length)organismMismatch=true;
  if(blank)applies=null;
  if(organismMismatch)applies=null;
  const passages=roiLinkedPassages(node,state),physiology=unique([node,...ancestors].flatMap(n=>roiMentions(n,state))),shape=roiShape(node,state);
  const hasRegimen=!!(Object.keys(shape.captures).length||arr(node.cells).some(c=>c.roles?.dose));
  const record={scopeNodeIds:ancestors.map(n=>n.id),id:node.id,nodeId:node.id,kind:node.kind,tableId:node.table_id||null,sectionId:node.section_id||null,indication:indication||null,sourceText:node.text,sourceSpans:evidenceOf(node),selected:!!applies,selectionReason:applies||(organismMismatch?'organism_not_covered':blank?'empty_indication_cell':'different_or_unestablished_context'),organisms:localOrganisms,physiology,relationships:passages,shape,hasRegimen,matchedFormats:[],conditions:[]};
  // This link can establish context only for a generic regimen. A named sibling
  // disease and an empty indication cell never borrow another indication.
  if(applies&&usableLinks.length){record.indicationLinks=usableLinks;const exact=usableLinks.filter(l=>l.organisms.length);if(exact.length)record.organisms=unique(exact.flatMap(l=>l.organisms));}
  roots.push(record);byNode.set(node.id,record);patterns.set(node.id,new Set());
  if(applies){selected.add(node.id);scopes.add(node.id);if(node.table_id)scopes.add(node.table_id);for(const a of ancestors)scopes.add(a.id);node.roi={id:record.id,selectionReason:applies,indication:record.indication,relationships:passages,physiology};
   const inherited=rawInd&&!rawGeneral?'':clinicalHead?.text;
   if(inherited&&!general&&(!node.fields?.indication||rawGeneral&&!indCells.length))node.fields={...node.fields,indication:field(inherited,evidenceOf(clinicalHead))};
   const link=!localOrganisms.length&&usableLinks.length===1?usableLinks[0]:null;
   if(link?.organisms.length&&!node.organismRestrictions)node.organismRestrictions=link.organisms;
   // A bare dose clause may inherit a single explicit indication heading.
   if(inherited&&!general)node.relations.roi_context=unique(arr(node.relations.roi_context).concat(clinicalHead.id));
  }
 }
 for(const source of roots.filter(r=>r.selected))for(const link of source.relationships.filter(l=>l.relation==='explicit_section_reference')){
  const target=state.index.get(link.nodeId);if(!target||!roiMentions(target,state).length)continue;
  for(const region of roots.filter(r=>r.scopeNodeIds.includes(link.nodeId)&&!r.selected&&r.selectionReason!=='organism_not_covered'&&r.selectionReason!=='empty_indication_cell')){
   region.selected=true;region.selectionReason='explicit_section_reference';selected.add(region.id);scopes.add(region.id);if(region.tableId)scopes.add(region.tableId);region.scopeNodeIds.forEach(id=>scopes.add(id));const node=state.index.get(region.id);node.roi={id:region.id,selectionReason:region.selectionReason,indication:null,relationships:region.relationships,physiology:region.physiology};
  }
 }
 if(roots.length>(p.maximumRegions||2000))fail('ROI_LIMIT','Label exceeds the configured ROI limit');
 // Retain global source precautions for review without turning an unrelated
 // population paragraph into the selected regimen's dose eligibility branch.
 const shared=state.label.nodes.filter(n=>n.kind==='prose.clause'&&arr(p.sharedConditionFields).includes(n.source_field)).flatMap(n=>{const mentions=roiMentions(n,state);return mentions.length?[{nodeId:n.id,sourceField:n.source_field,sourceText:n.text,sourceSpans:evidenceOf(n),physiology:mentions}]:[];});
 state.roi={roots,byNode,selected,scopes,patterns,links,shared,terms,candidateConstraints:new Map()};
 for(const scoped of state.scopes){const relevant=scoped.node.kind==='table'?roots.filter(r=>r.selected&&r.tableId===scoped.node.id):roots.filter(r=>r.selected&&(r.nodeId===scoped.node.id||r.relationships.some(l=>l.nodeId===scoped.node.id)));scoped.features.roi={selected:relevant.length>0,count:relevant.length,fingerprints:unique(relevant.map(region=>region.shape.fingerprint))};}
}
function roiConstraintGuard(node,constraints,state){
 if(!state.roi)return constraints;
 const sources=[node,...arr(node.scopeNodes).filter(n=>['section.heading','table.caption','footnote'].includes(n.kind))];
 const out=constraints.concat(sources.flatMap(source=>roiClinicalConstraints(source,state)));
 for(const source of sources.filter(n=>n.kind==='footnote'))if(roiPolicy(state.db).physiologyFootnote&&state.runtime.match(roiPolicy(state.db).physiologyFootnote,source.text))out.push(...sourceAxisConstraints(source,state));
 const guard=roiPolicy(state.db).ambiguousRenalMetric;
 if(guard)for(const source of sources){const match=state.runtime.captures(guard,source.text)[0];if(match&&!out.some(c=>['crcl','gfr','egfr','normalized_crcl','indexed_clearance'].includes(c.field)))out.push({kind:'unknown',field:null,reason:'renal_metric_not_identified',sourceText:match.text,sourceSpans:evidenceOf(source)});}
 for(const source of sources)for(const rule of arr(roiPolicy(state.db).unparsedScopes)){
  if(rule.clinicalFilter?out.some(c=>c.kind==='clinical_filter'):out.some(c=>c.field===rule.field))continue;
  const match=state.runtime.captures(rule.pattern,source.text)[0];if(match)out.push({kind:'unknown',field:rule.field,reason:'unparsed_physiological_scope',sourceText:match.text,sourceSpans:evidenceOf(source)});
 }
 return unique(out);
}
function roiReport(state,regimens,pending,references=[]){
 if(!state.roi)return null;
 const {roots,patterns,shared}=state.roi,p=roiPolicy(state.db),resolvedIds=new Set(regimens.flatMap(r=>arr(r.sourceStructure?.nodeIds))),pendingIds=new Set(pending.flatMap(r=>arr(r.sourceStructure?.nodeIds))),referenceIds=new Set(references.flatMap(r=>arr(r.sourceStructure?.nodeIds)));
 const selected=roots.filter(r=>r.selected),unmatched=[];
 for(const region of selected){region.matchedFormats=[...(patterns.get(region.id)||[])];region.constraints=state.roi.candidateConstraints.get(region.id)||[];
  const failures=state.unresolved.filter(r=>arr(r.sourceStructure?.nodeIds).includes(region.id)),excluded=state.excluded.filter(r=>(r.nodeId||r.candidateId)===region.id);
  region.status=resolvedIds.has(region.id)?'resolved':referenceIds.has(region.id)?'reference_only':pendingIds.has(region.id)||failures.some(r=>arr(r.missingFields).length)?'needs_inputs':excluded.length?'excluded':failures.length?'unsupported_or_ambiguous':region.hasRegimen?'unmatched_pattern':'context_only';
  region.conditions=unique(failures.flatMap(r=>arr(r.conditions)));region.missingFields=unique(failures.flatMap(r=>arr(r.missingFields)));
  if(['unmatched_pattern','unsupported_or_ambiguous'].includes(region.status)&&region.hasRegimen){
   const shape=region.shape,reference=state.db.formats.find(f=>f.processing.pipelineRef===p.patternDraft.pipelineRef&&f.mode==='extractor'&&f.enabled),draft=reference?shapeRoiDraft(reference,region,p,state.label.identity.document_id):null;
   unmatched.push({fingerprint:shape.fingerprint,status:region.status,sourceIdentity:clone(state.label.identity),sourceText:region.sourceText,sourceSpans:region.sourceSpans,relationships:region.relationships,physiology:region.physiology,shape,matchedFormats:region.matchedFormats,diagnostics:state.diagnostics.filter(d=>d.candidateId===region.id),formatDraft:draft});
  }
 }
 const allIds=new Set(selected.map(r=>r.id));
 return {version:1,workflow:['clinical_context','source_region','pattern_match','physiology','patient_filters','source_bullet'],context:{indication:state.context.indication||state.context.label||null,organism:state.context.organism||state.context.pathogen||null,browse:state.context.browse===true},status:regimens.length?'resolved':selected.some(r=>r.status==='needs_inputs')?'needs_inputs':unmatched.length?'unsupported_pattern':allIds.size?'no_applicable_regimen':'context_not_found',regionCount:roots.length,selectedRegionCount:selected.length,regions:selected,skippedRegions:roots.filter(r=>!r.selected).map(r=>({id:r.id,indication:r.indication,reason:r.selectionReason})),sharedConditions:shared,unmatchedPatterns:unmatched};
}

function expandPopulationColumns(state){
 const additions=[],db=state.db;
 for(const row of state.label.nodes.filter(node=>node.kind==='table.row')){
  const doseCells=arr(row.cells).filter(cell=>cell.roles?.dose),typed=doseCells.map(cell=>({cell,constraints:sourceAxisConstraints({...cell,text:arr(cell.headers).join(' '),sourceSpans:arr(cell.relations?.header_parent).map(id=>state.index.get(id)).filter(Boolean).flatMap(evidenceOf)},state)}));
  if(doseCells.length<2||typed.some(item=>!item.constraints.some(c=>c.field==='age')))continue;
  const original=clone(row);row.kind='table.header';
  const overrideRule=db.lexicons.sourceScopeRules.adultWeightOverride;
  let weightOverride=null;
  if(overrideRule)for(const node of state.label.nodes.filter(n=>n.kind==='section.heading'&&n.source_field==='dosage_and_administration'))for(const span of evidenceOf(node)){
   const capture=state.runtime.captures(overrideRule,span.quote)[0];if(capture)weightOverride={value:Number(capture.groups.value),sourceSpans:[{...span,quote:capture.text,start:capture.index,end:capture.end}]};
  }

  for(const [i,item]of typed.entries()){
   const cells=arr(original.cells).filter(cell=>!cell.roles?.dose||cell.id===item.cell.id).map(clone);
   for(const cell of cells)if(cell.id===item.cell.id){cell.roles.population=false;cell.boundPatientAxis=true;}
   let constraints=clone(item.constraints);
   if(weightOverride&&Number.isFinite(weightOverride.value)){
    const adult=constraints.find(c=>c.field==='age'&&c.range?.lower===18),child=constraints.find(c=>c.field==='age'&&c.range?.upper===18);
    const weight={kind:'quantity',field:'weight',metric:'weight',unit:'kg',range:{lower:adult?weightOverride.value:null,upper:child?weightOverride.value:null,lowerInclusive:true,upperInclusive:false,lowerUnbounded:!adult,upperUnbounded:!child,metric:'weight',unit:'kg'},sourceSpans:weightOverride.sourceSpans};
    if(adult)constraints=constraints.filter(c=>c!==adult).concat({kind:'any',alternatives:[adult,weight],sourceSpans:adult.sourceSpans.concat(weight.sourceSpans)});
    else if(child)constraints.push(weight);
   }
   additions.push({...clone(original),id:original.id+':population:'+i,cells,columnConstraints:constraints,sourceSpans:unique(cells.flatMap(evidenceOf)),text:cells.map(cell=>cell.text).join(' | ')});
  }
 }
 for(const node of additions){state.label.nodes.push(node);state.index.set(node.id,node);}
 for(const row of state.label.nodes.filter(node=>node.kind==='table.row'))for(const cell of arr(row.cells))if(cell.roles?.severity&&sourceAxisConstraints({...cell,text:cell.headers.join(' ')+' '+cell.text},state).some(c=>c.kind==='enum'))cell.boundPatientAxis=true;
}
function expandIndicationColumns(state){
 const additions=[];
 for(const row of state.label.nodes.filter(node=>node.kind==='table.row')){
  const cells=arr(row.cells).filter(cell=>cell.roles?.dose);if(cells.length<2||!cells.some(cell=>arr(state.db.lexicons.indicationTerms).some(term=>phrase(cell.headers.join(' '),term))))continue;
  const original=clone(row);row.kind='table.header';
  for(const [i,cell]of cells.entries()){
   const selected=original.cells.filter(other=>!other.roles?.dose||other.id===cell.id).map(clone),evidence=arr(cell.relations.header_parent).map(id=>state.index.get(id)).filter(Boolean).flatMap(evidenceOf);
   additions.push({...clone(original),id:row.id+':indication:'+i,cells:selected,text:selected.map(c=>c.text).join(' | '),fields:{...original.fields,indication:field(cell.headers.join(' '),evidence)}});
  }
 }
 for(const node of additions){state.label.nodes.push(node);state.index.set(node.id,node);}
}
function splitCellRegimenOptions(state){
 const additions=[],pattern=state.db.lexicons.sourceScopeRules.regimenAlternativeSeparator;if(!pattern)return;
 for(const row of state.label.nodes.filter(node=>node.kind==='table.row')){
  const dose=arr(row.cells).filter(cell=>cell.roles?.dose);if(dose.length!==1)continue;
  const cell=dose[0],cuts=state.runtime.captures(pattern,cell.text);if(!cuts.length)continue;
  const starts=[0,...cuts.map(c=>c.end)],ends=[...cuts.map(c=>c.index),cell.text.length],parts=starts.map((start,i)=>cell.text.slice(start,ends[i]).trim());
  if(parts.some(text=>state.runtime.captures(state.db.tokenGrammars.mass_activity_amount,text).length!==1||state.runtime.captures(state.db.tokenGrammars.frequency,text).length!==1))continue;
  row.kind='table.header';for(const [i,text]of parts.entries()){const cells=row.cells.map(other=>other.id===cell.id?{...clone(other),text}:clone(other));additions.push({...clone(row),kind:'table.row',id:row.id+':option:'+i,cells,text:cells.map(c=>c.text).join(' | '),regimen_option:String(i)});}
 }
 for(const node of additions){state.label.nodes.push(node);state.index.set(node.id,node);}
}
// Split only source alternatives containing one complete dose and one schedule
// each. The common source prefix, shared duration and original evidence survive.
function splitProseRegimenOptions(state){
 const rules=state.db.lexicons.sourceScopeRules,separator=rules.proseAlternativeSeparator;if(!separator)return;
 const additions=[];
 for(const node of state.label.nodes.filter(node=>node.kind==='prose.clause')){
  const cuts=state.runtime.captures(separator,node.text);if(!cuts.length||cuts.length>3)continue;
  const intro=rules.proseAlternativeIntro&&state.runtime.captures(rules.proseAlternativeIntro,node.text)[0],offset=intro?.end||0;
  const starts=[offset,...cuts.map(c=>c.end)],ends=[...cuts.map(c=>c.index),node.text.length],parts=starts.map((start,i)=>({start,text:node.text.slice(start,ends[i]).trim()}));
  const dose=source=>{const mass=state.runtime.captures(state.db.tokenGrammars.mass_activity_amount,source);return mass.length?mass:state.runtime.captures(state.db.tokenGrammars.administered_unit_count,source);};
  const frequencies=parts.map(part=>state.runtime.captures(state.db.tokenGrammars.frequency,part.text)),sharedSchedule=frequencies.slice(0,-1).every(found=>!found.length)&&frequencies.at(-1).length===1;
  if(parts.some((part,i)=>dose(part.text).length!==1||(!sharedSchedule&&frequencies[i].length!==1)))continue;
  const first=dose(parts[0].text)[0],prefix=node.text.slice(0,offset+first.index),duration=rules.proseAlternativeSharedDuration&&state.runtime.captures(rules.proseAlternativeSharedDuration,node.text)[0],original=clone(node);
  node.kind='section.heading';node.text=prefix;node.section_id=node.id;state.index.set(node.id,node);
  for(const [i,part]of parts.entries()){
   const id=original.id+':source-option:'+i,fields=clone(original.fields||{});
   const inherited=clone(original.inheritedRoleCells||{}),sharedDuration=duration?.groups.duration||(sharedSchedule&&state.runtime.captures(state.db.tokenGrammars.duration,parts.at(-1).text).length===1?state.runtime.captures(state.db.tokenGrammars.duration,parts.at(-1).text)[0].text:null);
   if(sharedDuration){fields.duration=field(sharedDuration,evidenceOf(original));inherited.duration={id:original.id+':shared-duration',text:sharedDuration,sourceSpans:evidenceOf(original)};}
   if(sharedSchedule)inherited.frequency={id:original.id+':shared-schedule',text:frequencies.at(-1)[0].text,sourceSpans:evidenceOf(original)};
   const spans=evidenceOf(original).map(span=>({...span,node_id:id,quote:part.text,start:(span.start||0)+part.start,end:(span.start||0)+part.start+part.text.length}));
   additions.push({...clone(original),id,text:part.text,fields,inheritedRoleCells:inherited,regimen_option:String(i),sourceSpans:spans,relations:{...original.relations,section_parent:unique(arr(original.relations?.section_parent).concat(node.id))}});
  }
 }
 for(const node of additions){state.label.nodes.push(node);state.index.set(node.id,node);}
}
function expandRenalColumns(state){
 const link=state.db.lexicons?.sourceScopeRules?.renalAdjustmentLink;if(!link)return;
 const anchor=state.label.nodes.find(node=>node.kind==='prose.clause'&&node.source_field==='dosage_and_administration'&&state.runtime.match(link,node.text));if(!anchor)return;
 const captions=node=>linkedNodes(node,{relations:['section_parent','table_caption','header_parent']},state);
 const rows=state.label.nodes.filter(node=>node.kind==='table.row'),basis=[];
 for(const node of state.label.nodes){
  if(!['table.row','prose.clause'].includes(node.kind)||!['dosage_and_administration','dosage_and_administration_table'].includes(node.source_field))continue;
  if(node.kind==='table.row'&&arr(node.cells).filter(cell=>cell.roles?.dose).length!==1)continue;
  const scoped={...node,scopeNodes:captions(node)},fields={...node.fields,...nodeRoleFields(node,{bindings:{}},state)},context=establishContext({...scoped,fields},state);
  if(context.indicationMatches!==true||context.organismContradicts!==false||context.intentContradicts!==false)continue;
  const constraints=inferConstraints(scoped,state);if(constraints.some(c=>c.kind==='unknown'||!c.field))continue;
  const nonRenal=constraints.filter(c=>state.db.units[c.unit]?.dimension!=='clearance');
  if(nonRenal.some(c=>evaluate(c.kind==='enum'?state.db.policies.applicabilityRules.enumBranch:state.db.policies.applicabilityRules.numericBand,{...envFor(state,node),constraint:c},state)!==true))continue;
  const source=node.kind==='table.row'?node.cells.find(cell=>cell.roles?.dose):node;
  const scheduleSource=node.kind==='table.row'?(node.cells.find(cell=>cell.roles?.frequency)||source):source;
  const doses=captureSource(state.db.tokenGrammars.mass_activity_amount,source,state),frequencies=captureSource(state.db.tokenGrammars.frequency,scheduleSource,state);
  if(doses.length!==1||frequencies.length!==1)continue;
  basis.push({node,fields,constraints:nonRenal,dose:doses[0],source,frequency:frequencies[0]});
 }
 const additions=[];
 // Transposed renal tables bind an explicit standard-dose cell to the same
 // amount and interval in an applicable indication row. Keep the entire renal
 // cell, including any loading and maintenance sequence, as source evidence.
 if(state.db.lexicons.sourceScopeRules.transposedRenalColumns)for(const row of rows){
  const cells=arr(row.cells),first=cells[0];if(!first||cells.length<2)continue;
  const baselineAxes=sourceAxisConstraints({...first,text:arr(first.headers).join(' ')},state);
  if(!baselineAxes.some(c=>c.field==='crcl'&&(c.kind==='qualitative_normal'||c.range?.lower!=null&&c.range.upperUnbounded)))continue;
  const amounts=captureSource(state.db.tokenGrammars.mass_activity_amount,first,state),frequencies=captureSource(state.db.tokenGrammars.frequency,first,state);
  if(amounts.length!==1||frequencies.length!==1)continue;
  for(const origin of basis){
   const a=amounts[0].groups,b=origin.dose.groups;
   if(a.unit!==b.unit||Number(a.amount)!==Number(b.amount)||canonical(frequencies[0].text)!==canonical(origin.frequency.text))continue;
   for(const [i,cell]of cells.entries()){
    if(!i)continue;
    const headers=arr(cell.relations?.header_parent).map(id=>state.index.get(id)).filter(Boolean),axes=sourceAxisConstraints({...cell,text:arr(cell.headers).join(' '),sourceSpans:headers.flatMap(evidenceOf)},state);
    if(!axes.length||!state.runtime.match(state.db.tokenGrammars.mass_activity_amount,cell.text))continue;
    if(!axes.some(axis=>axis.field==='dialysis'))axes.push({kind:'enum',field:'dialysis',allowedValues:['none'],sourceSpans:headers.flatMap(evidenceOf)});
    const id=row.id+':renal-column:'+i+':basis:'+origin.node.id,selected=clone(cell);
    selected.roles={...rolesFor([],state.db,state.runtime),dose:true};selected.boundPatientAxis=true;
    additions.push({...clone(row),id,text:cell.text,cells:[selected],fields:{indication:origin.fields.indication},constraints:unique(origin.constraints.filter(c=>c.field!=='dialysis').concat(axes)),conditions:[field(first.text,evidenceOf(first),{feature:'baseline_option'}),field(anchor.text,evidenceOf(anchor)),field(cell.headers.join(' '),headers.flatMap(evidenceOf))],renalOption:true,sourceSpans:unique(evidenceOf(cell).concat(evidenceOf(origin.node),headers.flatMap(evidenceOf))),relations:{...clone(row.relations||{}),header_parent:headers.map(node=>node.id)}});
   }
  }
 }
 for(const row of rows){
  const axes=arr(row.cells).filter(cell=>cell.roles?.renal),doseCells=arr(row.cells).filter(cell=>cell.roles?.dose);if(axes.length!==1||doseCells.length<2)continue;
  const axis=axes[0],scope={...axis,text:axis.headers.join(' ')+' '+axis.text},constraints=sourceAxisConstraints(scope,state);
  const renal=constraints.find(c=>state.db.units[c.unit]?.dimension==='clearance');if(!renal||state.patient[renal.field]==null)continue;
  if(evaluate(state.db.policies.applicabilityRules.numericBand,{...envFor(state,row),constraint:renal},state)!==true)continue;
  const baseRows=rows.filter(other=>other.table_id===row.table_id&&arr(other.cells).some(cell=>cell.roles?.renal&&sourceAxisConstraints({...cell,text:cell.headers.join(' ')+' '+cell.text},state).some(c=>c.field===renal.field&&c.range?.upperUnbounded)));
  if(baseRows.length!==1||baseRows[0].id===row.id)continue;
  for(const cell of doseCells){
   const baseline=baseRows[0].cells.find(other=>other.column_index===cell.column_index);if(!baseline)continue;
   const nominalDose=captureSource(state.db.tokenGrammars.mass_activity_amount,baseline,state),nominalFrequency=captureSource(state.db.tokenGrammars.frequency,baseline,state);if(nominalDose.length!==1||nominalFrequency.length!==1)continue;
   const target=nominalDose[0].groups,nominalUnit=state.db.units[target.unit],wanted=Number(String(target.amount).replace(/,/g,''))*(nominalUnit?.scaleToBase||1);
   const nominalInterval=state.runtime.captures(state.db.tokenGrammars.frequency.interval,nominalFrequency[0].text)[0];if(!nominalInterval)continue;
   for(const origin of basis){
    const quantity=origin.dose.groups,unit=state.db.units[quantity.unit];if(!unit||unit.dimension!==nominalUnit?.dimension)continue;
    const factor=unit.scaleToBase||1,lower=Number(String(quantity.amount).replace(/,/g,''))*factor,upper=Number(quantity.upper??quantity.amount)*factor;
    const alternatives=state.runtime.captures(state.db.tokenGrammars.mass_activity_amount.sharedAlternatives,origin.source.text)[0];
    const amountFits=alternatives?[Number(alternatives.groups.first),Number(alternatives.groups.second)].some(value=>value*factor===wanted):wanted>=lower&&wanted<=upper;
    if(!amountFits)continue;
    const interval=state.runtime.captures(state.db.tokenGrammars.frequency.interval,origin.frequency.text)[0];if(!interval)continue;
    const a=interval.groups,b=nominalInterval.groups;if(a.unit.replace(/s$/,'')!==b.unit.replace(/s$/,''))continue;
    if(Number(b.lower)<Number(a.lower)||Number(b.lower)>Number(a.upper??a.lower))continue;
    const id=row.id+':option:'+cell.column_index+':basis:'+origin.node.id;
    const cells=[clone(axis),clone(cell)];for(const c of cells)c.roles=rolesFor(c.headers,state.db,state.runtime);
    const conditions=[field(baseline.text,evidenceOf(baseline),{feature:'baseline_option'}),field(anchor.text,evidenceOf(anchor)),field(axis.headers.join(' ')+' '+axis.text,evidenceOf(axis)),field(cell.headers.join(' '),evidenceOf(cell),{feature:'regimen_phase'})];
    const derived={...clone(row),id,text:axis.text+' | '+cell.text,cells,fields:{indication:origin.fields.indication},constraints:unique(origin.constraints.concat(constraints)),conditions,regimen_option:String(cell.column_index),renalOption:true,sourceSpans:unique(cells.flatMap(evidenceOf).concat(evidenceOf(origin.node))),relations:clone(row.relations||{})};
    additions.push(derived);
   }
  }
 }
 for(const node of additions){state.label.nodes.push(node);state.index.set(node.id,node);}
}
function withinScope(node,scope,state){if(node.id===scope.id)return true;if(scope.kind==='table')return node.table_id===scope.id;if(scope.kind==='section.heading')return node.section_id===scope.section_id;return false;}
function nodeRoleFields(n,f,state){
 const fields={},cells=arr(n.cells),db=state.db;
 const indicationCells=cells.filter(cell=>!cell.excluded&&cell.roles?.indication);if(indicationCells.length)fields.indication=field(indicationCells.map(cell=>cell.text).join(' | '),indicationCells.flatMap(evidenceOf));
 for(const[name,b]of Object.entries(f.bindings||{})){
  if(!b.roleRef)continue;
  let matching=cells.filter(c=>!c.excluded&&!(b.roleRef==='dose'&&c.roles?.preparation)&&c.roles?.[b.roleRef]);
  if(!matching.length&&n.inferredRoles){const i=n.inferredRoles.indexOf(b.roleRef);if(i>=0&&cells[i]&&!cells[i].excluded)matching=[cells[i]];}
  if(matching.length){const text=matching.map(c=>c.text).join(' | '),spans=matching.flatMap(evidenceOf);fields[name]=field(text,spans,{role:b.roleRef,cells:matching.map(c=>c.id)});}
 }
 return fields;
}
function linkedNodes(n,args,state){const ids=[];for(const relation of arr(args.relations)){const v=n.relations?.[relation];if(typeof v==='string')ids.push(v);else ids.push(...arr(v));}return unique(ids).map(id=>state.index.get(id)).filter(x=>x&&x.document_id===n.document_id&&(!x.product_id||!n.product_id||x.product_id===n.product_id)&&(!x.table_id||!n.table_id||x.table_id===n.table_id));}
function captureNodes(n,f,grammarId,state){
 const grammar=state.db.tokenGrammars[grammarId],explicit=Object.entries(f.bindings||{}).filter(([,binding])=>binding.grammarRef===grammarId);
 const roles=unique(explicit.map(([,binding])=>binding.roleRef).filter(Boolean).concat(grammar.captureRole||[]));
 const cells=arr(n.cells).filter(cell=>!cell.excluded);
 if(!cells.length)return arr(n.cells).length?[]:[n];
 if(roles.length){const matching=cells.filter(cell=>roles.some(role=>cell.roles?.[role]));if(matching.length)return matching;
  if(['frequency','duration','route'].includes(grammar.captureRole))return cells.filter(cell=>cell.roles?.[f.bindings?.dose?.roleRef||'dose']);
  return [];
 }
 return cells;
}
function captureSource(grammar,source,state){
 let tokens=state.runtime.captures(grammar,source.text);
 // A repeated unit belongs to the same source range, not to a second dose.
 // Normalize compatible source units only; this never calculates a patient dose.
 tokens=tokens.filter(token=>{
  const g=token.groups;if(!g.lowerUnit)return true;
  const lower=state.db.units[g.lowerUnit.toLowerCase()],upper=state.db.units[g.unit.toLowerCase()];
  if(!lower||!upper||lower.dimension!==upper.dimension||!Number.isFinite(lower.scaleToBase)||!Number.isFinite(upper.scaleToBase))return false;
  const converted=Number(String(g.upper).replace(/,/g,''))*upper.scaleToBase/lower.scaleToBase;
  if(!Number.isFinite(converted)||converted<Number(String(g.amount).replace(/,/g,'')))return false;
  g.sourceUpperUnit=g.unit;g.unit=g.lowerUnit.toLowerCase();g.upper=String(converted);return true;
 });
 if(!tokens.length&&grammar.captureRole&&source.inheritedRoleCells?.[grammar.captureRole])return captureSource(grammar,source.inheritedRoleCells[grammar.captureRole],state);
 for(const equivalence of arr(grammar.equivalences))for(const equivalent of state.runtime.captures(equivalence,source.text)){
  const inside=tokens.filter(token=>token.index>=equivalent.index&&token.end<=equivalent.end);
  if(equivalent.groups?.totalAmount){
   const g=equivalent.groups,unit=state.db.units[g.totalUnit],a=state.db.units[g.componentUnit1],b=state.db.units[g.componentUnit2];
   if(!unit||!a||!b||unit.dimension!=='mass'||a.dimension!=='mass'||b.dimension!=='mass'||Math.abs(Number(g.totalAmount)*(unit.scaleToBase||1)-Number(g.componentAmount1)*(a.scaleToBase||1)-Number(g.componentAmount2)*(b.scaleToBase||1))>1e-7)continue;
  }

  if(equivalence.equivalenceKind==='tablet_strength'){
   const g=equivalent.groups,count=Number(g.tabletCount)||state.db.lexicons.sourceScopeRules.numberWords?.[String(g.tabletCount).toLowerCase()];
   if(!Number.isFinite(count)||Math.abs(Number(g.doseAmount)-count*Number(g.tabletStrength))>1e-7)continue;
  }
  if(inside.length>1){const first=inside[0];tokens=tokens.filter(token=>!inside.slice(1).includes(token));first.text=equivalent.text;first.end=equivalent.end;first.equivalenceVerbatim=true;}
 }
 if(!tokens.length&&grammar.inheritFromHeader){
  const headerNodes=arr(source.relations?.header_parent).map(id=>state.index.get(id)).filter(Boolean);
  const headerSpans=headerNodes.flatMap(evidenceOf);
  for(const header of arr(source.headers)){tokens=state.runtime.captures(grammar,header).map(token=>({...token,sourceSpans:headerSpans,inheritedHeader:true}));if(tokens.length)break;}
 }
 if(!tokens.length)for(const rule of arr(grammar.headerUnits)){
  if(!state.runtime.match(rule.pattern,arr(source.headers).join(' ')))continue;
  const synthetic=String(source.text)+' '+rule.unit;
  tokens=state.runtime.captures(grammar,synthetic).map(token=>({...token,sourceSpans:unique(evidenceOf(source).concat(arr(source.relations?.header_parent).map(id=>state.index.get(id)).filter(Boolean).flatMap(evidenceOf))),inheritedUnit:true,inheritedUnitText:rule.unit}));
  if(tokens.length)break;
 }
 return tokens;
}
function inheritedUnitCapture(source,grammar,state){
 if(source.inheritedDoseUnit&&source.roles?.dose){
  const value=source.text.match(/^\s*(\d+(?:\.\d+)?)\s*(.*)$/),tail=value?.[2]?.trim(),frequency=tail&&state.runtime.captures(state.db.tokenGrammars.frequency,tail);
  if(value&&(!tail||frequency?.length===1&&frequency[0].index===0&&frequency[0].end===tail.length))return state.runtime.captures(grammar,value[1]+' '+source.inheritedDoseUnit.unit).map(token=>({...token,sourceSpans:unique(evidenceOf(source).concat(source.inheritedDoseUnit.evidence)),inheritedUnit:true}));
 }
 if(!source.roles?.dose||source.excluded||!/^\s*\d+(?:\.\d+)?\s*$/.test(source.text)||!grammar.pattern.includes('(?<amount>')||!grammar.pattern.includes('(?<unit>'))return [];
 const headers=arr(source.headers).join(' '),compact=headers.replace(/\s+/g,'').toLowerCase();
 const matched=Object.keys(state.db.units).filter(u=>compact.includes(u.replace(/\s+/g,'').toLowerCase())).sort((a,b)=>b.length-a.length);
 const units=matched.filter(u=>!matched.some(v=>v!==u&&v.length>u.length&&v.includes(u)));
 if(units.length!==1||['concentration','clearance','indexed_clearance','weight_normalized_clearance','volume','time','age','surface_area','flow','weight'].includes(state.db.units[units[0]].dimension))return [];
 const headerIds=arr(source.relations?.header_parent),headerSpans=headerIds.map(id=>state.index.get(id)).filter(Boolean).flatMap(evidenceOf);
 if(!headerSpans.length)return [];
 return state.runtime.captures(grammar,clean(source.text)+' '+units[0]).map(t=>({...t,sourceSpans:unique(evidenceOf(source).concat(headerSpans)),inheritedUnit:true}));
}
function bindCapturedFields(n,f,state){
 const fields=n.fields||(n.fields={}),all=arr(n.tokens);
 const bound=Object.entries(f.bindings||{});
 for(const[name,b]of bound){if(!b.grammarRef)continue;const tokens=all.filter(t=>t.grammar===b.grammarRef);if(tokens.length){fields[name]=field(tokens.map(t=>t.text).join(' | '),tokens.flatMap(t=>t.sourceSpans),{tokens:tokens.map(t=>({text:t.text,groups:t.groups})),...tokens[0].groups});}}
 if(!fields.dose){const dose=all.filter(t=>t.grammar==='mass_activity_amount');if(dose.length)fields.dose=field(dose.map(t=>t.text).join(' | '),dose.flatMap(t=>t.sourceSpans),{tokens:dose.map(t=>({text:t.text,groups:t.groups}))});}
 if(!fields.schedule){const tokens=all.filter(t=>t.grammar==='frequency');if(tokens.length)fields.schedule=field(tokens.map(t=>t.text).join(' | '),tokens.flatMap(t=>t.sourceSpans));else if(fields.frequency)fields.schedule=clone(fields.frequency);}
 if(!fields.duration){const tokens=all.filter(t=>t.grammar==='duration');if(tokens.length)fields.duration=field(tokens.map(t=>t.text).join(' | '),tokens.flatMap(t=>t.sourceSpans));}
 if(fields.duration){const inherited=all.find(token=>token.grammar==='duration'&&token.inheritedUnitText);if(inherited)fields.duration.unit=inherited.inheritedUnitText;}
 if(fields.route){const text=fields.route.sourceText;fields.route.code=canonical(text);}
 if(!fields.route){const tokens=all.filter(t=>t.grammar==='route');if(tokens.length){const texts=unique(tokens.map(t=>canonical(t.groups.route||t.text)));if(texts.length===1)fields.route=field(tokens[0].text,tokens.flatMap(t=>t.sourceSpans),{code:texts[0]});}else{const route=state.label.identity.route;if(typeof route==='string'&&route.trim()){const identitySpan={document_id:n.document_id,node_id:'source-identity-route',source_field:'openfda.route',quote:route};fields.route=field(route,[identitySpan],{code:canonical(route)});}}}
 const amounts=all.filter(t=>own(t.groups||{},'amount')&&(!fields.dose||arr(t.sourceSpans).some(e=>arr(fields.dose.sourceSpans).some(d=>d.node_id===e.node_id))));if(fields.dose&&amounts.length===1){const g=amounts[0].groups;for(const key of ['amount','unit','basis','period'])if(g[key]!=null)fields.dose[key]=g[key];fields.dose.sourceSpans=unique(arr(fields.dose.sourceSpans).concat(arr(amounts[0].sourceSpans)));}
 if(fields.dose&&all.some(token=>token.grammar==='mass_activity_amount'&&token.inheritedUnit)){fields.dose.unitInheritedFromHeader=true;}
 if(fields.dose&&f.bindings?.dose?.roleRef==='daily_total'){
  const cells=arr(n.cells).filter(cell=>cell.roles?.daily_total),headers=cells.flatMap(cell=>arr(cell.headers));
  fields.dose.quantityKind='total_daily';fields.dose.period='day';
  const pattern=state.db.lexicons.sourceScopeRules.dailyTotalComponent;
  const component=pattern&&headers.flatMap(text=>state.runtime.captures(pattern,text))[0];
  if(component)fields.dose.quantityComponent=component.groups.component||component.text;
  fields.dose.sourceSpans=unique(arr(fields.dose.sourceSpans).concat(cells.flatMap(cell=>arr(cell.relations?.header_parent).map(id=>state.index.get(id)).filter(Boolean).flatMap(evidenceOf))));
 }
 if(n.renalOption&&fields.dose&&!state.db.tokenGrammars[f.bindings?.dose?.grammarRef]?.sequenceVerbatim){const primary=all.find(token=>token.grammar==='mass_activity_amount');if(primary)fields.dose.sourceText=primary.text;}
 if(fields.dose?.period&&/day|24\s*hours?/i.test(fields.dose.period))fields.dose.quantityKind='total_daily';
 fields.components=fields.components||[];fields.steps=fields.steps||[];fields.alternatives=fields.alternatives||[];
 return fields;
}
function legacyInferConstraints(n,state){
 if(own(n,'constraints'))return clone(n.constraints);
 const db=state.db,rt=state.runtime,constraints=[];
 const axes=arr(n.cells).filter(c=>Object.entries(c.roles||{}).some(([r,v])=>v&&['population','renal','weight','surface_area'].includes(r)));
 const fieldMatches=(text)=>{const normalized=normalizeMatchText(text,db,rt);return Object.entries(db.fieldDefinitions).filter(([k,v])=>phrase(normalized,k)||phrase(normalized,v.label));};
 const make=(source,fieldEntries)=>{
  if(fieldEntries.length!==1)return {kind:'unknown',field:null,sourceSpans:evidenceOf(source),reason:'unbound_patient_axis'};
  const[key,def]=fieldEntries[0],c={kind:def.type==='number'?'quantity':'enum',field:key,metric:key,unit:def.unit,sourceSpans:evidenceOf(source)};
  const text=source.constraintText||source.text;
  if(def.type!=='number'){
   const values=arr(def.values).filter(v=>phrase(text,v));
   if(values.length!==1)return {...c,kind:'unknown',reason:'unparsed_or_mixed_enum_branch'};
   c.allowedValues=values;return c;
  }
  const compact=String(source.axisHeader||text).replace(/\s+/g,'').toLowerCase();
  const units=Object.keys(db.units).sort((x,y)=>y.length-x.length).filter(u=>compact.includes(u.replace(/\s+/g,'').toLowerCase()));
  const explicitUnit=units.find(u=>db.units[u].dimension===db.units[def.unit]?.dimension||/[\/]/.test(u));
  if(explicitUnit&&explicitUnit!==def.unit)return {...c,kind:'unknown',reason:'source_unit_differs_from_measurement'};
  let token=rt.captures(db.tokenGrammars.numeric_range,text)[0];
  if(token){const g=token.groups;c.range={lower:Number(g.lower),upper:Number(g.upper),lowerInclusive:!['>','greater than'].includes(clean(g.lowerOperator).toLowerCase()),upperInclusive:!['<','less than'].includes(clean(g.upperOperator).toLowerCase()),metric:key,unit:def.unit};return c;}
  token=rt.captures(db.tokenGrammars.threshold,text)[0];
  if(token){const g=token.groups,op=canonical(g.operator)||g.operator,amount=Number(g.value),lower=['>','>=','≥','at least','greater than'].includes(g.operator)||['at least','greater than'].includes(op);c.range={lower:lower?amount:null,upper:lower?null:amount,lowerUnbounded:!lower,upperUnbounded:lower,lowerInclusive:['>=','≥','at least'].includes(g.operator)||op==='at least',upperInclusive:['<=','≤','no greater than'].includes(g.operator)||op==='no greater than',metric:key,unit:def.unit};return c;}
  return {...c,kind:'unknown',reason:'unparsed_numeric_branch'};
 };
 for(const cell of axes){const header=arr(cell.headers).join(' ');constraints.push(make({...cell,axisHeader:header},fieldMatches(header+' '+cell.text)));}
 if(!axes.length){
  const contexts=[n,...arr(n.scopeNodes).filter(x=>x.kind==='section.heading')];
  for(const source of contexts){
   const measures=rt.captures(db.tokenGrammars.measurement,source.text);
   if(measures.length){for(let i=0;i<measures.length;i++){const start=measures[i].index;let end=measures[i+1]?.index??source.text.length;const dose=rt.captures(db.tokenGrammars.mass_activity_amount,source.text).find(t=>t.index>start);if(dose)end=Math.min(end,dose.index);const text=source.text.slice(start,end);constraints.push(make({...source,constraintText:text,axisHeader:text},fieldMatches(measures[i].text)));}}
   else if(rt.match(db.roleRules.population.matches,source.text)||rt.match(db.roleRules.renal.matches,source.text))constraints.push({kind:'unknown',field:null,reason:'unparsed_patient_scope',sourceSpans:evidenceOf(source)});
  }
 }
 return unique(constraints);
}
function sourceAxisConstraints(source,state){
 const result=[],seen=new Set(),text=source.constraintText||source.text||'';
 for(const rule of arr(state.db.lexicons?.patientAxisRules)){
  if(seen.has(rule.field)&&!rule.additive||rule.unless&&state.runtime.match(rule.unless,text))continue;
  const capture=state.runtime.captures(rule.pattern,text)[0];if(!capture)continue;
  const definition=state.db.fieldDefinitions[rule.field];if(!definition)continue;
  if(rule.relation==='prohibited'){result.push({kind:'prohibited',field:rule.field,prohibitedValue:rule.value,sourceSpans:evidenceOf(source),sourceText:capture.text});seen.add(rule.field);continue;}
  if(rule.relation==='enum'){result.push({kind:'enum',field:rule.field,allowedValues:clone(rule.values),anyValue:!!rule.anyValue,sourceSpans:evidenceOf(source),sourceText:capture.text});seen.add(rule.field);continue;}
  if(rule.relation==='qualitative_normal'){result.push({kind:'qualitative_normal',field:rule.field,unit:definition.unit,sourceSpans:evidenceOf(source),sourceText:capture.text});seen.add(rule.field);continue;}
  const groups=capture.groups||{},factor=rule.factor||1,value=Number(groups.value??rule.value)*factor;
  let lower=null,upper=null,lowerInclusive=true,upperInclusive=true;
  if(rule.relation==='range'){lower=Number(groups.lower)*(rule.lowerFactor||factor);upper=Number(groups.upper)*(rule.upperFactor||factor);}
  else if(rule.relation==='lower'){lower=value;lowerInclusive=rule.inclusive!==false;}
  else if(rule.relation==='upper'){upper=value;upperInclusive=rule.inclusive!==false;}
  else if(rule.relation==='operator'){
   const operator=clean(groups.operator).toLowerCase().replace(/\s+/g,' ');
   if(['>','>=','≥','greater than','older than','over','above','more than','at least','greater than or equal to'].includes(operator)){lower=value;lowerInclusive=['>=','≥','at least','greater than or equal to'].includes(operator);}
   else {upper=value;upperInclusive=['<=','≤','no greater than','less than or equal to','at most'].includes(operator);}
  }else continue;
  if((lower!==null&&!Number.isFinite(lower))||(upper!==null&&!Number.isFinite(upper)))continue;
  const compact=text.replace(/\s+/g,'').toLowerCase(),unit=definition.unit;
  if(['gfr','egfr'].includes(rule.field)){
   const explicit=text.slice(Math.max(0,capture.index),capture.end+45).match(/mL\s*\/\s*min(?:\s*\/\s*1[.]73\s*m\s*(?:2|²))?/i);
   if(explicit){const indexed=/1[.]73/.test(explicit[0]);if(indexed!==(state.db.units[unit]?.dimension==='indexed_clearance')){result.push({kind:'unknown',field:rule.field,reason:'source_unit_differs_from_measurement',sourceText:capture.text,sourceSpans:evidenceOf(source)});seen.add(rule.field);continue;}}
  }
  if(unit==='mL/min'&&/ml\/min\/(?:1[.]73|kg)/i.test(compact)){
   result.push({kind:'unknown',field:rule.field,reason:'source_unit_differs_from_measurement',sourceSpans:evidenceOf(source)});seen.add(rule.field);continue;
  }
  result.push({kind:'quantity',field:rule.field,metric:rule.field,unit,range:{lower,upper,lowerInclusive,upperInclusive,lowerUnbounded:lower===null,upperUnbounded:upper===null,metric:rule.field,unit},sourceSpans:evidenceOf(source),sourceText:capture.text});seen.add(rule.field);
 }
 return result;
}
function inferConstraints(n,state){
 if(own(n,'constraints'))return clone(n.constraints);
 const result=clone(n.columnConstraints||[]),axes=arr(n.cells).filter(cell=>['population','renal','weight','surface_area','severity'].some(role=>cell.roles?.[role]));
 for(const cell of axes){const text=arr(cell.headers).join(' ')+' '+cell.text,source={...cell,text};const bound=sourceAxisConstraints(source,state);
  if(bound.length)result.push(...bound);else result.push(...legacyInferConstraints({...n,cells:[cell],scopeNodes:[]},state));
 }
 for(const source of [n,...arr(n.scopeNodes).filter(scope=>['section.heading','table.caption'].includes(scope.kind))]){
  const bound=sourceAxisConstraints(source,state);result.push(...bound);
  if(!bound.length&&!axes.length)result.push(...legacyInferConstraints({...source,scopeNodes:[],cells:[]},state));
 }
 const merged=new Map();for(const constraint of result){const key=JSON.stringify([constraint.kind,constraint.field,constraint.range,constraint.allowedValues,constraint.reason]);if(merged.has(key))merged.get(key).sourceSpans=unique(merged.get(key).sourceSpans.concat(constraint.sourceSpans||[]));else merged.set(key,constraint);}
 for(const constraint of merged.values()){const r=constraint.range;if(r&&Number.isFinite(r.lower)&&Number.isFinite(r.upper)&&r.lower>r.upper){[r.lower,r.upper]=[r.upper,r.lower];[r.lowerInclusive,r.upperInclusive]=[r.upperInclusive,r.lowerInclusive];}}
 const all=[...merged.values()],combined=all.filter(c=>c.kind!=='qualitative_normal'||!all.some(other=>other.kind==='quantity'&&other.field===c.field&&Number.isFinite(other.range?.lower)&&other.range.upperUnbounded)),routine=state.db.policies.quantity?.routineRenalBranch;if(routine&&combined.some(c=>state.db.units[c.unit]?.dimension==='clearance')&&!combined.some(c=>c.field===routine.field))combined.push({kind:'enum',field:routine.field,allowedValues:clone(routine.allowedValues),sourceSpans:combined.filter(c=>state.db.units[c.unit]?.dimension==='clearance').flatMap(c=>c.sourceSpans)});return combined;
}
function prepareSourceScopes(state){
 const nodes=state.label.nodes,additions=[],shared=new Map(),sections=new Map();
 const scopeRule=state.db.lexicons?.sourceScopeRules?.sharedPopulation;
 for(const node of nodes){
  if(node.kind!=='prose.clause'||node.source_field!=='dosage_and_administration')continue;
  const key=String(node.sourceSpans?.[0]?.source_index??0),spans=evidenceOf(node);
  if(sections.has(key))node.relations.section_parent=unique(arr(node.relations.section_parent).concat(sections.get(key)));
  const headingRule=state.db.lexicons?.sourceScopeRules?.sectionHeading;
  if(headingRule){for(const match of state.runtime.captures(headingRule,node.text)){const id=node.id+':section-scope:'+match.index;additions.push({id,kind:'section.heading',text:match.groups.scope||match.text,source_field:node.source_field,document_id:node.document_id,section_id:id,sourceSpans:spans,relations:{}});const previous=sections.get(key),population=shared.get(key);sections.set(key,id);shared.delete(key);if(match.index===0)node.relations.section_parent=unique(arr(node.relations.section_parent).filter(parent=>parent!==previous&&parent!==population).concat(id));}}
  if(scopeRule){const match=state.runtime.captures(scopeRule,node.text)[0];if(match){const id=node.id+':population-scope',text=match.groups.scope||match.text;
   const heading={id,kind:'section.heading',text,source_field:node.source_field,document_id:node.document_id,section_id:id,sourceSpans:spans,relations:{}};additions.push(heading);shared.set(key,id);}}
  if(shared.has(key))node.relations.section_parent=unique(arr(node.relations.section_parent).concat(shared.get(key)));
  const dose=state.runtime.captures(state.db.tokenGrammars.mass_activity_amount,node.text)[0];
  if(dose){const prefix=node.text.slice(0,dose.index),last=prefix.lastIndexOf(':');
   if(last>=0){const preceding=prefix.slice(0,last),prior=preceding.lastIndexOf(':'),heading=clean(preceding.slice(prior+1));
    if(heading)node.fields={...node.fields,indication:field(heading,spans)};
   }
  }
 }
 const override=state.db.lexicons?.sourceScopeRules?.organismDoseOverride;
 if(override)for(const row of nodes.filter(node=>node.kind==='table.row')){
  for(const cell of arr(row.cells).slice(0,1))for(const match of state.runtime.captures(override,cell.text)){
   const organisms=sourceOrganisms(match.groups.organism,state.db);if(!organisms.length)continue;
   const id=row.id+':organism-override:'+match.index;
   additions.push({id,kind:'prose.clause',text:match.text,source_field:row.source_field,document_id:row.document_id,section_id:row.section_id,table_id:row.table_id,sourceSpans:evidenceOf(cell),relations:clone(row.relations||{}),organismRestrictions:organisms,fields:{indication:field(cell.text,evidenceOf(cell))},inheritedRoleCells:{duration:arr(row.cells).find(candidate=>rolesFor(candidate.headers,state.db,state.runtime).duration),route:arr(row.cells).find(candidate=>rolesFor(candidate.headers,state.db,state.runtime).route)||arr(row.cells).find(candidate=>rolesFor(candidate.headers,state.db,state.runtime).dose)}});
   row.overrideOrganisms=unique(arr(row.overrideOrganisms).concat(organisms));
  }
 }
 nodes.push(...additions);
}
function sourceOrganisms(text,db){
 const found=[];for(const entry of arr(db.lexicons?.organismSourceAliases))if(arr(entry.aliases).some(alias=>phrase(text,alias)))found.push(...arr(entry.canonical));return unique(found);
}
function establishContext(n,state){
 if(obj(n.context))return clone(n.context);
 const context=state.context,terms=unique([context.indication||context.label||'',...arr(context.indicationTerms)].flatMap(term=>expandContext(term,state.db))),ownInd=n.fields?.indication?.sourceText||'',scopeTexts=arr(n.scopeNodes).filter(x=>x.kind==='section.heading'||x.kind==='table.caption').map(x=>x.text);
 const local=[ownInd,n.text,...scopeTexts].join(' '),general=Boolean(ownInd)&&state.db.lexicons?.sourceScopeRules?.genericRegimenContext&&state.runtime.match(state.db.lexicons.sourceScopeRules.genericRegimenContext,ownInd),hasExplicit=(Boolean(ownInd)&&!general)||arr(state.db.lexicons?.indicationTerms).some(t=>phrase(n.text,t));
 let indicationMatches=terms.length?terms.some(t=>phrase(local,t)):context.browse===true?true:null;
 if(ownInd&&!general)indicationMatches=terms.length?terms.some(t=>phrase(ownInd,t)):context.browse===true?true:null;
 if(terms.length&&!hasExplicit&&!indicationMatches){const labelInd=state.label.identity.indications||'';indicationMatches=terms.some(t=>phrase(labelInd,t))?true:null;}
 // An empty disease cell is not a general dosage instruction. In particular it
 // must not borrow the label's other indications to supply an unrelated dose.
 if(arr(n.cells).some(cell=>cell.roles?.indication)&&!ownInd)indicationMatches=null;
 const sourceIntent=arr(n.cells).filter(c=>c.roles?.option||c.roles?.indication).map(c=>c.text).join(' ')+' '+local;
 const targetIntent=context.treatment_intent;let intentContradicts=false;
 if(!targetIntent)intentContradicts=context.browse===true?false:null;else if(targetIntent==='treatment'&&phrase(sourceIntent,'prophylaxis')&&!phrase(sourceIntent,'treatment'))intentContradicts=true;else if(targetIntent==='prophylaxis'&&phrase(sourceIntent,'treatment')&&!phrase(sourceIntent,'prophylaxis'))intentContradicts=true;
 let organismContradicts=false;if(context.organism||context.pathogen){const raw=context.organism||context.pathogen,wanted=sourceOrganisms(raw,state.db);if(!wanted.length)wanted.push(raw);const restrictions=arr(n.organismRestrictions).length?n.organismRestrictions:sourceOrganisms(ownInd||local,state.db);if(restrictions.length)organismContradicts=!restrictions.some(r=>wanted.some(w=>canonical(r)===canonical(w)));if(arr(n.overrideOrganisms).some(r=>wanted.some(w=>canonical(r)===canonical(w))))organismContradicts=true;}
 if(!context.organism&&!context.pathogen&&arr(n.organismRestrictions).length&&context.browse!==true)organismContradicts=null;
 for(const conflict of arr(state.db.lexicons?.contextConflictRules))if(state.runtime.match(conflict.target,[context.indication,...arr(context.indicationTerms)].join(' '))&&state.runtime.match(conflict.source,ownInd||n.text))indicationMatches=false;
 if(terms.length&&terms.some(t=>phrase(local,'not indicated for '+t)||phrase(local,'not recommended for '+t)))indicationMatches=false;
 for(const rule of arr(state.db.lexicons?.sourceScopeRules?.contextualRegimenRules)){
  const env=envFor(state,n,{...n,fields:n.fields||{}});
  if(evaluate(rule.when,env,state)===true&&evaluate(rule.assert,env,state)!==true)indicationMatches=false;
 }
 return {indicationMatches,organismContradicts,intentContradicts};
}
function abnormalRenalState(state){
 const p=state.db.policies.quantity?.physiologicalRenalAssumption;
 return state.patient[p.noDialysisField]!=null&&state.patient[p.noDialysisField]!==p.noDialysisValue||Object.entries(p?.normalMinimums||{crcl:90,gfr:90,indexed_clearance:90,egfr:90}).some(([field,minimum])=>Number.isFinite(state.patient[field])&&state.patient[field]<minimum);
}
function qualitativeNormalRenalState(state){
 const policy=state.db.policies.quantity?.physiologicalRenalAssumption,patient=state.patient;
 return !!policy?.enabled&&state.db.policies.quantity.assumeNormalRenalFunction===true&&!abnormalRenalState(state)&&Number.isFinite(patient[policy.screenField])&&patient[policy.screenField]>=policy.minimumScreenValue&&patient[policy.noDialysisField]===policy.noDialysisValue&&!arr(state.db.policies.sourceCalculations?.definitions).some(rule=>patient[rule.activation?.field]===rule.activation?.value&&patient[rule.output?.field]==null);
}
function physiologicalRenalAssumption(constraint,state,candidate){
 const policy=state.db.policies.quantity?.physiologicalRenalAssumption,patient=state.patient;
 if(!qualitativeNormalRenalState(state)||constraint.kind!=='quantity'||!arr(policy.fields||[policy.missingField]).includes(constraint.field)||patient[constraint.field]!=null)return null;
 const rules=state.db.lexicons.sourceScopeRules,context=[candidate?.text,...arr(candidate?.sourceNode?.scopeNodes).map(node=>node.text)].join(' ');
 if(rules.impairedOnlyContext&&state.runtime.match(rules.impairedOnlyContext,candidate?.text||'')&&!(rules.standardRenalBaseline&&state.runtime.match(rules.standardRenalBaseline,candidate?.text||'')))return null;
 const range=constraint.range;if(!range||!Number.isFinite(range.lower)||range.lower>policy.maximumStandardLowerBound||(range.lower===policy.maximumStandardLowerBound&&!range.lowerInclusive))return null;
 if(!range.upperUnbounded){if(!policy.allowSourceIdentifiedBoundedBaseline||!Number.isFinite(range.upper)||range.upper<(policy.minimumStandardUpperBound||90)||!rules.standardRenalBaseline||!state.runtime.match(rules.standardRenalBaseline,context)||rules.nonstandardRenalContext&&state.runtime.match(rules.nonstandardRenalContext,context))return null;}
 return {type:'physiological_renal',field:constraint.field,screenField:policy.screenField,screenValue:patient[policy.screenField],minimumScreenValue:policy.minimumScreenValue,noNumericValueInferred:true};
}
function candidateFrom(n,f,state){
 const fields=bindCapturedFields(n,f,state),constraints=roiConstraintGuard(n,inferConstraints(n,state),state),ev=unique(evidenceOf(n).concat(Object.values(fields).filter(obj).flatMap(evidenceOf)));
 n.constraints=clone(constraints);state.renalConstraints.push(...constraints.filter(c=>['quantity','qualitative_normal'].includes(c.kind)&&['clearance','indexed_clearance'].includes(state.db.units[c.unit]?.dimension)));
 if(state.roi)state.roi.candidateConstraints.set(n.id,unique((state.roi.candidateConstraints.get(n.id)||[]).concat(constraints)));
 if(state.indicationCompanionConditions===undefined){
  state.indicationCompanionConditions=[];
  if(state.db.lexicons.sourceScopeRules.indicationCompanion)for(const clause of state.label.nodes.filter(node=>node.kind==='prose.clause')){
   if(!state.runtime.match(state.db.lexicons.sourceScopeRules.indicationCompanion,clause.text))continue;
   const context=establishContext({...clause,fields:{}},state);
   if(context.indicationMatches===true&&context.organismContradicts===false&&context.intentContradicts===false)state.indicationCompanionConditions.push(field(clause.text,evidenceOf(clause),{feature:'required_companion'}));
  }
 }
 const sourceConditions=n.fields?.indication?state.indicationCompanionConditions:[];
 const c={id:n.id,nodeIds:[n.id],document_id:n.document_id,product_id:n.product_id||state.label.identity.product||'',section_id:n.section_id,table_id:n.table_id,row_id:n.row_id,regimen_option:n.regimen_option||'',phase_sequence:n.phase_sequence||'',text:n.text,fields,constraints,evidence:ev,conditions:unique(arr(n.conditions).concat(sourceConditions,arr(n.scopeNodes).filter(x=>['footnote','table.caption','section.heading'].includes(x.kind)&&x.text!==n.source_field?.replace(/_/g,' ')).map(x=>field(x.text,evidenceOf(x))))),context:establishContext({...n,fields},state),hasContradictions:Boolean(n.hasContradictions),resolutionStatus:'resolved',missingFields:[],assumptions:[],formatMatches:[f.id],diagnostics:[],sourceNode:n};
 if(state.roi)c.conditions=unique(c.conditions.concat(constraints.filter(item=>item.sourceText).map(item=>field(item.sourceText,item.sourceSpans||[],{feature:'source_patient_condition'}))));
 const phases=arr(n.tokens).filter(t=>t.grammar==='phase');
 const sequence=arr(n.tokens).find(token=>state.db.tokenGrammars[token.grammar]?.sequenceVerbatim&&token.grammar===f.bindings?.dose?.grammarRef);
 const nonLoading=state.db.lexicons.sourceScopeRules.initialNotLoading;const semanticPhases=phases.filter(token=>!(token.groups?.phase?.toLowerCase()==='initial'&&nonLoading&&state.runtime.match(nonLoading,n.text)));
 if(semanticPhases.length){
  if(n.kind==='prose.clause'){c.fields.steps=[field(n.text,evidenceOf(n),{sequenceVerbatim:true})];if(c.fields.dose)c.fields.dose.sourceText=n.text;if(c.fields.schedule)c.fields.schedule.sourceText=n.text;}
  else if(sequence){c.fields.steps=[field(sequence.text,sequence.sourceSpans,{sequenceVerbatim:true})];}
  else if(!arr(n.relations?.phase_sequence).length)mark(c,'unresolved','PHASE_SEQUENCE_REQUIRES_EXPLICIT_LINK');
 }
 if(arr(n.cells).filter(cell=>cell.roles?.phase).length>1&&!arr(n.relations?.phase_sequence).length)mark(c,'unresolved','PHASE_SEQUENCE_REQUIRES_EXPLICIT_LINK');
 const doseTokens=arr(n.tokens).filter(t=>own(t.groups||{},'amount'));
 const doseSources=new Set(arr(c.fields.dose?.sourceSpans).map(e=>e.node_id));
 if(!doseTokens.some(t=>arr(t.sourceSpans).some(e=>doseSources.has(e.node_id))))mark(c,'unresolved','DOSE_NOT_ESTABLISHED_BY_GRAMMAR');
 if(!Array.isArray(constraints))mark(c,'unresolved','CONSTRAINTS_UNAVAILABLE');
 for(const x of arr(constraints))if(x.kind==='unknown'||!x.field&&x.kind!=='any')mark(c,'unresolved','UNPARSED_PATIENT_AXIS',x.field||x.reason);
 return c;
}
function mark(c,status,code,fieldName){c.resolutionStatus=status;c.diagnostics=arr(c.diagnostics);if(!c.diagnostics.some(x=>x.code===code&&x.field===fieldName))c.diagnostics.push({code,...(fieldName?{field:fieldName}:{})});if(fieldName){if(code==='MISSING_PATIENT_FIELD')c.missingFields=unique(arr(c.missingFields).concat(fieldName));else c.failedChecks=unique(arr(c.failedChecks).concat(fieldName));}return c;}
function combineCandidate(a,b){const out=clone(a);out.nodeIds=unique(a.nodeIds.concat(b.nodeIds));out.evidence=unique(a.evidence.concat(b.evidence));out.conditions=unique(a.conditions.concat(b.conditions));out.formatMatches=unique(a.formatMatches.concat(b.formatMatches));out.text=[a.text,b.text].join('\n');out.fields.steps=[...arr(a.fields.steps),field(a.text,a.evidence,{fields:clone(a.fields)}),...arr(b.fields.steps),field(b.text,b.evidence,{fields:clone(b.fields)})];for(const[k,v]of Object.entries(b.fields)){if(!out.fields[k]||(Array.isArray(out.fields[k])&&!out.fields[k].length))out.fields[k]=clone(v);else if(JSON.stringify(out.fields[k])!==JSON.stringify(v)&&obj(v)&&obj(out.fields[k]))out.fields[k]=field(out.fields[k].sourceText+' | '+v.sourceText,arr(out.fields[k].sourceSpans).concat(arr(v.sourceSpans)),{parts:[out.fields[k],v]});}out.constraints=unique(arr(a.constraints).concat(arr(b.constraints)));if(b.resolutionStatus!=='resolved')mark(out,'unresolved','UNRESOLVED_LINKED_STEP');return out;}
function materialize(value,env,state){if(Array.isArray(value))return value.map(x=>materialize(x,env,state));if(obj(value)){if(own(value,'path')||own(value,'op'))return evaluate(value,env,state);const out={};for(const[k,v]of Object.entries(value))out[k]=materialize(v,env,state);return out;}return value;}
function executePipeline(f,scope,state){
 const stages=compiledDatabase(state.db).stages.get(f),outputs={'label.nodes':state.label.nodes};
 const candidateLimit=state.db.contract.expansion?.limits?.maximumCandidatesPerLabel||2000;
 for(const s of stages){state.runtime.checkDeadline();const a=s.arguments,input=outputs[s.input];let result=[];
  switch(s.operation){
  case 'select':{const selector=a.selector||{};result=input.filter(n=>withinScope(n,scope,state)&&(!selector.nodeTypes||selector.nodeTypes.includes(n.kind))&&(!selector.withinSourceFields||selector.withinSourceFields.includes(n.source_field))&&(!selector.roiFingerprint||state.roi?.byNode.get(n.id)?.shape?.fingerprint===selector.roiFingerprint)&&(f.mode!=='extractor'||!state.roi||state.roi.selected.has(n.id))&&!arr(selector.excludeRoles).some(r=>n.roles?.[r])&&!state.excludedIds.has(n.id));result=result.map(n=>clone(n));break;}
  case 'bind_roles':result=input.map(n=>({...n,fields:{...clone(n.fields||{}),...nodeRoleFields(n,f,state)}}));break;
  case 'inherit_scope':result=input.map(n=>{const links=linkedNodes(n,a,state);return {...n,scopeNodes:links,sourceSpans:unique(evidenceOf(n).concat(links.flatMap(evidenceOf)))};});break;
  case 'tokenize':result=input.map(n=>{const ids=unique(arr(a.grammarRefs).concat(Object.values(f.bindings||{}).map(b=>b.grammarRef).filter(Boolean))),tokens=[];for(const id of ids){const g=state.db.tokenGrammars[id];for(const source of captureNodes(n,f,id,state)){let captures=captureSource(g,source,state);if(!captures.length)captures=inheritedUnitCapture(source,g,state);for(const cap of captures){tokens.push({...cap,grammar:id,sourceNode:source.id,sourceSpans:cap.sourceSpans||evidenceOf(source)});}}}return {...n,tokens};});break;
  case 'group':{result=input.map(n=>{const c=n.fields&&n.formatMatches?n:candidateFrom(n,f,state);if(state.roi)for(const id of c.nodeIds||[])state.roi.patterns.get(id)?.add(f.id);c.groupKey=arr(a.keys).map(k=>JSON.stringify(get(c,k)??null)).join('|');return c;});break;}
  case 'join':{
   result=input.map(clone);
   // Only explicitly linked source nodes may be joined. Shared drug/indication alone is insufficient.
   const used=new Set();for(let i=0;i<result.length;i++){if(used.has(i))continue;const links=arr(result[i].sourceNode?.relations?.regimen_link).concat(arr(result[i].sourceNode?.relations?.phase_sequence));const matches=result.map((v,j)=>({v,j})).filter(({v,j})=>j!==i&&v.document_id===result[i].document_id&&v.product_id===result[i].product_id&&links.some(id=>v.nodeIds.includes(id)));if(matches.length>1&&a.cardinality==='one_to_one'){mark(result[i],'unresolved','JOIN_CARDINALITY');continue;}for(const{v,j}of matches){result[i]=combineCandidate(result[i],v);used.add(j);}}result=result.filter((_,i)=>!used.has(i));break;}
  case 'filter':result=input.filter(c=>{let value;const predicate=a.predicate,patientFilter=predicate?.op==='all'&&arr(predicate.args).some(e=>e.forEach==='candidate.constraints');
   if(patientFilter){
    if(!Array.isArray(c.constraints))value=null;else{const values=c.constraints.map(constraint=>{if(constraint.kind==='clinical_filter'){const v=get(state.safetyFilters,constraint.filterPath);return v==null?null:constraint.allowedValues.includes(v);}
    if(constraint.kind==='unknown'||!constraint.field&&constraint.kind!=='any')return null;if(constraint.kind==='any'){const vals=constraint.alternatives.map(part=>evaluate(state.db.policies.applicabilityRules.numericBand,{...envFor(state,c.sourceNode,c),constraint:part},state));return vals.includes(true)?true:vals.includes(null)?null:false;}if(constraint.kind==='enum'&&constraint.anyValue&&state.patient[constraint.field]==null)return true;if(constraint.kind==='qualitative_normal'){const direct=state.patient[constraint.field],policy=state.db.policies.quantity.physiologicalRenalAssumption;return Number.isFinite(direct)?direct>=(policy.qualitativeMeasuredLowerBound||90):qualitativeNormalRenalState(state)?true:null;}const p=constraint.kind==='enum'?state.db.policies.applicabilityRules?.enumBranch:constraint.kind==='prohibited'?state.db.policies.applicabilityRules?.prohibitedBranch:state.db.policies.applicabilityRules?.numericBand;let verdict=p?evaluate(p,{...envFor(state,c.sourceNode,c),constraint},state):null;if(verdict===null){const assumption=physiologicalRenalAssumption(constraint,state,c);if(assumption){c.assumptions=unique(arr(c.assumptions).concat(assumption));verdict=true;}else if(state.db.policies.quantity?.physiologicalRenalAssumption?.excludeImpairedBands&&qualitativeNormalRenalState(state)&&constraint.kind==='quantity'&&arr(state.db.policies.quantity.physiologicalRenalAssumption.fields||['crcl']).includes(constraint.field)&&Number.isFinite(constraint.range?.upper)&&(constraint.range.upper<state.db.policies.quantity.physiologicalRenalAssumption.minimumScreenValue||constraint.range.upper===state.db.policies.quantity.physiologicalRenalAssumption.minimumScreenValue&&constraint.range.upperInclusive===false)){verdict=false;}}return verdict;});value=values.includes(false)?false:values.includes(null)?null:true;}
   }else value=evaluate(predicate,envFor(state,c.sourceNode,c),state);
   if(value===true)return true;if(value===false&&patientFilter&&Array.isArray(c.constraints)&&c.constraints.some(constraint=>standardRenalBand(constraint,state,c))){const others=c.constraints.filter(constraint=>!standardRenalBand(constraint,state,c));if(others.every(constraint=>evaluate(constraint.kind==='enum'?state.db.policies.applicabilityRules.enumBranch:state.db.policies.applicabilityRules.numericBand,{...envFor(state,c.sourceNode,c),constraint},state)===true)){c.referenceOnly=true;return true;}}if(value===false){state.excluded.push({status:'excluded',candidateId:c.id,reason:'FILTER_MISMATCH',evidence:c.evidence});return false;}const missing=patientFilter?arr(c.constraints).filter(constraint=>constraint.kind!=='unknown'&&constraint.field&&state.patient[constraint.field]==null).map(constraint=>constraint.field):[];if(missing.length){for(const name of unique(missing))mark(c,'unresolved','MISSING_PATIENT_FIELD',name);}else mark(c,'unresolved','MISSING_OR_AMBIGUOUS_FILTER');return true;});break;
  case 'require':result=input.map(c=>{for(const check of arr(a.checks)){const v=evaluate(check.assert,envFor(state,c.sourceNode,c),state);if(v!==true){if(check.referenceOnlyWhen&&evaluate(check.referenceOnlyWhen,envFor(state,c.sourceNode,c),state)===true){c.referenceOnly=true;continue;}const missing=arr(check.inputFieldRefs).filter(name=>own(state.db.fieldDefinitions,name)&&state.patient[name]==null);for(const name of missing)mark(c,'unresolved','MISSING_PATIENT_FIELD',name);mark(c,'unresolved',v===false?'REQUIREMENT_FAILED':'REQUIREMENT_UNKNOWN',check.id);}}return c;});break;
  case 'project':{const mapping=get(state.db,a.mappingRef);result=input.map(c=>{const r=materialize(mapping,envFor(state,c.sourceNode,c),state);let calculation=false;walk(mapping.dose,x=>{if(obj(x)&&['add','subtract','multiply','divide','minimum','maximum'].includes(x.op))calculation=true;});if(calculation&&state.db.policies.quantity?.allowDoseCalculation!==true){r.status='unresolved';mark(c,'unresolved','DOSE_CALCULATION_DISABLED');}for(const k of ['components','steps','alternatives','conditions','evidence','missingFields','formatMatches'].concat(own(mapping,'assumptions')?['assumptions']:[]))if(!Array.isArray(r[k]))r[k]=[];for(const k of ['indication','population','dose','schedule','route','duration'])if(!obj(r[k]))r[k]=null;r._candidate=c;r._diagnostics=c.diagnostics;return r;});break;}
  case 'attach_evidence':result=input.map(r=>({...r,evidence:unique(arr(r.evidence).concat(arr(r._candidate?.evidence)))}));break;
  case 'emit':result=input.map(r=>{const cleanRecord=clone(r);delete cleanRecord._candidate;delete cleanRecord._diagnostics;let sourceValid=true;for(const key of ['dose','schedule']){const v=cleanRecord[key];if(v){const spans=arr(v.sourceSpans);const quotes=spans.map(e=>canonical(/<\/?(?:table|td|th|tr|content|paragraph|p|div|br|sup|sub)\b/i.test(e.quote)?normText(e.quote):e.quote));const pieces=String(v.sourceText||'').split(/\s*\|\s*|\n/).map(canonical).filter(Boolean);const headerUnitValid=key==='dose'&&v.unitInheritedFromHeader===true&&v.upper==null&&v.unit&&v.amount&&canonical(v.sourceText)===canonical(String(v.amount)+' '+v.unit)&&quotes.some(q=>q===canonical(v.amount)||q.startsWith(canonical(v.amount)+' ')&&state.runtime.match(state.db.tokenGrammars.frequency,q))&&quotes.some(q=>phrase(q,v.unit));if(!spans.length||spans.some(e=>e.document_id!==state.label.identity.document_id)||!pieces.every(piece=>quotes.some(q=>q.includes(piece))||headerUnitValid)){sourceValid=false;cleanRecord.status='unresolved';state.diagnostics.push({code:'FIELD_LINEAGE_MISMATCH',field:key,formatId:f.id});}}}const summary=state.db.presentations[a.presentationRef];if(Array.isArray(summary?.summaryQualifiers)&&state.db.regimenSchema?.properties?.summaryQualifiers){const text=[cleanRecord.sourceStructure?.sourceText,...arr(cleanRecord.conditions).map(item=>item.sourceText)].filter(Boolean).join(' ');cleanRecord.summaryQualifiers=unique(summary.summaryQualifiers.flatMap(rule=>state.runtime.captures(rule.pattern,text).map(capture=>({kind:rule.kind,sourceText:capture.text,sourceSpans:arr(cleanRecord.sourceStructure?.sourceSpans)}))));}let errors=schemaErrors(cleanRecord,get(state.db,a.schemaRef),get(state.db,a.schemaRef),0,'regimen',state.runtime);if(errors.length){cleanRecord.status='unresolved';state.diagnostics.push({code:'OUTPUT_SCHEMA',formatId:f.id,errors});}const ev=arr(cleanRecord.evidence);if(!ev.length||!cleanRecord.dose?.sourceSpans?.length||!cleanRecord.schedule?.sourceSpans?.length){cleanRecord.status='unresolved';state.diagnostics.push({code:'INCOMPLETE_SOURCE_EVIDENCE',formatId:f.id});}if(arr(r._candidate?.diagnostics).length)state.diagnostics.push(...r._candidate.diagnostics.map(x=>({...x,formatId:f.id,candidateId:r._candidate.id})));if(cleanRecord.status==='resolved'&&r._candidate?.referenceOnly){state.normalReferences.push({...cleanRecord,status:'reference_only'});return null;}if(cleanRecord.status!=='resolved'){if(sourceValid&&!errors.length&&cleanRecord.dose?.sourceSpans?.length&&cleanRecord.schedule?.sourceSpans?.length&&arr(r._candidate?.diagnostics).length&&r._candidate.diagnostics.every(item=>item.code==='MISSING_PATIENT_FIELD')&&state.db.policies.resolution?.missingPatientInputDisplay==='conditional_source_excerpt'){state.pending.push({...cleanRecord,status:'awaiting_inputs'});}const {dose,schedule,components,steps,alternatives,...notice}=cleanRecord;state.unresolved.push({...notice,dose:null,schedule:null,components:[],steps:[],alternatives:[],reason:'INSUFFICIENT_OR_CONFLICTING_EVIDENCE'});return null;}return cleanRecord;}).filter(Boolean);break;
  case 'annotate':result=input.map(n=>({nodeId:n.id,table_id:n.table_id,section_id:n.section_id,...materialize(a.mapping,envFor(state,n,n,scope,n.features),state)}));state.annotations.push(...result);break;
  case 'exclude':result=input.filter(n=>{const v=evaluate(a.predicate,envFor(state,n,n,scope,n.features),state);if(v===true){state.excludedIds.add(n.id);state.excluded.push({status:'excluded',nodeId:n.id,reason:'DATABASE_EXCLUSION',evidence:evidenceOf(n)});return false;}if(v===null)state.diagnostics.push({code:'EXCLUSION_UNRESOLVED',nodeId:n.id});return true;});break;
  default:fail('UNKNOWN_OPERATION','Unknown pipeline operation');
  }
  if(result.length>candidateLimit)fail('CANDIDATE_LIMIT','Source exceeded candidate limit');outputs[s.output]=result;
 }
 return outputs[stages[stages.length-1].output];
}
function propagateExclusions(state){
 const excludedColumns=state.label.nodes.filter(n=>state.excludedIds.has(n.id)&&n.kind==='table.column');
 for(const row of state.label.nodes.filter(n=>n.kind==='table.row')){
  for(const c of arr(row.cells))if(excludedColumns.some(x=>x.table_id===row.table_id&&x.column_index===c.column_index)){c.excluded=true;c.roles={...c.roles,preparation:true};}
  if(arr(row.cells).length&&row.cells.every(c=>c.excluded||c.roles?.preparation))state.excludedIds.add(row.id);
 }
}
function standardRenalBand(constraint,state,candidate){
 if(constraint.kind==='qualitative_normal')return true;
 const range=constraint.range,dimension=state.db.units[constraint.unit]?.dimension,policy=state.db.policies.quantity.physiologicalRenalAssumption;
 if(constraint.kind!=='quantity'||!['clearance','indexed_clearance'].includes(dimension)||!Number.isFinite(range?.lower)||range.lower>(policy?.maximumStandardLowerBound||90))return false;
 if(range.upperUnbounded)return true;
 const rules=state.db.lexicons.sourceScopeRules,context=[candidate?.text,...arr(candidate?.sourceNode?.scopeNodes).map(node=>node.text)].join(' ');
 return !!policy?.allowSourceIdentifiedBoundedBaseline&&Number.isFinite(range.upper)&&range.upper>=(policy.minimumStandardUpperBound||90)&&!!rules.standardRenalBaseline&&state.runtime.match(rules.standardRenalBaseline,context)&&!(rules.nonstandardRenalContext&&state.runtime.match(rules.nonstandardRenalContext,context));
}
function renalAdjustedRecord(record,state){
 return arr(record.sourceStructure?.constraints).some(c=>c.kind==='quantity'&&['clearance','indexed_clearance'].includes(state.db.units[c.unit]?.dimension)&&Number.isFinite(c.range?.upper)&&!c.range.upperUnbounded&&Number.isFinite(state.patient[c.field])&&state.patient[c.field]<90||c.kind==='enum'&&c.field==='dialysis'&&state.patient.dialysis!=='none'&&arr(c.allowedValues).includes(state.patient.dialysis));
}
function runSourceCalculation(db,request,runtime){
 const definition=arr(db.policies.sourceCalculations?.definitions).find(item=>item.id===request.calculationId);
 if(!db.policies.sourceCalculations?.enabled||!definition)fail('UNKNOWN_CALCULATION','The requested source equation is not registered.');
 const patient=clone(request.patient||{}),values={},missing=[];
 if(definition.preferEnteredValue&&Number.isFinite(patient[definition.output.field]))return {status:'provided',calculationId:definition.id,field:definition.output.field,value:patient[definition.output.field],unit:definition.output.unit};
 for(const [name,input]of Object.entries(definition.inputs||{})){
  const value=patient[input.field],fieldDefinition=db.fieldDefinitions[input.field];
  if(value==null||Array.isArray(input.values)&&!input.values.includes(value)){missing.push(input.field);continue;}
  if(input.unit&&(!Number.isFinite(value)||fieldDefinition?.unit!==input.unit))fail('CALCULATION_UNIT','Calculation inputs must use their declared units.',{field:input.field});
  values[name]=value;
 }
 if(missing.length)return {status:'needs_inputs',calculationId:definition.id,missingFields:missing};
 const environment={patient,input:{values}};
 for(const requirement of arr(definition.requirements))if(evaluateExpression(requirement.assert,environment,db,runtime)!==true)return {status:'unavailable',calculationId:definition.id,reason:requirement.id,message:requirement.message};
 if(!request.label)return {status:'needs_source',calculationId:definition.id};
 const label=normalizeLabel(request.label,request.provenance?{provenance:request.provenance}:{});
 const identity=label.identity,source=db.sourceRegistry[clean(identity.sourceId||identity.source).toLowerCase()];let sourceUrl;
 try{sourceUrl=new URL(identity.sourceUrl);}catch{return {status:'needs_source',calculationId:definition.id};}
 if(identity.testOnly||!source||identity.status!=='retrieved'||sourceUrl.protocol!=='https:'||!arr(source.officialHosts).some(host=>sourceUrl.hostname===host||sourceUrl.hostname.endsWith('.'+host)))return {status:'needs_source',calculationId:definition.id};
 const evidence=[];
 for(const pattern of arr(definition.source.patterns)){
  let bound=null;
  for(const node of label.nodes){if(node.kind!=='section.heading'||!arr(definition.source.fields).includes(node.source_field))continue;for(const span of arr(node.sourceSpans)){const capture=runtime.captures(pattern,span.quote)[0];if(capture){bound={...span,quote:capture.text,start:capture.index,end:capture.end};break;}}if(bound)break;}
  if(!bound)return {status:'needs_source',calculationId:definition.id};evidence.push(bound);
 }
 const value=evaluateExpression(definition.expression,environment,db,runtime);
 if(!Number.isFinite(value)||value<=0)fail('CALCULATION_RESULT','The equation did not produce a positive finite value.');
 const output=db.fieldDefinitions[definition.output.field];if(!output||output.unit!==definition.output.unit||!db.units[definition.output.unit])fail('CALCULATION_UNIT','The equation output has no compatible declared unit.');
 return {status:'resolved',calculationId:definition.id,label:definition.label,field:definition.output.field,value,unit:definition.output.unit,kind:definition.output.kind,estimated:true,equation:definition.displayEquation,inputs:values,evidence,sourceIdentity:identity};
}
const preparedSources=new Map();let preparedSourceBytes=0;
function runAnalysis(db,request,runtime){
 const started=now(),cacheKey=JSON.stringify([request.label||Object.fromEntries(Object.entries(request).filter(([key])=>!['patient','clinicalContext','calculations'].includes(key))),request.provenance||null]),cached=preparedSources.get(cacheKey);
 runtime.restart(db.contract.expansion?.regexExecution?.maximumPreparationMilliseconds||3000);
 const label=cached?clone(cached.label):normalizeLabel(request.label||request,request.provenance?{provenance:request.provenance}:{});
 const documentId=label.identity.document_id;for(const n of label.nodes){if(n.document_id!==documentId||evidenceOf(n).some(e=>e.document_id!==documentId)||arr(n.cells).some(c=>evidenceOf(c).some(e=>e.document_id!==documentId)))fail('CROSS_DOCUMENT_EVIDENCE','A source node references another document');}
 if(!label.identity.indications)label.identity.indications=label.nodes.filter(n=>n.kind==='prose.clause'&&n.source_field==='indications_and_usage').map(n=>n.text).join(' ');
 const state={db,label,safetyFilters:clone(request.safetyFilters||{}),patient:clone(request.patient||{}),context:clone(request.clinicalContext||{}),runtime,diagnostics:arr(label.diagnostics),excludedIds:new Set(),excluded:[],unresolved:[],pending:[],normalReferences:[],renalConstraints:[],annotations:[]};
 if(cached){preparedSources.delete(cacheKey);preparedSources.set(cacheKey,cached);state.index=new Map(label.nodes.map(node=>[node.id,node]));}
 else{
  prepareSourceNodes(state);
  const source=clone(state.label),bytes=cacheKey.length+JSON.stringify(source).length;
  if(bytes<=8000000){while(preparedSources.size>=12||preparedSourceBytes+bytes>8000000){const key=preparedSources.keys().next().value,entry=preparedSources.get(key);preparedSourceBytes-=entry.bytes;preparedSources.delete(key);}preparedSources.set(cacheKey,{label:source,bytes});preparedSourceBytes+=bytes;}
 }
 const prepared=now();runtime.restart(db.contract.expansion?.regexExecution?.maximumEvaluationMilliseconds||1000);
 finishNodes(state);
 buildRoiPlan(state);
 const compiled=compiledDatabase(db),matches=[],dispatch=new Map(),unrestricted=[];let recognitionChecks=0;
 const eligible=cached?.eligible||compiled.entries.filter(entry=>entry.guards.every(guard=>evaluate(guard,envFor(state,null),state)===true));
 const sourceEntry=preparedSources.get(cacheKey);if(sourceEntry)sourceEntry.eligible=eligible;
 for(const entry of eligible)if(entry.kinds){for(const kind of entry.kinds){if(!dispatch.has(kind))dispatch.set(kind,[]);dispatch.get(kind).push(entry);}}else unrestricted.push(entry);
 for(const scoped of state.scopes)for(const entry of (dispatch.get(scoped.scope.kind)||[]).concat(unrestricted)){
  if(entry.format.mode==='extractor'&&state.roi&&!state.roi.scopes.has(scoped.node.id))continue;
  runtime.checkDeadline();recognitionChecks++;const v=evaluate(entry.format.recognition,envFor(state,scoped.node,null,scoped.scope,scoped.features),state);if(v===true)matches.push({format:entry.format,formatOrder:entry.order,...scoped});
 }
 matches.sort((a,b)=>({exclusion:0,overlay:1,extractor:2}[a.format.mode]-{exclusion:0,overlay:1,extractor:2}[b.format.mode])||(b.format.priority||0)-(a.format.priority||0)||a.formatOrder-b.formatOrder);
 const raw=[];for(const m of matches){if(m.format.mode==='extractor')propagateExclusions(state);const result=executePipeline(m.format,m.node,state);if(m.format.mode==='extractor')raw.push(...result);}
 const merged=new Map();for(const r of raw){const key=JSON.stringify([r.sourceIdentity?.labelId||r.sourceIdentity?.document_id,(r.dose?.unit&&!phrase(r.dose?.sourceText,r.dose.unit)?clean(r.dose?.sourceText)+' '+r.dose.unit:r.dose?.sourceText),r.schedule?.sourceText,r.route?.code,r.indication?.sourceText,r.population?.sourceText,r.duration?.sourceText,r.conditions,r.evidence.map(s=>[s.node_id,s.row_index,s.column_index])]);if(merged.has(key)){const p=merged.get(key);p.formatMatches=unique(p.formatMatches.concat(r.formatMatches));p.evidence=unique(p.evidence.concat(r.evidence));}else merged.set(key,r);}
 const pendingMerged=new Map();for(const record of state.pending){const key=JSON.stringify([record.sourceIdentity?.labelId,record.dose?.sourceText,record.schedule?.sourceText,record.route?.code,record.indication?.sourceText,record.population?.sourceText,record.duration?.sourceText,record.conditions,record.evidence]);if(pendingMerged.has(key)){const prior=pendingMerged.get(key);prior.formatMatches=unique(prior.formatMatches.concat(record.formatMatches));}else pendingMerged.set(key,record);}
 let pendingRegimens=[...pendingMerged.values()],regimens=[...merged.values()];for(const r of regimens.concat(pendingRegimens)){const ids=new Set(r.evidence.map(s=>s.node_id));const overlays=state.annotations.filter(a=>ids.has(a.nodeId)||r.evidence.some(s=>a.table_id&&s.table_id===a.table_id));if(overlays.length)r.conditions=unique(r.conditions.concat(overlays.map(a=>({feature:a.feature,sourceText:a.sourceText,sourceSpans:arr(a.evidence)}))));}
 let selectedRegimens=regimens,normalRegimens=unique(state.normalReferences),adjusted=[];
 if(state.db.policies.resolution?.preferMatchedRenalBranch){adjusted=regimens.filter(record=>renalAdjustedRecord(record,state));if(adjusted.length){const regular=regimens.filter(record=>!renalAdjustedRecord(record,state));normalRegimens=unique(normalRegimens.concat(regular.map(record=>({...record,status:'reference_only'}))));selectedRegimens=adjusted;}}
 if(normalRegimens.length&&state.db.policies.resolution?.preferSpecificIndicationForBaseline&&state.context.browse!==true){const general=state.db.lexicons.sourceScopeRules.genericRegimenContext,specific=normalRegimens.filter(record=>record.indication?.sourceText&&!(general&&state.runtime.match(general,record.indication.sourceText)));if(specific.length)normalRegimens=specific;}
 // A source's lower-usual-dose exception applies only when one exact baseline
 // amount is established. The source renal interval is retained, with both spans.
 const lowerRule=state.db.lexicons.sourceScopeRules.renalLowerDoseRule;
 const doseQuantity=record=>{const dose=record.dose,unit=state.db.units[dose?.unit],amount=Number(dose?.amount);return unit?.dimension==='mass'&&Number.isFinite(amount)&&amount>0?amount*unit.scaleToBase:null;};
 for(const record of adjusted){const condition=arr(record.conditions).find(item=>lowerRule&&state.runtime.match(lowerRule,item.sourceText||''));if(!condition)continue;const amounts=unique(normalRegimens.map(doseQuantity)),renalAmount=doseQuantity(record);if(amounts.length===1&&amounts[0]!==null&&renalAmount!==null){if(amounts[0]<renalAmount){const baseline=normalRegimens[0];record.dose=clone(baseline.dose);record.conditions.push({feature:'lower_usual_dose_exception',sourceText:condition.sourceText,sourceSpans:arr(condition.sourceSpans)});record.evidence=unique(record.evidence.concat(arr(baseline.dose.sourceSpans),arr(condition.sourceSpans)));}}else{record.status='unresolved';state.unresolved.push({status:'unresolved',reason:'BASELINE_DOSE_REQUIRED_FOR_RENAL_EXCEPTION',dose:null,schedule:null,missingFields:[],evidence:arr(condition.sourceSpans)});}}
 selectedRegimens=selectedRegimens.filter(record=>record.status==='resolved');adjusted=adjusted.filter(record=>record.status==='resolved');
 if(!adjusted.length){
  const assumption=state.db.policies.quantity.physiologicalRenalAssumption,fields=unique(state.renalConstraints.filter(c=>Number.isFinite(c.range?.upper)&&!c.range.upperUnbounded).map(c=>c.field));
  const required=fields.find(name=>{const value=state.patient[name];if(value==null){const calculating=arr(state.db.policies.sourceCalculations?.definitions).some(def=>def.output.field===name&&state.patient[def.activation?.field]===def.activation?.value);return state.db.policies.resolution.blockUnmeasuredRenalBaseline&&(calculating||abnormalRenalState(state)&&['clearance','indexed_clearance','weight_normalized_clearance'].includes(state.db.units[state.db.fieldDefinitions[name]?.unit]?.dimension));}return state.db.policies.resolution.requireMatchedRenalBranchWithinSourceRange&&Number.isFinite(value)&&!selectedRegimens.some(record=>arr(record.sourceStructure?.constraints).some(constraint=>constraint.kind==='quantity'&&constraint.field===name&&['clearance','indexed_clearance'].includes(state.db.units[constraint.unit]?.dimension)))&&value<=Math.max(...state.renalConstraints.filter(c=>c.field===name&&Number.isFinite(c.range?.upper)).map(c=>c.range.upper));});
  if(required&&selectedRegimens.length){normalRegimens=unique(normalRegimens.concat(selectedRegimens.map(record=>({...record,status:'reference_only'}))));selectedRegimens=[];state.unresolved.push({status:'unresolved',reason:state.patient[required]==null?'MISSING_PATIENT_FIELD':'UNMATCHED_RENAL_BAND',missingFields:state.patient[required]==null?[required]:[],dose:null,schedule:null,evidence:[]});}
 }
 const dialysisPolicy=state.db.policies.quantity.routineRenalBranch,dialysisMode=state.patient[dialysisPolicy?.field];
 if(dialysisPolicy&&dialysisMode!=null&&!arr(dialysisPolicy.allowedValues).includes(dialysisMode)&&state.renalConstraints.length){
  const unsupported=selectedRegimens.filter(record=>!arr(record.sourceStructure?.constraints).some(c=>c.kind==='enum'&&c.field===dialysisPolicy.field&&arr(c.allowedValues).includes(dialysisMode)));
  if(unsupported.length){normalRegimens=unique(normalRegimens.concat(unsupported.map(record=>({...record,status:'reference_only'}))));selectedRegimens=selectedRegimens.filter(record=>!unsupported.includes(record));adjusted=adjusted.filter(record=>!unsupported.includes(record));state.unresolved.push({status:'unresolved',reason:'MATCHED_DIALYSIS_BRANCH_REQUIRED',missingFields:[],dose:null,schedule:null,evidence:[]});}
 }
 if(state.roi&&abnormalRenalState(state)&&!adjusted.length){
  const unresolvedAdjustment=state.roi.roots.some(region=>{
   const counts=region.shape.captures,cs=state.roi.candidateConstraints.get(region.id)||[];
   if(!region.selected||!(counts.mass_activity_amount&&counts.frequency)||!region.physiology.some(m=>['creatinine_clearance','estimated_gfr','gfr','renal_function','dialysis'].includes(m.concept))||selectedRegimens.some(record=>arr(record.sourceStructure?.nodeIds).includes(region.id)))return false;
   if(!cs.some(c=>['crcl','gfr','egfr','indexed_clearance','normalized_crcl','dialysis'].includes(c.field))&&region.selectionReason!=='explicit_section_reference')return false;
   if(cs.some(c=>c.kind==='quantity'&&Number.isFinite(state.patient[c.field])&&evaluate(state.db.policies.applicabilityRules.numericBand,{...envFor(state,null),constraint:c},state)===false||c.kind==='enum'&&state.patient[c.field]!=null&&!arr(c.allowedValues).includes(state.patient[c.field])))return false;
   return cs.some(c=>c.kind==='unknown')||!(state.roi.patterns.get(region.id)?.size);
  });
  if(unresolvedAdjustment&&selectedRegimens.length){normalRegimens=unique(normalRegimens.concat(selectedRegimens.map(record=>({...record,status:'reference_only'}))));selectedRegimens=[];state.unresolved.push({status:'unresolved',reason:'ROI_RENAL_ADJUSTMENT_UNRESOLVED',missingFields:[],dose:null,schedule:null,evidence:[]});}
 }
 if(state.safetyFilters.productAllergyStatus==='BLOCKED'){
  for(const record of selectedRegimens)state.excluded.push({status:'excluded',nodeId:record.sourceStructure?.nodeIds?.[0],reason:'ACTIVE_ALLERGY_FILTER',evidence:record.evidence});
  selectedRegimens=[];normalRegimens=[];adjusted=[];state.pending=[];pendingRegimens=[];
 }
 const roi=roiReport(state,selectedRegimens,state.pending,normalRegimens);
 if(roi&&roi.status==='context_not_found')state.diagnostics.push({code:'ROI_CONTEXT_NOT_FOUND',message:'No dosing region was bound to the selected disease and organism.'});
 if(roi?.unmatchedPatterns.length)state.diagnostics.push({code:'ROI_PATTERN_REVIEW',count:roi.unmatchedPatterns.length,message:'The selected source region has an unmatched or incomplete pattern; a disabled pattern draft is available.'});
 const metrics=unique(adjusted.flatMap(record=>arr(record.sourceStructure?.constraints).filter(c=>c.kind==='quantity'&&['clearance','indexed_clearance'].includes(state.db.units[c.unit]?.dimension)&&Number.isFinite(c.range?.upper)&&Number.isFinite(state.patient[c.field])).map(c=>({field:c.field,value:state.patient[c.field],unit:c.unit,range:c.range,sourceText:c.sourceText,sourceSpans:c.sourceSpans}))));
 return {...(roi?{roi}:{}),processing:{sourceCacheHit:!!cached,preparationMilliseconds:prepared-started,matchingMilliseconds:now()-prepared,recognitionChecks,formatCount:db.formats.length,eligibleFormatCount:eligible.length,sourceNodeCount:label.nodes.length},renalFields:unique(state.renalConstraints.map(c=>c.field)),status:selectedRegimens.length?'resolved':state.unresolved.length?'unresolved':'none',regimens:selectedRegimens,normalRegimens,renalSelection:{adjusted:adjusted.length>0,metrics},calculations:clone(request.calculations||[]),pendingRegimens,unresolved:unique(state.unresolved),excluded:unique(state.excluded),annotations:unique(state.annotations),diagnostics:unique(state.diagnostics),databaseVersion:db.databaseVersion};
}
let workerDatabase=null;
function initializeWorker(database,trusted){
 // The pool only ever sends the bundle its engine already validated; a worker need not repeat that pass.
 preparedSources.clear();preparedSourceBytes=0;
 workerDatabase=trusted===true?freeze(database):validateBundle(database);compiledDatabase(workerDatabase);
 const runtime=regexRuntime(workerDatabase);runtime.restart(10000);
 const errors=schemaErrors(workerDatabase,workerDatabase.schema,workerDatabase.schema,0,'database',runtime);if(errors.length)fail('DATABASE_SCHEMA','Database schema validation failed',{errors});
 return {valid:true,databaseVersion:workerDatabase.databaseVersion};
}
function runJob(job){const db=workerDatabase;if(!db)fail('WORKER_NOT_INITIALIZED','The interpreter has no validated database');const runtime=regexRuntime(db);if(job.kind==='calculate')return runSourceCalculation(db,job.request,runtime);if(job.kind==='evaluate')return evaluateExpression(job.expression,job.environment||{},db,runtime);if(job.kind==='validate')return {valid:true,databaseVersion:db.databaseVersion};return runAnalysis(db,job.request,runtime);}
function workerSource(node){
 const factory='('+engineFactory.toString()+')(true)',handler="try{if(job.kind==='init'){const result=api.workerInit(job.database,job.trusted===true);send({kind:'ready',result});}else{send({kind:'started'});send({kind:'result',result:api.workerRun(job)});}}catch(e){send({kind:'error',error:{code:e.code||'ENGINE_ERROR',message:e.message,details:e.details||{}}});}";
 return node?"const {parentPort}=require('node:worker_threads');const api="+factory+";const send=m=>parentPort.postMessage(m);parentPort.on('message',job=>{"+handler+"});":"const api="+factory+";const send=m=>self.postMessage(m);self.onmessage=e=>{const job=e.data;"+handler+"};";
}
// Reuse validated workers and source-only preparation. Requests/results are never
// cached here. Aborting a running request terminates its worker immediately.
class WorkerPool {
 constructor(database){this.database=database;this.slots=[];this.queue=[];this.closed=false;}
 submit(job,options={}){return new Promise((resolve,reject)=>{
  if(this.closed){reject(new EngineError('ENGINE_DISPOSED','Interpreter was disposed'));return;}
  const task={job,resolve,reject,signal:options.signal,done:false,slot:null};
  task.abort=()=>{if(task.done)return;const slot=task.slot;if(slot)this.closeSlot(slot);this.finish(task,null,new EngineError('CANCELLED','Obsolete analysis cancelled'));this.drain();};
  if(task.signal?.aborted){task.abort();return;}task.signal?.addEventListener('abort',task.abort,{once:true});this.queue.push(task);this.drain();
 });}
 finish(task,result,error){if(task.done)return;task.done=true;task.signal?.removeEventListener('abort',task.abort);if(error)task.reject(error);else task.resolve(result);}
 closeSlot(slot){clearTimeout(slot.timer);slot.closed=true;slot.worker?.terminate();if(slot.url)URL.revokeObjectURL(slot.url);this.slots=this.slots.filter(item=>item!==slot);}
 failSlot(slot,error){const task=slot.task;this.closeSlot(slot);if(task)this.finish(task,null,error);this.drain();}
 dispatch(slot,task){slot.task=task;task.slot=slot;slot.worker.ref?.();
  if(slot.ready){slot.worker.postMessage(task.job);this.arm(slot,((this.database.contract.expansion?.regexExecution?.maximumPreparationMilliseconds||3000)+(this.database.contract.expansion?.regexExecution?.maximumEvaluationMilliseconds||1000))+500);}
 }
 arm(slot,milliseconds){clearTimeout(slot.timer);slot.timer=setTimeout(()=>this.failSlot(slot,new EngineError(slot.ready?'REGEX_DEADLINE':'WORKER_START_TIMEOUT',slot.ready?'Isolated database evaluation exceeded its processing deadline':'Interpreter initialization exceeded its deadline')),milliseconds);}
 spawn(task){const slot={ready:false,closed:false,task,worker:null,timer:null,url:null};task.slot=slot;this.slots.push(slot);
  const handle=message=>{if(slot.closed)return;
   if(message.kind==='ready'){clearTimeout(slot.timer);slot.ready=true;this.dispatch(slot,slot.task);}
   else if(message.kind==='result'||message.kind==='error'){
    const current=slot.task;clearTimeout(slot.timer);slot.task=null;
    if(message.kind==='error'&&!slot.ready){this.failSlot(slot,new EngineError(message.error.code,message.error.message,message.error.details));this.finish(current,null,new EngineError(message.error.code,message.error.message,message.error.details));return;}
    this.finish(current,message.result,message.kind==='error'?new EngineError(message.error.code,message.error.message,message.error.details):null);slot.worker.unref?.();this.drain();
   }
  };
  try{
   if(typeof process!=='undefined'&&process.versions?.node&&typeof require==='function'){const {Worker}=require('node:worker_threads');slot.worker=new Worker(workerSource(true),{eval:true});slot.worker.on('message',handle);slot.worker.on('error',error=>{if(!slot.closed)this.failSlot(slot,new EngineError('WORKER_ERROR',error.message));});slot.worker.on('exit',code=>{if(!slot.closed)this.failSlot(slot,new EngineError('WORKER_EXIT','Interpreter worker exited before completion'));});}
   else if(typeof Worker!=='undefined'&&typeof Blob!=='undefined'&&typeof URL!=='undefined'){slot.url=URL.createObjectURL(new Blob([workerSource(false)],{type:'text/javascript'}));slot.worker=new Worker(slot.url);slot.worker.onmessage=event=>handle(event.data);slot.worker.onerror=event=>{if(!slot.closed)this.failSlot(slot,new EngineError('WORKER_ERROR',event.message||'Worker failed'));};}
   else throw new EngineError('ISOLATION_UNAVAILABLE','A Web Worker or Node worker_threads is required');
   this.arm(slot,30000);slot.worker.postMessage({kind:'init',database:this.database,trusted:true});
  }catch(error){this.failSlot(slot,error);}
 }
 drain(){if(this.closed)return;this.queue=this.queue.filter(task=>!task.done);
  while(this.queue.length){const slot=this.slots.find(item=>item.ready&&!item.task&&!item.closed);if(slot)this.dispatch(slot,this.queue.shift());else if(this.slots.length<2)this.spawn(this.queue.shift());else break;}
 }
 cancel(){for(const task of [...this.queue,...this.slots.map(slot=>slot.task).filter(Boolean)])task.abort();this.queue=[];}
 dispose(){this.closed=true;this.cancel();for(const slot of [...this.slots])this.closeSlot(slot);}
}
class AMUEngine {
 constructor(database){this._database=validateBundle(database);this._pool=new WorkerPool(this._database);}
 static get version(){return VERSION;}
 static get protocol(){return PROTOCOL;}
 get database(){return this._database;}
 static async load(source='./amu-database.json',options={}){
  let database;if(obj(source)&&typeof source.text!=='function')database=source;else if(source&&typeof source.text==='function')database=JSON.parse(await source.text());else{if(typeof location!=='undefined'&&location.protocol==='file:')fail('LOCAL_IMPORT_REQUIRED','Choose amu-database.json with a file picker when opening local files');const response=await fetch(source,{credentials:'same-origin',cache:'no-cache',signal:options.signal});if(!response.ok)fail('DATABASE_FETCH','Could not load the database',{status:response.status});database=await response.json();}
  const e=new AMUEngine(database);try{await e.validate();return e;}catch(error){e.dispose();throw error;}
 }
 async validate(){return this._pool.submit({kind:'validate'});}
 cancelAnalyses(){this._pool.cancel();}
 clearTransientState(){this._pool.dispose();this._pool=new WorkerPool(this._database);}
 dispose(){this._pool.dispose();}
 withDatabase(database){return new AMUEngine(database);}
 replaceDatabase(database){const next=validateBundle(database);this._pool.dispose();this._database=next;this._pool=new WorkerPool(next);return this;}
 importFormats(patch){const next=clone(this._database);if(!obj(patch))fail('INVALID_PATCH','Database patch must be an object');for(const[k,v]of Object.entries(patch)){if(k==='formats'){for(const f of arr(v)){const i=next.formats.findIndex(x=>x.id===f.id);if(i>=0){if(!(f.version>next.formats[i].version))fail('FORMAT_VERSION','Replacing a format requires a higher version');next.formats[i]=clone(f);}else next.formats.push(clone(f));}}else if(['roleRules','tokenGrammars','fieldDefinitions','pipelines','presentations','mappings','units','lexicons','policies','databaseVersion'].includes(k))next[k]=obj(v)?merge(next[k],v):clone(v);else fail('PATCH_MEMBER','Unsupported database patch member',{member:k});}return this.replaceDatabase(next);}
 normalizeLabel(input,options={}){return normalizeLabel(input,options);}
 async calculate(request,options={}){return this._pool.submit({kind:'calculate',request:clone(request)},options);}
 async analyze(request,options={}){try{return await this._pool.submit({kind:'analyze',request:clone(request)},options);}catch(e){if(['REGEX_DEADLINE','TEXT_LIMIT','TOKEN_LIMIT','CANDIDATE_LIMIT','ISOLATION_UNAVAILABLE','WORKER_ERROR','WORKER_EXIT','WORKER_START_TIMEOUT'].includes(e.code))return {status:'unresolved',regimens:[],unresolved:[{status:'unresolved',reason:e.code,dose:null,schedule:null,evidence:[]}],excluded:[],annotations:[],diagnostics:[{code:e.code,message:e.message}],databaseVersion:this._database.databaseVersion};throw e;}}
 evaluate(expression,environment={},options={}){return this._pool.submit({kind:'evaluate',expression:clone(expression),environment:clone(environment)},options);}
 getFieldDefinitions(){return clone(this._database.fieldDefinitions);}
 getSourceBadge(record){return sourceBadge(record,this._database);}
 toBullets(result){return arr(result.regimens).filter(r=>r.status==='resolved').map(r=>({text:unique([r.indication?.sourceText,r.population?.sourceText,(r.dose?.unit&&!phrase(r.dose?.sourceText,r.dose.unit)?clean(r.dose?.sourceText)+' '+r.dose.unit:r.dose?.sourceText),r.schedule?.sourceText,r.route?.sourceText,r.duration?.sourceText,...arr(r.conditions).map(c=>c.sourceText)].map(clean).filter(Boolean)).join(' — '),evidence:clone(r.evidence),source:this.getSourceBadge(r),formatMatches:clone(r.formatMatches),steps:clone(r.steps)}));}
}

/* Generic, synchronous expression primitives. Execute only inside the engine's
   isolated deadline worker when an expression may use a database regex. */
function exprError(code, message) { const error = new Error(message); error.code = code; return error; }
function exprOwn(value, key) { return value !== null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key); }
const exprPathCache = new Map();
function exprPathKeys(name) {
  if (typeof name !== 'string' || name.length > 1024) throw exprError('INVALID_PATH', 'Expression path must be a bounded own-property path.');
  let keys = exprPathCache.get(name);
  if (keys) return keys;
  keys = name.split('.');
  if (!keys.length || keys.some(key => !key || !/^(?:[A-Za-z_$][A-Za-z0-9_$]*|\d+)$/.test(key) || ['__proto__', 'prototype', 'constructor'].includes(key))) throw exprError('INVALID_PATH', 'Unsafe or unsupported expression path.');
  if (exprPathCache.size >= 4096) exprPathCache.clear();
  exprPathCache.set(name, keys);
  return keys;
}
function exprPath(root, name) {
  const keys = exprPathKeys(name);
  let value = root;
  for (const key of keys) { if (!exprOwn(value, key)) return null; value = value[key]; }
  return value === undefined ? null : value;
}
function exprKnown(value) { return value !== null && value !== undefined && !(typeof value === 'number' && !Number.isFinite(value)); }
function exprTruth(value) {
  if (value === true || value === 'match') return true;
  if (value === false || value === 'mismatch') return false;
  return null;
}
function exprAll(values) { let unknown = false; for (const value of values) { const t = exprTruth(value); if (t === false) return false; if (t === null) unknown = true; } return unknown ? null : true; }
function exprAny(values) { let unknown = false; for (const value of values) { const t = exprTruth(value); if (t === true) return true; if (t === null) unknown = true; } return unknown ? null : false; }
function exprSame(a, b) {
  if (!exprKnown(a) || !exprKnown(b)) return null;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
  if (ak.length !== bk.length || ak.some((key, i) => key !== bk[i])) return false;
  const results = ak.map(key => exprSame(a[key], b[key]));
  return results.includes(false) ? false : (results.includes(null) ? null : true);
}
function exprFieldId(ast, env) {
  if (!ast || typeof ast !== 'object' || !ast.path) return null;
  if (typeof ast.keyFrom === 'string') return exprPath(env, ast.keyFrom);
  if (/^patient\.[A-Za-z_$][\w$]*$/.test(ast.path)) return ast.path.slice(8);
  return null;
}
function exprQuantity(value, ast, env, db) {
  if (!exprKnown(value)) return null;
  const fieldId = exprFieldId(ast, env);
  const definition = fieldId && db && db.fieldDefinitions && exprOwn(db.fieldDefinitions, fieldId) ? db.fieldDefinitions[fieldId] : null;
  if (typeof value === 'number') return { value, unit: definition && definition.unit || null, metric: fieldId || null, scalar: !definition };
  if (typeof value !== 'object' || !Number.isFinite(value.value)) return null;
  return { value: value.value, unit: value.unit || definition && definition.unit || null, metric: value.metric || definition && fieldId || null, scalar: !value.unit && !definition };
}
function exprUnitDefinition(db, unit) {
  return db && db.units && typeof unit === 'string' && exprOwn(db.units, unit) ? db.units[unit] : null;
}
function exprCompatibleValues(left, right, db, requiredMetric, requiredUnit) {
  if (!left || !right) return null;
  if (requiredMetric && ((left.metric && left.metric !== requiredMetric) || (right.metric && right.metric !== requiredMetric))) return null;
  if (left.metric && right.metric && left.metric !== right.metric) return null;
  const metric = requiredMetric || left.metric || right.metric;
  if (requiredMetric && !left.metric) return null;
  const targetUnit = requiredUnit || right.unit || left.unit;
  const convert = quantity => {
    if (!targetUnit) return quantity.unit ? null : quantity.value;
    if (!quantity.unit) return null;
    if (quantity.unit === targetUnit) return quantity.value;
    const from = exprUnitDefinition(db, quantity.unit), to = exprUnitDefinition(db, targetUnit);
    if (!from || !to || from.dimension !== to.dimension || from.requiresSourceEquivalenceForConversion || to.requiresSourceEquivalenceForConversion) return null;
    if (!Number.isFinite(from.scaleToBase) || !Number.isFinite(to.scaleToBase) || to.scaleToBase === 0) return null;
    return quantity.value * from.scaleToBase / to.scaleToBase;
  };
  const lv = convert(left), rv = convert(right);
  if (lv === null || rv === null || !Number.isFinite(lv) || !Number.isFinite(rv)) return null;
  return { left: lv, right: rv, unit: targetUnit || null, metric: metric || null };
}
function exprCompare(op, left, right, leftAst, rightAst, env, db, requiredMetric, requiredUnit) {
  if (!exprKnown(left) || !exprKnown(right)) return null;
  let lv = left, rv = right;
  const quantity = (typeof left === 'object' && left && Number.isFinite(left.value)) || (typeof right === 'object' && right && Number.isFinite(right.value)) || (typeof left === 'number' && exprFieldId(leftAst, env)) || (typeof right === 'number' && exprFieldId(rightAst, env)) || requiredMetric || requiredUnit;
  if (quantity) {
    const lq = exprQuantity(left, leftAst, env, db), rq = exprQuantity(right, rightAst, env, db);
    // Bare numeric literals are acceptable as a source threshold in the same
    // explicitly declared dimension, never as an alternate patient measurement.
    if (lq && rq && rq.scalar && !rq.unit && typeof right === 'number' && lq.unit) { rq.unit = requiredUnit || lq.unit; rq.metric = requiredMetric || lq.metric; }
    if (lq && rq && lq.scalar && !lq.unit && typeof left === 'number' && rq.unit && !exprFieldId(leftAst, env)) { lq.unit = requiredUnit || rq.unit; lq.metric = requiredMetric || rq.metric; }
    const values = exprCompatibleValues(lq, rq, db, requiredMetric, requiredUnit);
    if (!values) return null;
    lv = values.left; rv = values.right;
  }
  if (op === 'eq') return exprSame(lv, rv);
  if (op === 'ne') { const result = exprSame(lv, rv); return result === null ? null : !result; }
  if (typeof lv !== 'number' || typeof rv !== 'number' || !Number.isFinite(lv) || !Number.isFinite(rv)) return null;
  return op === 'gt' ? lv > rv : op === 'gte' ? lv >= rv : op === 'lt' ? lv < rv : op === 'lte' ? lv <= rv : null;
}
const exprKnownOps = new Set(['all','any','not','eq','ne','gt','gte','lt','lte','exists','matches','in','contains','count','add','subtract','multiply','divide','minimum','maximum','coalesce','if','range_contains','quantity_compare']);
const exprLimitCache = new WeakMap();
function exprLimits(db) {
  const cacheable = db !== null && typeof db === 'object';
  if (cacheable) { const hit = exprLimitCache.get(db); if (hit) return hit; }
  const limits = db && db.contract && db.contract.expansion && db.contract.expansion.limits;
  const out = { maxDepth: Math.min(128, Number(limits && limits.maximumExpressionDepth) || 32), maxItems: Math.min(10000, Number(limits && limits.maximumCandidatesPerLabel) || 2000) };
  if (cacheable) exprLimitCache.set(db, out);
  return out;
}
function evaluateExpression(ast, env, db, runtime = {}) {
  const { maxDepth, maxItems } = exprLimits(db);
  let evaluations = 0;
  const knownOps = exprKnownOps;
  const tick = typeof runtime.tick === 'function' ? runtime.tick : (typeof runtime.checkDeadline === 'function' ? runtime.checkDeadline : null);
  function evaluate(node, scope, depth) {
    if (depth > maxDepth || ++evaluations > maxItems * 64) throw exprError('EXPRESSION_LIMIT', 'Expression complexity limit exceeded.');
    if (tick) tick();
    if (node === undefined || node === null) return null;
    if (typeof node === 'number') return Number.isFinite(node) ? node : null;
    if (typeof node === 'string' || typeof node === 'boolean') return node;
    if (Array.isArray(node)) { if (node.length > maxItems) throw exprError('EXPRESSION_LIMIT','Expression array limit exceeded.'); return node.map(item => evaluate(item, scope, depth + 1)); }
    if (typeof node !== 'object') throw exprError('INVALID_EXPRESSION','Unsupported expression value.');
    if (exprOwn(node, 'path')) {
      let value = exprPath(scope, node.path);
      if (exprOwn(node, 'keyFrom')) {
        const key = typeof node.keyFrom === 'string' ? exprPath(scope, node.keyFrom) : evaluate(node.keyFrom, scope, depth + 1);
        if (typeof key !== 'string' && typeof key !== 'number') return null;
        if (['__proto__','prototype','constructor'].includes(String(key)) || !/^[A-Za-z0-9_$]+$/.test(String(key))) throw exprError('INVALID_PATH','Unsafe dynamic property.');
        value = exprOwn(value, String(key)) ? value[String(key)] : null;
      }
      return value === undefined ? null : value;
    }
    if (!exprOwn(node, 'op')) {
      const out = Object.create(null);
      for (const key of Object.keys(node)) { if (['__proto__','prototype','constructor'].includes(key)) throw exprError('INVALID_EXPRESSION','Unsafe literal property.'); out[key] = evaluate(node[key],scope,depth + 1); }
      return out;
    }
    if (!knownOps.has(node.op)) throw exprError('UNKNOWN_EXPRESSION_OPERATION','Unsupported expression operation: '+String(node.op));
    if (exprOwn(node, 'forEach')) {
      const collection = typeof node.forEach === 'string' ? exprPath(scope,node.forEach) : evaluate(node.forEach,scope,depth + 1);
      if (!Array.isArray(collection)) return null;
      if (collection.length > maxItems) throw exprError('EXPRESSION_LIMIT','Constraint iteration limit exceeded.');
      const expression = Object.assign({},node); delete expression.forEach;
      return exprAll(collection.map(constraint => evaluate(expression,Object.assign({},scope,{constraint}),depth + 1)));
    }
    if ((node.op === 'all' || node.op === 'any') && Array.isArray(node.args)) {
      // Three-valued logic: a definite false (all) / true (any) decides the result.
      const isAll = node.op === 'all'; let unknown = false;
      for (const arg of node.args) { const t = exprTruth(evaluate(arg, scope, depth + 1)); if (t === !isAll) return t; if (t === null) unknown = true; }
      return unknown ? null : isAll;
    }
    const value = key => evaluate(node[key],scope,depth + 1);
    const args = () => Array.isArray(node.args) ? node.args.map(arg=>evaluate(arg,scope,depth+1)) : [value('left'),value('right')];
    const desiredMetric = () => node.metricFrom ? exprPath(scope,node.metricFrom) : value('metric');
    const desiredUnit = () => node.unitFrom ? exprPath(scope,node.unitFrom) : value('unit');
    switch (node.op) {
      case 'all': return exprAll(args());
      case 'any': return exprAny(args());
      case 'not': { const t=exprTruth(value(exprOwn(node,'arg')?'arg':'value')); return t===null?null:!t; }
      case 'exists': return exprKnown(value('value'));
      case 'eq': case 'ne': case 'gt': case 'gte': case 'lt': case 'lte': return exprCompare(node.op,value('left'),value('right'),node.left,node.right,scope,db,desiredMetric(),desiredUnit());
      case 'matches': {
        const text=value('value'), pattern=value('pattern');
        if (typeof text!=='string' || !pattern || typeof pattern.pattern!=='string') return null;
        const limit=Number(db && db.contract && db.contract.expansion && db.contract.expansion.limits && db.contract.expansion.limits.maximumPatternCharacters)||4096;
        if(pattern.pattern.length>limit || /[^gimsu]/.test(pattern.flags||''))throw exprError('REGEX_LIMIT','Unsupported regular expression definition.');
        if(typeof runtime.match!=='function')throw exprError('REGEX_ISOLATION_REQUIRED','Regex expressions require the isolated engine runtime.');
        return exprTruth(runtime.match(pattern,text));
      }
      case 'in': { const item=value('value'), collection=value('values'); if(!exprKnown(item)||!Array.isArray(collection))return null;const results=collection.map(entry=>exprSame(item,entry));return results.includes(true)?true:results.includes(null)?null:false; }
      case 'contains': { const container=exprOwn(node,'container')?value('container'):value('left'), sought=exprOwn(node,'value')?value('value'):value('right'); if(!exprKnown(container)||!exprKnown(sought))return null;if(typeof container==='string'&&typeof sought==='string')return container.includes(sought);if(Array.isArray(container))return exprAny(container.map(item=>exprSame(item,sought)));return null; }
      case 'count': { const input=value('value');return Array.isArray(input)||typeof input==='string'?input.length:null; }
      case 'coalesce': {
        if(!Array.isArray(node.args))throw exprError('INVALID_EXPRESSION','coalesce requires args.');
        let missed=false;
        for(const arg of node.args){const evaluated=evaluate(arg,scope,depth+1);if(!exprKnown(evaluated)){missed=true;continue;}if(missed&&!(arg&&typeof arg==='object'&&(exprOwn(arg,'path')||exprOwn(arg,'op'))))return null;return evaluated;}return null;
      }
      case 'if': { const condition=exprTruth(value(exprOwn(node,'condition')?'condition':'test'));return condition===null?null:value(condition?'then':'else'); }
      case 'range_contains': case 'quantity_compare': {
        const leftAst=node.op==='range_contains'?node.value:node.left;
        const rightAst=node.op==='range_contains'?node.range:node.right;
        const left=evaluate(leftAst,scope,depth+1),right=evaluate(rightAst,scope,depth+1);
        if(!right||typeof right!=='object')return null;
        // A quantity_compare may explicitly compare two measured quantities.
        if(Number.isFinite(right.value))return exprCompare(node.comparator||'eq',left,right,leftAst,rightAst,scope,db,desiredMetric(),desiredUnit());
        const metric=desiredMetric()||right.metric||null,unit=desiredUnit()||right.unit||null;
        if(!exprOwn(right,'lower')||!exprOwn(right,'upper'))return null;
        const quantity=exprQuantity(left,leftAst,scope,db);if(!quantity)return null;
        if(metric&&quantity.metric!==metric)return null;
        const checkBound=(key,inclusiveKey,unboundedKey,lower)=>{
          const n=right[key];if(n===null)return right[unboundedKey]===true?true:null;
          if(!Number.isFinite(n)||typeof right[inclusiveKey]!=='boolean')return null;
          const bound={value:n,unit,metric};const values=exprCompatibleValues(quantity,bound,db,metric,unit);if(!values)return null;
          return lower?(right[inclusiveKey]?values.left>=values.right:values.left>values.right):(right[inclusiveKey]?values.left<=values.right:values.left<values.right);
        };
        if(right.lower===null&&right.upper===null)return null;
        return exprAll([checkBound('lower','lowerInclusive','lowerUnbounded',true),checkBound('upper','upperInclusive','upperUnbounded',false)]);
      }
      case 'add': case 'subtract': case 'multiply': case 'divide': case 'minimum': case 'maximum': {
        const operandAsts=Array.isArray(node.args)?node.args:[node.left,node.right];
        const operands=args().map((item,index)=>{const field=exprFieldId(operandAsts[index],scope);const definition=field&&db&&db.fieldDefinitions&&db.fieldDefinitions[field];return typeof item==='number'&&definition&&definition.unit?exprQuantity(item,operandAsts[index],scope,db):item;});if(!operands.length||operands.some(item=>!exprKnown(item)))return null;
        const quantities=operands.filter(item=>typeof item==='object'&&item&&Number.isFinite(item.value));
        const calculate=values=>{
          if(values.some(item=>!Number.isFinite(item)))return null;
          if(node.op==='add')return values.reduce((a,b)=>a+b,0);
          if(node.op==='subtract')return values.slice(1).reduce((a,b)=>a-b,values[0]);
          if(node.op==='multiply')return values.reduce((a,b)=>a*b,1);
          if(node.op==='divide')return values.slice(1).some(v=>v===0)?null:values.slice(1).reduce((a,b)=>a/b,values[0]);
          return node.op==='minimum'?Math.min(...values):Math.max(...values);
        };
        if(!quantities.length){const result=calculate(operands);return Number.isFinite(result)?result:null;}
        if(['multiply','divide'].includes(node.op)){
          if(quantities.length!==1||(node.op==='divide'&&(!operands[0]||typeof operands[0]!=='object')))return null;
          const first=quantities[0];if(!exprUnitDefinition(db,first.unit))return null;
          const result=calculate(operands.map(item=>typeof item==='object'?item.value:item));return Number.isFinite(result)?Object.assign({},first,{value:result}):null;
        }
        if(quantities.length!==operands.length)return null;
        const first=exprQuantity(operands[0],null,scope,db);if(!first||!first.unit||!exprUnitDefinition(db,first.unit))return null;
        const converted=[];
        for(const item of operands){const pair=exprCompatibleValues(exprQuantity(item,null,scope,db),first,db,first.metric,first.unit);if(!pair)return null;converted.push(pair.left);}
        const result=calculate(converted);return Number.isFinite(result)?{value:result,unit:first.unit,...(first.metric?{metric:first.metric}:{})}:null;
      }
      default: throw exprError('UNKNOWN_EXPRESSION_OPERATION','Unsupported expression operation.');
    }
  }
  return evaluate(ast,env||{},0);
}

/* Source normalization is format-independent. It never assigns a regimen or a source badge. */
function normClone(value, depth = 0, seen = new Set()) {
  if (depth > 64) throw new Error('AMU_NORMALIZATION_DEPTH');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'object') return undefined;
  if (seen.has(value)) throw new Error('AMU_CYCLIC_INPUT');
  seen.add(value);
  const out = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('AMU_UNSAFE_INPUT_KEY');
    const child = normClone(value[key], depth + 1, seen);
    if (child !== undefined) out[key] = child;
  }
  seen.delete(value);
  return out;
}
function normFirst(value) { return Array.isArray(value) ? String(value[0] || '') : String(value || ''); }
function normHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function normDecodeEntities(text) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', le: '≤', ge: '≥', micro: 'µ', times: '×', sup2: '²', deg: '°' };
  return String(text || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (whole, name) => {
    if (name[0] === '#') {
      const point = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : whole;
    }
    return Object.prototype.hasOwnProperty.call(entities, name.toLowerCase()) ? entities[name.toLowerCase()] : whole;
  });
}
function normText(html) {
  return normDecodeEntities(String(html || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<\s*(?:br|\/p|\/div|\/li|\/tr)\b[^>]*>/gi, '\n').replace(/<[^>]*>/g, ' '))
    .replace(/[\t\r ]+/g, ' ').replace(/ *\n */g, '\n').trim();
}
function normAttr(tag, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = tag.match(new RegExp('(?:^|\\s)' + escaped + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return m ? normDecodeEntities(m[1] ?? m[2] ?? m[3] ?? '') : '';
}
function normSplitClauses(text) {
  const input = String(text || '');
  const out = [];
  let start = 0;
  const push = end => {
    const raw = input.slice(start, end);
    const leading = (raw.match(/^\s*/) || [''])[0].length;
    const trailing = (raw.match(/\s*$/) || [''])[0].length;
    if (raw.trim()) out.push({ text: raw.trim(), start: start + leading, end: end - trailing });
    start = end;
  };
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\n' && /\n|\s*\d+\.\d+(?:\.\d+)*\s+[A-Z]/.test(input.slice(i + 1, i + 100))) { push(i); start = i + 1; continue; }
    if (!/[.!?]/.test(input[i]) || !/\s/.test(input[i + 1] || '')) continue;
    if (/\d/.test(input[i - 1] || '') && /\d/.test(input[i + 1] || '')) continue;
    const before = input.slice(Math.max(0, i - 18), i + 1);
    if (/\b(?:e\.g|i\.e|vs|Dr|Mr|Mrs|St|No|Fig|U\.S|E|S|P|H|C)\.$/i.test(before)) continue;
    const rest = input.slice(i + 1);
    if (/^\s+[A-Z0-9(]/.test(rest)) push(i + 1);
  }
  push(input.length);
  return out;
}
function normParseTable(html, limits) {
  const raw = String(html || '');
  if (raw.length > limits.maximumTextCharacters) throw new Error('AMU_TABLE_TEXT_LIMIT');
  const tables = [...raw.matchAll(/<\s*table\b/gi)];
  if (tables.length > 1) return { error: 'nested_or_multiple_tables' };
  const tokens = [...raw.matchAll(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)];
  const physical = []; const notes = []; let row = null, cell = null, caption = '', inCaption = false, inHead = false, inFoot = false, cellStart = 0, rowStart = 0, ignored = 0;
  let closedCells = 0;
  for (const token of tokens) {
    const part = token[0], offset = token.index;
    if (part.startsWith('<!--')) continue;
    if (part[0] !== '<') { if (!ignored) { if (cell) cell.raw += part; if (inCaption) caption += part; } continue; }
    const m = part.match(/^<\s*(\/?)\s*([a-z0-9]+)/i); if (!m) continue;
    const close = !!m[1], tag = m[2].toLowerCase();
    if (['script', 'style'].includes(tag)) { ignored += close ? -1 : 1; ignored = Math.max(0, ignored); continue; }
    if (ignored) continue;
    if (tag === 'caption') { inCaption = !close; continue; }
    if (tag === 'thead') { inHead = !close; continue; }
    if (tag === 'tfoot') { inFoot = !close; continue; }
    if (tag === 'tr') {
      if (!close) { if (row || cell) return { error: 'unclosed_table_row_or_cell' }; row = { cells: [], inHead, inFoot, start: offset }; rowStart = offset; }
      else { if (!row || cell) return { error: 'unbalanced_table_row' }; row.end = offset + part.length; if (row.inFoot) notes.push(row.cells.map(c => c.text).join(' ')); else physical.push(row); row = null; }
      continue;
    }
    if (tag === 'td' || tag === 'th') {
      if (!close) {
        if (!row || cell) return { error: 'unbalanced_table_cell' };
        const rs = normAttr(part, 'rowspan'), cs = normAttr(part, 'colspan');
        if ((rs && !/^\d+$/.test(rs)) || (cs && !/^\d+$/.test(cs))) return { error: 'invalid_cell_span' };
        const rowspan = rs ? Number(rs) : 1, colspan = cs ? Number(cs) : 1;
        if (rowspan < 1 || colspan < 1 || rowspan > limits.maximumRows || colspan > limits.maximumColumns) return { error: 'cell_span_limit' };
        cell = { raw: '', header: tag === 'th' || inHead || normAttr(part, 'scope') === 'col', rowspan, colspan, start: offset, attributes: { id: normAttr(part, 'id'), headers: normAttr(part, 'headers') } }; cellStart = offset;
        if (/\/\s*>$/.test(part)) { cell.text='';cell.end=offset+part.length;cell.quote=part;row.cells.push(cell);cell=null;closedCells++; }
      } else {
        if (!cell || !row) return { error: 'unbalanced_table_cell' };
        cell.text = normText(cell.raw); if(/<(?:content|b|strong)\b[^>]*(?:styleCode=[\"'][^\"']*bold|^<(?:b|strong)\b)/i.test(cell.raw)&&!/[0-9]\s*(?:mg|mcg|g|grams?|milligrams?|units)\b/i.test(cell.text))cell.header=true; cell.end = offset + part.length; cell.quote = raw.slice(cellStart, cell.end); row.cells.push(cell); cell = null; closedCells++;
      }
      continue;
    }
    if (cell) cell.raw += part;
    if (inCaption) caption += part;
  }
  if (row || cell) return { error: 'unclosed_table_row_or_cell' };
  if (!closedCells || !physical.length) return { error: 'empty_table' };
  if (physical.length > limits.maximumRows) throw new Error('AMU_TABLE_ROW_LIMIT');
  const grid = [];
  for (let r = 0; r < physical.length; r++) {
    grid[r] ||= []; let column = 0;
    for (const sourceCell of physical[r].cells) {
      while (grid[r][column]) column++;
      if (column + sourceCell.colspan > limits.maximumColumns || r + sourceCell.rowspan > physical.length) return { error: 'cell_span_outside_table' };
      sourceCell.origin = { row_index: r, column_index: column, rowspan: sourceCell.rowspan, colspan: sourceCell.colspan };
      for (let dr = 0; dr < sourceCell.rowspan; dr++) for (let dc = 0; dc < sourceCell.colspan; dc++) {
        grid[r + dr] ||= [];
        if (grid[r + dr][column + dc]) return { error: 'overlapping_cell_spans' };
        grid[r + dr][column + dc] = sourceCell;
      }
      column += sourceCell.colspan;
    }
  }
  const width = Math.max(...grid.map(r => r.length));
  if (grid.some(row => row.length !== width || Array.from({ length: width }, (_, c) => row[c]).some(x => !x))) return { error: 'ragged_table' };
  let headerRows = 0;
  while (headerRows < physical.length && physical[headerRows].cells.length && physical[headerRows].cells.every(c => c.header)) headerRows++;
  if (headerRows === physical.length) return { error: 'table_has_no_data_rows' };
  const titleRows=new Set();
  for(let r=0;r<headerRows;r++){const origins=new Set(grid[r].map(cell=>cell));if(origins.size===1&&grid[r][0].origin.colspan===width&&width>1){titleRows.add(r);caption+='<br>'+grid[r][0].text;}}
  const headers = Array.from({ length: width }, (_, c) => {
    const values = [];
    for (let r = 0; r < headerRows; r++) { if(titleRows.has(r))continue; const text = grid[r][c].text; if (text && !values.includes(text)) values.push(text); }
    return values.join(' — ');
  });
  return { raw, caption: normText(caption), grid, physical, headers, headerRows, notes, width };
}
function normalizeLabel(input, options = {}) {
  const limits = {
    maximumNodes: Math.min(20000, Number(options.maximumNodes) || 12000),
    maximumTextCharacters: Math.min(5000000, Number(options.maximumTextCharacters) || 2000000),
    maximumTables: Math.min(200, Number(options.maximumTables) || 100),
    maximumRows: Math.min(1000, Number(options.maximumRows) || 500),
    maximumColumns: Math.min(100, Number(options.maximumColumns) || 60)
  };
  if (!input || typeof input !== 'object') throw new Error('AMU_LABEL_OBJECT_REQUIRED');
  const record = input.label && typeof input.label === 'object' ? input.label : input;
  const explicit = normClone(options.provenance || options.identity || record.identity || {});
  const metadata = record.openfda || {};
  const hint = record.id || record.labelId || record.set_id || explicit.labelId || explicit.setId;
  const fingerprint = hint || normHash(JSON.stringify(record).slice(0, limits.maximumTextCharacters));
  const documentId = String(explicit.document_id || explicit.documentId || fingerprint);
  const identity = {
    sourceId: explicit.sourceId || explicit.source || (record.openfda ? 'openfda' : 'unverified'),
    source: explicit.source || explicit.sourceId || (record.openfda ? 'openFDA' : 'unverified'),
    status: explicit.status || 'unverified', labelId: String(explicit.labelId || record.id || record.labelId || ''),
    setId: String(explicit.setId || record.set_id || ''), effectiveTime: String(explicit.effectiveTime || record.effective_time || ''),
    sourceUrl: String(explicit.sourceUrl || explicit.url || options.sourceUrl || ''),
    genericName: explicit.genericName || normFirst(metadata.generic_name) || record.genericName || '',
    product: explicit.product || normFirst(metadata.generic_name) || record.product || '',
    brandName: explicit.brandName || normFirst(metadata.brand_name) || '',
    route: explicit.route || (Array.isArray(metadata.route) ? metadata.route.join(', ') : normFirst(metadata.route)) || record.route || '',
    dosageForm: explicit.dosageForm || normFirst(metadata.dosage_form) || '',
    document_id: documentId, ...explicit
  };
  identity.document_id = documentId;
  if (!['retrieved', 'reference', 'unverified', 'unavailable', 'no_label_retrieved'].includes(identity.status)) identity.status = 'unverified';
  if (Array.isArray(record.nodes)) {
    if (record.nodes.length > limits.maximumNodes) throw new Error('AMU_NODE_LIMIT');
    const nodes = normClone(record.nodes), ids = new Set(); let total = 0;
    const validKinds = new Set(['table', 'table.header', 'table.column', 'table.row', 'table.cell', 'table.caption', 'section.heading', 'prose.clause', 'footnote']);
    for (const node of nodes) {
      if (!node || typeof node.id !== 'string' || ids.has(node.id) || !validKinds.has(node.kind) || typeof node.text !== 'string' || !Array.isArray(node.sourceSpans) || !node.relations || typeof node.relations !== 'object') throw new Error('AMU_INVALID_NORMALIZED_NODE');
      ids.add(node.id); total += node.text.length; node.document_id ||= documentId;
      if (!node.source_field && node.sourceSpans[0]) node.source_field = node.sourceSpans[0].source_field;
      for (const span of node.sourceSpans) if (!span || !span.document_id || !span.node_id || !span.source_field || typeof span.quote !== 'string') throw new Error('AMU_INVALID_SOURCE_SPAN');
    }
    if (total > limits.maximumTextCharacters) throw new Error('AMU_LABEL_TEXT_LIMIT');
    return { identity, nodes, diagnostics: normClone(record.diagnostics || []) };
  }
  const nodes = [], diagnostics = [], embeddedTables=[]; let total = 0, tableCount = 0;
  const add = node => {
    total += node.text.length;
    if (nodes.length >= limits.maximumNodes) throw new Error('AMU_NODE_LIMIT');
    if (total > limits.maximumTextCharacters) throw new Error('AMU_LABEL_TEXT_LIMIT');
    node.document_id = documentId; node.relations ||= {}; nodes.push(node); return node;
  };
  const span = (id, field, quote, extra = {}) => ({ document_id: documentId, node_id: id, source_field: field, quote: String(quote), ...extra });
  function prose(raw, field, index) {
    const text = String(raw || ''); if (!text.trim()) return;
    const base = `${documentId}:${field}:${index}`;
    const section = add({ id: base + ':section', kind: 'section.heading', text: field.replace(/_/g, ' '), source_field: field, section_id: base + ':section', sourceSpans: [span(base + ':section', field, text, { source_index: index })], relations: {} });
    // HTML/SPL headings establish source boundaries before tokenization. Keep
    // original fragments/offsets as evidence and never flatten an embedded table
    // into an adjacent prose regimen.
    if (/<(?:h[1-6]|title|p|paragraph|table)\b/i.test(text)) {
      const stack=[{id:section.id,level:0}],markers=[...text.matchAll(/<(h[1-6]|title)\b[^>]*>([\s\S]*?)<\/\1\s*>|<table\b[\s\S]*?<\/table\s*>/gi)];
      let cursor=0,part=0;
      const body=(raw,start)=>{
        let position=0;const breaks=[...raw.matchAll(/<\/(?:p|paragraph|div|li)\s*>|<br\s*\/?\s*>/gi)];
        for(const boundary of [...breaks,{index:raw.length,0:''}]){
          const end=boundary.index+boundary[0].length,fragment=raw.slice(position,end),visible=normText(fragment);
          if(visible)for(const clause of normSplitClauses(visible)){
            const id=base+':html-clause:'+(part++),parents=stack.slice().reverse().map(s=>s.id);
            add({id,kind:'prose.clause',text:clause.text,source_field:field,section_id:parents[0],sourceSpans:[span(id,field,fragment,{start:start+position,end:start+end,source_index:index})],relations:{section_parent:parents}});
          }
          position=end;
        }
      };
      for(const marker of markers){body(text.slice(cursor,marker.index),cursor);
        if(marker[1]){const heading=normText(marker[2]),level=marker[1].toLowerCase()==='title'?1:Number(marker[1].slice(1));while(stack.length>1&&stack[stack.length-1].level>=level)stack.pop();const id=base+':html-heading:'+(part++);add({id,kind:'section.heading',text:heading,headingLevel:level,source_field:field,section_id:id,sourceSpans:[span(id,field,marker[0],{start:marker.index,end:marker.index+marker[0].length,source_index:index})],relations:{section_parent:stack.slice().reverse().map(s=>s.id)}});stack.push({id,level});}
        else if(field==='dosage_and_administration')embeddedTables.push({html:marker[0],sectionIds:stack.slice().reverse().map(s=>s.id),sourceIndex:index,start:marker.index});
        cursor=marker.index+marker[0].length;
      }
      body(text.slice(cursor),cursor);return;
    }
    let currentSection = section.id;
    for (const [i, clause] of normSplitClauses(text).entries()) {
      const head = clause.text.match(/^(\d+\.\d+(?:\.\d+)*)\s+([A-Z][A-Za-z /&(),-]{2,120})(?=\s+(?:The|For|Administer|Adults|Patients|Recommended)\b|$)/);
      if (head) {
        const headingId = base + ':heading:' + i;
        add({ id: headingId, kind: 'section.heading', text: head[0], source_field: field, section_id: headingId, sourceSpans: [span(headingId, field, head[0], { start: clause.start, end: clause.start + head[0].length, source_index: index })], relations: { section_parent: [section.id] } }); currentSection = headingId;
      }
      const id = base + ':clause:' + i;
      add({ id, kind: 'prose.clause', text: clause.text, source_field: field, section_id: currentSection, sourceSpans: [span(id, field, clause.text, { start: clause.start, end: clause.end, source_index: index })], relations: { section_parent: [currentSection] } });
    }
  }
  function addTable(value, index, field) {
    if (++tableCount > limits.maximumTables) throw new Error('AMU_TABLE_LIMIT');
    const tableId = `${documentId}:${field}:${index}`;
    let parsed;
    if (typeof value === 'string') parsed = normParseTable(value, limits);
    else {
      const source = normClone(value), rawRows = source.rows || [], headers = source.headers || [];
      if (!Array.isArray(rawRows) || !Array.isArray(headers) || rawRows.length > limits.maximumRows || headers.length > limits.maximumColumns) throw new Error('AMU_INVALID_TABLE_SHAPE');
      const width = Math.max(headers.length, ...rawRows.map(r => Array.isArray(r) ? r.length : -1), 0);
      if (!width || rawRows.some(r => !Array.isArray(r) || r.length !== width) || (headers.length && headers.length !== width)) parsed = { error: 'ragged_table' };
      else {
        const allRows = headers.length ? [headers, ...rawRows] : rawRows;
        const grid = allRows.map((r, ri) => r.map((c, ci) => ({ text: typeof c === 'object' && c ? String(c.text || '') : String(c ?? ''), raw: String(c ?? ''), quote: typeof c === 'object' && c ? String(c.text || '') : String(c ?? ''), origin: { row_index: ri, column_index: ci, rowspan: 1, colspan: 1 }, start: null, end: null, header: !!headers.length && ri === 0, attributes: {} })));
        parsed = { raw: source.rawHtml || '', caption: source.caption || '', grid, headers: headers.map(String), headerRows: headers.length ? 1 : 0, width, notes: Array.isArray(source.notes) ? source.notes : [], inferredHeaderRoles: source.inferredHeaderRoles === true };
      }
    }
    if (parsed.error) { diagnostics.push({ code: 'table_unresolved', reason: parsed.error, source_field: field, source_index: index, table_id: tableId, sourceSpans: [span(tableId, field, typeof value === 'string' ? value : JSON.stringify(value))] }); return; }
    const tableText = [parsed.caption, ...parsed.grid.map(r => r.map(c => c.text).join(' | ')), ...parsed.notes].filter(Boolean).join('\n');
    const table = add({ id: tableId, kind: 'table', text: tableText, source_field: field, table_id: tableId, section_id: String(value?.section_id || ''), headers: parsed.headers, headerRows: parsed.headerRows, inferredHeaderRoles: parsed.inferredHeaderRoles === true, caption: parsed.caption, rows: parsed.grid.slice(parsed.headerRows).map(r => r.map(c => c.text)), sourceSpans: [span(tableId, field, parsed.raw || tableText, { source_index: index, table_index: index })], relations: {} });
    if (parsed.caption) {
      const id = tableId + ':caption'; add({ id, kind: 'table.caption', text: parsed.caption, source_field: field, table_id: tableId, sourceSpans: [span(id, field, parsed.caption, { source_index: index, table_index: index })], relations: {} }); table.relations.table_caption = [id];
    }
    const cellIds = new Map();
    for (let ri = 0; ri < parsed.grid.length; ri++) for (let ci = 0; ci < parsed.width; ci++) {
      const c = parsed.grid[ri][ci], key = c.origin.row_index + ':' + c.origin.column_index;
      if (cellIds.has(key)) continue;
      const id = tableId + ':cell:' + key; cellIds.set(key, id);
      const cellSpan = span(id, field, c.quote || c.text, { source_index: index, table_index: index, row_index: c.origin.row_index, column_index: c.origin.column_index, rowspan: c.origin.rowspan, colspan: c.origin.colspan, start: c.start, end: c.end });
      add({ id, kind: ri < parsed.headerRows ? 'table.header' : 'table.cell', text: c.text, source_field: field, table_id: tableId, row_index: c.origin.row_index, column_index: c.origin.column_index, origin: normClone(c.origin), header: !!c.header, sourceSpans: [cellSpan], relations: {} });
    }
    for (let ci = 0; ci < parsed.width; ci++) {
      const headerIds = [];
      for (let hr = 0; hr < parsed.headerRows; hr++) { const c = parsed.grid[hr][ci], id = cellIds.get(c.origin.row_index + ':' + c.origin.column_index); if (!headerIds.includes(id)) headerIds.push(id); }
      const id = tableId + ':column:' + ci;
      add({ id, kind: 'table.column', text: parsed.headers[ci] || '', source_field: field, table_id: tableId, column_index: ci, sourceSpans: headerIds.flatMap(hid => nodes.find(n => n.id === hid)?.sourceSpans || []), relations: { header_parent: headerIds } });
    }
    for (let ri = parsed.headerRows; ri < parsed.grid.length; ri++) {
      const rowId = tableId + ':row:' + ri, cells = [];
      for (let ci = 0; ci < parsed.width; ci++) {
        const c = parsed.grid[ri][ci], originId = cellIds.get(c.origin.row_index + ':' + c.origin.column_index), original = nodes.find(n => n.id === originId);
        const headerIds = [];
        for (let hr = 0; hr < parsed.headerRows; hr++) { const h = parsed.grid[hr][ci], hid = cellIds.get(h.origin.row_index + ':' + h.origin.column_index); if (!headerIds.includes(hid)) headerIds.push(hid); }
        const relations = { header_parent: headerIds };
        if (c.origin.row_index !== ri) relations.rowspan_origin = [originId];
        if (c.origin.column_index !== ci) relations.colspan_origin = [originId];
        cells.push({ id: originId, text: c.text, headers: parsed.headers[ci] ? [parsed.headers[ci]] : [], column_index: ci, row_index: ri, origin: normClone(c.origin), sourceSpans: normClone(original.sourceSpans), relations });
      }
      const evidence = [], seen = new Set();
      for (const c of cells) for (const s of c.sourceSpans) { const key = s.node_id; if (!seen.has(key)) { seen.add(key); evidence.push(s); } }
      add({ id: rowId, kind: 'table.row', text: cells.map(c => c.text).join(' | '), source_field: field, table_id: tableId, row_id: rowId, row_index: ri, headers: parsed.headers, cells, sourceSpans: evidence, relations: { ...(table.relations.table_caption ? { table_caption: table.relations.table_caption } : {}) } });
    }
    for (let ni = 0; ni < parsed.notes.length; ni++) {
      const id = tableId + ':footnote:' + ni; add({ id, kind: 'footnote', text: String(parsed.notes[ni]), source_field: field, table_id: tableId, sourceSpans: [span(id, field, parsed.notes[ni], { table_index: index })], relations: {} });
      for (const node of nodes) if (node.table_id === tableId && node.kind === 'table.row') { node.relations.footnote_link ||= []; node.relations.footnote_link.push(id); }
    }
  }
  const textFields = ['indications_and_usage', 'dosage_and_administration', 'use_in_specific_populations', 'contraindications', 'warnings_and_cautions', 'warnings', 'boxed_warning', 'drug_interactions', 'microbiology'];
  for (const field of textFields) {
    const values = Array.isArray(record[field]) ? record[field] : (record[field] == null ? [] : [record[field]]);
    values.forEach((value, i) => prose(value, field, i));
  }
  if (record.prose != null || record.text != null) (Array.isArray(record.prose) ? record.prose : [record.prose ?? record.text]).forEach((value, i) => prose(value, 'dosage_and_administration', i));
  const explicitTableTexts=new Set((Array.isArray(record.dosage_and_administration_table)?record.dosage_and_administration_table:record.dosage_and_administration_table?[record.dosage_and_administration_table]:[]).filter(v=>typeof v==='string').map(normText));
  for(const [i,embedded]of embeddedTables.entries()){
    if(explicitTableTexts.has(normText(embedded.html)))continue;
    const start=nodes.length;addTable(embedded.html,i,'dosage_and_administration');
    for(const node of nodes.slice(start))if(node.table_id){node.relations.section_parent=unique(arr(node.relations.section_parent).concat(embedded.sectionIds));for(const source of node.sourceSpans)source.embedded_in={source_field:'dosage_and_administration',source_index:embedded.sourceIndex,start:embedded.start};}
  }
  const htmlTables = Array.isArray(record.dosage_and_administration_table) ? record.dosage_and_administration_table : (record.dosage_and_administration_table ? [record.dosage_and_administration_table] : []);
  htmlTables.forEach((value,i)=>{const start=nodes.length;addTable(value,i,'dosage_and_administration_table');const parents=typeof value==='string'?embeddedTables.filter(e=>normText(e.html)===normText(value)):[];if(parents.length===1)for(const node of nodes.slice(start))if(node.table_id)node.relations.section_parent=unique(arr(node.relations.section_parent).concat(parents[0].sectionIds));});
  if (Array.isArray(record.tables)) record.tables.forEach((value, i) => addTable(value, i + htmlTables.length, value?.sourceField || 'dosage_and_administration_table'));
  if (Array.isArray(record.headers) || Array.isArray(record.rows)) addTable(record, htmlTables.length + (record.tables?.length || 0), 'dosage_and_administration_table');
  return { identity, nodes, diagnostics };
}

return { AMUEngine, EngineError, ...(isolated ? { workerRun: runJob, workerInit: initializeWorker } : {}) };
}
(function expose(root) {
 const api = engineFactory(false);
 if (typeof module === 'object' && module.exports) module.exports = api;
 else { root.AMUEngine = api.AMUEngine; root.AMU = Object.freeze(api); }
})(typeof globalThis !== 'undefined' ? globalThis : self);
