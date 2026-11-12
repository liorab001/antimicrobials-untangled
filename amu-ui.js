/* V1.18 UI and support behaviors. Live regimens use AMUApp/AMUEngine.
 * Legacy parser functions are retained for source inspection, never as a live-dose fallback. */

    // =========================================================================
    // 1. ZERO-MEMORY LEGAL GATE & STRICT CLIENT-SIDE PII FIREWALL
    // =========================================================================
    function acceptLegalGate() {
      document.getElementById("legalGateModal").classList.add("hidden");
    }

    function isQuerySafeFromPii(rawInput) {
      const trimmed = rawInput.trim();
      const alertBox = document.getElementById("piiFirewallAlert");
      alertBox.classList.add("hidden");

      if (/\d{2,}/.test(trimmed)) {
        showPiiBlock("Blocked: Numeric sequences (dates, ages, IDs, or phone numbers) are prohibited.");
        return false;
      }
      if (/[@\/\\]/.test(trimmed)) {
        showPiiBlock("Blocked: Special characters (@, /) associated with emails or dates are prohibited.");
        return false;
      }
      if (/\b(mr|mrs|ms|miss|dr|patient|pacient|name|jméno|dob|born|age|male|female|ward|room|bed|chart|id|ssn)\b/i.test(trimmed)) {
        showPiiBlock("Blocked: Personal identifiers or patient chart descriptors are strictly prohibited.");
        return false;
      }
      const words = trimmed.split(/\s+/);
      if (trimmed.length > 48 || words.length > 4) {
        showPiiBlock("Blocked: Enter only a 1–4 word generic drug, microbe, or syndrome name.");
        return false;
      }
      return true;
    }

    function showPiiBlock(msg) {
      const alertBox = document.getElementById("piiFirewallAlert");
      alertBox.innerHTML = `<i class="fa-solid fa-shield-halved mr-1"></i> <strong>Search-box identifier block:</strong> ${msg}`;
      alertBox.classList.remove("hidden");
    }

    // =========================================================================
    // 2. DRUGS & DRUG GROUPS CATALOG
    // =========================================================================
    let antimicrobialDrugGroups = AMUApp.reference("drugGroups");
    let antimicrobialDrugCatalog = AMUApp.reference("drugCatalog");
    // =========================================================================
    // 3. PATHOGEN-SPECIFIC KNOWLEDGE GRAPH (COMMON + SEARCHABLE RARE PATHOGENS)
    // =========================================================================
    let pathogenKnowledgeGraph = AMUApp.reference("pathogenProfiles");
    // =========================================================================
    // 4. SYNDROME / DISEASE CATALOG
    // =========================================================================
    let canonicalSyndromeTerms = AMUApp.reference("syndromeTerms");
    // Syndrome-only curation: do not derive these suggestions from broad FDA substring matches.
    let SYNDROME_CLINICAL_MAP = AMUApp.reference("syndromeMap");
    let activeSyndromePathogenId = "all";

    function getSyndromeClinicalMap() {
      if (currentSearchLevel !== "SYNDROME") return null;
      const label = normalizeClinicalKeyword(document.getElementById("activeDiseaseHeader")?.textContent || currentQueryLabel);
      return Object.entries(SYNDROME_CLINICAL_MAP).find(([key]) => normalizeClinicalKeyword(key) === label)?.[1] || null;
    }

    function canonicalizeClinicalIngredient(value) {
      let key = String(value || "").toLowerCase();
      key = key.replace(/\b\d+(?:\.\d+)?\s*(?:mg|g|mcg|units)\b/gi, " ");
      key = key.replace(/\b(anhydrous|benzathine|procaine|sodium|disodium|potassium|sulfate|tosylate|hydrochloride|hcl|hemihydrate|besylate|mesylate|tartrate|citrate|phosphate|diphosphate|acetate|succinate|fumarate|maleate|gluconate|lactobionate|lactate|palmitate|ethylsuccinate|stearate|estolate|hippurate|methenamine|axetil|pivoxil|cilexetil|proxetil|colloidal dispersion|liposomal|lipid complex|cholesteryl sulfate|usp|monohydrate|dihydrate|trihydrate|calcium|magnesium|micronized|injection|oral|topical)\b/gi, " ");
      key = key.replace(/\bcefalexin\b/g, "cephalexin").replace(/\brifampicin\b/g, "rifampin");
      key = key.replace(/\b(and|with|plus)\b/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
      const parts = key.split(" ").filter(Boolean);
      return parts.length > 1 ? parts.sort().join(" ") : key;
    }

    function drugMatchesCuratedAgent(drug, agentName) {
      const agent = canonicalizeClinicalIngredient(agentName || "");
      if (!agent) return false;
      const candidates = [drug?.activeIngredientSource, drug?.genericName].filter(Boolean)
        .map(canonicalizeClinicalIngredient);
      return candidates.some(name => name === agent);
    }

    function isFormulationCompatibleWithSystemicInfection(drug) {
      // A local product is eligible only for a specifically mapped presentation.
      if (currentSearchLevel === 'PATHOGEN' && activePathogenProfile && firstLineKnowledge()?.allowsLocalProduct(activePathogenProfile.canonical, activeDiseaseFilterId, drug, AMUApp.patient(), drugMatchesCuratedAgent)) return true;
      const route = String(drug?.route || "").toLowerCase();
      const rawDosing = String(drug?.rawDosing || "").toLowerCase();
      const productText = `${route} ${drug?.genericName || ""} ${drug?.brandName || ""} ${rawDosing}`.toLowerCase();
      const routeHasSystemic = /\b(oral|intravenous|intramuscular|subcutaneous|systemic|injection|intrathecal)\b/i.test(route);
      const localOnly = /\b(ophthalmic|otic|topical|cutaneous|dermal|vaginal|rectal|intraocular|eye drops?|ear drops?|ophthalmic solution|otic solution)\b/i.test(route) ||
        /\b(ophthalmic solution|ophthalmic ointment|otic solution|otic suspension|topical cream|topical ointment|vaginal cream|rectal ointment)\b/i.test(productText);
      if (localOnly && !routeHasSystemic) return false;

      // Inhaled-only formulations are not accepted as stand-alone systemic treatment
      // suggestions by this infection explorer. A dedicated airway-disease map would
      // be needed before such products can be included safely.
      if (/\b(inhalation|inhaled|nebulization)\b/i.test(route)) return false;

      const routeIsUnverified = !route || /^(?:systemic|route not verified|route not specified|unknown)$/i.test(route.trim());
      const isSyntheticDefaultDose = /^standard systemic dosing for /i.test(rawDosing.trim());
      const systemicEvidenceInLabel = !isSyntheticDefaultDose && /\b(oral|orally|intravenous|intravenously|intramuscular|intramuscularly|subcutaneous|subcutaneously|systemic|injection|intrathecal)\b/i.test(rawDosing);
      if (routeIsUnverified && !systemicEvidenceInLabel) return !!drug?.isCuratedFallback;
      if (!routeHasSystemic && !systemicEvidenceInLabel && !drug?.isCuratedFallback) return false;
      return true;
    }

    function getSyndromeCoverageForDrug(drug) {
      const map = getSyndromeClinicalMap();
      if (!map) return [];
      return map.pathogens.filter(pathogen => pathogen.id === activeSyndromePathogenId || activeSyndromePathogenId === "all")
        .filter(pathogen => pathogen.agents.some(agent => drugMatchesCuratedAgent(drug, agent)));
    }

    function renderSyndromePathogenFilterBar() {
      const box = document.getElementById("syndromePathogenFilterBox");
      const pills = document.getElementById("syndromePathogenPills");
      const status = document.getElementById("activeSyndromePathogenLabel");
      const note = document.getElementById("syndromePathogenNote");
      const map = getSyndromeClinicalMap();
      if (!box || currentSearchLevel !== "SYNDROME" || !map) { box?.classList.add("hidden"); return; }
      box.classList.remove("hidden");
      const active = map.pathogens.find(x => x.id === activeSyndromePathogenId);
      status.textContent = `Active filter: ${active ? active.label : "All pathogens"}`;
      const choices = [{ id: "all", label: "All pathogens" }, ...map.pathogens.map(p => ({ id: p.id, label: p.label }))];
      pills.innerHTML = choices.map(p => `
        <button type="button" onclick="selectSyndromePathogenFilter('${p.id}')" class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeSyndromePathogenId === p.id ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'}">
          <i class="fa-solid ${p.id === 'all' ? 'fa-layer-group' : 'fa-bacterium'} text-[10px] mr-1"></i>${esc(p.label)}
        </button>`).join("");
      note.textContent = map.note || "Select one pathogen to narrow suggestions, or keep All pathogens to see agents associated with likely pathogens.";
    }

    async function selectSyndromePathogenFilter(pathogenId) {
      activeSyndromePathogenId = pathogenId;
      const map = getSyndromeClinicalMap();
      if (map && pathogenId !== "all") {
        const selected = map.pathogens.find(p => p.id === pathogenId);
        if (selected) await ensureCuratedDrugCardsLoaded(selected.agents);
      }
      renderSyndromePathogenFilterBar();
      reFilterCurrentResults();
    }

    function curatedProductRequirement(agentName) {
      const gasThroat = (currentSearchLevel === "PATHOGEN" && activePathogenProfile?.canonical === "Streptococcus pyogenes" && activeDiseaseFilterId === "pharyngitis")
        || (currentSearchLevel === "SYNDROME" && normalizeClinicalKeyword(getSyndromeClinicalMap()?.contextKeywords?.[0] || "") === "streptococcal pharyngitis");
      return gasThroat && canonicalizeClinicalIngredient(agentName) === canonicalizeClinicalIngredient("Penicillin G") ? "benzathine_im" : "";
    }

    function curatedProductMatches(drug, agentName) {
      if (drug?.isCuratedFallback || !drugMatchesCuratedAgent(drug, agentName) || !isFormulationCompatibleWithSystemicInfection(drug)) return false;
      const preference=amuCuratedProductPreference(agentName);
      if(preference?.routes?.length&&!preference.routes.some(route=>clinicalPhrasePresent(drug.route||'',route)))return false;
      if(preference?.excludeFormulation&&new RegExp(preference.excludeFormulation,'i').test(`${drug.activeIngredientSource||''} ${drug.brandName||''}`))return false;
      const product=[drug.activeIngredientSource,drug.genericName,drug.brandName,drug.dosageForm].join(' ');
      if(preference?.productPatterns?.length&&!preference.productPatterns.some(pattern=>new RegExp(pattern,'i').test(product)))return false;
      if(preference?.excludeProductPatterns?.some(pattern=>new RegExp(pattern,'i').test(product)))return false;
      if (curatedProductRequirement(agentName) !== "benzathine_im") return true;
      const formulation = `${drug.activeIngredientSource || ""} ${drug.genericName || ""} ${drug.brandName || ""}`;
      return /benzathine|bicillin\s*l.?a/i.test(formulation) && !/procaine|bicillin\s*c.?r/i.test(formulation)
        && /intramuscular|\bim\b/i.test(drug.route || "");
    }

    function amuCuratedProductPreference(agentName) {
      const key=currentSearchLevel==='PATHOGEN'?`${activePathogenProfile?.canonical||''}|${activeDiseaseFilterId}`:'';
      const explicit=(AMUApp.database?.referenceCollections?.productPreferences?.records||[]).find(rule=>rule.contextKeys.includes(key)&&rule.drugNames.some(name=>canonicalizeClinicalIngredient(name)===canonicalizeClinicalIngredient(agentName)));
      return explicit || (currentSearchLevel==='PATHOGEN' && activePathogenProfile ? firstLineKnowledge()?.preference(activePathogenProfile.canonical,activeDiseaseFilterId,agentName,AMUApp.patient()) : null);
    }

    // Drug lookups must match the complete ingredient set. A label returned by a
    // broad API query is not evidence that its combination/formulation was requested.
    function amuDrugLookupRequest(rawName) {
      const raw = String(rawName || "").trim();
      const needle = normalizeClinicalKeyword(raw);
      const catalog = antimicrobialDrugCatalog.find(d => [d.name, ...(d.aliases || [])]
        .some(name => normalizeClinicalKeyword(name) === needle));
      const ingredientName = catalog?.name || raw;
      const formulationHints = [
        [/\bbenzathine\b/i, "benzathine"], [/\bprocaine\b/i, "procaine"],
        [/\bliposomal\b|\bambisome\b/i, "liposomal"], [/\blipid complex\b|\babelcet\b/i, "lipid_complex"],
        [/\bcholesteryl sulfate\b|\bcolloidal dispersion\b/i, "colloidal_dispersion"],
        [/\bextended.release\b|\bdelayed.release\b|\bmodified.release\b/i, "modified_release"]
      ].filter(([re]) => re.test(raw)).map(([, hint]) => hint);
      return { raw, ingredientName, ingredientKey: canonicalizeClinicalIngredient(ingredientName), formulationHints };
    }

    function amuProductMatchesDrugRequest(drug, rawName) {
      const request = typeof rawName === "object" ? rawName : amuDrugLookupRequest(rawName);
      const sourceIngredient = drug?.activeIngredientSource || drug?.genericName || "";
      if (!request.ingredientKey || canonicalizeClinicalIngredient(sourceIngredient) !== request.ingredientKey) return false;
      const product = `${sourceIngredient} ${drug?.brandName || ""} ${drug?.dosageForm || drug?.labelProvenance?.dosageForm || ""}`;
      const hintPatterns = {
        benzathine: /\bbenzathine\b|\bbicillin\s*l.?a\b/i, procaine: /\bprocaine\b/i,
        liposomal: /\bliposomal\b|\bambisome\b/i, lipid_complex: /\blipid complex\b|\babelcet\b/i,
        colloidal_dispersion: /\bcholesteryl sulfate\b|\bcolloidal dispersion\b/i,
        modified_release: /\bextended.release\b|\bdelayed.release\b|\bmodified.release\b/i
      };
      return request.formulationHints.every(hint => hintPatterns[hint].test(product));
    }

    function amuRequestedBrandMatches(drug, request) {
      const brand = normalizeClinicalKeyword(drug?.brandName || "");
      const raw = normalizeClinicalKeyword(request.raw);
      return !!brand && (brand === raw || clinicalPhrasePresent(brand, raw));
    }

    function amuSelectRequestedDrug(cards, rawName, preferredProductId = "") {
      const request = amuDrugLookupRequest(rawName);
      const matching = (cards || []).filter(d => !d.isCuratedFallback && d.labelSourceStatus !== "no_fda_label_retrieved"
        && amuProductMatchesDrugRequest(d, request));
      return matching.find(d => preferredProductId && d.id === preferredProductId)
        || matching.find(d => amuRequestedBrandMatches(d, request))
        || matching.find(d => !d.isCuratedFallback && d.labelSourceStatus !== "no_fda_label_retrieved")
        || null;
    }

    function amuRequestedFdaRecords(records, rawName) {
      const request = amuDrugLookupRequest(rawName);
      const matching = (records || []).filter(item => (item.openfda?.generic_name || []).some(name =>
        amuProductMatchesDrugRequest({ activeIngredientSource: name,
          brandName: (item.openfda?.brand_name || []).join(" "),
          dosageForm: (item.openfda?.dosage_form || []).join(" ") }, request)));
      // Select the requested brand before generic/route deduplication can discard it.
      const branded = matching.filter(item => amuRequestedBrandMatches({ brandName: (item.openfda?.brand_name || []).join(" ") }, request));
      return branded.length ? branded : matching;
    }

    function amuDrugLookupUrls(rawName) {
      const request = amuDrugLookupRequest(rawName);
      const base = normalizeBaseDrugName(request.ingredientName).toLowerCase();
      const quote = value => '"' + String(value).replace(/["\\]/g, " ") + '"';
      const components = base.split(/\s*(?:\band\b|\bwith\b|\bplus\b|[-/+])\s*/i).filter(Boolean);
      const ingredientQuery = components.map(component => `(openfda.generic_name:${quote(component)} OR openfda.substance_name:${quote(component)})`).join(" AND ");
      const searches = [];
      if (normalizeClinicalKeyword(request.raw) !== normalizeClinicalKeyword(request.ingredientName)) {
        searches.push(`openfda.brand_name:${quote(request.raw)} OR openfda.generic_name:${quote(request.raw)}`);
      }
      if (ingredientQuery) searches.push(ingredientQuery);
      searches.push(`openfda.generic_name:${quote(base)}`);
      if (components.length === 1 && base) {
        const first = base.split(/\s+/)[0];
        searches.push(`openfda.substance_name:${quote(first)} OR openfda.generic_name:${quote(first)}`);
      }
      // Newest labels that actually contain a dosing section. A short page is
      // enough for one requested product and avoids downloading duplicate SPLs.
      return [...new Set(searches)].map(search => `https://api.fda.gov/drug/label.json?${new URLSearchParams({
        search: `${search} AND (_exists_:dosage_and_administration OR _exists_:dosage_and_administration_table)`,
        sort: "effective_time:desc",
        limit: "8"
      })}`);
    }

    // A new search aborts the previous retrieval so a stalled label download
    // cannot keep the spinner up or overwrite the newer results.
    let liveSearchGeneration = 0;
    let liveSearchAbort = null;
    function beginLiveSearch() {
      liveSearchAbort?.abort();
      liveSearchAbort = new AbortController();
      return { generation: ++liveSearchGeneration, signal: liveSearchAbort.signal };
    }

    function amuExternalSignal(signal, timeoutMs) {
      const timeout = AbortSignal.timeout(timeoutMs);
      return signal ? AbortSignal.any([signal, timeout]) : timeout;
    }

    function amuFetchResponse(url, signal, timeoutMs = 8000) {
      return fetch(url, { signal: amuExternalSignal(signal, timeoutMs) });
    }

    async function amuMapPool(items, limit, fn) {
      const out = new Array(items.length);
      let next = 0;
      const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
          const index = next++;
          out[index] = await fn(items[index], index);
        }
      });
      await Promise.all(workers);
      return out;
    }

    async function amuFetchRequestedDrug(rawName, accept = () => true, extraUrls = [], signal) {
      const deadline = Date.now() + 8000;
      const urls = [...extraUrls, ...amuDrugLookupUrls(rawName)];
      // Two queries at a time so a miss on the specific name does not wait out
      // before the next candidate starts. Earlier URLs stay preferred.
      for (let start = 0; start < urls.length; start += 2) {
        if (signal?.aborted) return null;
        const remaining = deadline - Date.now();
        if (remaining < 500) return null;
        const batch = urls.slice(start, start + 2);
        const found = await Promise.all(batch.map(async (url, offset) => {
          try {
            const response = await amuFetchResponse(url, signal, remaining);
            if (!response.ok) return null;
            const data = await response.json();
            const exactRecords = amuRequestedFdaRecords(data.results || [], rawName);
            const parsed = deduplicateAndDistillFdaDrugs(exactRecords, rawName).filter(accept);
            const selected = amuSelectRequestedDrug(parsed, rawName);
            return selected ? { selected, offset } : null;
          } catch (error) {
            if (signal?.aborted) return null;
            return null;
          }
        }));
        const winner = found.filter(Boolean).sort((a, b) => a.offset - b.offset)[0];
        if (winner) return winner.selected;
      }
      return null;
    }

    async function fetchCuratedDrugCard(agentName, signal) {
      if (currentFetchedDrugs.some(d => curatedProductMatches(d, agentName))) return null;
      const extraUrls = curatedProductRequirement(agentName) === "benzathine_im"
        ? ["https://api.fda.gov/drug/label.json?" + new URLSearchParams({
            search: 'openfda.substance_name:"penicillin g benzathine" AND openfda.route:"intramuscular" AND (_exists_:dosage_and_administration OR _exists_:dosage_and_administration_table)',
            sort: "effective_time:desc",
            limit: "5"
          })]
        : [];
      const preference=amuCuratedProductPreference(agentName);
      if(preference?.routes?.length){
        const ingredient=normalizeBaseDrugName(amuDrugLookupRequest(agentName).ingredientName).replace(/["\\]/g,' ');
        const routes=preference.routes.map(route=>`openfda.route:"${String(route).replace(/["\\]/g,' ')}"`).join(' OR ');
        extraUrls.unshift('https://api.fda.gov/drug/label.json?'+new URLSearchParams({
          search:`openfda.generic_name:"${ingredient}" AND (${routes}) AND (_exists_:dosage_and_administration OR _exists_:dosage_and_administration_table)`,
          sort:'effective_time:desc',
          limit:'8'
        }));
      }
      return amuFetchRequestedDrug(agentName, d => curatedProductMatches(d, agentName), extraUrls, signal);
    }

    function buildCuratedSuggestionFallbackCard(agentName) {
      const base = normalizeBaseDrugName(agentName);
      const card = buildGuaranteedFallbackCard(agentName, base);
      card.brandName = "FDA label not retrieved";
      card.epcClasses = [`Curated ${currentSearchLevel === "SYNDROME" ? "syndrome" : "pathogen"} suggestion • source unavailable`];
      card.route = "Route not verified";
      card.rawIndications = `Curated educational association for ${currentQueryLabel}; this is not a patient-specific regimen.`;
      card.rawDosing = `No matching FDA product-label record was retrieved for ${agentName}. Verify the current official label and syndrome-specific guideline before interpreting dose or route.`;
      card.rawInteractions = `FDA interaction section was not retrieved for ${agentName}. Consult the official product label for interactions and contraindications.`;
      card.rawRenalPop = `FDA renal / special-population section was not retrieved for ${agentName}. Verify renal and population-specific dosing in the official label.`;
      card.dosingBullets = [{ color: "amber", tag: "FDA Source Unavailable", text: "Drug is included from the curated educational pathogen map; no dose is displayed because its FDA label could not be retrieved." }];
      card.interactionBullets = [{ color: "amber", tag: "Source Check Required", text: "Official product-label interaction data were not retrieved." }];
      card.renalBullets = [{ color: "amber", tag: "Source Check Required", text: "Official renal dosing data were not retrieved." }];
      card.autoBadges = [{ label: "Curated Agent • Verify Source", color: "bg-amber-100 text-amber-900 border-amber-300", icon: "fa-circle-exclamation" }];
      card.isCuratedFallback = true;
      monographStore[card.id] = { genericName: card.genericName, rawDosing: card.rawDosing, rawInteractions: card.rawInteractions, rawRenalPop: card.rawRenalPop };
      return card;
    }

    async function ensureCuratedDrugCardsLoaded(agentNames, signal = liveSearchAbort?.signal) {
      const generation = liveSearchGeneration;
      const unique = [...new Set(agentNames || [])];
      const missing = unique.filter(name => !currentFetchedDrugs.some(d =>
        curatedProductMatches(d, name)
      ));
      if (!missing.length) return;
      let loaded = missing.map(() => null);
      try {
        loaded = await amuMapPool(missing, 4, name => fetchCuratedDrugCard(name, signal));
      } catch (error) { /* Unfetched agents become source-unavailable cards below. */ }
      if (generation !== liveSearchGeneration) return;
      const byId = new Map(currentFetchedDrugs.map(d => [d.id, d]));
      missing.forEach((name, index) => {
        const card = loaded[index] || buildCuratedSuggestionFallbackCard(name);
        if (loaded[index]) {
          for (const [id, prior] of byId) if (prior.isCuratedFallback && drugMatchesCuratedAgent(prior, name)) byId.delete(id);
        }
        if (!byId.has(card.id) || byId.get(card.id).isCuratedFallback) byId.set(card.id, card);
      });
      currentFetchedDrugs = [...byId.values()];
    }

    async function ensureSyndromeDrugCardsLoaded() {
      const map = getSyndromeClinicalMap();
      if (map) await ensureCuratedDrugCardsLoaded([...new Set(map.pathogens.flatMap(p => p.agents))]);
    }

    let PATHOGEN_DISEASE_AGENT_SETS = AMUApp.reference("pathogenDiseaseAgents");
    function getPathogenDiseaseAgentSet() {
      if (currentSearchLevel !== "PATHOGEN" || !activePathogenProfile || activeDiseaseFilterId === "all") return null;
      const explicit = PATHOGEN_DISEASE_AGENT_SETS[`${activePathogenProfile.canonical}|${activeDiseaseFilterId}`];
      if (explicit) return explicit;
      const selected = activePathogenProfile.diseases?.find(d => d.id === activeDiseaseFilterId);
      if (!selected) return null;

      const infectionLinks = {
        skin: ["Cellulitis & Skin Structure"], bite_skin: ["Cellulitis & Skin Structure"],
        pharyngitis: ["Streptococcal Pharyngitis"], skin_nec: ["Cellulitis & Skin Structure"],
        bone: ["Osteomyelitis (Acute / Chronic)"], bone_joint: ["Osteomyelitis (Acute / Chronic)", "Septic Arthritis"],
        bacteremia: ["Bacteremia / Septicemia", "Infective Endocarditis"], bacteremia_endo: ["Bacteremia / Septicemia", "Infective Endocarditis"],
        cns_sepsis: ["Bacteremia / Septicemia", "Bacterial Meningitis"], meningitis: ["Bacterial Meningitis"],
        cap: ["Community-Acquired Pneumonia"], ent: ["Acute Otitis Media", "Acute Bacterial Sinusitis"], pneumonia: ["Community-Acquired Pneumonia", "Nosocomial / Ventilator Pneumonia"],
        hap_vap: ["Nosocomial / Ventilator Pneumonia"], respiratory: ["Community-Acquired Pneumonia"],
        cystitis: ["Complicated / Uncomplicated UTI"],
        uti: ["Complicated / Uncomplicated UTI"],
        pyelo_sepsis: ["Acute Pyelonephritis", "Complicated / Uncomplicated UTI", "Bacteremia / Septicemia"],
        uti_abd: ["Complicated / Uncomplicated UTI", "Intra-Abdominal Infection / Peritonitis"],
        intra_abd: ["Intra-Abdominal Infection / Peritonitis", "Acute Cholecystitis / Cholangitis"],
        liver_abscess: ["Pyogenic Liver Abscess"],
        early: ["Cellulitis & Skin Structure"], neuro_cardio: ["Bacterial Meningitis", "Infective Endocarditis"],
        prophylaxis: []
      };
      const targetInfections = infectionLinks[activeDiseaseFilterId] || [];
      const curatedNames = activePathogenProfile.curatedDrugs || [];
      const curatedCatalog = antimicrobialDrugCatalog.filter(drug =>
        curatedNames.some(name => [drug.name, ...(drug.aliases || [])].some(alias => {
          const a = normalizeClinicalKeyword(alias), b = normalizeClinicalKeyword(name);
          return a === b;
        }))
      );
      const catalogMatches = curatedCatalog.filter(drug =>
        (drug.mainInfections || []).some(infection => targetInfections.some(target => {
          const a = normalizeClinicalKeyword(infection), b = normalizeClinicalKeyword(target);
          return a === b;
        }))
      ).map(drug => drug.name);
      if (catalogMatches.length) return [...new Set(catalogMatches)];

      // Never broaden a disease-specific filter to every drug for the organism.
      // An unmapped disease returns no curated agents rather than leaking unrelated therapy.
      return [];
    }

    function levenshteinDistance(a, b) {
      const s1 = a.toLowerCase();
      const s2 = b.toLowerCase();
      const dp = Array.from({ length: s1.length + 1 }, () => Array(s2.length + 1).fill(0));
      for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
      for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
      for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
          const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      return dp[s1.length][s2.length];
    }

    // =========================================================================
    // 5. INTENT RESOLVER & DYNAMIC HEADER ICON UPDATER
    // =========================================================================
    function resolveUniversalSearchIntent(rawInput) {
      const clean = rawInput.trim();
      const lower = clean.toLowerCase();

      for (const grp of antimicrobialDrugGroups) {
        if (grp.groupName.toLowerCase() === lower || grp.aliases.includes(lower)) {
          return { intentType: "DRUG_GROUP", matchedTerm: grp.groupName, drugGroupEntry: grp, drugCatalogEntry: null, pathogenProfile: null, syndromeEntry: null, alternatives: [] };
        }
      }

      for (const d of antimicrobialDrugCatalog) {
        if (d.name.toLowerCase() === lower || d.aliases.includes(lower)) {
          return { intentType: "DRUG", matchedTerm: d.name, drugGroupEntry: null, drugCatalogEntry: d, pathogenProfile: null, syndromeEntry: null, alternatives: [] };
        }
      }

      for (const p of pathogenKnowledgeGraph) {
        if (p.canonical.toLowerCase() === lower || p.aliases.includes(lower)) {
          return { intentType: "PATHOGEN", matchedTerm: p.canonical, drugGroupEntry: null, drugCatalogEntry: null, pathogenProfile: p, syndromeEntry: null, alternatives: [] };
        }
      }

      for (const s of canonicalSyndromeTerms) {
        const queryTerms = resolverExpandKeywords([clean]);
        const exactTerms = [s.label, s.fdaQuery, s.nihTerm, ...(SYNDROME_CLINICAL_MAP[s.label]?.contextKeywords || [])];
        if (exactTerms.some(term => resolverExpandKeywords([term]).some(key => queryTerms.includes(key)))) {
          return { intentType: "SYNDROME", matchedTerm: s.label, drugGroupEntry: null, drugCatalogEntry: null, pathogenProfile: null, syndromeEntry: s, alternatives: [] };
        }
      }

      const candidates = [];

      for (const grp of antimicrobialDrugGroups) {
        let bestSim = 1 - levenshteinDistance(lower, grp.groupName.toLowerCase()) / Math.max(lower.length, grp.groupName.length);
        for (const al of grp.aliases) {
          const simAl = 1 - levenshteinDistance(lower, al) / Math.max(lower.length, al.length);
          if (simAl > bestSim) bestSim = simAl;
        }
        candidates.push({ intentType: "DRUG_GROUP", term: grp.groupName, score: bestSim, drugGroupEntry: grp, drugCatalogEntry: null, pathogenProfile: null, syndromeEntry: null });
      }

      for (const d of antimicrobialDrugCatalog) {
        let bestSim = 1 - levenshteinDistance(lower, d.name.toLowerCase()) / Math.max(lower.length, d.name.length);
        for (const al of d.aliases) {
          const simAl = 1 - levenshteinDistance(lower, al) / Math.max(lower.length, al.length);
          if (simAl > bestSim) bestSim = simAl;
        }
        if (d.name.toLowerCase().startsWith(lower) && lower.length >= 4) bestSim = Math.max(bestSim, 0.85);
        candidates.push({ intentType: "DRUG", term: d.name, score: bestSim, drugGroupEntry: null, drugCatalogEntry: d, pathogenProfile: null, syndromeEntry: null });
      }

      for (const p of pathogenKnowledgeGraph) {
        let bestSim = 1 - levenshteinDistance(lower, p.canonical.toLowerCase()) / Math.max(lower.length, p.canonical.length);
        for (const al of p.aliases) {
          const simAl = 1 - levenshteinDistance(lower, al) / Math.max(lower.length, al.length);
          if (simAl > bestSim) bestSim = simAl;
        }
        if (p.canonical.toLowerCase().includes(lower) && lower.length >= 4) bestSim = Math.max(bestSim, 0.84);
        candidates.push({ intentType: "PATHOGEN", term: p.canonical, score: bestSim, drugGroupEntry: null, drugCatalogEntry: null, pathogenProfile: p, syndromeEntry: null });
      }

      for (const s of canonicalSyndromeTerms) {
        const simLabel = 1 - levenshteinDistance(lower, s.label.toLowerCase()) / Math.max(lower.length, s.label.length);
        const simQuery = 1 - levenshteinDistance(lower, s.fdaQuery.toLowerCase()) / Math.max(lower.length, s.fdaQuery.length);
        let bestSim = Math.max(simLabel, simQuery);
        if (s.label.toLowerCase().includes(lower) && lower.length >= 4) bestSim = Math.max(bestSim, 0.82);
        candidates.push({ intentType: "SYNDROME", term: s.label, score: bestSim, drugGroupEntry: null, drugCatalogEntry: null, pathogenProfile: null, syndromeEntry: s });
      }

      candidates.sort((a, b) => b.score - a.score);
      const uniqueCandidates = [];
      const seen = new Set();
      for (const c of candidates) {
        if (!seen.has(c.term)) {
          seen.add(c.term);
          uniqueCandidates.push(c);
        }
      }

      const best = uniqueCandidates[0];
      const alternatives = uniqueCandidates.slice(1, 4).filter(x => x.score >= 0.44).map(x => x.term);

      if (best && best.score >= 0.60) {
        return {
          intentType: best.intentType,
          matchedTerm: best.term,
          drugGroupEntry: best.drugGroupEntry,
          drugCatalogEntry: best.drugCatalogEntry,
          pathogenProfile: best.pathogenProfile,
          syndromeEntry: best.syndromeEntry,
          alternatives
        };
      }

      const isTaxonomicPathogen = /\b(staphylococcus|streptococcus|pasteurella|pseudomonas|escherichia|klebsiella|acinetobacter|enterococcus|listeria|neisseria|haemophilus|borrelia|bartonella|bacillus|clostridioides|clostridium|mycobacterium|candida|aspergillus|mycoplasma|chlamydia|legionella|treponema|campylobacter|salmonella|shigella|helicobacter|brucella|francisella|nocardia|actinomyces|rickettsia|vibrio|yersinia|proteus|serratia|morganella|providencia|citrobacter|enterobacter|stenotrophomonas|burkholderia|bacteroides|fusobacterium|prevotella|cryptococcus|pneumocystis)\b/i.test(clean);

      return {
        intentType: isTaxonomicPathogen ? "CUSTOM_PATHOGEN" : "CUSTOM_SYNDROME",
        matchedTerm: clean,
        drugGroupEntry: null,
        drugCatalogEntry: null,
        pathogenProfile: null,
        syndromeEntry: null,
        alternatives: uniqueCandidates.slice(0, 3).map(x => x.term)
      };
    }

    // Updates Scope Badges AND switches the Header Logo Icon between Bacteria + Thumbs-Up (Pathogen/Syndrome) and Medical Cross + Thumbs-Up (Drug)
    function updateThreeLevelHeaderBadges(activeLevel) {
      const bPath = document.getElementById("levelBadgePathogen");
      const bSynd = document.getElementById("levelBadgeSyndrome");
      const bDrug = document.getElementById("levelBadgeDrug");
      const baseIcon = document.getElementById("headerBaseIcon");
      const logoBox = document.getElementById("headerLogoBox");

      const inactiveStyle = "px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-400";
      bPath.className = inactiveStyle;
      bSynd.className = inactiveStyle;
      bDrug.className = inactiveStyle;

      if (activeLevel === "PATHOGEN") {
        bPath.className = "px-2.5 py-0.5 rounded-full border border-indigo-600 bg-indigo-600 text-white shadow-sm";
        baseIcon.className = "fa-solid fa-bacterium text-[20px] text-blue-100 -translate-x-1 -translate-y-1 transition-all";
        logoBox.title = "Pathogen Mode: Thumbs-Up over Bacteria";
      } else if (activeLevel === "SYNDROME") {
        bSynd.className = "px-2.5 py-0.5 rounded-full border border-blue-600 bg-blue-600 text-white shadow-sm";
        baseIcon.className = "fa-solid fa-bacterium text-[20px] text-blue-100 -translate-x-1 -translate-y-1 transition-all";
        logoBox.title = "Syndrome Mode: Thumbs-Up over Bacteria";
      } else if (activeLevel === "DRUG") {
        bDrug.className = "px-2.5 py-0.5 rounded-full border border-emerald-600 bg-emerald-600 text-white shadow-sm";
        // Replace generic bacteria icon with simple medical cross icon (still partially covered by thumbs-up)
        baseIcon.className = "fa-solid fa-plus text-[22px] font-black text-blue-100 -translate-x-1 -translate-y-1 transition-all";
        logoBox.title = "Drug Mode: Thumbs-Up over Medical Cross";
      } else {
        baseIcon.className = "fa-solid fa-bacterium text-[20px] text-blue-100 -translate-x-1 -translate-y-1 transition-all";
      }
    }

    // =========================================================================
    // 6. CURATED RENAL PHARMACOKINETICS & CONTRAINDICATION MATRIX (eGFR < 30)
    // =========================================================================
    let renalPharmacokineticsMatrix = AMUApp.reference("legacyRenalProfiles");
    function isCombinationProductName(name) {
      return /[,/]|\b(?:and|plus|with)\b|\b(?:avibactam|vaborbactam|tazobactam|sulbactam|clavulanate|cilastatin|relebactam)\b/i.test(String(name || ""));
    }

    function lookupRenalProfile(genericName, rawPopText, rawDoseText, formulationText = "") {
      const upper = genericName.toUpperCase();
      const formulation = `${genericName} ${formulationText} ${rawDoseText}`.toLowerCase();
      // Benzathine/procaine Penicillin G products are depot IM formulations. Do not
      // apply the generic high-dose aqueous IV Penicillin G renal schedule to them.
      if (/penicillin\s*v\b|phenoxymethylpenicillin/i.test(`${genericName} ${formulationText}`)) {
        return {
          adjustedDose: "No product-specific renal adjustment was extracted for oral Penicillin V. Review this oral product's own label; no aqueous IV Penicillin G schedule is applied.",
          contraLevel: "NO FORMULATION-SPECIFIC MATRIX RULE",
          contraNote: "Oral Penicillin V and aqueous or depot Penicillin G are distinct products. Their dose schedules are not interchangeable.",
          source: "formulation_guard"
        };
      }
      if (/benzathine|bicillin\s*l.?a|penicillin\s*g\s*benzathine/i.test(formulation) && /intramuscular|\bim\b/i.test(formulation)) {
        return {
          adjustedDose: "No separate renal dose adjustment has been extracted for this depot IM formulation. Do not apply the generic high-dose IV Penicillin G matrix to benzathine Penicillin G.",
          contraLevel: "NO FORMULATION-SPECIFIC MATRIX RULE",
          contraNote: "Review this product's own warnings and the patient's renal status. The aqueous IV Penicillin G dose-reduction rule is not interchangeable with the single-dose benzathine IM regimen.",
          source: "formulation_specific_review"
        };
      }
      // Combination products cannot inherit a monotherapy's legacy renal schedule.
      const compositeIdentity = isCombinationProductName(genericName);
      if (!compositeIdentity) for (const [key, profile] of Object.entries(renalPharmacokineticsMatrix)) {
        if (upper.includes(key)) return { ...profile, source: "legacy_matrix" };
      }
      const combined = `${rawPopText} ${rawDoseText}`;
      const match = combined.match(/[^.?!]*\b(?:creatinine clearance|crcl|egfr|renal impairment|hemodialysis)\b[^.?!]*[.?!]?/i);
      const isNoAdjust = /no\s+(?:dosage|dose)\s+adjustment\s+is\s+(?:recommended|necessary|required)\s+(?:for|in)\s+patients\s+with\s+renal/i.test(combined);
      if (isNoAdjust) {
        return {
          adjustedDose: "Standard dosage maintained (FDA label indicates no primary renal dose reduction required)",
          contraLevel: "RENAL SAFE (NO ADJUSTMENT)",
          contraNote: match ? match[0].trim() : "Cleared predominantly via non-renal pathways."
        };
      }
      return {
        adjustedDose: match ? match[0].trim() : "No product-specific renal dose instruction was extracted. Review this product's own FDA label; no reduction or interval is inferred.",
        contraLevel: match ? "LABEL RENAL INSTRUCTIONS — REVIEW" : "SOURCE UNAVAILABLE",
        contraNote: "Renal dosing must follow this product's own formulation, components and label thresholds; a generic reduction is not assumed.",
        source: "label_review"
      };
    }

    // =========================================================================
    // 7. SELF-REGULATING BULLET DISTILLER & SALT NORMALIZER
    // =========================================================================
    function evaluateComplexityAndSelfRegulate(rawText, sectionTitle, drugName) {
      if (!rawText || rawText.length < 180) return null;
      const lower = rawText.toLowerCase();
      const isDoseSection = String(sectionTitle || "").startsWith("1.");
      const triggers = [];
      if (/\btable\s+\d+/i.test(rawText)) triggers.push("Embedded Multi-Variable Dosing/Clearance Table");
      const conditionalCount = (lower.match(/\b(if|unless|whereas|except|provided that|conversely)\b/g) || []).length;
      if (conditionalCount >= (isDoseSection ? 6 : 4)) triggers.push("Multi-Branch Conditional Clinical Logic");
      if (isDoseSection) {
        // Age/weight branches should already have been filtered against the active
        // profile before this function runs. Flag only if mutually exclusive dose
        // populations still remain mixed in the surviving text.
        const survivingDoseSentences = splitLabelSentences(rawText).filter(sentence => sentenceHasDoseDirective(sentence));
        const hasAdultDose = survivingDoseSentences.some(sentence => /\b(adult|adults)\b/i.test(sentence));
        const hasPediatricDose = survivingDoseSentences.some(sentence => /\b(pediatric|paediatric|children|child|infant|neonate)\b/i.test(sentence));
        if (hasAdultDose && hasPediatricDose) triggers.push("Unresolved Age-Stratified Dose Branches");
        if (survivingDoseSentences.length > 8) triggers.push("Many Remaining Regimen Branches");
      } else {
        if (/\b(pediatric|neonat|birth to|weighing less than|mg\/kg\/day)\b/i.test(rawText) && /\b(adult|adolescent)\b/i.test(rawText)) {
          triggers.push("Age/Weight Stratified Sub-Populations");
        }
        if (/\b(contraindicated|fatal|life-threatening|black box|boxed warning|irreversible)\b/i.test(rawText)) {
          triggers.push("High-Severity Regulatory Caveats");
        }
      }
      const parsedDoseCount = isDoseSection ? splitLabelSentences(rawText).filter(sentence => sentenceHasDoseDirective(sentence)).length : 0;
      if (isDoseSection && rawText.length > 5000 && parsedDoseCount === 0) triggers.push("Extended Unstructured Dosing Section");
      if (triggers.length === 0 && (isDoseSection ? rawText.length < 5000 || parsedDoseCount > 0 : rawText.length < 1100)) return null;
      const reasonSummary = triggers.length > 0
        ? triggers.slice(0, 2).join(" + ")
        : "Extended Unstructured Monograph Section (" + rawText.length + " chars)";
      return {
        isComplexFlag: true,
        sectionTitle,
        drugName,
        reasonSummary,
        previewExcerpt: rawText.slice(0, 480) + (rawText.length > 480 ? "..." : ""),
        fullRawText: rawText
      };
    }

    function isNonAntimicrobialNoise(ingredientName) {
      const lower = ingredientName.toLowerCase();
      const noiseTerms = [
        "albumin", "sodium chloride", "dextrose", "water", "ringer", "mannitol",
        "heparin", "lidocaine", "epinephrine", "hydrocortisone", "prednisone",
        "dexamethasone", "insulin", "potassium chloride", "calcium gluconate",
        "immunoglobulin", "vaccine", "toxoid", "plasma", "gelatin", "hetastarch"
      ];
      return noiseTerms.some(term => lower.includes(term));
    }

    function normalizeBaseDrugName(rawIngredient) {
      return rawIngredient
        .replace(/,\s*/g, " and ")
        .replace(/\b(anhydrous|benzathine|procaine|sodium|disodium|potassium|sulfate|tosylate|hydrochloride|hcl|hemihydrate|besylate|mesylate|tartrate|citrate|phosphate|diphosphate|acetate|succinate|fumarate|maleate|gluconate|lactobionate|lactate|palmitate|ethylsuccinate|stearate|estolate|hippurate|methenamine|axetil|pivoxil|cilexetil|proxetil|colloidal dispersion|liposomal|lipid complex|cholesteryl sulfate|usp|monohydrate|dihydrate|trihydrate|calcium|magnesium|micronized|injection|oral|topical)\b/gi, "")
        .replace(/\s+/g, " ")
        .replace(/^\s*and\s+|\s+and\s*$/gi, "")
        .trim();
    }

    function extractComprehensiveFdaSections(item, genericKey) {
      const cleanJoin = (arr) => (arr || []).map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean).join(" ");

      const rawIndications = cleanJoin(item.indications_and_usage) || "Indicated for susceptible microbial infections.";
      const rawMicro = cleanJoin(item.microbiology);
      const rawDosing = cleanJoin(item.dosage_and_administration) || "";
      const rawDosingSources = (item.dosage_and_administration || []).map((raw, sourceIndex) => ({
        sourceField: "dosage_and_administration", sourceIndex, raw: String(raw || ""), text: cleanJoin([raw])
      })).filter(x => x.text);
      const rawBoxed = cleanJoin(item.boxed_warning);

      // openFDA stores label tables in separate *_table fields; retain their source identity.
      const rawDosingTables = (item.dosage_and_administration_table || []).map((html, sourceIndex) => {
        const parsed = amuParseHtmlTable(html);
        const captionHtml = (String(html || "").match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i) || [])[1] || "";
        const caption = amuHtmlCellText(captionHtml);
        if (!parsed) return null;
        const linkedNotes = amuBindSourceFootnotes({ ...parsed, rawHtml: String(html || "") }, rawDosing);
        return { ...parsed, notes: [...new Set([...(parsed.notes || []), ...linkedNotes])], caption, sourceField: "dosage_and_administration_table", sourceIndex, rawHtml: String(html || "") };
      }).filter(Boolean);
      const rawDosingTableText = rawDosingTables.map((t, i) => amuTableToPlainText(t, i + 1)).join("\n");
      const fdaDoseFieldKeys = Object.keys(item).filter(k => /dosage|dosing/i.test(k));

      const ddiParts = [
        cleanJoin(item.drug_interactions),
        cleanJoin(item.warnings_and_cautions),
        cleanJoin(item.warnings),
        cleanJoin(item.precautions),
        cleanJoin(item.contraindications)
      ].filter(Boolean);
      const rawInteractions = ddiParts.join(" — ") || "";

      const popParts = [
        cleanJoin(item.use_in_specific_populations),
        cleanJoin(item.pregnancy),
        cleanJoin(item.nursing_mothers),
        cleanJoin(item.pediatric_use),
        cleanJoin(item.geriatric_use)
      ].filter(Boolean);

      if (popParts.length === 0) {
        const legacySource = `${cleanJoin(item.precautions)} ${cleanJoin(item.clinical_pharmacology)} ${rawDosing}`;
        const sentences = legacySource.split(/(?<=[.?!])\s+/);
        const matchedSentences = sentences.filter(s => /\b(renal|creatinine|hemodialysis|hepatic|cirrhosis|pregnancy|pregnant|pediatric|geriatric|elderly|breastfeeding|lactation)\b/i.test(normalizeLabelStructureText(s)));
        if (matchedSentences.length > 0) {
          popParts.push(matchedSentences.join(" "));
        }
      }

      const rawRenalPop = popParts.join(" — ") || "";
      const openFdaMeta = item.openfda || {};
      const firstMeta = value => Array.isArray(value) ? (value[0] || "") : (value || "");
      const labelProvenance = {
        source: "openFDA",
        status: "retrieved",
        sourceUrl: item.id ? `https://api.fda.gov/drug/label.json?search=id:${encodeURIComponent(item.id)}` : (item.set_id ? `https://api.fda.gov/drug/label.json?search=set_id:${encodeURIComponent(item.set_id)}` : ""),
        labelId: item.id || "",
        setId: item.set_id || "",
        effectiveTime: item.effective_time || "",
        version: item.version || "",
        brandName: firstMeta(openFdaMeta.brand_name),
        genericName: firstMeta(openFdaMeta.generic_name) || genericKey || "",
        dosageForm: firstMeta(openFdaMeta.dosage_form),
        route: Array.isArray(openFdaMeta.route) ? openFdaMeta.route.join(", ") : firstMeta(openFdaMeta.route),
        productNdc: firstMeta(openFdaMeta.product_ndc),
        manufacturer: firstMeta(openFdaMeta.manufacturer_name),
        dosingFields: fdaDoseFieldKeys.slice()
      };
      return { rawIndications, rawMicro, rawDosing, rawDosingSources, rawDosingTables, rawDosingTableText, fdaDoseFieldKeys, rawInteractions, rawRenalPop, rawBoxed, labelProvenance };
    }

    function hasMeaningfulExtraText(rawText, bulletsArray) {
      if (!rawText || rawText.trim().length < 60) return false;
      const combinedBullets = bulletsArray.map(b => b.text.toLowerCase().trim()).join(" ");
      const normRaw = rawText.toLowerCase().trim();
      if (combinedBullets.includes(normRaw)) return false;
      if (normRaw.length <= combinedBullets.length + 35) return false;
      return true;
    }

    // =========================================================================
    // 8. CLINICAL DIRECTORY (NO "LEVEL X" LABELS, HIGH-FREQUENCY PATHOGENS ONLY)
    // =========================================================================
    let directoryTaxonomy = AMUApp.reference("directory");
    let activeSystem = "Pathogens";
    let currentSearchLevel = "NONE"; // "PATHOGEN" | "SYNDROME" | "DRUG"
    let currentFetchedDrugs = [];
    let currentQueryLabel = "";
    let activePathogenProfile = null;
    let activeDiseaseFilterId = "all";
    let currentNihPillNames = [];
    let currentNihIngredientNames = [];
    let selectedPinnedDrugName = null; // Enforces single-drug selection in the NIH Active Ingredients bar
    const monographStore = {};

    function init() {
      renderSystemTabs();
      renderSyndromeList();
      renderWelcomeHomeState();
    }

    function renderWelcomeHomeState() {
      currentFetchedDrugs = [];
      activePathogenProfile = null;
      selectedPinnedDrugName = null;
      currentSearchLevel = "NONE";
      updateThreeLevelHeaderBadges("NONE");

      document.getElementById("queryModeTag").textContent = "Ready to Search";
      document.getElementById("nihDiseaseBadge").textContent = "Select a Pathogen, Syndrome, or Drug / Group";
      document.getElementById("activeDiseaseHeader").textContent = "Welcome to Antimicrobials Untangled";
      document.getElementById("drugCountBadge").textContent = "Awaiting Query";
      document.getElementById("typoCorrectionBanner").classList.add("hidden");
      document.getElementById("drugMainInfectionsBox").classList.add("hidden");
      document.getElementById("pathogenDiseaseFilterBox").classList.add("hidden");
      document.getElementById("nihIngredientsBox").classList.add("hidden");
      document.getElementById("excludedContainerWrapper").classList.add("hidden");

      document.getElementById("liveResultsContainer").innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div class="space-y-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              Academic monograph sandbox
            </span>
            <h3 class="text-lg font-extrabold text-slate-900 pt-1">Explore by Pathogen, Syndrome, or Drug / Group</h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              Use the top search bar or choose an index entry below to inspect FDA monograph text, NIH ingredient associations, and educational pathogen–syndrome indexes. Branch filters select label sentences. They do not calculate a dose, and a missing flag is not a safety finding.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2.5">
              <div class="font-bold text-indigo-950 flex items-center gap-2">
                <i class="fa-solid fa-bacterium text-indigo-600"></i>
                <span>Pathogen-Specific</span>
              </div>
              <p class="text-[11px] text-slate-600">Shows active antimicrobials AND a clickable bar of <strong>clinical infections caused by that pathogen</strong>:</p>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <button onclick="executeUntangleSearch('Staphylococcus aureus', false)" class="px-2.5 py-1 rounded bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-300 font-semibold text-[11px] transition-colors">S. aureus</button>
                <button onclick="executeUntangleSearch('Escherichia coli', false)" class="px-2.5 py-1 rounded bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-300 font-semibold text-[11px] transition-colors">E. coli</button>
                <button onclick="executeUntangleSearch('Pseudomonas aeruginosa', false)" class="px-2.5 py-1 rounded bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-300 font-semibold text-[11px] transition-colors">P. aeruginosa</button>
                <button onclick="executeUntangleSearch('Klebsiella pneumoniae', false)" class="px-2.5 py-1 rounded bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-300 font-semibold text-[11px] transition-colors">K. pneumoniae</button>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5">
              <div class="font-bold text-blue-950 flex items-center gap-2">
                <i class="fa-solid fa-stethoscope text-blue-600"></i>
                <span>Syndrome / Disease</span>
              </div>
              <p class="text-[11px] text-slate-600">Focused strictly on therapeutic regimens for that specific clinical syndrome:</p>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <button onclick="executeUntangleSearch('Community-Acquired Pneumonia', false)" class="px-2.5 py-1 rounded bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-300 font-semibold text-[11px] transition-colors">Community Pneumonia</button>
                <button onclick="executeUntangleSearch('Bacterial Meningitis', false)" class="px-2.5 py-1 rounded bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-300 font-semibold text-[11px] transition-colors">Meningitis</button>
                <button onclick="executeUntangleSearch('Acute Pyelonephritis', false)" class="px-2.5 py-1 rounded bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-300 font-semibold text-[11px] transition-colors">Pyelonephritis</button>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
              <div class="font-bold text-emerald-950 flex items-center gap-2">
                <i class="fa-solid fa-capsules text-emerald-600"></i>
                <span>Drug / Drug Group</span>
              </div>
              <p class="text-[11px] text-slate-600">Inspect specific drugs or classes + clickable list of main infections they treat:</p>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <button onclick="executeUntangleSearch('Fluoroquinolones', false)" class="px-2.5 py-1 rounded bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 font-semibold text-[11px] transition-colors">Fluoroquinolones</button>
                <button onclick="executeUntangleSearch('Carbapenems', false)" class="px-2.5 py-1 rounded bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 font-semibold text-[11px] transition-colors">Carbapenems</button>
                <button onclick="executeUntangleSearch('Meropenem', false)" class="px-2.5 py-1 rounded bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 font-semibold text-[11px] transition-colors">Meropenem</button>
                <button onclick="executeUntangleSearch('Linezolid', false)" class="px-2.5 py-1 rounded bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 font-semibold text-[11px] transition-colors">Linezolid</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function switchPage(page) {
      const pageCds = document.getElementById("pageCds");
      const pageRes = document.getElementById("pageResistances");
      const btnCds = document.getElementById("navBtnCds");
      const btnRes = document.getElementById("navBtnResistances");
      const searchBar = document.getElementById("cdsSearchBar");

      if (page === "cds") {
        pageCds.classList.remove("hidden");
        pageRes.classList.add("hidden");
        searchBar.classList.remove("hidden");
        btnCds.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 bg-blue-600 text-white shadow";
        btnRes.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 text-slate-300 hover:text-white";
      } else {
        pageCds.classList.add("hidden");
        pageRes.classList.remove("hidden");
        searchBar.classList.add("hidden");
        btnRes.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 bg-blue-600 text-white shadow";
        btnCds.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 text-slate-300 hover:text-white";
        runDailyResistancePoll(false);
      }
    }

    function renderSystemTabs() {
      const systems = Object.keys(directoryTaxonomy);
      document.getElementById("systemTabs").innerHTML = systems.map(sys => `
        <button onclick="selectSystem('${sys}')" class="px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${sys === activeSystem ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          ${sys}
        </button>
      `).join("");
    }

    function selectSystem(sys) {
      activeSystem = sys;
      renderSystemTabs();
      renderSyndromeList();
    }

    function renderSyndromeList() {
      const list = directoryTaxonomy[activeSystem] || [];
      document.getElementById("syndromeList").innerHTML = list.map(item => `
        <button onclick="executeUntangleSearch('${item.query.replace(/'/g, "\\'")}', false)" class="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 transition-colors flex items-center justify-between group">
          <span>${item.label}</span>
          <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-blue-500"></i>
        </button>
      `).join("");
    }

    function executeDiseaseQuery() {
      const inputEl = document.getElementById("diseaseSearchInput");
      const raw = inputEl.value.trim();
      if (!raw) return;
      if (!isQuerySafeFromPii(raw)) return;
      executeUntangleSearch(raw, true);
    }

    // =========================================================================
    // 9. MASTER SEARCH PIPELINE
    // =========================================================================
    async function executeUntangleSearch(rawQueryString, showBanner) {
      if (showEuOnlyNotice(rawQueryString)) return;
      const intent = resolveUniversalSearchIntent(rawQueryString);
      const typoBanner = document.getElementById("typoCorrectionBanner");
      const typoText = document.getElementById("typoCorrectionText");
      const typoPills = document.getElementById("typoAlternativePills");
      selectedPinnedDrugName = null;

      if (showBanner || intent.alternatives.length > 0) {
        typoBanner.classList.remove("hidden");
        typoText.innerHTML = `
          <i class="fa-solid fa-circle-check text-emerald-600"></i>
          <span>Showing results for <strong class="text-slate-900 underline">"${esc(intent.matchedTerm)}"</strong></span>
        `;
        if (intent.alternatives.length > 0) {
          typoPills.innerHTML = `<span class="text-[11px] text-slate-500 mr-1">Alternative interpretations:</span>` + intent.alternatives.map(alt => `
            <button onclick="executeUntangleSearch('${jsArg(alt)}', true)" class="text-[11px] bg-white hover:bg-amber-100 text-amber-900 font-semibold px-2.5 py-0.5 rounded border border-amber-300 transition-colors">
              ${esc(alt)}
            </button>
          `).join("");
        } else {
          typoPills.innerHTML = "";
        }
      } else {
        typoBanner.classList.add("hidden");
      }

      // Reset syndrome-only filtering whenever a new search begins.
      activeSyndromePathogenId = "all";
      document.getElementById("syndromePathogenFilterBox")?.classList.add("hidden");

      // DRUG OR DRUG GROUP SEARCH
      if (intent.intentType === "DRUG" || intent.intentType === "DRUG_GROUP") {
        currentSearchLevel = "DRUG";
        updateThreeLevelHeaderBadges("DRUG");
        const requested = String(rawQueryString || "").trim();
        const entry = intent.drugCatalogEntry;
        intent.requestedDrugName = entry && ([entry.name, ...(entry.aliases || [])].some(name =>
          normalizeClinicalKeyword(name) === normalizeClinicalKeyword(requested))
          || canonicalizeClinicalIngredient(requested) === canonicalizeClinicalIngredient(entry.name)) ? requested : intent.matchedTerm;
        await runDrugOrGroupPipeline(intent);
        return;
      }

      // PATHOGEN-SPECIFIC SEARCH
      if (intent.intentType === "PATHOGEN" || intent.intentType === "CUSTOM_PATHOGEN") {
        currentSearchLevel = "PATHOGEN";
        updateThreeLevelHeaderBadges("PATHOGEN");
        activePathogenProfile = intent.pathogenProfile;
        activeDiseaseFilterId = "all";

        const fdaTerm = intent.pathogenProfile ? intent.pathogenProfile.fdaSearch : intent.matchedTerm;
        const nihTerm = intent.pathogenProfile ? intent.pathogenProfile.nihTerm : intent.matchedTerm;

        document.getElementById("queryModeTag").textContent = "Pathogen-Specific Search";
        document.getElementById("queryModeTag").className = "text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200";
        document.getElementById("drugMainInfectionsBox").classList.add("hidden");
        await runLiveDiseasePipeline(intent.matchedTerm, fdaTerm, nihTerm, "PATHOGEN");
        return;
      }

      // SYNDROME / DISEASE SEARCH
      currentSearchLevel = "SYNDROME";
      updateThreeLevelHeaderBadges("SYNDROME");
      activePathogenProfile = null;
      activeDiseaseFilterId = "all";
      activeSyndromePathogenId = "all";

      const fdaTerm = intent.syndromeEntry ? intent.syndromeEntry.fdaQuery : intent.matchedTerm;
      const nihTerm = intent.syndromeEntry ? intent.syndromeEntry.nihTerm : intent.matchedTerm;

      document.getElementById("queryModeTag").textContent = "Syndrome / Disease Search";
      document.getElementById("queryModeTag").className = "text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200";
      document.getElementById("drugMainInfectionsBox").classList.add("hidden");
      document.getElementById("pathogenDiseaseFilterBox").classList.add("hidden");
      await runLiveDiseasePipeline(intent.matchedTerm, fdaTerm, nihTerm, "SYNDROME");
    }

    async function runDrugOrGroupPipeline(intent) {
      const { generation, signal } = beginLiveSearch();
      const isGroup = intent.intentType === "DRUG_GROUP";
      const displayName = intent.matchedTerm;
      currentQueryLabel = displayName;
      activePathogenProfile = null;
      activeDiseaseFilterId = "all";

      document.getElementById("queryModeTag").textContent = isGroup ? "Drug-Group Search" : "Drug-Specific Search";
      document.getElementById("queryModeTag").className = "text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200";
      document.getElementById("activeDiseaseHeader").textContent = `${displayName.toUpperCase()} — ${isGroup ? 'Class Members & Main Infections' : 'Drug Profile & Main Infections'}`;
      document.getElementById("nihDiseaseBadge").textContent = "Querying NIH RxClass & U.S. FDA SPL...";
      document.getElementById("loadingIndicator").classList.remove("hidden");
      document.getElementById("liveResultsContainer").innerHTML = "";
      document.getElementById("excludedContainerWrapper").classList.add("hidden");
      document.getElementById("nihIngredientsBox").classList.add("hidden");
      document.getElementById("pathogenDiseaseFilterBox").classList.add("hidden");
      document.getElementById("syndromePathogenFilterBox")?.classList.add("hidden");
      document.getElementById("drugMainInfectionsBox").classList.add("hidden");

      const targetDrugNames = isGroup ? intent.drugGroupEntry.members : [displayName];
      let mainInfectionsList = isGroup 
        ? [...intent.drugGroupEntry.mainInfections] 
        : (intent.drugCatalogEntry ? [...intent.drugCatalogEntry.mainInfections] : []);

      currentFetchedDrugs = [];

      try {
        const cards = await amuMapPool(targetDrugNames, 4, async (dName) => {
          const requestedName = !isGroup ? (intent.requestedDrugName || dName) : dName;
          const ingredientName = amuDrugLookupRequest(requestedName).ingredientName;
          const selected = await amuFetchRequestedDrug(requestedName, () => true, [], signal);
          const card = selected || buildGuaranteedFallbackCard(requestedName, normalizeBaseDrugName(ingredientName));
          card.forceShowEvenIfAllergic = true;
          return card;
        });
        if (generation !== liveSearchGeneration) return;
        currentFetchedDrugs = cards.filter(Boolean);

        if (!isGroup) {
          try {
            const encodedSingle = encodeURIComponent(normalizeBaseDrugName(displayName).toLowerCase());
            const res = await amuFetchResponse(`https://rxnav.nlm.nih.gov/REST/rxclass/class/byDrugName.json?drugName=${encodedSingle}&relaSource=MEDRT&rela=may_treat`, signal, 8000);
            if (res.ok) {
              const data = await res.json();
              const infos = data?.rxclassDrugInfoList?.rxclassDrugInfo || [];
              mainInfectionsList.push(...infos.map(i => i.rxclassMinConceptItem?.className).filter(Boolean));
            }
          } catch (e) {}
        }
        if (generation !== liveSearchGeneration) return;

        const uniqueInfections = [...new Set(mainInfectionsList)].slice(0, 14);
        document.getElementById("nihDiseaseBadge").textContent = `Drug Profile (${currentFetchedDrugs.length} Agent${currentFetchedDrugs.length === 1 ? '' : 's'} • ${uniqueInfections.length} Main Infections)`;

        const infBox = document.getElementById("drugMainInfectionsBox");
        const infPills = document.getElementById("drugMainInfectionsPills");
        if (uniqueInfections.length > 0) {
          infBox.classList.remove("hidden");
          infPills.innerHTML = uniqueInfections.map(inf => `
            <button 
              onclick="executeUntangleSearch('${jsArg(inf)}', true)" 
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-600 text-emerald-900 hover:text-white border border-emerald-300 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <i class="fa-solid fa-stethoscope text-[10px]"></i>
              <span>${esc(inf)}</span>
              <i class="fa-solid fa-arrow-right text-[9px] opacity-70"></i>
            </button>
          `).join("");
        }
      } catch (error) { /* Render the cards retrieved before this lookup failed. */ } finally {
        if (generation === liveSearchGeneration) document.getElementById("loadingIndicator").classList.add("hidden");
      }
      if (generation !== liveSearchGeneration) return;
      reFilterCurrentResults();
    }

    async function runLiveDiseasePipeline(displayTitle, fdaQueryTerm, nihDiseaseTerm, searchLevel) {
      const { generation, signal } = beginLiveSearch();
      currentQueryLabel = fdaQueryTerm;
      document.getElementById("activeDiseaseHeader").textContent = displayTitle;
      document.getElementById("loadingIndicator").classList.remove("hidden");
      document.getElementById("liveResultsContainer").innerHTML = "";
      document.getElementById("excludedContainerWrapper").classList.add("hidden");
      document.getElementById("nihIngredientsBox").classList.add("hidden");
      document.getElementById("pathogenDiseaseFilterBox").classList.add("hidden");

      const encodedFda = encodeURIComponent(fdaQueryTerm);
      const encodedNih = encodeURIComponent(nihDiseaseTerm);
      const curatedPathogenAgents = searchLevel === "PATHOGEN" ? (activePathogenProfile?.curatedDrugs || []) : [];
      // Syndrome cards are also limited to the curated agent map. The broad
      // indication search is only needed when that map is empty.
      const syndromeHasCuratedAgents = searchLevel === "SYNDROME"
        && (getSyndromeClinicalMap()?.pathogens || []).some(pathogen => pathogen.agents?.length);

      try {
        currentFetchedDrugs = [];
        currentNihPillNames = [];
        currentNihIngredientNames = [];
        if (curatedPathogenAgents.length) {
          // All-presentations only renders these curated agents. Waiting on the
          // broad openFDA indication dump downloads several megabytes of unused
          // labels, and a stalled response body never hides the spinner.
          await Promise.all([
            fetchNihMedRtDrugs(encodedNih, generation, signal),
            ensureCuratedDrugCardsLoaded(curatedPathogenAgents, signal)
          ]);
        } else if (syndromeHasCuratedAgents) {
          await fetchNihMedRtDrugs(encodedNih, generation, signal);
        } else {
          const nihTask = fetchNihMedRtDrugs(encodedNih, generation, signal);
          await fetchOpenFdaIndicationAndMicrobiologyDrugs(encodedFda, fdaQueryTerm, generation, signal, nihTask);
        }
      } finally {
        if (generation === liveSearchGeneration) document.getElementById("loadingIndicator").classList.add("hidden");
      }
      if (generation !== liveSearchGeneration) return;

      if (searchLevel === "PATHOGEN") {
        document.getElementById("syndromePathogenFilterBox")?.classList.add("hidden");
        renderPathogenDiseaseFilterBar();
      } else if (searchLevel === "SYNDROME") {
        document.getElementById("pathogenDiseaseFilterBox").classList.add("hidden");
        await ensureSyndromeDrugCardsLoaded();
        if (generation !== liveSearchGeneration) return;
        renderSyndromePathogenFilterBar();
      } else {
        document.getElementById("syndromePathogenFilterBox")?.classList.add("hidden");
      }

      reFilterCurrentResults();
    }

    function renderPathogenDiseaseFilterBar() {
      const box = document.getElementById("pathogenDiseaseFilterBox");
      const pillsContainer = document.getElementById("pathogenDiseasePills");
      const noteBox = document.getElementById("pathogenClinicalNote");
      const statusLabel = document.getElementById("activeDiseaseSubfilterLabel");

      if (currentSearchLevel !== "PATHOGEN") {
        box.classList.add("hidden");
        return;
      }

      if (activePathogenProfile && activePathogenProfile.diseases && activePathogenProfile.diseases.length > 0) {
        box.classList.remove("hidden");
        const diseases = activePathogenProfile.diseases;
        const activeObj = diseases.find(d => d.id === activeDiseaseFilterId) || diseases[0];

        statusLabel.textContent = `Active Filter: ${activeObj.label}`;
        pillsContainer.innerHTML = diseases.map(d => {
          const isSelected = d.id === activeDiseaseFilterId;
          return `
            <button 
              onclick="selectPathogenDiseaseFilter('${d.id}')" 
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'}"
            >
              <i class="fa-solid ${d.id === 'all' ? 'fa-layer-group' : 'fa-stethoscope'} text-[10px]"></i>
              <span>${d.label}</span>
            </button>
          `;
        }).join("");

        if (activeObj.note) {
          noteBox.classList.remove("hidden");
          noteBox.innerHTML = `<i class="fa-solid fa-circle-info text-indigo-600 mr-1.5"></i><strong>${activeObj.label} — Clinical Guidance:</strong> ${activeObj.note}`;
        } else {
          noteBox.classList.add("hidden");
        }
        return;
      }

      const dynamicSyndromes = extractDynamicSyndromesFromFdaCards(currentFetchedDrugs);
      if (dynamicSyndromes.length > 1) {
        box.classList.remove("hidden");
        noteBox.classList.add("hidden");
        const activeObj = dynamicSyndromes.find(d => d.id === activeDiseaseFilterId) || dynamicSyndromes[0];
        statusLabel.textContent = `Active Filter: ${activeObj.label}`;

        pillsContainer.innerHTML = dynamicSyndromes.map(d => {
          const isSelected = d.id === activeDiseaseFilterId;
          return `
            <button 
              onclick="selectPathogenDiseaseFilter('${d.id}')" 
              class="px-3 py-1 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'}"
            >
              ${d.label}
            </button>
          `;
        }).join("");
      } else {
        box.classList.add("hidden");
      }
    }

    function extractDynamicSyndromesFromFdaCards(drugs) {
      const buckets = [
        { id: "skin", label: "Skin & Soft Tissue", keywords: ["skin", "cellulitis", "abscess", "wound"] },
        { id: "resp", label: "Respiratory / Pneumonia", keywords: ["pneumonia", "respiratory", "bronchitis", "sinusitis"] },
        { id: "uti", label: "Urinary Tract / Pyelonephritis", keywords: ["urinary", "pyelonephritis", "cystitis"] },
        { id: "bone", label: "Bone & Joint / Osteomyelitis", keywords: ["bone", "joint", "osteomyelitis", "arthritis"] },
        { id: "abd", label: "Intra-Abdominal / Peritonitis", keywords: ["intra-abdominal", "peritonitis"] },
        { id: "blood", label: "Bacteremia / Meningitis / Endocarditis", keywords: ["bacteremia", "septicemia", "meningitis", "endocarditis"] }
      ];

      const matched = [{ id: "all", label: "All Presentations", keywords: [] }];
      for (const b of buckets) {
        const count = drugs.filter(d => {
          const text = `${d.rawIndications} ${d.rawDosing}`;
          return resolverExpandKeywords(b.keywords).some(k => textContainsClinicalKeyword(text, k));
        }).length;
        if (count > 0) matched.push({ ...b, label: `${b.label} (${count})` });
      }
      return matched;
    }

    async function selectPathogenDiseaseFilter(filterId) {
      activeDiseaseFilterId = filterId;
      renderPathogenDiseaseFilterBar();
      const curatedAgents = getPathogenDiseaseAgentSet();
      if (curatedAgents) await ensureCuratedDrugCardsLoaded(curatedAgents);
      renderPathogenDiseaseFilterBar();
      reFilterCurrentResults();
    }

    // =========================================================================
    // 10. NIH NLM RXCLASS FETCHER (SINGLE-SELECT RADIO PILLS, NO POPUP)
    // =========================================================================
    async function fetchNihMedRtDrugs(encodedTerm, generation = liveSearchGeneration, signal) {
      const badge = document.getElementById("nihDiseaseBadge");
      const box = document.getElementById("nihIngredientsBox");

      let combinedIngredients = [];
      if (activePathogenProfile && activePathogenProfile.curatedDrugs) {
        combinedIngredients.push(...activePathogenProfile.curatedDrugs);
      }

      try {
        let res = await amuFetchResponse(`https://rxnav.nlm.nih.gov/REST/rxclass/class/byName.json?className=${encodedTerm}&classTypes=DISEASE`, signal, 8000);
        let data = await res.json();
        let classes = data?.rxclassMinConceptList?.rxclassMinConcept || [];
        if (classes.length === 0) {
          res = await amuFetchResponse(`https://rxnav.nlm.nih.gov/REST/rxclass/class/similar.json?className=${encodedTerm}&classTypes=DISEASE`, signal, 8000);
          data = await res.json();
          classes = data?.similarityMember?.rankClassConcept || [];
        }
        if (classes.length > 0) {
          if (generation !== liveSearchGeneration) return [];
          const matchedClass = classes[0];
          badge.textContent = `NIH MED-RT: ${matchedClass.className} (${matchedClass.classId})`;
          const memRes = await amuFetchResponse(`https://rxnav.nlm.nih.gov/REST/rxclass/classMembers.json?classId=${matchedClass.classId}&relaSource=MEDRT&rela=may_treat`, signal, 8000);
          if (generation !== liveSearchGeneration) return [];
          const memData = await memRes.json();
          const members = memData?.drugMemberGroup?.drugMember || [];
          const nihNames = members
            .map(m => m.minConcept?.name)
            .filter(Boolean)
            .filter(name => !isNonAntimicrobialNoise(name));
          combinedIngredients.push(...nihNames);
        } else if (generation === liveSearchGeneration) {
          badge.textContent = activePathogenProfile 
            ? `Pathogen Knowledge Graph + FDA Microbiology Mode` 
            : `NIH MED-RT: Direct FDA Indication Mode`;
        }
      } catch (e) {
        if (generation === liveSearchGeneration) badge.textContent = `Direct FDA Indication & Microbiology Mode`;
      }
      if (generation !== liveSearchGeneration) return [];

      // Deduplicate by normalized base molecule (including benzathine/procaine salts)
      const seenBaseMolecules = new Set();
      const deduplicatedIngredients = [];
      for (const rawName of combinedIngredients) {
        const base = normalizeBaseDrugName(rawName);
        if (!base || base.length < 3) continue;
        const key = base.toLowerCase();
        if (!seenBaseMolecules.has(key)) {
          seenBaseMolecules.add(key);
          deduplicatedIngredients.push(base.charAt(0).toUpperCase() + base.slice(1).toLowerCase());
        }
      }

      currentNihIngredientNames = deduplicatedIngredients;
      // The pill bar stays readable; label retrieval uses the full member list.
      currentNihPillNames = deduplicatedIngredients.slice(0, 40);
      if (currentNihPillNames.length > 0) {
        box.classList.remove("hidden");
        renderNihIngredientPills();
      }
      return deduplicatedIngredients;
    }

    // Renders the NIH Active Ingredient Pills so ONLY ONE drug can appear selected at any time
    function renderNihIngredientPills() {
      const pills = document.getElementById("nihIngredientsPills");
      const statusEl = document.getElementById("nihClickStatus");
      const allergyState = getAllergyState();

      pills.innerHTML = currentNihPillNames.map((name, idx) => {
        const safeArg = jsArg(name);
        const isSelected = selectedPinnedDrugName && selectedPinnedDrugName.toLowerCase() === name.toLowerCase();

        if (isSelected) {
          const matchedDrug = currentFetchedDrugs.find(d => d.isSelectedPinned);
          const isBlocked = matchedDrug ? evaluateDrugAllergyStatus(matchedDrug, allergyState).status === "BLOCKED" : false;
          const activeClass = isBlocked
            ? "bg-rose-600 text-white border-rose-300 ring-2 ring-rose-400/50 font-bold"
            : "bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/50 font-bold";
          const iconHtml = isBlocked
            ? `<i class="fa-solid fa-triangle-exclamation text-amber-200 text-[10px]"></i>`
            : `<i class="fa-solid fa-thumbtack text-emerald-100 text-[10px]"></i>`;

          return `
            <button 
              id="nih_pill_${idx}"
              onclick="selectSingleActiveIngredient('${safeArg}', 'nih_pill_${idx}')" 
              class="text-[11px] ${activeClass} px-3 py-1 rounded-md border transition-all flex items-center gap-1.5 shadow"
            >
              ${iconHtml}
              <span>${esc(name)}</span>
              <span class="text-[9px] opacity-80 ml-0.5">(Pinned #1)</span>
            </button>
          `;
        }

        return `
          <button 
            id="nih_pill_${idx}"
            onclick="selectSingleActiveIngredient('${safeArg}', 'nih_pill_${idx}')" 
            class="text-[11px] bg-slate-800 hover:bg-blue-600 active:scale-95 text-slate-200 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 hover:border-blue-400 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>${esc(name)}</span>
            <i class="fa-solid fa-arrow-up text-[9px] text-emerald-400"></i>
          </button>
        `;
      }).join("");

      if (!selectedPinnedDrugName && statusEl) {
        statusEl.textContent = "Select one drug at a time to pin its data hub to #1 below";
      }
    }

    // openFDA will return up to 1000 label documents per call, but those documents
    // repeat the same ingredient across manufacturers. A count of 1000 distinct
    // generic names is small; each follow-up asks for one current dosing label.
    const AMU_EPC_ANTIMICROBIAL = "openfda.pharm_class_epc:(antibacterial OR antimicrobial OR antifungal OR antiviral OR antimycobacterial OR antiprotozoal)";
    const AMU_DOSING_EXISTS = "(_exists_:dosage_and_administration OR _exists_:dosage_and_administration_table)";
    const AMU_SYSTEMIC_ROUTE = 'openfda.route:("ORAL" OR "INTRAVENOUS" OR "INTRAMUSCULAR" OR "PARENTERAL" OR "SUBCUTANEOUS")';
    const AMU_ORAL_ROUTE = 'openfda.route:"ORAL"';
    const AMU_PARENTERAL_ROUTE = 'openfda.route:("INTRAVENOUS" OR "INTRAMUSCULAR" OR "PARENTERAL" OR "SUBCUTANEOUS")';
    const AMU_MAX_DIVERSE_INGREDIENTS = 80;
    const AMU_LABEL_FETCH_CONCURRENCY = 4;
    const amuOpenFdaJsonCache = new Map();

    function amuFdaLabelUrl(params) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params || {})) {
        if (value != null && value !== "") query.set(key, String(value));
      }
      return "https://api.fda.gov/drug/label.json?" + query.toString();
    }

    function amuQuoteFdaTerm(value) {
      return '"' + String(value || "").replace(/["\\]/g, " ").replace(/\s+/g, " ").trim() + '"';
    }

    function amuIndicationMicrobiologyClause(term) {
      const quoted = amuQuoteFdaTerm(term);
      return `(indications_and_usage:${quoted} OR microbiology:${quoted})`;
    }

    async function amuFetchJson(url, signal, timeoutMs, useCache = false) {
      if (useCache && amuOpenFdaJsonCache.has(url)) return amuOpenFdaJsonCache.get(url);
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal?.aborted) return null;
        let response;
        try {
          response = await amuFetchResponse(url, signal, timeoutMs);
        } catch (error) {
          return null;
        }
        if (response.status === 429 && attempt === 0) {
          const header = Number(response.headers.get("retry-after"));
          const waitMs = Number.isFinite(header) && header > 0 ? Math.min(header * 1000, 3000) : 700;
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        if (response.status === 404) {
          const empty = { results: [] };
          if (useCache) amuOpenFdaJsonCache.set(url, empty);
          return empty;
        }
        if (!response.ok) return null;
        try {
          const data = await response.json();
          if (useCache && data) {
            amuOpenFdaJsonCache.set(url, data);
            if (amuOpenFdaJsonCache.size > 240) amuOpenFdaJsonCache.delete(amuOpenFdaJsonCache.keys().next().value);
          }
          return data;
        } catch (error) {
          return null;
        }
      }
      return null;
    }

    async function amuOpenFdaCountTerms(search, field, signal) {
      const data = await amuFetchJson(amuFdaLabelUrl({ search, count: field, limit: "1000" }), signal, 12000, true);
      return Array.isArray(data?.results) ? data.results.filter(row => row && typeof row.term === "string" && row.term.trim()) : [];
    }

    function amuFormulationMarks(raw) {
      const text = String(raw || "");
      const marks = [];
      if (/\bbenzathine\b/i.test(text)) marks.push("benzathine");
      if (/\bprocaine\b/i.test(text)) marks.push("procaine");
      if (/\bliposomal\b/i.test(text)) marks.push("liposomal");
      if (/\blipid complex\b/i.test(text)) marks.push("lipid_complex");
      if (/\bcholesteryl sulfate\b|\bcolloidal dispersion\b/i.test(text)) marks.push("colloidal_dispersion");
      if (/\bextended[- ]release\b|\bdelayed[- ]release\b|\bmodified[- ]release\b/i.test(text)) marks.push("modified_release");
      return marks;
    }

    function amuCensusIdentity(term) {
      const marks = amuFormulationMarks(term);
      let base = canonicalizeClinicalIngredient(term)
        .replace(/\b(?:tablet|tablets|capsule|capsules|suspension|solution|syrup|cream|ointment|gel|powder|lozenge|spray|drops|ds)\b/g, " ")
        .replace(/\bsulfameth\b/g, "sulfamethoxazole")
        .replace(/\btrimeth\b/g, "trimethoprim");
      base = [...new Set(base.split(" ").filter(Boolean))].sort().join(" ");
      return { base, marks, key: [base, ...marks].join("|") };
    }

    function amuIngredientBucket(base) {
      const n = String(base || "");
      if (/floxacin|oxacin/.test(n)) return "fluoroquinolone";
      if (/cillin|penicillin/.test(n)) return "penicillin";
      if (/cef|ceph/.test(n)) return "cephalosporin";
      if (/penem|bactam/.test(n)) return "carbapenem";
      if (/cycline/.test(n)) return "tetracycline";
      if (/thromycin|mycin|micin/.test(n)) return "macrolide_aminoglycoside";
      if (/conazole|fungin|amphotericin|flucytosine/.test(n)) return "antifungal";
      if (/navir|clovir|vudine|tamivir|sivir|mivir|buvir|previr|asvir/.test(n)) return "antiviral";
      if (/nidazole|dazole/.test(n)) return "nitroimidazole";
      if (/trimethoprim|sulfameth|oxazole/.test(n)) return "antifolate";
      return "other";
    }

    function amuIngredientLooksAntimicrobial(name) {
      const text = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!text || isNonAntimicrobialNoise(text)) return false;
      if (/\b(?:prednisone|prednisolone|methylprednisolone|acetylcysteine|treprostinil|citric acid|sucralfate|albuterol|budesonide|fluticasone|salmeterol|ipratropium|guaifenesin|dextromethorphan|montelukast|theophylline|hydrocortisone|dexamethasone)\b/.test(text)) return false;
      if (/cef|ceph|floxacin|oxacin|cillin|penem|bactam|cycline|thromycin|mycin|micin|conazole|fungin|nidazole|dazole|navir|clovir|vudine|tamivir|sivir|mivir|buvir|previr|asvir|phenicol/.test(text)) return true;
      return /\b(?:penicillin|linezolid|tedizolid|daptomycin|mupirocin|fosfomycin|nitrofurantoin|rifampin|rifampicin|rifabutin|rifapentine|isoniazid|pyrazinamide|ethambutol|atovaquone|pentamidine|nitazoxanide|fidaxomicin|lefamulin|telavancin|oritavancin|dalbavancin|vancomycin|teicoplanin|colistin|polymyxin|trimethoprim|sulfamethoxazole|sulfameth|streptomycin|ribavirin|oseltamivir|zanamivir|baloxavir|remdesivir|amphotericin|griseofulvin|terbinafine|flucytosine|aztreonam|plazomicin|foscarnet|cidofovir|letermovir|maribavir|nirmatrelvir|quinupristin|dalfopristin|chloramphenicol)\b/.test(text);
    }

    function amuIsTypoOf(candidate, canonical, candidateCount, canonicalCount) {
      if (!candidate || !canonical || candidate === canonical) return false;
      const squeeze = value => String(value).replace(/(.)\1+/g, "$1");
      if (squeeze(candidate) === squeeze(canonical)) return true;
      if (Math.abs(candidate.length - canonical.length) > 2) return false;
      const prefix = Math.min(6, candidate.length, canonical.length);
      if (prefix < 6 || candidate.slice(0, prefix) !== canonical.slice(0, prefix)) return false;
      const distance = levenshteinDistance(candidate, canonical);
      if (distance === 1) return true;
      return distance === 2 && candidateCount * 2 <= canonicalCount;
    }

    function amuCollapseCensus(entries, epcKeys) {
      const prepared = [];
      for (const entry of entries || []) {
        const term = String(entry?.term || "").trim();
        if (!term) continue;
        const identity = amuCensusIdentity(term);
        if (!identity.base || identity.base.length < 3) continue;
        const listed = epcKeys.has(identity.key) || epcKeys.has(identity.base);
        if (!listed && !amuIngredientLooksAntimicrobial(term) && !amuIngredientLooksAntimicrobial(identity.base)) continue;
        prepared.push({ term, count: Number(entry.count) || 0, identity, listed });
      }
      prepared.sort((a, b) => b.count - a.count);
      const groups = [];
      for (const row of prepared) {
        const typoOf = groups.find(group => group.identity.marks.join("|") === row.identity.marks.join("|")
          && amuIsTypoOf(row.identity.base, group.identity.base, row.count, group.count));
        if (typoOf) {
          typoOf.count += row.count;
          continue;
        }
        const group = groups.find(existing => existing.identity.key === row.identity.key);
        if (group) {
          group.count += row.count;
          if (group.terms.length < 6 && !group.terms.includes(row.term)) group.terms.push(row.term);
          group.listed = group.listed || row.listed;
        } else {
          groups.push({
            identity: row.identity,
            count: row.count,
            terms: [row.term],
            listed: row.listed,
            loose: false,
            bucket: amuIngredientBucket(row.identity.base),
            rank: 0,
            primaryRecord: null
          });
        }
      }
      return groups;
    }

    function amuInterleaveByBucket(groups) {
      const buckets = new Map();
      for (const group of groups) {
        if (!buckets.has(group.bucket)) buckets.set(group.bucket, []);
        buckets.get(group.bucket).push(group);
      }
      for (const list of buckets.values()) list.sort((a, b) => b.count - a.count || a.identity.base.localeCompare(b.identity.base));
      const lanes = [...buckets.values()].sort((a, b) => (b[0]?.count || 0) - (a[0]?.count || 0));
      const ranked = [];
      while (ranked.length < AMU_MAX_DIVERSE_INGREDIENTS) {
        let progressed = false;
        for (const lane of lanes) {
          if (!lane.length) continue;
          ranked.push(lane.shift());
          progressed = true;
          if (ranked.length >= AMU_MAX_DIVERSE_INGREDIENTS) break;
        }
        if (!progressed) break;
      }
      ranked.forEach((group, index) => { group.rank = index; });
      return ranked;
    }

    function amuSeedGroups(names, seenKeys) {
      const rows = [];
      const local = new Set();
      for (const name of names || []) {
        if (!amuIngredientLooksAntimicrobial(name)) continue;
        const identity = amuCensusIdentity(name);
        if (!identity.base || identity.base.length < 3 || seenKeys.has(identity.key) || local.has(identity.key)) continue;
        local.add(identity.key);
        rows.push({
          identity,
          count: 1,
          terms: [String(name).trim()],
          listed: false,
          loose: true,
          bucket: amuIngredientBucket(identity.base),
          rank: 0,
          primaryRecord: null
        });
      }
      return amuInterleaveByBucket(rows).slice(0, 24);
    }

    function amuExactGenericClause(terms) {
      const unique = [...new Set((terms || []).map(term => String(term || "").trim()).filter(Boolean))].slice(0, 6);
      if (!unique.length) return "";
      const parts = unique.map(term => `openfda.generic_name.exact:${amuQuoteFdaTerm(term)}`);
      return parts.length === 1 ? parts[0] : `(${parts.join(" OR ")})`;
    }

    function amuGenericClause(group) {
      if (group.loose) {
        const name = group.terms[0];
        return `(openfda.generic_name:${amuQuoteFdaTerm(name)} OR openfda.substance_name:${amuQuoteFdaTerm(name)})`;
      }
      return amuExactGenericClause(group.terms);
    }

    function amuRepresentativeLabelParams(termClause, indicationClause, routeClause) {
      const parts = [termClause, AMU_DOSING_EXISTS];
      if (indicationClause) parts.push(indicationClause);
      if (routeClause) parts.push(routeClause);
      return { search: parts.filter(Boolean).join(" AND "), sort: "effective_time:desc", limit: "1" };
    }

    async function amuDownloadLabel(params, signal) {
      const data = await amuFetchJson(amuFdaLabelUrl(params), signal, 12000, true);
      return data?.results?.[0] || null;
    }

    let amuLiveRenderFrame = 0;
    function amuScheduleLiveRender() {
      if (amuLiveRenderFrame || typeof reFilterCurrentResults !== "function") return;
      amuLiveRenderFrame = requestAnimationFrame(() => {
        amuLiveRenderFrame = 0;
        reFilterCurrentResults();
      });
    }
    function amuFlushLiveRender() {
      if (amuLiveRenderFrame) cancelAnimationFrame(amuLiveRenderFrame);
      amuLiveRenderFrame = 0;
      if (typeof reFilterCurrentResults === "function") reFilterCurrentResults();
    }
    function amuRememberFetchedCards(cards, generation) {
      if (generation !== liveSearchGeneration || !cards?.length) return;
      const byId = new Map(currentFetchedDrugs.map(drug => [drug.id, drug]));
      let changed = false;
      for (const card of cards) {
        if (!card?.id || byId.has(card.id)) continue;
        byId.set(card.id, card);
        changed = true;
      }
      if (!changed) return;
      currentFetchedDrugs = [...byId.values()].sort((a, b) =>
        (a.diversityRank ?? 1e9) - (b.diversityRank ?? 1e9) || String(a.genericName).localeCompare(String(b.genericName)));
      amuScheduleLiveRender();
    }

    async function amuFetchLabelPhase(group, indicationClause, signal, phase) {
      const clause = amuGenericClause(group);
      if (!clause || signal?.aborted) return [];
      const pull = (route) => amuDownloadLabel(amuRepresentativeLabelParams(clause, indicationClause, route), signal);
      if (phase === "complement") {
        const primary = group.primaryRecord;
        if (!primary) return [];
        const routeText = (primary.openfda?.route || []).join(" ").toUpperCase();
        const hasOral = /\bORAL\b/.test(routeText);
        const hasParenteral = /\b(?:INTRAVENOUS|INTRAMUSCULAR|PARENTERAL|SUBCUTANEOUS)\b/.test(routeText);
        const complement = hasOral && !hasParenteral ? AMU_PARENTERAL_ROUTE : hasParenteral && !hasOral ? AMU_ORAL_ROUTE : "";
        if (!complement) return [];
        const secondary = await pull(complement);
        if (!secondary || secondary.id === primary.id || (secondary.set_id && secondary.set_id === primary.set_id)) return [];
        return [secondary];
      }
      let primary = await pull(AMU_SYSTEMIC_ROUTE);
      if (!primary) primary = await pull("");
      if (signal?.aborted || !primary) return [];
      group.primaryRecord = primary;
      return [primary];
    }

    async function amuRunLabelPhase(groups, indicationClause, generation, signal, phase, rawTerm) {
      await amuMapPool(groups, AMU_LABEL_FETCH_CONCURRENCY, async group => {
        if (signal?.aborted || generation !== liveSearchGeneration) return null;
        let records = [];
        try {
          records = await amuFetchLabelPhase(group, indicationClause, signal, phase);
        } catch (error) {
          return null;
        }
        if (generation !== liveSearchGeneration || signal?.aborted || !records.length) return null;
        const offset = phase === "complement" ? 1 : 0;
        const cards = deduplicateAndDistillFdaDrugs(records, rawTerm);
        cards.forEach((card, index) => { card.diversityRank = group.rank * 10 + offset + index; });
        amuRememberFetchedCards(cards, generation);
        return records;
      });
    }

    async function amuFallbackPagedLabels(rawTerm, indication, generation, signal) {
      const best = new Map();
      for (let page = 0; page < 4; page++) {
        if (signal?.aborted || generation !== liveSearchGeneration) return;
        const data = await amuFetchJson(amuFdaLabelUrl({
          search: `${indication} AND ${AMU_DOSING_EXISTS} AND _exists_:openfda.generic_name`,
          sort: "effective_time:desc",
          limit: "40",
          skip: String(page * 40)
        }), signal, 15000, true);
        const rows = data?.results || [];
        if (!rows.length) break;
        for (const item of rows) {
          const generic = item?.openfda?.generic_name?.[0];
          if (!generic) continue;
          const identity = amuCensusIdentity(generic);
          if (!amuIngredientLooksAntimicrobial(generic) && !amuIngredientLooksAntimicrobial(identity.base)) continue;
          const prev = best.get(identity.key);
          if (!prev || String(item.effective_time || "") > String(prev.effective_time || "")) best.set(identity.key, item);
          if (best.size >= AMU_MAX_DIVERSE_INGREDIENTS) break;
        }
        if (best.size >= AMU_MAX_DIVERSE_INGREDIENTS || rows.length < 40) break;
      }
      const cards = deduplicateAndDistillFdaDrugs([...best.values()], rawTerm);
      cards.forEach((card, index) => { card.diversityRank = index; });
      amuRememberFetchedCards(cards, generation);
    }

    async function fetchOpenFdaIndicationAndMicrobiologyDrugs(encodedTerm, rawTerm, generation = liveSearchGeneration, signal, nihTask) {
      const term = String(rawTerm || "").trim();
      if (!term) return;
      const seenKeys = new Set();
      try {
        const indication = amuIndicationMicrobiologyClause(term);
        const [broad, epc] = await Promise.all([
          amuOpenFdaCountTerms(`${indication} AND _exists_:openfda.generic_name`, "openfda.generic_name.exact", signal),
          amuOpenFdaCountTerms(`${indication} AND ${AMU_EPC_ANTIMICROBIAL}`, "openfda.generic_name.exact", signal)
        ]);
        if (signal?.aborted || generation !== liveSearchGeneration) return;
        const epcKeys = new Set();
        for (const row of epc) {
          const identity = amuCensusIdentity(row.term);
          if (identity.key) epcKeys.add(identity.key);
          if (identity.base) epcKeys.add(identity.base);
        }
        const sourceRows = broad.length ? broad : epc;
        const groups = sourceRows.length ? amuInterleaveByBucket(amuCollapseCensus(sourceRows, epcKeys)) : [];
        if (!groups.length) {
          await amuFallbackPagedLabels(term, indication, generation, signal);
          return;
        }
        for (const group of groups) seenKeys.add(group.identity.key);
        await amuRunLabelPhase(groups, indication, generation, signal, "primary", term);
        let seedNames = [];
        if (nihTask && generation === liveSearchGeneration && !signal?.aborted) {
          try { seedNames = await nihTask; } catch (error) { seedNames = []; }
        }
        if (generation !== liveSearchGeneration || signal?.aborted) return;
        const seeds = amuSeedGroups(Array.isArray(seedNames) ? seedNames : [], seenKeys);
        seeds.forEach((group, index) => { group.rank = groups.length + index; seenKeys.add(group.identity.key); });
        if (seeds.length) await amuRunLabelPhase(seeds, indication, generation, signal, "primary", term);
        if (generation !== liveSearchGeneration || signal?.aborted) return;
        // The other route for each ingredient continues after the first labels are visible.
        void amuRunLabelPhase(groups.concat(seeds), indication, generation, signal, "complement", term).catch(() => {});
      } catch (error) {
        if (signal?.aborted || generation !== liveSearchGeneration) return;
      } finally {
        if (generation === liveSearchGeneration) amuFlushLiveRender();
      }
    }

    // EXCLUSIVE SINGLE-DRUG SELECTION: Unpins any previously chosen drug and pins ONLY the newly selected drug to #1 (No Popup)
    async function selectSingleActiveIngredient(rawIngredientName, btnId, preferredProductId = "") {
      const request = amuDrugLookupRequest(rawIngredientName);
      const baseMolecule = normalizeBaseDrugName(request.ingredientName);
      const statusEl = document.getElementById("nihClickStatus");

      // If clicking the already-selected drug pill, deselect and unpin it
      if (selectedPinnedDrugName && selectedPinnedDrugName.toLowerCase() === baseMolecule.toLowerCase()
          && (!preferredProductId || currentFetchedDrugs.some(d => d.isSelectedPinned && d.id === preferredProductId))) {
        selectedPinnedDrugName = null;
        currentFetchedDrugs.forEach(d => {
          d.isSelectedPinned = false;
          d.forceShowEvenIfAllergic = false;
        });
        renderNihIngredientPills();
        reFilterCurrentResults();
        return;
      }

      // Clear previous selection across all loaded drugs
      selectedPinnedDrugName = baseMolecule;
      currentFetchedDrugs.forEach(d => {
        d.isSelectedPinned = false;
        d.forceShowEvenIfAllergic = false;
      });

      const btn = btnId ? document.getElementById(btnId) : null;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-sky-400 text-[10px]"></i> <span>Loading ${esc(baseMolecule)}...</span>`;
      }

      try {
        const existing = amuSelectRequestedDrug(currentFetchedDrugs, rawIngredientName, preferredProductId);
        let targetItem = existing;
        if (existing) {
          currentFetchedDrugs = currentFetchedDrugs.filter(d => d.id !== existing.id);
        } else {
          targetItem = await amuFetchRequestedDrug(rawIngredientName)
            || buildGuaranteedFallbackCard(rawIngredientName, baseMolecule);
          currentFetchedDrugs = currentFetchedDrugs.filter(d => d.id !== targetItem.id);
        }

        // Pin exclusively to #1 slot at the top of the list
        targetItem.isSelectedPinned = true;
        targetItem.forceShowEvenIfAllergic = true;
        currentFetchedDrugs.unshift(targetItem);

        activeDiseaseFilterId = "all";
        if (currentSearchLevel === "PATHOGEN") renderPathogenDiseaseFilterBar();
        renderNihIngredientPills();
        reFilterCurrentResults();

        const allergyState = getAllergyState();
        const isBlocked = evaluateDrugAllergyStatus(targetItem, allergyState).status === "BLOCKED";
        if (statusEl) {
          statusEl.textContent = isBlocked
            ? `Pinned "${targetItem.genericName}" to #1 below (allergy-class filter match — not a contraindication ruling)`
            : `✓ Pinned "${targetItem.genericName}" data hub to #1 at top of list`;
        }

        setTimeout(() => {
          const cardEl = document.getElementById(`drug_card_${targetItem.id}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
            cardEl.classList.add("card-flash");
            setTimeout(() => cardEl.classList.remove("card-flash"), 1600);
          }
        }, 60);

      } catch (err) {
        const fallbackItem = buildGuaranteedFallbackCard(rawIngredientName, baseMolecule);
        fallbackItem.isSelectedPinned = true;
        fallbackItem.forceShowEvenIfAllergic = true;
        currentFetchedDrugs.unshift(fallbackItem);
        renderNihIngredientPills();
        reFilterCurrentResults();
      }
    }

    // Allows clicking a drug in the Contraindicated bottom drawer to pin it as the single selected drug at #1
    function pinContraindicatedDrugToTop(drugId) {
      const found = currentFetchedDrugs.find(d => d.id === drugId);
      if (!found) return;
      selectSingleActiveIngredient(found.activeIngredientSource || found.genericName, null, found.id);
    }

    function buildGuaranteedFallbackCard(rawName, baseMolecule) {
      const upperKey = baseMolecule.toUpperCase() || rawName.toUpperCase();
      const id = upperKey.replace(/[^A-Z0-9]/g, "_");
      const renalProfile = {
        adjustedDose: "No FDA-label renal dose was retrieved for this fallback record; no adjustment is inferred.",
        contraLevel: "SOURCE UNAVAILABLE",
        contraNote: "A verified product-specific label is required before deriving renal dosing.",
        source: "no_fda_label"
      };
      const rawDosing = "";
      const rawInteractions = "No FDA label text was retrieved for this fallback ingredient record.";
      const rawRenalPop = "No FDA label text was retrieved for this fallback ingredient record.";

      monographStore[id] = { genericName: upperKey, rawDosing: "No FDA dosing passage was retrieved. No dose is inferred.", rawInteractions, rawRenalPop };

      let inferredClass = "Systemic Antimicrobial Agent";
      if (/(floxacin)/.test(upperKey.toLowerCase())) inferredClass = "Fluoroquinolone Antibacterial";
      else if (/(cillin)/.test(upperKey.toLowerCase())) inferredClass = "Penicillin-class Antibacterial";
      else if (/(cef|ceph)/.test(upperKey.toLowerCase())) inferredClass = "Cephalosporin Antibacterial";
      else if (/(penem)/.test(upperKey.toLowerCase())) inferredClass = "Carbapenem Antibacterial";
      else if (/(mycin|micin)/.test(upperKey.toLowerCase())) {
        if (/(azithro|clarithro|erythro|fidaxo)/.test(upperKey.toLowerCase())) inferredClass = "Macrolide Antimicrobial";
        else if (/(vanco|dalba|orita|telavancin)/.test(upperKey.toLowerCase())) inferredClass = "Glycopeptide Antibacterial";
        else if (/(clinda|linco)/.test(upperKey.toLowerCase())) inferredClass = "Lincosamide Antibacterial";
        else inferredClass = "Aminoglycoside Antibacterial";
      } else if (/(cycline)/.test(upperKey.toLowerCase())) inferredClass = "Tetracycline-class Antibacterial";

      return {
        id,
        genericName: upperKey,
        brandName: rawName !== baseMolecule ? rawName : "Label unavailable",
        epcClasses: [inferredClass],
        route: "Route not verified",
        dosingBullets: [{ color: "amber", tag: "Ingredient association only", text: `No product label or dosing regimen was retrieved for ${rawName}. An ingredient association does not verify a regimen.` }],
        interactionBullets: [{ color: "amber", tag: "Class Precautions", text: "Verify institutional CYP450, QTc, and nephrotoxic co-medication profiles." }],
        renalBullets: [{ color: "amber", tag: "Source Check Required", text: renalProfile.adjustedDose }],
        selfReg1: null,
        selfReg2: null,
        selfReg3: null,
        renalProfile,
        rawDosing,
        rawDosingTextOnly: "",
        rawDosingTables: [],
        structuredRegimenIndex: { version: "adaptive-label-index-v8", candidates: [], sourceStatus: "no_fda_label_retrieved", structure: { version: "fda-label-structure-v6", detected: [], tableProfiles: [], sections: [], strategy: [] } },
        labelProvenance: { source: "unavailable", status: "no_label_retrieved" },
        labelSourceStatus: "no_fda_label_retrieved",
        rawInteractions,
        rawRenalPop,
        rawIndications: `Ingredient association to review for ${currentQueryLabel}; no retrieved label confirms this indication.`,
        rawBoxed: "",
        autoBadges: [{ label: "Source unavailable • ingredient only", color: "bg-amber-100 text-amber-900 border-amber-300", icon: "fa-circle-exclamation" }],
        forceShowEvenIfAllergic: false,
        isSelectedPinned: false
      };
    }

    function fdaProductStructureKey(item, genericKey) {
      const meta = item.openfda || {};
      const text = [...(meta.generic_name || []), ...(meta.brand_name || []), ...(meta.dosage_form || [])].join(" ");
      const modifiers = [
        [/\bbenzathine\b/i, "benzathine"], [/\bprocaine\b/i, "procaine"],
        [/\bliposomal\b|\bambisome\b/i, "liposomal"], [/\blipid complex\b|\babelcet\b/i, "lipid_complex"],
        [/\bcholesteryl sulfate\b|\bcolloidal dispersion\b/i, "colloidal_dispersion"],
        [/\bextended.release\b|\bdelayed.release\b|\bmodified.release\b/i, "modified_release"]
      ].filter(([re]) => re.test(text)).map(([, label]) => label);
      const routes = [...new Set((meta.route || ["unverified"]).map(r => String(r).toLowerCase()))].sort().join("_");
      return [genericKey, routes, ...modifiers].join("|");
    }

    function deduplicateAndDistillFdaDrugs(results, searchKeyword) {
      const sourceQuality = item => (item.dosage_and_administration?.length ? 2 : 0) + (item.dosage_and_administration_table?.length ? 2 : 0);
      const betterLabel = (candidate, incumbent) => {
        const quality = sourceQuality(candidate) - sourceQuality(incumbent);
        if (quality) return quality > 0;
        return String(candidate.effective_time || "").localeCompare(String(incumbent.effective_time || "")) > 0;
      };
      // One pass keeps the strongest label per product. Sorting every raw SPL
      // first repeated the same comparisons across manufacturer duplicates.
      const bestByProduct = new Map();
      for (const item of results || []) {
        const rawGeneric = item?.openfda?.generic_name?.[0];
        if (!rawGeneric || isNonAntimicrobialNoise(rawGeneric)) continue;
        const genericKey = normalizeBaseDrugName(rawGeneric).toUpperCase().trim() || rawGeneric.toUpperCase().trim();
        const productKey = fdaProductStructureKey(item, genericKey);
        const incumbent = bestByProduct.get(productKey);
        if (!incumbent || betterLabel(item, incumbent)) bestByProduct.set(productKey, item);
      }
      const normalized = [];
      for (const item of bestByProduct.values()) {
        const rawGeneric = item.openfda.generic_name[0];
        const genericKey = normalizeBaseDrugName(rawGeneric).toUpperCase().trim() || rawGeneric.toUpperCase().trim();
        const productKey = fdaProductStructureKey(item, genericKey);

        const id = productKey.toUpperCase().replace(/[^A-Z0-9]/g, "_");
        const brandName = item.openfda?.brand_name?.[0] || "";
        const epcClasses = item.openfda?.pharm_class_epc || [];
        const route = item.openfda?.route?.join(", ") || "Route not verified";

        const { rawIndications, rawMicro, rawDosing, rawDosingSources, rawDosingTables, rawDosingTableText, fdaDoseFieldKeys, rawInteractions, rawRenalPop, rawBoxed, labelProvenance } = extractComprehensiveFdaSections(item, genericKey);
        const renalProfile = lookupRenalProfile(genericKey, rawRenalPop, rawDosing, `${rawGeneric} ${brandName} ${route}`);

        const rawDosingCombined = [rawDosing, rawDosingTableText].filter(Boolean).join("\n");
        // Never synthesize a dose and present it as FDA label content.
        const finalRawDosing = rawDosingCombined;
        const finalRawInteractions = rawInteractions || `No drug-interaction text was returned in this openFDA label record.`;
        const finalRawRenalPop = rawRenalPop || `No use-in-specific-populations text was returned in this openFDA label record.`;
        const structuredRegimenIndex = { candidates: [], structure: {}, databaseDriven: true };

        monographStore[id] = {
          genericName: genericKey,
          rawDosing: finalRawDosing || "No dosage_and_administration text or parsed dosing table was returned for this openFDA label record.",
          rawInteractions: finalRawInteractions,
          rawRenalPop: finalRawRenalPop,
          labelProvenance
        };

        const dosingBullets = []; // Filled only by AMUEngine through AMUApp.
        const interactionBullets = distillSection2Interactions(finalRawInteractions, rawBoxed, genericKey);
        const renalBullets = distillSection3RenalPopulations(finalRawRenalPop, finalRawDosing, renalProfile);

        const selfReg1 = evaluateComplexityAndSelfRegulate(finalRawDosing, "1. FDA Dosing & Administration", genericKey);
        const selfReg2 = evaluateComplexityAndSelfRegulate(finalRawInteractions, "2. FDA Drug Interactions & Cautions", genericKey);
        const selfReg3 = evaluateComplexityAndSelfRegulate(finalRawRenalPop, "3. Renal & Specific Populations", genericKey);

        const autoBadges = scanPharmacologicalRisks(genericKey, epcClasses, finalRawInteractions, rawBoxed, finalRawRenalPop);

        normalized.push({
          id,
          _amuLabel: item,
          genericName: genericKey,
          activeIngredientSource: rawGeneric,
          brandName,
          epcClasses,
          route,
          dosingBullets,
          interactionBullets,
          renalBullets,
          selfReg1,
          selfReg2,
          selfReg3,
          renalProfile,
          rawDosing: finalRawDosing,
          rawDosingTextOnly: rawDosing,
          rawDosingSources,
          rawDosingTables,
          structuredRegimenIndex,
          labelProvenance,
          labelSourceStatus: finalRawDosing ? "openfda_dosing_text_present" : "openfda_dosing_text_missing",
          fdaDoseFieldKeys,
          rawInteractions: finalRawInteractions,
          rawRenalPop: finalRawRenalPop,
          rawIndications: `${rawIndications} ${rawMicro}`,
          rawBoxed,
          autoBadges,
          forceShowEvenIfAllergic: false,
          isSelectedPinned: false
        });
      }
      return normalized;
    }

    // Shared vocabulary for matching only. Source label wording, dose expressions,
    // measurement scales, negation and severity remain available verbatim as evidence.
    // These are linguistic equivalents, not permission to transfer dosing between diseases.
    let LABEL_WORDING_EQUIVALENTS = AMUApp.lexicon("wordingEquivalents");
    function normalizeLabelStructureText(value) {
      // NFC retains semantic unit/fraction glyphs (m², ½) consumed by dose parsers.
      let text = String(value || "").normalize("NFC").toLowerCase()
        .replace(/\bcl\s*cr\b|\bclcr\b/gi, "crcl");
      LABEL_WORDING_EQUIVALENTS.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });
      return text;
    }

    // Build clinical keywords from the currently selected syndrome, excluding drug names
    // that appear in some filter definitions only to ensure those agents remain visible.
    function normalizeClinicalKeyword(value) {
      return normalizeLabelStructureText(value).replace(/[^a-z0-9]+/g, " ").trim();
    }

    // Exact phrase boundaries prevent e.g. complicated/uncomplicated and otitis
    // media/otitis externa from becoming accidental substring matches.
    function clinicalPhrasePresent(text, keyword) {
      const hay = " " + normalizeClinicalKeyword(text) + " ";
      const key = normalizeClinicalKeyword(keyword);
      return !!key && hay.includes(" " + key + " ");
    }

    // One-way retrieval concepts: anaphylaxis is a form of hypersensitivity,
    // but generic hypersensitivity must never satisfy an anaphylaxis filter.
    let CLINICAL_RETRIEVAL_EXPANSIONS = AMUApp.lexicon("retrievalExpansions");
    function expandClinicalRetrievalKeywords(keys) {
      const out = new Set((keys || []).map(normalizeClinicalKeyword).filter(Boolean));
      CLINICAL_RETRIEVAL_EXPANSIONS.forEach(rule => {
        if (rule.triggers.some(t => out.has(normalizeClinicalKeyword(t)))) rule.add.forEach(a => out.add(normalizeClinicalKeyword(a)));
      });
      return [...out];
    }

    function isKnownDrugKeyword(value) {
      const needle = normalizeClinicalKeyword(value);
      if (!needle) return false;
      const names = [];
      if (Array.isArray(antimicrobialDrugCatalog)) {
        antimicrobialDrugCatalog.forEach(d => names.push(d.name, ...(d.aliases || [])));
      }
      if (Array.isArray(antimicrobialDrugGroups)) {
        antimicrobialDrugGroups.forEach(g => names.push(g.groupName, ...(g.aliases || []), ...(g.members || [])));
      }
      return names.some(n => normalizeClinicalKeyword(n) === needle);
    }

    let CLINICAL_CONTEXT_SYNONYMS = AMUApp.lexicon("contextSynonyms");
    function buildClinicalDosingContext(label, keywords, strict = false) {
      const terms = [];
      (keywords || []).forEach(k => {
        const clean = String(k || "").trim();
        if (clean && !isKnownDrugKeyword(clean)) terms.push(clean);
      });
      // Syndrome-level matching is deliberately strict: do not add individual label
      // words (e.g. "pneumonia") or broad synonyms that can match another disease.
      if (!strict) {
        const labelTerms = normalizeClinicalKeyword(label).split(/\s+/).filter(w =>
          w.length > 3 && !["with", "from", "into", "adult", "acute", "chronic", "hospital", "purulent"].includes(w)
        );
        terms.push(...labelTerms);
        labelTerms.forEach(term => terms.push(...(CLINICAL_CONTEXT_SYNONYMS[term] || [])));
      }
      const unique = resolverExpandKeywords(terms)
        .sort((a, b) => b.length - a.length);
      return unique.length ? { label, keywords: unique } : null;
    }

    function getActiveClinicalDosingContext() {
      if (currentSearchLevel === "PATHOGEN" && activeDiseaseFilterId !== "all") {
        let selected = activePathogenProfile?.diseases?.find(d => d.id === activeDiseaseFilterId) || null;
        if (!selected) {
          selected = extractDynamicSyndromesFromFdaCards(currentFetchedDrugs)
            .find(d => d.id === activeDiseaseFilterId) || null;
        }
        if (selected && selected.id !== "all") {
          const context = buildClinicalDosingContext(selected.label, selected.keywords || [], true);
          if (context) context.pathogen = activePathogenProfile?.canonical || "";
          return context;
        }
      }

      if (currentSearchLevel === "SYNDROME") {
        const label = document.getElementById("activeDiseaseHeader")?.textContent || currentQueryLabel || "Selected syndrome";
        const curated = getSyndromeClinicalMap();
        // No broad FDA search term or generic label token is added here. If no exact
        // syndrome map exists, require the full displayed syndrome name to be present.
        const context = buildClinicalDosingContext(label, curated?.contextKeywords || [label], true);
        if (context) {
          const selectedPathogen = curated?.pathogens?.find(p => p.id === activeSyndromePathogenId);
          if (selectedPathogen) context.pathogen = selectedPathogen.label || "";
          else if (curated?.pathogens?.length === 1) context.pathogen = curated.pathogens[0].label || "";
        }
        return context;
      }
      return null;
    }

    function textContainsClinicalKeyword(text, keyword) {
      return expandClinicalRetrievalKeywords([keyword]).some(k => clinicalPhrasePresent(text, k));
    }

    function getActiveDosingPhysiology() {
      const age = Number.isFinite(ptAge) ? ptAge : 40;
      const dialysis = typeof rrtMode === "function" ? rrtMode() : "none";
      const renalMetric = document.getElementById("useCrClInput")?.checked ? "crcl" : "egfr";
      return {
        age,
        pediatric: age < 18,
        weightKg: Number.isFinite(ptKg) ? ptKg : 70,
        pregnancy: !!document.getElementById("ptPreg")?.checked,
        hepaticClass: document.getElementById("ptHepClass")?.value || "none",
        hepatic: (document.getElementById("ptHepClass")?.value || "none") !== "none",
        egfr: Number.isFinite(egfr) ? egfr : null,
        crcl: Number.isFinite(crcl) ? crcl : null,
        renalMetric,
        dialysis,
        gestationalAgeWeeks: Number.isFinite(ptGaWeeks) ? ptGaWeeks : null,
        postnatalAgeDays: Number.isFinite(ptPnaDays) ? ptPnaDays : null
      };
    }

    function sentenceHasDoseDirective(sentence) {
      return /\b(?:\d+(?:\.\d+)?\s*(?:mg\/kg(?:\/day)?|mcg\/kg(?:\/day)?|mg|g|mcg|units)|dose|dosage|administer|every\s+\d+|q\d+h|once\s+daily|twice\s+daily)\b/i.test(sentence);
    }

    function renalMetricInClause(sentence) {
      const s = normalizeLabelStructureText(sentence).toLowerCase();
      if (/\b(?:crcl|creatinine clearance)\b/.test(s)) return "crcl";
      if (/\begfr\b/.test(s)) return "egfr";
      if (/\bgfr\b/.test(s)) return "gfr";
      return "unspecified";
    }

    // Standard renal function is a qualitative assumption, never a calculated CrCl.
    // The database defines the eGFR threshold; no numeric CrCl is inferred.
    function canAssumeNormalRenalFunction(profile) {
      const policy=AMUApp.database?.policies?.quantity?.physiologicalRenalAssumption;
      if(AMUApp.normalRenalDefaults)return AMUApp.normalRenalDefaults()&&!AMUApp.isRenalCalculationActive();
      return !AMUApp.isRenalCalculationActive?.() && AMUApp.database?.policies?.quantity?.assumeNormalRenalFunction===true && !!policy?.enabled && !Number.isFinite(profile.crcl) && Number.isFinite(profile.egfr)
        && profile.egfr>=policy.minimumScreenValue && profile.dialysis===policy.noDialysisValue;
    }
    function isStandardRenalBranch(sentence) {
      const s = normalizeLabelStructureText(sentence).toLowerCase();
      if (/\b(?:impairment|dysfunction|failure|dialysis|anuri|augmented)\b/.test(s)
          && !/\b(?:normal renal function|without renal impairment)\b/.test(s)) return false;
      if (/\b(?:no|not|without) normal renal function\b/.test(s)) return false;
      if (/\b(?:normal renal function|without renal impairment)\b/.test(s)
          && !/(?:crcl|creatinine clearance)\s*(?:<|≤|less than|below|under)/.test(s)) return true;
      // These are explicitly the unrestricted upper band, not a finite impairment band.
      const m = s.match(/(?:crcl|creatinine clearance)\s*(?:\(crcl\))?\s*(?:of\s*)?(>=|≥|>|greater than(?: or equal to)?|above|at least)\s*(\d+(?:\.\d+)?)/i);
      if (!m || Number(m[2]) > 90) return false;
      const afterThreshold = s.slice(m.index + m[0].length, m.index + m[0].length + 110);
      // A bounded impairment band is never the standard upper band. Keep dose
      // ranges after the clearance units separate from the renal constraint itself.
      const renalTail = afterThreshold.split(/m[lL]\s*\/\s*min/i)[0];
      if (/^\s*(?:[-–—]|to\b|through\b)\s*(?:<|≤)?\s*\d/.test(renalTail)) return false;
      if (/(?:<|≤|less than|below|under|up to|no greater than|not more than)\s*\d/.test(renalTail)) return false;
      if (/(?:and|but|,)\s*(?:crcl\s*)?(?:<|≤|less than|below|under|up to|no greater than)\s*\d/.test(afterThreshold)) return false;
      return true;
    }

    function renalValueForClause(sentence, profile) {
      const metric = renalMetricInClause(sentence);
      if (metric === "crcl") return Number.isFinite(profile.crcl)
        ? { value: profile.crcl, metric, proxy: false }
        : { value: null, metric, proxy: false, missing: true };
      if (metric === "egfr") return Number.isFinite(profile.egfr)
        ? { value: profile.egfr, metric, proxy: false }
        : { value: null, metric, proxy: false, missing: true };
      if (metric === "gfr") return { value: null, metric, proxy: false, missing: true };
      // Generic "renal impairment" wording does not identify a measurable scale.
      // Do not invent a severity cutoff or silently interpret it as eGFR/CrCl.
      return { value: null, metric, proxy: false, unspecified: true, missing: true };
    }

    // Numeric branch grammar shared by renal and weight axes. Compare every
    // explicit endpoint; '>30-60' must not also match 90. No interpolation occurs.
    function amuNumericBranchFits(text, value) {
      if (!Number.isFinite(value)) return false;
      const input = normalizeLabelStructureText(text)
        .replace(/m[lL]\s*\/\s*min(?:ute)?(?:\s*\/\s*1\.73\s*m(?:2|²))?/gi, " ")
        .replace(/\b(?:kg|lbs?|pounds?)\b/gi, " ");
      const op = "(?:greater than or equal to|less than or equal to|no greater than|at least|at most|greater than|more than|less than|older than|younger than|above|below|under|over|>=|<=|≥|≤|>|<)";
      const n = "(\\d+(?:\\.\\d+)?)";
      const range = input.match(new RegExp("(" + op + ")?\\s*" + n + "\\s*(?:to|through|[-–—]|and)\\s*(" + op + ")?\\s*" + n, "i"));
      const fits = (operator, amount, lower) => {
        const cmp = String(operator || "").toLowerCase();
        if ([">", "greater than", "more than", "older than", "above", "over"].includes(cmp)) return value > amount;
        if (["<", "less than", "younger than", "below", "under"].includes(cmp)) return value < amount;
        if (["<=", "≤", "less than or equal to", "no greater than", "at most"].includes(cmp)) return value <= amount;
        if ([">=", "≥", "greater than or equal to", "at least"].includes(cmp)) return value >= amount;
        return lower ? value >= amount : value <= amount;
      };
      if (range) return fits(range[1], Number(range[2]), true) && fits(range[3], Number(range[4]), false);
      const threshold = input.match(new RegExp("(" + op + ")\\s*" + n, "i"));
      return threshold ? fits(threshold[1], Number(threshold[2]), true) : null;
    }

    function renalClauseFitsPatient(sentence, profile) {
      const s = normalizeLabelStructureText(sentence).toLowerCase();
      const renal = /\b(normal renal function|renal impairment|renal dysfunction|renal failure|creatinine clearance|\bcrcl\b|egfr|gfr|hemodialysis|haemodialysis|peritoneal dialysis|capd|apd|dialysis|anuric)\b/i.test(s);
      if (!renal) return true;

      const nonDialysis = /\b(?:not (?:on|receiving|undergoing)|without|not requiring)\s+(?:(?:regular|intermittent|chronic)\s+)?(?:hemodialysis|haemodialysis|dialysis)\b/.test(s);
      if (nonDialysis && profile.dialysis !== "none") return false;
      const renalText = nonDialysis ? s.replace(/\b(?:not (?:on|receiving|undergoing)|without|not requiring)\s+(?:(?:regular|intermittent|chronic)\s+)?(?:hemodialysis|haemodialysis|dialysis)\b/g, "") : s;
      if (/continuous renal replacement|\bcrrt\b/.test(renalText)) return profile.dialysis === "crrt";
      if (/peritoneal dialysis|\bcapd\b|\bapd\b/.test(renalText)) return profile.dialysis === "capd";
      if (/intermittent hemodialysis|hemodialysis|haemodialysis/.test(renalText)) return profile.dialysis === "hd";
      if (/\bdialysis\b/.test(renalText)) return profile.dialysis !== "none";
      if (nonDialysis && !/\b(?:crcl|creatinine clearance|egfr|gfr|renal impairment|renal dysfunction|renal failure)\b/.test(renalText)) return true;
      if (profile.dialysis !== "none") return false;

      if (/\b(?:no|not|without) normal renal function\b/.test(s)) return false;
      if (/\b(?:normal renal function|without renal impairment)\b/.test(s)
          && !/\b(?:crcl|creatinine clearance|egfr|gfr)\b/.test(s)) {
        return Number.isFinite(profile.crcl)
          ? profile.crcl >= 90 && profile.crcl <= 130
          : canAssumeNormalRenalFunction(profile);
      }
      const metricValue = renalValueForClause(s, profile);
      // A label statement that explicitly says no renal dose adjustment is needed
      // can be retained without quantifying impairment. Otherwise, an unspecified
      // renal metric is not eligible for numeric matching.
      if (metricValue.unspecified && /no\s+(?:dosage|dose)\s+adjustment\s+(?:is\s+)?(?:needed|required|recommended|necessary)/i.test(s)) return true;
      if (metricValue.missing || !Number.isFinite(metricValue.value)) {
        return canAssumeNormalRenalFunction(profile) && isStandardRenalBranch(s);
      }
      const value = metricValue.value;
      const metricPattern = /(?:crcl|creatinine clearance|egfr|gfr|renal function)/i;
      const metricMatch = metricPattern.exec(s);
      const tail = metricMatch ? s.slice(metricMatch.index, metricMatch.index + 130) : s;
      // Stop before administered amounts/schedule directives; a later dose range
      // or interval cannot become a renal measurement band.
      const doseAt = tail.search(/\b\d+(?:\.\d+)?(?:\s*(?:to|–|-)\s*\d+(?:\.\d+)?)?\s*(?:mg|mcg|g|grams?|units)\b/i);
      const directiveAt = tail.search(/\b(?:dose|dosage|administer|give|every|daily)\b/i);
      const stops = [doseAt, directiveAt].filter(at => at >= 0);
      const branch = stops.length ? tail.slice(0, Math.min(...stops)) : tail;
      const interval = amuNumericBranchFits(branch, value);
      if (interval !== null) return interval;

      // A non-numeric statement is not a computable threshold. This includes
      // qualitative "severe/moderate renal impairment" language.
      if (/no\s+(?:dosage|dose)\s+adjustment\s+(?:is\s+)?(?:needed|required|recommended|necessary)/i.test(s)) return true;
      return false;
    }

    function ageValueToYears(value, unit) {
      const amount = Number(value);
      if (/week/i.test(unit)) return amount / 52;
      return /month/i.test(unit) ? amount / 12 : amount;
    }

    function ageClauseFitsPatient(sentence, profile) {
      const s = normalizeLabelStructureText(sentence), age = profile.age;
      const n = "(\\d+(?:\\.\\d+)?)", u = "(months?|years?|weeks?)";
      const op = "(?:greater than or equal to|less than or equal to|no older than|not older than|no younger than|at least|at most|older than|younger than|greater than|less than|under|over|>=|<=|≥|≤|>|<)";
      // Treatment/course lengths are not age thresholds even in pediatric prose.
      const isAgeBound = (at, text) => !/\b(?:for|every|during|over|within)\s*$/i.test(s.slice(Math.max(0, at - 20), at))
        && !/^\s*(?:of treatment|of therapy|after|following)/i.test(s.slice(at + text.length));
      const compare = (operator, value, lower) => {
        const cmp = String(operator || "").toLowerCase();
        if ([">", "older than", "greater than", "over"].includes(cmp)) return age > value;
        if (["<", "younger than", "less than", "under"].includes(cmp)) return age < value;
        if (["<=", "≤", "less than or equal to", "no older than", "not older than", "at most"].includes(cmp)) return age <= value;
        if ([">=", "≥", "greater than or equal to", "no younger than", "at least"].includes(cmp)) return age >= value;
        return lower ? age >= value : age <= value;
      };
      const range = new RegExp("(" + op + ")?\\s*" + n + "\\s*" + u + "\\s*(?:to|through|[-–]|and)\\s*(" + op + ")?\\s*" + n + "\\s*" + u, "gi");
      for (const m of s.matchAll(range)) {
        if (isAgeBound(m.index, m[0]) && (!compare(m[1], ageValueToYears(m[2], m[3]), true)
            || !compare(m[4], ageValueToYears(m[5], m[6]), false))) return false;
      }
      const shared = new RegExp("(" + op + ")?\\s*" + n + "\\s*(?:to|through|[-–])\\s*(" + op + ")?\\s*" + n + "\\s*" + u, "gi");
      for (const m of s.matchAll(shared)) {
        if (isAgeBound(m.index, m[0]) && (!compare(m[1], ageValueToYears(m[2], m[5]), true)
            || !compare(m[3], ageValueToYears(m[4], m[5]), false))) return false;
      }
      const threshold = new RegExp("(" + op + ")\\s*" + n + "\\s*" + u, "gi");
      for (const m of s.matchAll(threshold)) {
        if (isAgeBound(m.index, m[0]) && !compare(m[1], ageValueToYears(m[2], m[3]), true)) return false;
      }
      const suffix = new RegExp(n + "\\s*" + u + "\\s*(?:of age\\s*)?(?:and|or)\\s*(older|above|over|younger|below|under)", "gi");
      for (const m of s.matchAll(suffix)) {
        const boundary = ageValueToYears(m[1], m[2]);
        if (isAgeBound(m.index, m[0]) && (/older|above|over/.test(m[3]) ? age < boundary : age > boundary)) return false;
      }
      const birth = s.match(new RegExp("\\b(?:from\\s+)?birth\\s+(?:through|to)\\s*" + n + "\\s*" + u, "i"));
      return !birth || age <= ageValueToYears(birth[1], birth[2]);
    }

    function weightClauseFitsPatient(sentence, profile) {
      const s = normalizeLabelStructureText(sentence);
      const n = "\\d+(?:\\.\\d+)?", unit = "(?:kg|lbs?\\.?|pounds?)";
      const op = "(?:greater than or equal to|less than or equal to|no greater than|at least|at most|up to|greater than|more than|less than|above|below|under|over|>=|<=|≥|≤|>|<)";
      const range = s.match(new RegExp("(?:" + op + ")?\\s*" + n + "\\s*(?:" + unit + ")?\\s*(?:to|through|[-–—]|and)\\s*(?:" + op + ")?\\s*" + n + "\\s*" + unit, "i"));
      const bound = range || s.match(new RegExp(op + "\\s*" + n + "\\s*" + unit, "i"));
      if (bound) {
        const value = /lbs?|pounds?/i.test(bound[0]) ? profile.weightKg * 2.20462 : profile.weightKg;
        return amuNumericBranchFits(bound[0].replace(/\bup to\b/gi, "at most"), value) !== false;
      }
      const suffix = s.match(new RegExp("(" + n + ")\\s*(" + unit + ")\\s*(or less|or below|or under|or more|or greater|and above|or higher)", "i"));
      if (suffix) {
        const value = /lbs?|pounds?/i.test(suffix[2]) ? profile.weightKg * 2.20462 : profile.weightKg;
        return /less|below|under/i.test(suffix[3]) ? value <= Number(suffix[1]) : value >= Number(suffix[1]);
      }
      // Numeric row values may inherit units from their own weight-axis header.
      const inherited = s.match(/\b(?:body weight|weight range|weight band|weight|weighing)\b\s*(?:\([^)]*\))?\s*:?\s*([^.;]{1,65})/i);
      if (inherited && /\b(?:kg|lbs?|pounds?)\b/i.test(s)) {
        const value = /\b(?:lbs?|pounds?)\b/i.test(s) ? profile.weightKg * 2.20462 : profile.weightKg;
        const fits = amuNumericBranchFits(inherited[1], value);
        if (fits !== null) return fits;
      }
      return true;
    }

    function neonatalAgeClauseFitsPatient(sentence, profile) {
      const s = String(sentence || "").toLowerCase();
      if (!/\b(gestational age|\bga\b|postnatal age|\bpna\b|preterm|premature|neonate|newborn)\b/i.test(s)) return true;
      if (profile.age >= 0.25) return true;
      if (!Number.isFinite(profile.gestationalAgeWeeks) || !Number.isFinite(profile.postnatalAgeDays)) return false;
      const ga = profile.gestationalAgeWeeks, pna = profile.postnatalAgeDays;
      const gaRange = s.match(/(?:gestational age|\bga\b)[^.;]{0,35}?(\d+(?:\.\d+)?)\s*(?:to|through|[-–])\s*(\d+(?:\.\d+)?)\s*weeks?/i);
      if (gaRange && (ga < Number(gaRange[1]) || ga > Number(gaRange[2]))) return false;
      const gaUnder = s.match(/(?:gestational age|\bga\b)[^.;]{0,35}?(?:less than|under|<)\s*(\d+(?:\.\d+)?)\s*weeks?/i);
      if (gaUnder && !(ga < Number(gaUnder[1]))) return false;
      const gaOver = s.match(/(?:gestational age|\bga\b)[^.;]{0,35}?(?:at least|greater than or equal to|>=|≥)\s*(\d+(?:\.\d+)?)\s*weeks?/i);
      if (gaOver && !(ga >= Number(gaOver[1]))) return false;
      const pnaRange = s.match(/(?:postnatal age|\bpna\b)[^.;]{0,35}?(\d+(?:\.\d+)?)\s*(?:to|through|[-–])\s*(\d+(?:\.\d+)?)\s*days?/i);
      if (pnaRange && (pna < Number(pnaRange[1]) || pna > Number(pnaRange[2]))) return false;
      const pnaUnder = s.match(/(?:postnatal age|\bpna\b)[^.;]{0,35}?(?:less than|under|<)\s*(\d+(?:\.\d+)?)\s*days?/i);
      if (pnaUnder && !(pna < Number(pnaUnder[1]))) return false;
      const pnaOver = s.match(/(?:postnatal age|\bpna\b)[^.;]{0,35}?(?:at least|greater than or equal to|>=|≥)\s*(\d+(?:\.\d+)?)\s*days?/i);
      if (pnaOver && !(pna >= Number(pnaOver[1]))) return false;
      return true;
    }

    function hepaticClauseFitsPatient(sentence, profile) {
      const s = normalizeLabelStructureText(sentence);
      const hepaticMention = /\b(hepatic impairment|child.pugh|cirrhosis|impaired liver function|liver impairment)\b/i.test(s);
      if (!hepaticMention) return true;
      const pc = String(profile.hepaticClass || "none").toUpperCase();
      if (!["A", "B", "C"].includes(pc)) return false;
      // Labels sometimes group classes (e.g. "Child-Pugh A or B") in one clause.
      // Preserve the full set instead of reading only the first class letter.
      const pughPhrase = (s.match(/child[ -]?pugh[^.;]{0,50}/i) || [""])[0];
      const pughClasses = [...pughPhrase.matchAll(/\b([abc])\b/gi)].map(m => m[1].toUpperCase());
      if (pughClasses.length) return pughClasses.includes(pc);
      const severityClasses = [];
      if (/\b(severe|severely|class c)\b/i.test(s)) severityClasses.push("C");
      if (/\b(moderate|moderately|class b)\b/i.test(s)) severityClasses.push("B");
      if (/\b(mild|mildly|class a)\b/i.test(s)) severityClasses.push("A");
      if (severityClasses.length) return severityClasses.includes(pc);
      // A generic hepatic-impairment clause can only be considered when the user
      // selected a known Child-Pugh class; it cannot establish which class a label meant.
      return profile.hepatic === true;
    }

    function dosingClauseFitsPatient(sentence, profile) {
      const s = normalizeLabelStructureText(sentence);
      const pediatricTerms = /\b(pediatric|paediatric|children|child|infant|neonate|newborn|birth to|months of age|years of age)\b/i.test(s);
      const adultTerms = /\b(adult|adults|adult patients)\b/i.test(s);
      const adolescentTerms = /\b(adolescent|adolescents)\b/i.test(s);
      if (!profile.pediatric && pediatricTerms && !adultTerms && !adolescentTerms) return false;
      if (profile.pediatric && adultTerms && !pediatricTerms && !adolescentTerms) return false;
      if (!ageClauseFitsPatient(sentence, profile)) return false;
      if (!neonatalAgeClauseFitsPatient(sentence, profile)) return false;
      if (!weightClauseFitsPatient(sentence, profile)) return false;
      if (!profile.pregnancy && /\b(pregnan(?:t|cy)|maternal|during labor|during labour)\b/i.test(s)) return false;
      if (/\b(hepatic impairment|child.pugh|cirrhosis|impaired liver function|liver impairment)\b/i.test(s) && sentenceHasDoseDirective(s) && !hepaticClauseFitsPatient(s, profile)) return false;
      return renalClauseFitsPatient(sentence, profile);
    }

    function filterDosingTextByPhysiology(text) {
      const profile = getActiveDosingPhysiology();
      const sentences = splitLabelSentences(text).flatMap(sentence => splitDoseAlternatives(sentence));
      if (!sentences.length) return String(text || "").trim();
      const filtered = [];
      let populationBranch = null, ageBranch = null, renalBranch = null, weightBranch = null, hepaticBranch = false, pregnancyBranch = false;
      sentences.forEach(sentence => {
        const s = normalizeLabelStructureText(sentence);
        const trimmed = sentence.trim();
        const isNumberedHeading = /^\s*(?:\(?\d+(?:\.\d+)*\)?\s+)/.test(trimmed);
        const isHeading = /^(?:\(?\d+(?:\.\d+)*\)?\s*)?[A-Z0-9][^.!?]{0,110}[.:]?\s*$/.test(trimmed) && !sentenceHasDoseDirective(sentence);
        if (isHeading && isNumberedHeading) {
          populationBranch = null; ageBranch = null; renalBranch = null; weightBranch = null; hepaticBranch = false; pregnancyBranch = false;
        }
        if (isHeading) {
          if (/\b(pediatric|paediatric|children|child|infant|neonate|newborn)\b/i.test(s)) populationBranch = "pediatric";
          else if (/\b(adult|adults)\b/i.test(s)) populationBranch = "adult";
          if (/\b(age|aged|months?|years?|older than|younger than|at least)\b/i.test(s) && /\d/.test(s)) ageBranch = s;
          if (/\b(renal impairment|renal dysfunction|renal failure|hemodialysis|dialysis|creatinine clearance|crcl)\b/i.test(s)) renalBranch = s;
          if (/\b(weight|weighing|body weight)\b/i.test(s)) weightBranch = s;
          if (/\b(hepatic impairment|child.pugh|cirrhosis|liver impairment)\b/i.test(s)) hepaticBranch = true;
          if (/\b(pregnan(?:t|cy)|maternal)\b/i.test(s)) pregnancyBranch = true;
        }
        let keep = dosingClauseFitsPatient(sentence, profile);
        if (!profile.pediatric && populationBranch === "pediatric") keep = false;
        if (profile.pediatric && populationBranch === "adult") keep = false;
        if (ageBranch && sentenceHasDoseDirective(sentence)) keep = keep && ageClauseFitsPatient(ageBranch + " " + sentence, profile);
        if (!profile.hepatic && hepaticBranch && sentenceHasDoseDirective(sentence)) keep = false;
        if (!profile.pregnancy && pregnancyBranch && sentenceHasDoseDirective(sentence)) keep = false;
        if (renalBranch && /\b(dose|dosage|administer|mg|mcg|units)\b/i.test(sentence)) keep = keep && renalClauseFitsPatient(renalBranch + " " + sentence, profile);
        if (weightBranch && /\b(dose|dosage|administer|mg|mcg|units|weigh|weight)\b/i.test(sentence)) keep = keep && weightClauseFitsPatient(weightBranch + " " + sentence, profile);
        if (keep) filtered.push(sentence);
      });
      return filtered.join(" ").trim();
    }

    function extractContextualDosingSection(rawText, context) {
      const compact = String(rawText || "").replace(/\s+/g, " ").trim();
      if (!compact) return "";
      if (!context || !context.keywords?.length) return filterDosingTextByPhysiology(compact);

      // Prefer indication-specific FDA numbered subsections. Keep the entire matched
      // subsection so the dose sentence retains its heading and qualifiers.
      const subsections = compact.split(/(?=\b(?:1|2|3)\.\d+(?:\.\d+)?\s+[A-Z])/g).map(x => x.trim()).filter(Boolean);
      let selected = "";
      if (subsections.length > 1) {
        selected = subsections.filter(section => context.keywords.some(k => textContainsClinicalKeyword(section, k))).join(" ");
      } else {
        const sentences = splitLabelSentences(compact);
        const hitIndexes = [];
        sentences.forEach((sentence, index) => {
          if (context.keywords.some(k => textContainsClinicalKeyword(sentence, k))) hitIndexes.push(index);
        });
        const keep = new Set();
        hitIndexes.forEach(index => {
          keep.add(index);
          // FDA labels often put the disease in a heading, then the dosing directive
          // in the next sentence. Include only the immediate local dosing continuation.
          for (let j = index + 1; j < Math.min(sentences.length, index + 3); j++) {
            if (/^\s*(?:2|3)\.\d+\s+[A-Z]/.test(sentences[j])) break;
            if (sentenceHasDoseDirective(sentences[j])) keep.add(j);
            else if (j > index + 1 && !/\b(?:dose|dosage|administer|patients|recommended|given)\b/i.test(sentences[j])) break;
          }
        });
        selected = [...keep].sort((a,b) => a-b).map(i => sentences[i]).join(" ");
      }
      if (!selected) return "";
      return filterDosingTextByPhysiology(selected);
    }

    function splitLabelSentences(rawText) {
      const normalized = String(rawText || "").replace(/\s+/g, " ").trim()
        .replace(/\s+(?=(?:\(?\d+\.\d+(?:\.\d+)?\)?\s+[A-Z]))/g, "\n")
        .replace(/(?<=[.!?;])\s+(?=(?:ADULTS?\b|PEDIATRIC PATIENTS?\b|PAEDIATRIC PATIENTS?\b|GERIATRIC PATIENTS?\b|PATIENTS WITH (?:RENAL|HEPATIC) IMPAIRMENT\b|DOSAGE IN (?:RENAL|HEPATIC) IMPAIRMENT\b))/gi, "\n");
      return normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9(])|\n+/g).map(x => x.trim()).filter(Boolean);
    }

    function cleanDosingSentence(sentence) {
      let out = String(sentence || "").trim();
      // Drop a long FDA subsection heading when the actual directive follows it.
      const directive = out.search(/\b(administer|give|the recommended (?:dose|dosage)|recommended (?:dose|dosage)|patients should receive|dose is|dosage is)\b/i);
      if (directive > 60) out = out.slice(directive).trim();
      // Administration time is part of the labeled regimen; preserve it in the
      // evidence and structured summary as well as in the route popup.
      // Keep course duration attached to its own regimen when the label provides it.
      return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").replace(/\s+\./g, ".").trim();
    }

    function compactDosingDirective(sentence, routeHint) {
      const source = cleanDosingSentence(sentence);
      if (!source) return "";
      // Without a resolved disease/patient context the clause's own label ("Adults:", "Complicated intra-abdominal
      // infections:") is the only thing telling the reader which regimen this is, so it stays in front of the dose.
      const leadMatch = source.match(/^(?:\d+(?:\.\d+)*\s+)?([A-Z][^:;—–\d]{1,80}?)\s*[:—–]\s+(?=\S)/);
      if (leadMatch && !/^(?:DOSAGE AND ADMINISTRATION)$/i.test(leadMatch[1].trim())) {
        const rest = source.slice(leadMatch[0].length);
        const conciseRest = amuCompactRegimen(rest, { routeHint });
        if (conciseRest) return leadMatch[1].trim() + ": " + conciseRest;
      }
      const concise = amuCompactRegimen(source, { routeHint });
      if (concise) return concise;
      // Not safely compressible: show the clause as written (never cut mid-word or mid-number).
      return source.length <= 260 ? source : amuClipAtBoundary(source, 240);
    }

    function splitDoseAlternatives(sentence) {
      const parts = String(sentence || "").split(/\s+(?:or|;|\bor alternatively\b)\s+/i).map(x => x.trim()).filter(Boolean);
      if (parts.length < 2) return [String(sentence || "").trim()];
      const doseRe = /\b\d+(?:\.\d+)?\s*(?:mg\/kg(?:\/day)?|mcg\/kg(?:\/day)?|mg\/(?:m2|m²)(?:\/(?:day|dose))?|mg|g|grams|mcg|units)(?![A-Za-z0-9²/])/i;
      if (parts.every(part => doseRe.test(part))) return parts;
      return [String(sentence || "").trim()];
    }

    function distillSection1Dosing(rawText, context, structuredIndex, labelProvenance) {
      const source = String(rawText || "").replace(/\s+/g, " ").trim();
      if (!source) return [{ color: "amber", tag: "Dosing Source", text: "No matching FDA dose was found for the selected infection and patient filters." }];

      const dosePattern = /\b\d+(?:\.\d+)?\s*(?:mg\/kg(?:\/day)?|mcg\/kg(?:\/day)?|mg|g|grams|mcg|units)\b/i;
      const candidates = [];
      const sentences = splitLabelSentences(source);
      sentences.forEach((sentence, index) => {
        if (!dosePattern.test(sentence)) return;
        if (/\b(?:do not administer|not recommended|should not be used|not indicated)\b/i.test(sentence)) return;
        let combined = sentence;
        const hasRouteOrFrequency = /\b(intravenously|intravenous|orally|oral|iv|po|im|intramuscular|subcutaneous|subcutaneously|every\s+\d+\s+hours?|q\d+h|once\s+daily|twice\s+daily|three\s+times\s+daily|daily|bid|tid|qid)\b/i.test(sentence);
        if (!hasRouteOrFrequency && index + 1 < sentences.length && /\b(intravenously|intravenous|orally|oral|iv|po|im|intramuscular|subcutaneous|subcutaneously|every\s+\d+\s+hours?|q\d+h|once\s+daily|twice\s+daily|daily)\b/i.test(sentences[index + 1])) {
          combined += " " + sentences[index + 1];
        }
        splitDoseAlternatives(combined).forEach(variant => {
          const cleaned = cleanDosingSentence(variant);
          if (cleaned && !candidates.includes(cleaned)) candidates.push(cleaned);
        });
      });

      const bullets = [];
      if (candidates.length) {
        candidates.slice(0, 8).forEach((sentence, index) => {
          const key = normalizeClinicalKeyword(sentence);
          const sourceCandidate = (structuredIndex?.candidates || []).find(c => c.sourceType === "prose" &&
            (normalizeClinicalKeyword(c.sourceText) === key || key.includes(normalizeClinicalKeyword(c.sourceText))));
          bullets.push({
            color: "blue",
            tag: candidates.length > 1 ? `Regimen ${index + 1}` : (context ? "Context-Matched Regimen" : "FDA Regimen"),
            text: compactDosingDirective(sentence),
            evidence: sourceCandidate ? [{ sourceType: sourceCandidate.sourceType, sourceField: sourceCandidate.sourceField,
              sourceText: sourceCandidate.sourceText, sourceOffset: sourceCandidate.sourceIndex, candidateId: sourceCandidate.id,
              qualifiers: sourceCandidate.qualifiers }] : [],
            labelProvenance: labelProvenance || {}
          });
        });
      } else {
        const fallback = extractCleanSentence(source, context?.keywords?.[0] || "", 150);
        bullets.push({
          color: "amber",
          tag: "Dose Not Parsed",
          text: fallback ? compactDosingDirective(fallback) : "No concise dose-and-frequency instruction could be extracted from the matched FDA text. Open the section for the source wording."
        });
      }

      const durationMatches = [...source.matchAll(/\b(?:for\s+)?\d+\s*(?:to|–|-)\s*\d+\s*(?:days|weeks)|\bfor\s+\d+\s*(?:days|weeks)/gi)]
        .map(m => m[0].trim().replace(/^for\s+/i, ""));
      const uniqueDurations = [...new Set(durationMatches)];
      const candidatesCarryDuration = candidates.some(sentence => /\bfor\s+\d+(?:\s*(?:to|–|-)\s*\d+)?\s*(?:days|weeks)\b/i.test(sentence));
      if (!candidatesCarryDuration && uniqueDurations.length === 1) {
        bullets.push({ color: "emerald", tag: "Course Window", text: uniqueDurations[0] });
      } else if (!candidatesCarryDuration && uniqueDurations.length > 1) {
        bullets.push({ color: "emerald", tag: "Duration Options", text: uniqueDurations.slice(0, 4).join("; ") });
      }
      return bullets.slice(0, 9);
    }

    // =========================================================================
    // v1.10: CONCISE REGIMEN FORMATTER, FDA TABLE READER, POPULATION-CLAUSE SPLITTER
    // =========================================================================

    // ---- 1. Concise regimen formatter -------------------------------------------------
    // Turns one regimen clause into "dose frequency [for duration] (route)", e.g.
    //   "Adults—a single injection of 1,200,000 units"  ->  "1,200,000 units, single dose (IM)"
    //   "500 mg every 12 hours or 250 mg every 8 hours"  ->  "500 mg q12h or 250 mg q8h (PO)"
    // Returns null (never a guess) when the clause is not safely compressible: mixed populations,
    // mixed severities, sequential steps (loading -> maintenance), several routes, or > 4 doses.
    const AMU_NUM = "\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?|\\.\\d+";
    const AMU_UNIT = "(?:million\\s+units|(?:mg|mcg|g|units|grams?|milligrams?|micrograms?)(?:\\/(?:kg|m2|m²))?(?:\\/(?:day|dose|24\\s*hours?))?|IU)";
    function amuDoseRegex() {
      return new RegExp("(" + AMU_NUM + ")(?:\\s*(?:to|–|-|—)\\s*(" + AMU_NUM + "))?\\s*(" + AMU_UNIT + ")(?![A-Za-z])", "gi");
    }
    function amuNormUnit(u) {
      return String(u).toLowerCase().replace(/^grams?\b/, "g").replace(/^milligrams?\b/, "mg").replace(/^micrograms?\b/, "mcg").replace(/\s+/g, " ");
    }
    // Returns every distinct frequency mentioned (non-overlapping, most specific wording first).
    function amuFindFrequencies(seg) {
      const defs = [
        [/\bevery\s+(\d+(?:\.\d+)?)(?:\s*(?:to|–|-)\s*(\d+(?:\.\d+)?))?\s*(?:hours?|hrs?|h)\b/gi, m => (!m[2] && Number(m[1]) === 24) ? "once daily" : "q" + m[1] + (m[2] ? "–" + m[2] : "") + "h"],
        [/\bq\s?(\d+)\s?h\b/gi, m => "q" + m[1] + "h"],
        [/\bevery\s+(\d+)\s*(days?|weeks?)\b/gi, m => "q" + m[1] + (/week/i.test(m[2]) ? "wk" : "d")],
        [/\bonce\s+(?:a\s+|per\s+)?(?:day|daily)\b|\bevery\s+day\b/gi, () => "once daily"],
        [/\b(?:twice|two\s+times)\s+(?:a\s+day|daily|per\s+day)\b|\bbid\b|\bb\.i\.d\b/gi, () => "BID"],
        [/\b(?:three\s+times|3\s+times)\s+(?:a\s+day|daily|per\s+day)\b|\btid\b|\bt\.i\.d\b/gi, () => "TID"],
        [/\b(?:four\s+times|4\s+times)\s+(?:a\s+day|daily|per\s+day)\b|\bqid\b|\bq\.i\.d\b/gi, () => "QID"],
        [/\b(?:once|one time)\s+(?:a|per|each)\s+week\b|\bonce weekly\b/gi, () => "once weekly"],
        [/\b(?:twice|two times|2 times)\s+(?:a|per|each)\s+week\b|\btwice weekly\b/gi, () => "twice weekly"],
        [/\b(?:three|3)\s+times\s+(?:a|per|each)\s+week\b/gi, () => "three times weekly"],
        [/\b(?:five|5)\s+times\s+(?:a day|daily|per day)\b/gi, () => "five times daily"],
        [/\bevery\s+other\s+day\b/gi, () => "every other day"],
        [/\bdaily\b|\ba\s+day\b|\bper\s+day\b/gi, () => "daily"],
        [/\bsingle\b|\bone[- ]time\b|\bone\s+dose\b/gi, () => "single dose"]
      ];
      const taken = [], hits = [];
      defs.forEach(([re, fn]) => {
        let m;
        while ((m = re.exec(seg)) !== null) {
          const a = m.index, b = a + m[0].length;
          if (taken.some(t => a < t[1] && b > t[0])) continue;
          taken.push([a, b]);
          hits.push({ index: a, label: fn(m) });
        }
      });
      hits.sort((x, y) => x.index - y.index);
      const labels = [];
      hits.forEach(h => { if (!labels.includes(h.label)) labels.push(h.label); });
      return { labels, firstIndex: hits.length ? hits[0].index : null };
    }
    function amuFindRoutes(text) {
      const set = new Set();
      if (/\b(?:intravenous(?:ly)?|iv)\b/i.test(text)) set.add("IV");
      if (/\b(?:intramuscular(?:ly)?|im)\b/i.test(text)) set.add("IM");
      if (/\b(?:subcutaneous(?:ly)?|sc|subq)\b/i.test(text)) set.add("SC");
      if (/\b(?:orally|oral|by mouth|po)\b/i.test(text)) set.add("PO");
      return [...set];
    }
    function amuRouteAbbrev(route) {
      const v = String(route || "").toLowerCase();
      const set = new Set();
      if (/intravenous|\biv\b/.test(v)) set.add("IV");
      if (/intramuscular|\bim\b/.test(v)) set.add("IM");
      if (/subcutaneous/.test(v)) set.add("SC");
      if (/\boral\b/.test(v)) set.add("PO");
      return set.size === 1 ? [...set][0] : "";
    }
    function amuCompactRegimen(rawText, opts) {
      opts = opts || {};
      const text = String(rawText || "").replace(/\s+/g, " ").trim();
      if (!text) return null;
      // Not safely compressible -> caller keeps the "complex" flag instead of showing a distorted line.
      if (/\badults?\b/i.test(text) && /\b(?:pediatric|paediatric|children|child|infants?|neonates?)\b/i.test(text)) return null;
      const severityPhrase = text.match(/\bmild\s+to\s+moderately\s+severe\b/i);
      if (/\b(?:mild|moderate)\b/i.test(text) && /\bsevere\b/i.test(text)
          && (!severityPhrase || /\bsevere\b/i.test(text.replace(severityPhrase[0], "")))) return null;
      if (/\b(?:then|followed by|thereafter|subsequent(?:ly)?|loading|maintenance|day\s*1\b|days?\s*2\b|step[- ]down)\b/i.test(text)) return null;
      if (/\b(?:prior to|before|after|following|during|until|at the end of|at bedtime)\b/i.test(text)) return null; // timing qualifiers cannot be dropped
      const routes = amuFindRoutes(text);
      if (routes.length > 1) return null;
      if (/\b\d+(?:\.\d+)?\s*(?:mg|g)\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|g)\b/i.test(text)) return null;

      const re = amuDoseRegex();
      const matches = [];
      let m;
      while ((m = re.exec(text)) !== null) matches.push({ index: m.index, end: m.index + m[0].length, lo: m[1], hi: m[2], unit: amuNormUnit(m[3]) });
      if (!matches.length) return null;

      const equivalents = new Map();
      const primaryMatches = matches.filter((d, i) => {
        if (!i) return true;
        const prev = matches[i - 1];
        const gap = text.slice(prev.end, d.index);
        const after = text.slice(d.end);
        const massThenUnits = /^(?:mg|mcg|g)$/.test(prev.unit) && /^(?:million units|units|iu)$/.test(d.unit);
        if (massThenUnits && /^\s*\(\s*(?:(?:equivalent to|equivalent|about|approximately)\s+)?$/i.test(gap) && /^\s*\)/.test(after)) {
          equivalents.set(prev, { text: text.slice(d.index, d.end).trim(), end: d.end + after.match(/^\s*\)/)[0].length });
          return false;
        }
        return true;
      });
      const atoms = [], maxes = [];
      for (let i = 0; i < primaryMatches.length; i++) {
        const d = primaryMatches[i];
        const equivalent = equivalents.get(d);
        const seg = text.slice(equivalent?.end || d.end, i + 1 < primaryMatches.length ? primaryMatches[i + 1].index : text.length);
        const before = text.slice(Math.max(0, d.index - 32), d.index);
        const dose = (d.hi ? d.lo + "–" + d.hi : d.lo) + " " + d.unit + (equivalent ? " (" + equivalent.text + ")" : "");
        if (/(?:maxim(?:um|al)|max\.?|not to exceed|up to|no more than)[^.;]{0,22}$/i.test(before)) { maxes.push(dose); continue; }
        // consecutive doses must be alternatives ("or" / ";"), not companions ("and") or steps
        if (atoms.length) {
          const prevSeg = atoms[atoms.length - 1].seg;
          if (!/\bor\b|\balternatively\b|;/i.test(prevSeg)) return null;
        }
        const fq = amuFindFrequencies(seg);
        if (fq.labels.length > 1) return null; // e.g. "once a day (or in divided doses twice a day)": an alternative we would otherwise drop
        const divIdx = seg.search(/\bdivided\b/i);
        atoms.push({ dose, unitKind: /\/kg/.test(d.unit) ? "perkg" : "abs", seg, freq: fq.labels[0] || null,
          divided: divIdx >= 0 && (fq.firstIndex === null || divIdx < fq.firstIndex) });
      }
      if (!atoms.length || atoms.length > 4) return null;
      if (new Set(atoms.map(a => a.unitKind)).size > 1) return null; // adult-style and per-kg doses mixed in one clause
      if (atoms.every(a => !a.freq)) {
        const whole = amuFindFrequencies(text).labels;
        if (whole.length === 1) atoms.forEach(a => { a.freq = whole[0]; });
        else if (whole.length > 1) return null;
      }

      const seen = new Set();
      const parts = [];
      atoms.forEach(a => {
        const piece = a.dose + (a.divided ? " divided" : "") + (a.freq ? (a.freq === "single dose" ? ", single dose" : " " + a.freq) : "");
        if (!seen.has(piece)) { seen.add(piece); parts.push(piece); }
      });
      let out = parts.join(" or ");
      if (severityPhrase) out += " [mild to moderately severe]";
      if (maxes.length) out += " (max " + [...new Set(maxes)].join(" or ") + ")";
      const dur = text.match(/\bfor\s+(?:at\s+least\s+|a\s+minimum\s+of\s+)?(\d+(?:\s*(?:to|–|-)\s*\d+)?)\s*(days?|weeks?)\b/i);
      if (dur) out += " for " + dur[1].replace(/\s*(?:to|–|-)\s*/i, "–").replace(/\s+/g, "") + " " + dur[2].toLowerCase();
      const route = routes[0] || opts.routeHint || "";
      if (route) out += " (" + route + ")";
      return out.length > 170 ? null : out;
    }

    // Header-only quantities are bound to their own column. A numeric range is kept as
    // a range; no interpolation, product-strength inference or dose calculation occurs.
    function amuIsNumericAmount(text) {
      return /^\s*(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?|\.\d+)(?:\s*(?:to|through|–|-)\s*(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?|\.\d+))?\s*$/.test(String(text || ""));
    }
    function amuHeaderDoseUnit(header) {
      const h = String(header || "").replace(/\s*\/\s*/g, "/");
      // Concentration, preparation and infusion-rate units do not describe an administered amount.
      if (/\/(?:\d*\s*m[lL]|min(?:ute)?|hour|hr)/i.test(h)) return "";
      const match = h.match(/\b(?:million\s+units|mg|mcg|g|grams?|milligrams?|micrograms?|units|IU)(?:\/(?:kg|m2|m²))?(?:\/(?:day|dose|24\s*hours?))?(?![a-z0-9²/])/i);
      return match ? match[0].replace(/\s+/g, " ") : "";
    }
    function amuExpandHeaderQuantity(value, header, role) {
      const v = String(value || "").trim(), h = String(header || "");
      if (!amuIsNumericAmount(v)) return v;
      if (["dose", "maximum"].includes(role)) {
        const unit = amuHeaderDoseUnit(h);
        return unit ? `${v} ${unit}` : v;
      }
      const time = h.match(/\b(hours?|hrs?|minutes?|mins?|days?|weeks?)\b/i)?.[0];
      if (!time) return v;
      if (role === "interval") return `every ${v} ${time}`;
      if (role === "duration") return `for ${v} ${time}`;
      if (role === "infusion") return `${v} ${time}`;
      return v;
    }
    function amuPatientAxisScope(header, value) {
      const h = String(header || ""), v = String(value || "").trim();
      if (!v) return h;
      const ageUnit = h.match(/\b(years?|months?|weeks?|days?)\b/i)?.[0];
      const weightUnit = h.match(/\b(kg|lbs?|pounds?)\b/i)?.[0];
      if (/\bage\b/i.test(h) && ageUnit && !/\b(year|month|week|day)/i.test(v)) return `${h}: ${v} ${ageUnit}`;
      if (/\bweight\b/i.test(h) && weightUnit && !/\b(kg|lb|pound)/i.test(v)) return `${h}: ${v} ${weightUnit}`;
      return `${h}: ${v}`;
    }
    // Numeric age bands in table rows often inherit their units from the header.
    // Evaluate that axis directly rather than hoping a prose regex sees the same syntax.
    function amuTablePatientAxesFit(headers, row, columns, profile) {
      return columns.every(i => {
        const h = String(headers[i] || ""), v = String(row?.[i] || "").trim();
        if (!v) return true;
        const unit = h.match(/\b(years?|months?|weeks?|days?)\b/i)?.[0];
        if (!/\bage\b/i.test(h) || !unit || /gestational|postnatal/i.test(h)) return dosingClauseFitsPatient(amuPatientAxisScope(h, v), profile);
        const age = /month/i.test(unit) ? profile.age * 12 : /week/i.test(unit) ? profile.age * 52 : /day/i.test(unit) ? profile.age * 365.25 : profile.age;
        const band = v.match(/^\s*(\d+(?:\.\d+)?)\s*(to|through|–|-)\s*(?:(less than|under|<)\s*)?(\d+(?:\.\d+)?)\s*$/i);
        if (band) return age >= Number(band[1]) && (band[3] ? age < Number(band[4]) : age <= Number(band[4]));
        const threshold = v.match(/^\s*(>=|≥|>|<=|≤|<|at least|less than|under|older than|younger than)\s*(\d+(?:\.\d+)?)\s*$/i);
        if (threshold) {
          const n = Number(threshold[2]), op = threshold[1].toLowerCase();
          if ([">=", "≥", "at least"].includes(op)) return age >= n;
          if ([">", "older than"].includes(op)) return age > n;
          if (["<=", "≤"].includes(op)) return age <= n;
          return age < n;
        }
        // Unknown numeric age-axis syntax cannot establish patient applicability.
        return !/\d/.test(v) && dosingClauseFitsPatient(amuPatientAxisScope(h, v), profile);
      });
    }

    // Additional structures are distinct because removing their qualifiers changes
    // meaning. The catalogue stores only patterns; all amounts stay in live label evidence.
    const ADAPTIVE_ADDITIONAL_FORMATS = [
      { family: "treatment_versus_prophylaxis_axis", re: /\b(?:treatment|therapeutic)\b[\s\S]{0,220}\b(?:prophylaxis|prevention)\b|\b(?:prophylaxis|prevention)\b[\s\S]{0,220}\b(?:treatment|therapeutic)\b/i, strategy: "Match treatment intent before dose selection; a preventive regimen cannot substitute for an active-infection regimen." },
      { family: "course_total_or_dispensing_quantity", re: /\b(?:total (?:mg|ml) per treatment course|number of (?:bottles|capsules)|to dispense|total course volume)\b/i, strategy: "Course totals and supply counts are separate from administered doses. Never promote the final course-total or capsule-supply column into a dose." },
      { family: "paired_component_mass_expression", re: /\b\d+(?:\.\d+)?\s*(?:mg|g)\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|g)\b/i, strategy: "Keep slash-separated component amounts in their labeled order and preserve the ingredient-pair header. Do not turn the pair into alternatives or add their masses." },
      { family: "colocated_induction_and_maintenance_sequence", re: /\b(?:induction|maintenance):[\s\S]{0,300}\b(?:induction|maintenance):/i, strategy: "A headerless two-column table is recognized only when each row explicitly binds a clinical indication to a complete dose-and-schedule cell; preserve every phase." },
      { family: "shared_unit_dose_alternatives", re: /\b\d+(?:\.\d+)?\s+or\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|units)\b/i, strategy: "Retain every amount when a single unit is shared by alternatives; do not interpret only the final number as the administered dose." },
      { family: "same_dose_alternative_routes", re: /\b(?:intravenous(?:ly)?|oral(?:ly)?|intramuscular(?:ly)?)\s+or\s+(?:intravenous(?:ly)?|oral(?:ly)?|intramuscular(?:ly)?)\b/i, strategy: "When one labeled dose explicitly applies to alternative routes, retain the complete route choice rather than selecting a route by guesswork." },
      { family: "active_moiety_equivalence", re: /\b(?:equivalent to|corresponds? to|expressed as)\b[^.;]{0,100}\b(?:mg|g|units)\b/i, strategy: "Keep prodrug/salt amount and active-moiety equivalent attached; do not count an equivalence as a second administered dose." },
      { family: "mass_and_activity_equivalence", re: /\b\d[\d,.]*(?:\s*(?:to|–|-)\s*\d[\d,.]*)?\s*mg\s*\([^)]*\d[\d,.]*\s*(?:million\s+)?units\b/i, strategy: "A parenthetical activity-unit equivalent belongs to the mass dose beside it; preserve both representations without treating them as alternatives." },
      { family: "phase_specific_treatment_sequence", re: /\b(?:induction|consolidation|suppressive therapy|suppression|continuation phase|intensive phase)\b/i, strategy: "Keep treatment phases separate and ordered. A maintenance/suppression dose must not replace the induction regimen." },
      { family: "calendar_day_or_week_schedule", re: /\b(?:on\s+days?\s+\d|days?\s+\d+\s*(?:through|to|–|-)\s*\d|weeks?\s+\d+\s*(?:through|to|–|-)\s*\d)/i, strategy: "Retain the explicit treatment-day/week schedule, including gaps, repeats and stop windows; do not convert it to a uniform daily interval." },
      { family: "intermittent_schedule_minimum_spacing", re: /\b(?:two|three|four|2|3|4)\s+times\s+(?:a|per|each)\s+week\b|\b(?:at least|minimum of)\s*\d+\s*hours?\s+(?:apart|between doses)\b/i, strategy: "Preserve weekly frequency together with minimum spacing between doses; a three-times-weekly schedule is not every 48 hours." },
      { family: "response_or_event_anchored_duration", re: /\b(?:for\s+at least|continue|continued|treatment|therapy)\b[^.;]{0,160}\b(?:after (?:the )?(?:last|first)|until|resolution|negative cultures?|defervescence|clinical response)\b/i, strategy: "Bind duration to the stated event or response; do not replace culture-clearance or symptom-resolution conditions with a fixed course." },
      { family: "route_transition_or_step_down", re: /\b(?:switch(?:ed|ing)? to|transition(?:ed|ing)? to|step[- ]down|followed by oral|intravenous to oral)\b/i, strategy: "Keep initial route, switch criteria and subsequent route-specific dose distinct; do not imply milligram-for-milligram substitution." },
      { family: "formulation_release_specific_regimen", re: /\b(?:extended[- ]release|delayed[- ]release|immediate[- ]release|gastro[- ]resistant|oral granules|for oral suspension)\b/i, strategy: "Bind the regimen to release type and dosage form; shared active ingredient does not establish interchangeability." },
      { family: "susceptibility_or_mic_condition", re: /\b(?:minimum inhibitory concentration|mic\s*(?:of|[<>=≤≥])|susceptibility[- ]directed|susceptible isolate)\b/i, strategy: "Preserve organism and MIC/susceptibility conditions with the regimen. Missing susceptibility data cannot establish the conditional branch." },
      { family: "coadministered_regimen_requirement", re: /\b(?:in combination with|coadminister(?:ed)? with|concomitantly with|together with)\b[^.;]{0,120}\b(?:antibiotic|antimicrobial|rifampin|isoniazid|clarithromycin|amoxicillin|metronidazole|ethambutol|pyrazinamide)\b/i, strategy: "Keep companion-drug requirements and each component's amount separate; a combination regimen must not be presented as monotherapy." },
      { family: "local_site_or_device_administration", re: /\b(?:intrathecal|intraventricular|ophthalmic|otic|intravaginal|inhalation|nebuliz|affected eye|affected ear|each nostril)\b/i, strategy: "Preserve local administration site, drops/application count and device/formulation; do not transfer local concentrations to systemic dosing." },
      { family: "reconstitution_dilution_preparation_matrix", re: /\b(?:reconstitution|reconstitut(?:ed|ion)|diluent|final concentration|withdrawal volume|volume to withdraw|volume of diluent)\b/i, strategy: "Treat reconstitution and dilution tables as preparation instructions, not independent administered-dose regimens." },
      { family: "combination_ratio_or_component_basis", re: /\b(?:based on (?:the )?(?:trimethoprim|amoxicillin|piperacillin|imipenem|ampicillin)|(?:trimethoprim|amoxicillin|piperacillin|imipenem|ampicillin) component|fixed[- ]ratio)\b/i, strategy: "Record which active component defines the dose; never substitute total combination mass for the named component amount." },
      { family: "missed_dose_or_repeat_after_emesis", re: /\b(?:missed dose|vomit(?:s|ed|ing)? within|repeat (?:the )?dose|do not repeat)\b/i, strategy: "Keep missed-dose and emesis-triggered redosing separate from the routine schedule; apply only when the triggering event is known." }
    ];

    function amuStructuredRegimenSummary(rawText, opts = {}) {
      const text = String(rawText || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 600 || !RESOLVER_DOSE_RE.test(text)) return null;
      if (/\b(?:see (?:table|section)|refer to table|as directed|individualize|individualized|dose should be adjusted)\b/i.test(text)) return null;
      if (/\badults?\b/i.test(text) && /\b(?:pediatric|paediatric|children|infants?|neonates?)\b/i.test(text)) return null;
      const structured = /\b(?:loading|maintenance|followed by|thereafter|then|divided|infusion|Severity|with food|with meals|empty stomach|fasting|based on|component|equivalent|not to exceed|maximum)\b/i.test(text)
        || ADAPTIVE_ADDITIONAL_FORMATS.some(f => f.re.test(text));
      const hasSchedule = amuFindFrequencies(text).labels.length > 0 || /\b(?:on )?days?\s+\d|\bweeks?\s+\d|\bInterval:\s*(?:every|\d)|\/day\b/i.test(text);
      if (!structured || !hasSchedule) return null;
      // An exact bounded extract is the structured representation: every step, cap,
      // food/timing qualifier and component is retained verbatim. No arithmetic occurs.
      const routes = amuFindRoutes(text);
      const route = routes.length ? "" : (opts.routeHint || "");
      return text + (route ? ` (${route})` : "");
    }
    function amuPresentRegimen(text, opts) {
      // Concision cannot silently discard a required administration or phase constraint.
      const preserve = /\b(?:loading|maintenance|followed by|thereafter|then|infusion|Severity|with food|with meals|empty stomach|fasting|based on|component|equivalent|after the last|until|divided)\b/i.test(text)
        || ADAPTIVE_ADDITIONAL_FORMATS.some(f => f.family !== "mass_and_activity_equivalence" && f.re.test(text));
      return preserve ? amuStructuredRegimenSummary(text, opts) : (amuCompactRegimen(text, opts) || amuStructuredRegimenSummary(text, opts));
    }


    // Last-resort clip for text that cannot be compacted: never cuts mid-word or mid-number.
    function amuClipAtBoundary(text, max) {
      const s = String(text || "").trim();
      if (s.length <= max) return s;
      const cut = s.slice(0, max);
      const b = Math.max(cut.lastIndexOf("; "), cut.lastIndexOf(", "), cut.lastIndexOf(". "));
      return (b > 60 ? cut.slice(0, b) : cut.slice(0, cut.lastIndexOf(" "))).trimEnd() + " … (see full text)";
    }

    // ---- 2. openFDA table reader ------------------------------------------------------
    // openFDA delivers label tables in separate "<section>_table" HTML fields, so the plain text of
    // dosage_and_administration often has the caption ("Table 1") but none of the doses.
    function amuDecodeEntities(s) {
      return String(s)
        .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
    }
    function amuHtmlCellText(s) {
      // Preserve exponents (m², 10⁶) and adjacent word fragments inside SPL
      // <content> tags; footnote markers are handled separately by the table reader.
      return amuDecodeEntities(String(s)
        .replace(/(m|10)\s*<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, base, inner) => {
          const n = amuDecodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
          return base + (/^[0-9+\-]+$/.test(n) ? n.split("").map(c => ({ "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" })[c] || c).join("") : "");
        })
        .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
        .replace(/<\/?(?:paragraph|p|div|li|footnote|linkHtml)\b[^>]*>|<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, ""))
        .replace(/[\u200b\ufeff]/g, "").replace(/\s+/g, " ").trim();
    }
    // SPL uses TDs for headers, empty self-closing cells and several nested
    // header rows. Expand spans before determining roles; keep title/section
    // scope separate so a title containing a dose never becomes a dose column.
    function amuParseHtmlTable(html) {
      const inlineNotes = [...String(html || "").matchAll(/<footnote\b[^>]*>([\s\S]*?)<\/footnote>/gi)].map(m => amuHtmlCellText(m[1])).filter(Boolean);
      const footerNotes = [...String(html || "").matchAll(/<tfoot\b[^>]*>([\s\S]*?)<\/tfoot>/gi)].map(m => amuHtmlCellText(m[1])).filter(Boolean);
      const bodyHtml = String(html || "").replace(/<tfoot\b[^>]*>[\s\S]*?<\/tfoot>/gi, "");
      const rowsHtml = [...bodyHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
      if (rowsHtml.length < 2) return null;
      const spans = [], grid = [], metadata = [];
      rowsHtml.forEach(rh => {
        const cells = [...rh.matchAll(/<(t[hd])\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/\1\s*>)/gi)];
        if (!cells.length) return;
        const row = [], originals = []; let c = 0;
        const consumeSpans = () => {
          while (spans[c] && spans[c].left > 0) {
            row[c] = spans[c].text; spans[c].left--; c++;
          }
        };
        cells.forEach(cm => {
          consumeSpans();
          const text = amuHtmlCellText(String(cm[3] || "").replace(/<footnote\b[^>]*>[\s\S]*?<\/footnote>/gi, ""));
          const rs = Math.min(1000, Math.max(1, parseInt((cm[2].match(/rowspan\s*=\s*["']?(\d+)/i) || [])[1] || "1", 10)));
          const cs = Math.min(64, Math.max(1, parseInt((cm[2].match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || "1", 10)));
          originals.push({ text, col: c, colspan: cs, rowspan: rs, th: cm[1].toLowerCase() === "th" });
          for (let k = 0; k < cs; k++) {
            row[c] = text; spans[c] = rs > 1 ? { text, left: rs - 1 } : null; c++;
          }
        });
        // A row may end before a later rowspan column. Retain that column's
        // position, including genuinely empty cells between occupied spans.
        while (c < spans.length) {
          if (spans[c] && spans[c].left > 0) { row[c] = spans[c].text; spans[c].left--; }
          else if (row[c] === undefined) row[c] = "";
          c++;
        }
        grid.push(row); metadata.push(originals);
      });
      if (grid.length < 2) return null;
      const width = Math.max(...grid.map(r => r.length));
      const headerRole = /\b(?:indications?|infections?|dos(?:e|es|age)|dosing|regimen|frequency|interval|duration|route|infusion|adult(?:s)?|pediatric|paediatric|patients?|age|weight|kilograms?|pounds|creatinine|clearance|renal|egfr|gfr|crcl|percent|volume|concentration|strength|formulation|loading|maintenance|weeks?\s*\d|days?\s*\d)\b/i;
      const doseValue = s => /\b\d+(?:\.\d+)?\s*[-]?\s*(?:mg|mcg|g|grams?|units|IU)\b(?!\s*\/\s*\d*\s*mL)/i.test(s);
      const dataLike = (row, originals) => {
        if (originals.length && originals.every(c => c.th)) return false;
        const own = originals.filter(c => c.text);
        if (own.length && own.every(c => /^(?:\d+(?:\.\d+)?\s*kg\s*(?:or less|or more)|(?:greater|less) than\s*\d+(?:\.\d+)?\s*kg)$/i.test(c.text))) return false;
        if (own.some(c => /^\s*\d+(?:\.\d+)?/.test(c.text)
          && !/^\s*\d+(?:\.\d+)?[- ]day\s+(?:regimen|schedule)\b/i.test(c.text)
          && !/^\s*\d+(?:\.\d+)?\s*mg\s*\/\s*(?:\d+(?:\.\d+)?\s*)?mL\b/i.test(c.text))) return true;
        if (row.some(s => /\b(?:creatinine clearance|CrCl|eGFR|GFR)\b[^;]{0,35}(?:[<>≤≥]|less than|greater than)\s*\d/i.test(s || ""))) return true;
        // Bare quantities, renal thresholds and weight ranges are data even
        // where the unit was specified exclusively in the header above.
        if (row.some(s => /^\s*(?:[<>≤≥]|less than|greater than|under|over)?\s*\d+(?:\.\d+)?(?:\s*(?:to|through|–|-)\s*\d+(?:\.\d+)?)?\s*(?:%|kg|lbs?|mL\s*\/\s*min)?\s*(?:\([^)]*\))?\s*$/i.test(s || ""))) return true;
        return originals.some(c => doseValue(c.text) && !/\b(?:concentration|strength|mg\s*\/\s*(?:\d+\s*)?mL|\d+\s*mg\s*\/\s*(?:\d+\s*)?mL)\b/i.test(c.text));
      };
      const isSingleScope = originals => {
        const nonempty = originals.filter(c => c.text);
        return nonempty.length === 1 && nonempty[0].colspan >= width;
      };
      let start = -1;
      for (let i = 0; i < Math.min(grid.length, 14); i++) {
        const own = metadata[i].filter(c => c.text);
        if (isSingleScope(metadata[i])) continue;
        if (own.length >= 2 && own.some(c => headerRole.test(c.text)) && !dataLike(grid[i], metadata[i])) { start = i; break; }
        if (metadata[i].every(c => c.th) && own.length) { start = i; break; }
      }
      if (start < 0) {
        const contentRows = grid.map((row, i) => ({ row, originals: metadata[i] })).filter(x => !isSingleScope(x.originals) && x.row.some(Boolean));
        const explicitIndication = /\b(?:treatment|prevention|prophylaxis|infection|retinitis|pneumonia|meningitis|influenza|malaria)\b/i;
        if (width === 2 && contentRows.length >= 2 && contentRows.every(x => explicitIndication.test(x.row[0] || "")
            && RESOLVER_DOSE_RE.test(x.row[1] || "") && amuFindFrequencies(x.row[1] || "").labels.length)) {
          const title = grid.filter((row, i) => isSingleScope(metadata[i])).map(row => [...new Set(row.filter(Boolean))].join(" ")).join(" ");
          return { headers: ["Indication", "Labeled dosage regimen"], rows: contentRows.map(x => x.row), title, headerContext: title,
            rowScopes: contentRows.map(() => ""), notes: [...new Set([...footerNotes, ...inlineNotes])], inferredHeaderRoles: true };
        }
        return null;
      }
      let end = start + 1;
      while (end < grid.length) {
        if (isSingleScope(metadata[end]) || dataLike(grid[end], metadata[end])) break;
        const nonempty = grid[end].filter(Boolean);
        if (!nonempty.length) { end++; continue; }
        // Remaining nested labels can be routes, age/weight bands or disease
        // columns (e.g. CrCl × cSSSI/bacteremia). They contain no dose payload.
        if (metadata[end].every(c => c.th) || nonempty.some(s => headerRole.test(s))
            || metadata[end].some(c => /\b(?:bold|underline)\b/i.test(rowsHtml[end] || ""))) { end++; continue; }
        break;
      }
      const headers = [];
      for (let c = 0; c < width; c++) {
        const parts = grid.slice(start, end).map(r => r[c] || "").filter((x, i, a) => x && a.indexOf(x) === i);
        headers.push(parts.filter((x, i) => !(i < parts.length - 1 && /^dosage,?\s+route,?\s+and\s+frequency of administration$/i.test(x))).join(" ").trim());
      }
      const titles = grid.slice(0, start).map(r => [...new Set(r.filter(Boolean))].join(" ")).filter(Boolean);
      const rows = [], rowScopes = [], notes = [...new Set([...footerNotes, ...inlineNotes])];
      let section = "";
      for (let i = end; i < grid.length; i++) {
        const originals = metadata[i], text = [...new Set(grid[i].filter(Boolean))].join(" ");
        if (!text) continue;
        if (isSingleScope(originals)) {
          const isNote = /^(?:[*†‡]|[a-z]\s|note\b|calculate\b|administer\b|all doses\b|either\b|for patients\b)/i.test(text);
          if (isNote) { notes.push(text); continue; }
          if (!doseValue(text)) { section = text; continue; }
        }
        rows.push(Array.from({ length: width }, (_, c) => grid[i][c] || ""));
        rowScopes.push(section);
      }
      if (!rows.length) return null;
      return { headers, rows, title: titles.join(" "), headerContext: titles.join(" "), rowScopes, notes };
    }

    function amuTableToPlainText(tbl, n) {
      if (!tbl) return "";
      return ["[Table " + n + "] " + (tbl.title ? tbl.title + " — " : "") + tbl.headers.join(" | ")]
        .concat(tbl.rows.map((r, i) => (tbl.rowScopes?.[i] ? tbl.rowScopes[i] + " — " : "") + r.join(" | ")))
        .concat((tbl.notes || []).map(note => "Table note: " + note)).join("\n");
    }

    // Some SPL exports leave only reference markers in table HTML and place the
    // corresponding footnote prose in dosage_and_administration. Bind by an exact,
    // unique table-body match and the nearest local definition of the same marker.
    // Reused asterisks in distant renal/dialysis tables must not cross-bind.
    function amuBindSourceFootnotes(tbl, rawDosing) {
      const tableText = amuDecodeEntities(String(tbl.rawHtml || "").replace(/<[^>]+>/g, " "));
      const markers = [...new Set(tableText.match(/\*{1,3}|[§†‡¶]/g) || [])];
      if (!markers.length || !rawDosing) return [];
      const normalized = value => {
        let text = ""; const offsets = [];
        String(value).split("").forEach((ch, i) => {
          const space = /[\s§†‡¶*]/.test(ch);
          if (space && (!text || text.endsWith(" "))) return;
          text += space ? " " : ch.toLowerCase(); offsets.push(i);
        });
        return { text: text.trimEnd(), offsets };
      };
      const raw = String(rawDosing), source = normalized(raw);
      const anchor = normalized((tbl.rows || []).map(row => row.join(" ")).join(" ")).text;
      if (anchor.length < 60) return [];
      const at = source.text.indexOf(anchor);
      if (at < 0 || source.text.indexOf(anchor, at + 1) >= 0) return [];
      const bodyStart = source.offsets[at], bodyEnd = source.offsets[at + anchor.length - 1] + 1;
      const definitions = [...raw.matchAll(/(?:^|[\s(.;])(\*{1,3}|[§†‡¶])\s*(?=(?:For|In|Or|On|Use|Administer|Do|Only|No|Intramuscular|Intravenous)\b)/gi)]
        .map(m => ({ marker: m[1], at: m.index + m[0].indexOf(m[1]) }));
      const notes = [];
      markers.forEach(marker => {
        const nearby = definitions.filter(d => d.marker === marker && (d.at < bodyStart || d.at >= bodyEnd))
          .map(d => ({ ...d, distance: d.at < bodyStart ? bodyStart - d.at : d.at - bodyEnd }))
          .filter(d => d.distance <= 900).sort((a, b) => a.distance - b.distance);
        if (!nearby.length || (nearby[1] && nearby[0].distance === nearby[1].distance)) return;
        const definition = nearby[0];
        let end = definitions.find(d => d.at > definition.at)?.at ?? raw.length;
        if (definition.at < bodyStart) end = Math.min(end, bodyStart);
        const tail = raw.slice(definition.at + marker.length, end);
        const boundary = tail.search(/\b(?:\d+\.\d+(?:\.\d+)*\s+[A-Z]|Table\s+\d+\s*[:.]|Recommended\s+(?:Dosage|Dosing)|Site\s+and\s+Type\s+of\s+Infection|Pediatric\s+Patients)\b/);
        if (boundary >= 0) end = definition.at + marker.length + boundary;
        const between = definition.at < bodyStart ? raw.slice(end, bodyStart) : raw.slice(bodyEnd, definition.at);
        if (/\b\d+\.\d+(?:\.\d+)*\s+[A-Z]/.test(between)) return;
        const note = raw.slice(definition.at, end).trim();
        if (note.length > marker.length + 8 && !(tbl.notes || []).some(existing => normalized(existing).text.includes(normalized(note).text))) notes.push(note);
      });
      return notes;
    }

    // A table's explicit outer population heading may exist only in the flattened
    // dosage section. Associate it only through a unique, exact body-text match.
    function amuBindTablePopulationScope(tbl, rawDosing) {
      const compact = t => String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
      const raw = compact(rawDosing);
      if (!raw) return "";
      const anchor = compact((tbl.rows || []).slice(0, 2).map(r => r.join(" ")).join(" "));
      if (anchor.length < 45) return "";
      const at = raw.indexOf(anchor);
      if (at < 0 || raw.indexOf(anchor, at + 1) >= 0) return "";
      const prefix = raw.slice(0, at);
      let found = "";
      const heading = /\b(?:(\d+\.\d+(?:\.\d+)*)\s+)?(adult patients|pediatric patients|paediatric patients|adults|children)\b/gi;
      for (const m of prefix.matchAll(heading)) {
        const after = prefix.slice(m.index + m[0].length);
        const explicit = !!m[1] || /^(?:\s*(?:\([^)]*\)|\[[^\]]*\]))*\s*(?:infection|indication|recommended dose|dosage|table)\b/i.test(after);
        if (explicit) found = m[2];
      }
      return found;
    }


    // Some SPL summary tables put an indication in a full-width section row and
    // adult/pediatric schedules in the following row. The parser retains that exact
    // section association in rowScopes; an arbitrary nearby label indication is never used.
    function amuBuildSectionScopedTableUnits(tbl, structure, context, profile, primaryDoseCols) {
      const out = [], keys = resolverExpandKeywords(context.keywords || []);
      const headers = tbl.headers || [], dims = structure.dimensions;
      const commonCols = [...new Set([...(dims.frequency || []), ...(dims.duration || []), ...(dims.maximum || []), ...(dims.route || []), ...(dims.infusionTime || [])])];
      (tbl.rows || []).forEach((row, rowIndex) => {
        const scope = [...new Set([tbl.caption || "", tbl.title || "", tbl.rowScopes?.[rowIndex] || ""].filter(Boolean))].join(" — ").trim();
        const relevant = scope && keys.some(k => resolverHasKeyword(resolverHay(scope), k));
        if (!relevant) return;
        const dualIntent = headers.some(h => /\btreatment\b/i.test(h)) && headers.some(h => /\bprophylaxis\b/i.test(h));
        const other = resolverIndicationTermsIn(scope).filter(t => !resolverTermIsContext(t, keys) && !(dualIntent && t === "prophylaxis"));
        if (other.length) { out.skippedRelevant = true; return; }
        const requestedIntent = amuContextTreatmentIntent(context);
        if (!amuHeaderMatchesTreatmentIntent(scope, requestedIntent)) return;
        const fitted = primaryDoseCols.filter(i => amuHeaderMatchesTreatmentIntent(headers[i], requestedIntent)
          && tableCellLooksLikeDose(row?.[i], headers[i], headers.join(" "))
          && dosingClauseFitsPatient(`${headers[i]} ${scope} ${row?.[i] || ""}`, profile));
        const phaseCols = [...(dims.treatmentPhase || []), ...(dims.dayAxis || [])];
        const orderedPhases = fitted.length > 1 && fitted.every(i => phaseCols.includes(i));
        if (fitted.length !== 1 && !orderedPhases) { out.skippedRelevant = true; return; }
        const patientColumns = (dims.population || []).filter(i => !primaryDoseCols.includes(i));
        if (!amuTablePatientAxesFit(headers, row, patientColumns, profile)) return;
        const pieces = fitted.map(i => (orderedPhases ? `${headers[i]}: ` : "") + amuExpandHeaderQuantity(row[i], headers[i], "dose"));
        if (!orderedPhases) {
          const headerDuration = headers[fitted[0]].match(/\bfor\s+\d+(?:\s*(?:to|–|-)\s*\d+)?\s*(?:days?|weeks?)\b/i)?.[0];
          if (headerDuration && !pieces.some(x => x.toLowerCase().includes(headerDuration.toLowerCase()))) pieces.push(headerDuration);
        }
        commonCols.filter(i => !fitted.includes(i)).forEach(i => {
          const role = dims.infusionTime.includes(i) ? "Infusion" : dims.duration.includes(i) ? "Duration" : dims.maximum.includes(i) ? "Maximum" : dims.route.includes(i) ? "Route" : "Interval";
          const value = amuExpandHeaderQuantity(row?.[i], headers[i], role.toLowerCase());
          if (value) pieces.push(`${role}: ${value}`);
        });
        const doseText = pieces.join("; "), sourceText = headers.map((h, i) => `${h}: ${row[i] || ""}`).join(" | ");
        const scopeText = `${scope} — ${doseText}`;
        out.push({ text: scopeText, hasDose: true, rel: 2, fits: true, renalBranch: RESOLVER_RENAL.test(scopeText), fromTable: true,
          doseText, severity: "", tableFamily: structure.family,
          source: { sourceType: "table_row", sourceField: tbl.sourceField || "dosage_and_administration_table", tableIndex: tbl.sourceIndex ?? null, rowIndex,
            sourceText, sourceHeading: `${headers[fitted[0]]} — ${scope}`, tableFamily: structure.family, tableNotes: tbl.notes || "" },
          qualifiers: { ...extractAdaptiveQualifiers(`${headers[fitted[0]]} ${scopeText}`), isProphylaxis: requestedIntent === "prophylaxis", treatmentIntent: requestedIntent }, doseComponents: extractDoseComponents(scopeText)
        });
      });
      return out;
    }


    // One regimen unit per table row, using only the dose column that applies to the active patient.
    // Skips (returns nothing for) any table whose columns cannot be told apart safely.
    function buildTableRegimenUnits(tables, context, profile, rawIndications = "", rawDosing = "") {
      const units = [];
      if (!tables || !tables.length || !context) return units;
      const ctxKeys = resolverExpandKeywords(context.keywords || []);
      const indicationHay = resolverHay(rawIndications);
      const labelSupportsContext = ctxKeys.some(k => textContainsClinicalKeyword(rawIndications, k) || resolverHasKeyword(indicationHay, k));
      const doseRole = h => /\b(dose|dosage|regimen|amount)\b/i.test(h);
      const maxRole = h => /\b(max(?:imum)?|up to a maximum)\b/i.test(h);
      const frequencyRole = h => /\b(interval|frequency|dosing interval|administration interval)\b/i.test(h) && !/\b(?:dose|dosage|regimen)\b/i.test(h);
      const durationRole = h => /\b(duration|days? of treatment|course length|treatment length)\b/i.test(h) && !/infusion|\b(?:dose|dosage|regimen)\b/i.test(h);
      const indicationRole = h => /\b(infections?|indications?|conditions?|diseases?|syndromes?|diagnoses?|type of infection|organisms?)\b/i.test(h);
      const isDoseCell = (cell, header, full) => tableCellLooksLikeDose(cell, header, full);
      const addUnresolvedRenalMatrix = (tbl, structure, relevant) => {
        if (!relevant || canAssumeNormalRenalFunction(profile)) return;
        units.skippedRelevant = true;
        units.renalMatrixUnlinked = true;
        const crclMentioned = /\b(?:crcl|creatinine clearance)\b/i.test((tbl.headers || []).join(" ") + " " + (tbl.rows || []).map(r => r.join(" ")).join(" "));
        if (crclMentioned && !Number.isFinite(profile.crcl) && profile.dialysis === "none") units.requiresCrClValue = true;
        units.renalMatrixEvidence = units.renalMatrixEvidence || [];
        units.renalMatrixEvidence.push({ family: structure.family, headers: tbl.headers || [], sourceIndex: tbl.sourceIndex ?? null });
      };

      tables.forEach(tbl => {
        const headers = tbl.headers || [];
        const rows = tbl.rows || [];
        const rawTableNotes = tbl.rawHtml ? amuHtmlCellText(String(tbl.rawHtml)) : "";
        const full = String(tbl.caption || "") + " | " + headers.join(" | ") + " | " + rows.map(r => r.join(" | ")).join(" | ") + " | " + rawTableNotes;
        const structure = classifyAdaptiveTableStructure(tbl);
        const populationScope = amuBindTablePopulationScope(tbl, rawDosing);
        const dims = structure.dimensions;
        const indCols = dims.indication.slice();
        // Identify columns carrying dosage payloads. Dose, max, frequency and duration
        // are separate dimensions and are recombined from the same row.
        let primaryDoseCols = headers.map((h, i) => i).filter(i => !dims.renal.includes(i) && (!indCols.includes(i) || doseRole(headers[i]) || dims.renal.length > 0)
          && !maxRole(headers[i]) && !frequencyRole(headers[i]) && !durationRole(headers[i])
          && !amuNonAdministeredQuantityHeader(headers[i])
          && !/\b(?:concentration|strength|mg\s*\/\s*(?:\d+\s*)?m[lL]|volume|infusion time|infusion duration)\b/i.test(headers[i])
          && (doseRole(headers[i]) || rows.some(r => isDoseCell(r?.[i], headers[i], full))));
        const maxCols = headers.map((h, i) => i).filter(i => maxRole(headers[i]));
        const frequencyCols = headers.map((h, i) => i).filter(i => frequencyRole(headers[i]));
        const durationCols = headers.map((h, i) => i).filter(i => durationRole(headers[i]) && !/infusion/i.test(headers[i]));
        const routeCols = headers.map((h, i) => i).filter(i => /\b(route|administration route)\b/i.test(headers[i]));
        const infusionCols = dims.infusionTime || [];
        const patientAxisCols = (dims.population || []).filter(i => !primaryDoseCols.includes(i));
        const severityCols = dims.severity || [];
        const renalCols = dims.renal || [];
        const indicationHeaderText = indCols.map(i => headers[i]).join(" ");
        const rowContextMatches = row => {
          const label = indCols.map(i => row?.[i] || "").join(" ");
          return ctxKeys.some(k => resolverHasKeyword(resolverHay(label), k));
        };
        const anyRowContext = rows.some(rowContextMatches);
        const headerContextSpecific = headers.some(h => RESOLVER_INDICATION_TERMS.some(term => resolverHasKeyword(resolverHay(h), term)));
        const tableMentionsContext = anyRowContext || (headerContextSpecific && ctxKeys.some(k => headers.some(h => resolverHasKeyword(resolverHay(h), k))));

        // Renal matrices can put CrCl bands on rows OR on columns. A matrix without an
        // indication-linked dose column is an adjustment layer, not a standalone regimen.
        const renalMatrix = renalCols.length > 0 && (structure.family === "renal_adjustment_matrix" || structure.family === "baseline_to_renal_adjustment_matrix" || structure.family === "renal_percent_interval_matrix" || structure.family === "renal_relative_dose_adjustment_table" || structure.family === "renal_regimen_option_matrix" || structure.axes.rowAxisRenal || structure.axes.columnAxisRenal);
        const hasIndicationLinkedRenalColumns = renalMatrix && primaryDoseCols.some(i => {
          const h = headers[i];
          return /\ball indications\b|\bnosocomial pneumonia\b|\ball indications except\b/i.test(h)
            || RESOLVER_INDICATION_TERMS.some(term => resolverHasKeyword(resolverHay(h), term));
        });

        if (renalMatrix && !hasIndicationLinkedRenalColumns) {
          // This captures levofloxacin/fluconazole-style baseline-dose × CrCl tables and
          // meropenem/daptomycin-style CrCl-row adjustment tables. They must be linked to
          // a separately context-matched base regimen before any final dose is shown.
          const relevant = labelSupportsContext || tableMentionsContext || !indCols.length;
          addUnresolvedRenalMatrix(tbl, structure, relevant);
          return;
        }

        // Piptazo-style tables: CrCl is a row axis; dosage columns are indication scopes
        // such as "all indications except nosocomial pneumonia" and "nosocomial pneumonia".
        if (renalMatrix && hasIndicationLinkedRenalColumns) {
          if (!Number.isFinite(profile.crcl) && profile.dialysis === "none" && !canAssumeNormalRenalFunction(profile)) {
            if (labelSupportsContext || tableMentionsContext) {
              units.skippedRelevant = true;
              units.requiresCrClValue = true;
            }
            return;
          }
          const renalAxisCol = renalCols[0];
          const labelCols = [renalAxisCol, ...indCols];
          const indicationDoseCols = primaryDoseCols;
          rows.forEach((row, rowIndex) => {
            const renalBand = String(row?.[renalAxisCol] || "").trim();
            const renalScope = headers[renalAxisCol] + " " + renalBand;
            if (!renalBand) return;
            const specificity = ["nosocomial", "hospital acquired", "community acquired", "ventilator associated"];
            const columnMatchesContext = scope => {
              const normalizedScope = normalizeClinicalKeyword(scope);
              // Qualifiers materially change the disease category; generic "pneumonia"
              // must not match a specifically nosocomial column (or vice versa).
              for (const q of specificity) {
                if (normalizedScope.includes(q) && !ctxKeys.some(k => normalizeClinicalKeyword(k).includes(q))) return false;
              }
              const terms = RESOLVER_INDICATION_TERMS.filter(term => resolverHasKeyword(resolverHay(scope), term));
              return terms.length ? terms.some(term => resolverTermIsContext(term, ctxKeys)) : false;
            };
            let selectedCols = indicationDoseCols.filter(i => {
              const h = headers[i];
              if (/all indications.{0,15}except/i.test(h)) {
                const excluded = h.match(/all indications\s*(?:\(\s*except\s+|except\s+)(.+?)(?:\)|$)/i)?.[1] || "";
                // If the active context is simply "pneumonia" and the exclusion is
                // "nosocomial pneumonia", the app cannot infer which pneumonia type
                // the user means. Block the catch-all branch until the subtype is clear.
                const excludedTerms = resolverIndicationTermsIn(excluded);
                const activeTerms = RESOLVER_INDICATION_TERMS.filter(term => ctxKeys.some(k => resolverHasKeyword(resolverHay(k), term)));
                const sharedCategory = excludedTerms.some(term => activeTerms.some(active => active === term || active.includes(term) || term.includes(active)));
                const excludedQualifier = specificity.find(q => normalizeClinicalKeyword(excluded).includes(q));
                const activeQualifier = specificity.find(q => ctxKeys.some(k => normalizeClinicalKeyword(k).includes(q)));
                const ambiguousExclusion = sharedCategory && excludedQualifier && !activeQualifier;
                return !!labelSupportsContext && !ambiguousExclusion && (!excluded || !columnMatchesContext(excluded));
              }
              return columnMatchesContext(h);
            });
            if (selectedCols.length !== 1) {
              if (labelSupportsContext || tableMentionsContext) addUnresolvedRenalMatrix(tbl, structure, true);
              return;
            }
            const col = selectedCols[0];
            const doseText = String(row?.[col] || "").trim();
            if (!doseText) return;
            let normalizedDose = doseText;
            if (/total\s+grams?/i.test(full) && !/\b(?:mg|g|grams|mcg|units)\b/i.test(normalizedDose)) normalizedDose = normalizedDose.replace(/^(\d+(?:\.\d+)?)/, "$1 g");
            const scopeText = renalScope + " " + headers[col] + " " + normalizedDose;
            const fits = renalClauseFitsPatient(scopeText, profile) && dosingClauseFitsPatient(scopeText, profile);
            units.push({
              text: scopeText, hasDose: true, rel: 2, fits, renalBranch: true, fromTable: true,
              doseText: normalizedDose, severity: "", tableFamily: structure.family,
              source: { sourceType: "table_row", sourceField: tbl.sourceField || "dosage_and_administration_table", tableIndex: tbl.sourceIndex ?? null, rowIndex,
                sourceText: headers.map((h, i) => `${h}: ${row[i] || ""}`).filter(Boolean).join(" | "),
                sourceHeading: headers[col] + " — " + renalScope, tableFamily: structure.family },
              qualifiers: extractAdaptiveQualifiers(scopeText), doseComponents: extractDoseComponents(scopeText), weightBasis: extractAdaptiveQualifiers(scopeText).weightBasis
            });
          });
          return;
        }

        // A classic indication-by-row or indication-by-population table.
        if (!indCols.length) {
          const sectionUnits = amuBuildSectionScopedTableUnits(tbl, structure, context, profile, primaryDoseCols);
          if (sectionUnits.length) { units.push(...sectionUnits); return; }
          if (sectionUnits.skippedRelevant) units.skippedRelevant = true;
          // New label formats may be weight-band conversions or complete regimen-option
          // schedules whose indication is supplied by a nearby subsection rather than a
          // table column. We index them, but do not assign them to a disease by guesswork.
          const contextDependentUnbound = ["weight_band_dose_volume_matrix", "weight_band_dose_matrix", "alternative_regimen_schedule_matrix", "procedure_phase_prophylaxis_matrix", "multi_component_dose_matrix", "phase_specific_treatment_matrix", "day_indexed_treatment_schedule", "body_surface_area_dose_matrix"].includes(structure.family);
          if (contextDependentUnbound && labelSupportsContext) {
            units.skippedRelevant = true;
            units.unboundStructuredTables = units.unboundStructuredTables || [];
            units.unboundStructuredTables.push({ family: structure.family, sourceIndex: tbl.sourceIndex ?? null, caption: tbl.caption || "", headers: headers.slice() });
          }
          // If no indication axis is found, don't guess that an arbitrary first column is a disease.
          return;
        }
        const hasRelevantRow = rows.some(row => rowContextMatches(row));
        if (!hasRelevantRow && !labelSupportsContext) return;
        if (!primaryDoseCols.length) {
          if (hasRelevantRow) units.skippedRelevant = true;
          return;
        }

        rows.forEach((row, rowIndex) => {
          const label = indCols.map(i => row?.[i] || "").filter(Boolean).join(" ").trim();
          if (!label || !amuHeaderMatchesTreatmentIntent(label, amuContextTreatmentIntent(context))) return;
          const hay = resolverHay(label);
          const ctxOwn = ctxKeys.some(k => resolverHasKeyword(hay, k));
          const otherTerms = resolverIndicationTermsIn(label).filter(term => !resolverTermIsContext(term, ctxKeys));
          // A single structured row explicitly groups the indications that share this regimen.
          // Unlike a free-form mixed sentence, this is a coherent table association.
          const rel = ctxOwn ? 2 : (otherTerms.length ? 0 : 1);

          const fittingDoseCols = primaryDoseCols.filter(i => amuHeaderMatchesTreatmentIntent(headers[i], amuContextTreatmentIntent(context)) && dosingClauseFitsPatient(headers[i] + " " + (row?.[i] || "") + " " + label, profile));
          const componentDoseCols = fittingDoseCols.filter(i => /\b(sulfamethoxazole|trimethoprim|piperacillin|tazobactam|amoxicillin|clavulanate|ampicillin|sulbactam|imipenem|cilastatin|quinupristin|dalfopristin|ceftazidime|avibactam|ceftolozane|vaborbactam|relebactam|durlobactam|ticarcillin)\b/i.test(headers[i] + " " + (row?.[i] || "")));
          const isExplicitComponentPair = componentDoseCols.length >= 2 && componentDoseCols.length === fittingDoseCols.length;
          if (fittingDoseCols.length !== 1 && !isExplicitComponentPair) {
            if (rel === 2 && fittingDoseCols.length !== 1) units.skippedRelevant = true;
            return;
          }
          const doseCol = fittingDoseCols[0];
          const pieces = [];
          if (isExplicitComponentPair) {
            componentDoseCols.forEach(i => {
              let componentDose = String(row?.[i] || "").trim();
              if (!componentDose) return;
              componentDose = amuExpandHeaderQuantity(componentDose, headers[i], "dose");
              pieces.push(headers[i] + ": " + componentDose);
            });
          } else {
            let mainDose = String(row?.[doseCol] || "").trim();
            if (!mainDose || !isDoseCell(mainDose, headers[doseCol], full)) return;
            mainDose = amuExpandHeaderQuantity(mainDose, headers[doseCol], "dose");
            pieces.push(mainDose);
          }
          const addColumn = (col, prefix) => {
            const rawValue = String(row?.[col] || "").trim();
            const value = amuExpandHeaderQuantity(rawValue, headers[col], prefix.toLowerCase());
            if (value && !pieces.some(x => x.toLowerCase() === value.toLowerCase())) pieces.push(`${prefix}: ${value}`);
          };
          maxCols.forEach(i => addColumn(i, "Maximum"));
          frequencyCols.forEach(i => addColumn(i, "Interval"));
          durationCols.forEach(i => addColumn(i, "Duration"));
          routeCols.forEach(i => addColumn(i, "Route"));
          severityCols.forEach(i => addColumn(i, "Severity"));
          infusionCols.forEach(i => addColumn(i, "Infusion"));
          const patientScope = patientAxisCols.map(i => amuPatientAxisScope(headers[i], row?.[i])).join("; ");
          const scopeHeaders = [populationScope, tbl.title || tbl.caption || "", headers[doseCol], ...[...maxCols, ...frequencyCols, ...durationCols, ...routeCols, ...severityCols].map(i => headers[i])].join(" ");
          const combined = pieces.join("; ");
          const scopeText = label + " — " + combined;
          const fits = dosingClauseFitsPatient(scopeHeaders + " " + patientScope + " " + scopeText, profile)
            && amuTablePatientAxesFit(headers, row, patientAxisCols, profile);
          units.push({
            text: scopeText, hasDose: true, rel, fits, scopeHeaders,
            renalBranch: RESOLVER_RENAL.test(scopeHeaders + " " + scopeText),
            fromTable: true, doseText: combined, severity: "", tableFamily: structure.family,
            source: { sourceType: "table_row", sourceField: tbl.sourceField || "dosage_and_administration_table", tableIndex: tbl.sourceIndex ?? null, rowIndex,
              sourceText: headers.map((h, i) => `${h}: ${row[i] || ""}`).filter(Boolean).join(" | "),
              sourceHeading: [populationScope, tbl.title || tbl.caption || "", headers[doseCol] + " — " + label].filter(Boolean).join(" | "),
              sourceScope: scopeHeaders, tableFamily: structure.family, sharedIndications: otherTerms, tableNotes: tbl.notes || "" },
            qualifiers: extractAdaptiveQualifiers(scopeHeaders + " " + patientScope + " " + label + " " + combined), doseComponents: extractDoseComponents(scopeHeaders + " " + label + " " + combined), weightBasis: extractAdaptiveQualifiers(scopeHeaders + " " + label + " " + combined).weightBasis
          });
        });
      });
      return units;
    }

    // ---- 3. Population-clause splitter -------------------------------------------------
    // "…(pharyngitis) Adults—a single injection of 1,200,000 units; older pediatric patients—a single
    //  injection of 900,000 units; infants and children under 60 lbs. in a single injection of …"
    // becomes separate parts so each population clause is filtered against the patient on its own.
    const AMU_POP = "(?:older\\s+|younger\\s+)?(?:adults?(?:\\s+and\\s+adolescents?)?|adolescents?|pediatric\\s+patients?|paediatric\\s+patients?|infants\\s+and\\s+children|children|infants|neonates?|newborns?|geriatric\\s+patients?)";
    function amuExpandPopulationClauses(text) {
      const t = String(text || "").trim();
      const shared = t.match(/^(.*?\b(?:recommendations|dosages?|doses?)\s+for\s+(?:adults?\s+and\s+(?:children|adolescents?)|(?:adults?|children|pediatric patients?|paediatric patients?))[^:;]{0,100}?\b(?:as follows|are|is)\s*:)([\s\S]+)$/i);
      if (shared && !RESOLVER_DOSE_RE.test(shared[1])) return [shared[1].trim(), shared[2].trim()];
      const pieces = t.split(new RegExp(";\\s+(?=" + AMU_POP + "\\b)", "i"));
      const dashRe = new RegExp("(^|[\\s(])(" + AMU_POP + ")\\s*(?:—|–|--|:)\\s*", "i");
      if (pieces.length < 2 && !dashRe.test(t)) return [t];
      // an "older …" clause is the complement of a sibling "under N lb/kg" clause
      let threshold = null;
      pieces.forEach(p => { const w = p.match(/^(?:infants|children|neonates?|newborns?)[^.;]{0,40}?\b(?:under|less than|below)\s*(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kg)\b/i); if (w) threshold = w[1] + " " + w[2]; });
      const out = [];
      pieces.forEach((piece, i) => {
        const m = piece.match(dashRe);
        if (m) {
          const head = piece.slice(0, m.index + m[1].length).trim();
          let body = piece.slice(m.index + m[0].length).trim();
          const label = m[2].charAt(0).toUpperCase() + m[2].slice(1);
          if (threshold && /^older\b/i.test(m[2]) && !/\b(?:weigh|lbs?|pounds?|kg)\b/i.test(body)) body += " weighing at least " + threshold;
          if (head) out.push(head);
          out.push(label + ": " + body);
        } else {
          out.push(piece.trim());
        }
      });
      return out.filter(Boolean);
    }

    // ---- 4. Label wording -> context aliases -------------------------------------------
    // FDA dosing tables use anatomical headings ("Ear/Nose/Throat", "Genitourinary Tract"), not the
    // disease the clinician selected ("pharyngitis", "UTI"). These aliases bridge the two.
    let RESOLVER_CONTEXT_ALIASES = AMUApp.lexicon("contextAliases");
    // Acronyms expand only as a complete keyword or a listed qualifier + acronym.
    // Replacing a short acronym in arbitrary prose could change "dose cap" into CAP.
    let CLINICAL_KEYWORD_ABBREVIATIONS = AMUApp.lexicon("abbreviations");
    function resolverExpandKeywords(keys) {
      const base = (keys || []).map(k => normalizeClinicalKeyword(k)).filter(Boolean);
      const out = new Set(base);
      base.forEach(k => {
        if (CLINICAL_KEYWORD_ABBREVIATIONS[k]) out.add(CLINICAL_KEYWORD_ABBREVIATIONS[k]);
        const qualified = k.match(/^(complicated|uncomplicated) (uti|ssti|iai)$/);
        if (qualified) out.add(qualified[1] + " " + CLINICAL_KEYWORD_ABBREVIATIONS[qualified[2]]);
      });
      RESOLVER_CONTEXT_ALIASES.forEach(rule => {
        if ([...out].some(k => rule.triggers.some(t => clinicalPhrasePresent(k, t)))) rule.add.forEach(a => out.add(normalizeClinicalKeyword(a)));
      });
      return [...out];
    }

    // =========================================================================
    // v1.9: CONTEXT-AWARE REGIMEN RESOLVER
    // Applies the active pathogen/disease context + patient physiology to the raw
    // FDA dosing text and returns only the 1–3 regimens that actually match.
    // It returns { status: "ok" | "none" | "unresolved" }. Only "ok" replaces the old
    // "Complex FDA Dosing" flag; anything else falls through to the existing logic,
    // so the resolver can never make the card less safe than before.
    // =========================================================================
    const REGIMEN_MAX = 3;            // max bullets for a single disease
    const REGIMEN_MAX_CHARS = 320;    // a regimen longer than this is not compressible -> fall back
    const SHOW_REGIMEN_FILTER_SUMMARY = false; // true = add a "Filters" bullet listing the applied filters

    // Disease/indication vocabulary used to tell "this sentence is about another disease" apart.
    let RESOLVER_INDICATION_TERMS = AMUApp.lexicon("indicationTerms");
    function resolverHay(text) { return " " + normalizeClinicalKeyword(text) + " "; }

    // Word-boundary keyword test (short keywords such as "ear" must match whole words only).
    function resolverHasKeyword(hay, keyword) {
      return clinicalPhrasePresent(hay, keyword);
    }

    function resolverIndicationTermsIn(text) {
      const hay = resolverHay(text);
      return RESOLVER_INDICATION_TERMS.filter(t => resolverHasKeyword(hay, t));
    }

    function resolverTermIsContext(term, ctxKeys) {
      const a = normalizeClinicalKeyword(term);
      return ctxKeys.some(k => clinicalPhrasePresent(a, k) || clinicalPhrasePresent(k, a));
    }

    const RESOLVER_DOSE_RE = /\b\d+(?:\.\d+)?(?:,\d{3})*\s*-?\s*(?:mg\/kg(?:\/(?:day|dose|24\s*hours?))?|mcg\/kg(?:\/(?:day|dose|24\s*hours?))?|units\/kg(?:\/(?:day|dose|24\s*hours?))?|mg\/(?:m2|m²)(?:\/(?:day|dose))?|mg|g|grams|mcg|units)(?![A-Za-z0-9²/])/i;
    const RESOLVER_POP_PED = /\b(pediatric|paediatric|children|child|infants?|neonates?|newborns?|adolescents?)\b/i;
    const RESOLVER_POP_ADULT = /\b(adults?)\b/i;
    const RESOLVER_RENAL = /\b((?:renal|kidney) (?:impairment|dysfunction|failure|insufficiency)|impaired (?:renal|kidney) function|creatinine clearance|crcl|egfr|gfr|hemodialysis|haemodialysis|peritoneal dialysis|capd|apd|dialysis|anuric)\b/i;

    // Universal intermediate representation for label-derived dosing candidates.
    // It is deliberately evidence-first: parsing records what the label says and where
    // it came from; patient matching happens later and never creates a dose.
    function extractDoseComponents(text) {
      const s = String(text || "");
      const out = [];
      // Preserve the amount for each named ingredient in combination products.
      const componentNames = "sulfamethoxazole|trimethoprim|piperacillin|tazobactam|amoxicillin|clavulanate|ampicillin|sulbactam|imipenem|cilastatin|quinupristin|dalfopristin|ceftazidime|avibactam|ceftolozane|vaborbactam|relebactam|durlobactam|ticarcillin";
      const afterDose = new RegExp(String.raw`(\d+(?:\.\d+)?(?:\s*(?:to|–|-)\s*\d+(?:\.\d+)?)?)\s*(mg|g|mcg|units)\s*\/\s*kg(?:\s*\/\s*(day|24\s*hours?))?\s+(${componentNames})\b`, "gi");
      for (const m of s.matchAll(afterDose)) out.push({ component: m[4].toLowerCase(), amount: m[1].replace(/\s+/g, " ").trim(), unit: m[2].toLowerCase() + "/kg", basis: /24/i.test(m[3] || "") || /day/i.test(m[3] || "") ? "per_kg_per_day" : "per_kg_basis_unspecified", sourceText: m[0] });
      const beforeDose = new RegExp(String.raw`\b(${componentNames})\s+(\d+(?:\.\d+)?(?:\s*(?:to|–|-)\s*\d+(?:\.\d+)?)?)\s*(mg|g|mcg)\s*\/\s*kg(?:\s*\/\s*(day|24\s*hours?))?`, "gi");
      for (const m of s.matchAll(beforeDose)) out.push({ component: m[1].toLowerCase(), amount: m[2].replace(/\s+/g, " ").trim(), unit: m[3].toLowerCase() + "/kg", basis: /24/i.test(m[4] || "") || /day/i.test(m[4] || "") ? "per_kg_per_day" : "per_kg_basis_unspecified", sourceText: m[0] });
      return out.filter((x, i) => out.findIndex(y => y.component === x.component && y.sourceText === x.sourceText) === i);
    }

    function extractAdaptiveQualifiers(text) {
      const s = typeof normalizeLabelStructureText === "function" ? normalizeLabelStructureText(text) : String(text || "");
      const weightBasis = /\bideal body weight\b/i.test(s) ? "ideal_body_weight"
        : /\btotal body weight\b/i.test(s) ? "total_body_weight"
        : /\bactual body weight\b/i.test(s) ? "actual_body_weight"
        : /\blean body weight\b/i.test(s) ? "lean_body_weight"
        : /\badjusted body weight\b/i.test(s) ? "adjusted_body_weight" : "not_specified";
      const renalAdjustmentType = /\b(?:percent|percentage)\s+of (?:the )?recommended dose|\b\d+\s*%\s+of (?:the )?usual/i.test(s) ? "percentage_of_reference_dose"
        : /\b(?:half|one.half|½|1\s*\/\s*2)\s+(?:the )?(?:usual|recommended|standard)\s+(?:dose|dosage|regimen)/i.test(s) ? "fraction_of_reference_dose"
        : /\b(?:supplemental|additional) dose\b/i.test(s) && /\b(dialysis|hemodialysis|haemodialysis|crrt)\b/i.test(s) ? "dialysis_supplement"
        : /\bno (?:dosage|dose) adjustment\b/i.test(s) ? "explicit_no_adjustment"
        : /\b(?:renal impairment|creatinine clearance|\bcrcl\b|egfr|gfr)\b/i.test(s) ? "renal_branch_unspecified" : "none";
      let foodCondition = "not_specified";
      if (/\bwith a full meal|with food|with meals\b/i.test(s)) foodCondition = "with_food_or_meal";
      if (/\bfasting|without food\b/i.test(s)) foodCondition = foodCondition === "with_food_or_meal" ? "conflicting_food_instructions" : "fasting_or_without_food";
      if (/\bacidic carbonated beverage|ginger ale\b/i.test(s)) foodCondition = "acidic_beverage_condition";
      return {
        age: /\b(?:aged?|years? of age|months? of age|neonate|newborn|infant|pediatric|paediatric|children)\b/i.test(s),
        weight: /\b(?:weight|weighing|mg\/kg|mcg\/kg|kg|lbs?|pounds?)\b/i.test(s),
        weightBasis,
        weightBasisRequired: weightBasis !== "not_specified",
        renal: RESOLVER_RENAL.test(s),
        renalMetric: renalMetricInClause(s),
        renalAdjustmentType,
        hepatic: /\b(?:hepatic impairment|liver impairment|child.pugh|cirrhosis|impaired liver function)\b/i.test(s),
        pregnancy: /\b(?:pregnan(?:t|cy)|maternal|labor|labour)\b/i.test(s),
        allergy: /\b(?:hypersensitiv(?:ity|e)|allerg(?:y|ic)|contraindicat(?:ed|ion|ions)|anaphyl(?:axis|actic))\b/i.test(s),
        pediatric: RESOLVER_POP_PED.test(s),
        adult: RESOLVER_POP_ADULT.test(s),
        weightDoseBasis: /\/kg\s*\/\s*(?:day|24\s*hours?)/i.test(s) ? "per_kg_per_day" : (/\/kg\s*\/\s*dose/i.test(s) ? "per_kg_per_dose" : (/\bmg\s*\/\s*kg\b/i.test(s) ? "per_kg_basis_unspecified" : "not_weight_based")),
        usesBodySurfaceArea: /\bmg\s*\/\s*m(?:2|²)|\bmg\/m2\b/i.test(s),
        hasMaximumDose: /\b(max(?:imum)? dose|not to exceed|up to a maximum)\b/i.test(s),
        hasLoadingOrMaintenanceStep: /\b(loading dose|initial dose|followed by|thereafter|maintenance dose|day 1|days? 2 through)\b/i.test(s),
        hasDividedDailyDose: /\b(divided into|divided doses|in divided doses)\b/i.test(s),
        hasMultipleActiveDoseComponents: extractDoseComponents(s).length > 1,
        activeDoseComponents: extractDoseComponents(s),
        anaphylaxis: /\banaphyl(?:axis|actic)\b/i.test(s),
        activeMoietyEquivalent: /\b(?:equivalent to|corresponds? to)\b/i.test(s),
        componentDoseBasis: (s.match(/\b(?:based on (?:the )?)?([a-z]+) component\b/i) || [])[1] || "not_specified",
        dayOrWeekSchedule: /\b(?:days?|weeks?)\s+\d+\s*(?:through|to|–|-|,)/i.test(s),
        responseAnchoredDuration: /\b(?:after (?:the )?(?:last|first)|until)\b[^.;]{0,80}\b(?:culture|resolution|response|defervescence)/i.test(s),
        routeTransition: /\b(?:switch|transition|step[- ]down|followed by oral)/i.test(s),
        hasWeightBand: /\b(?:body weight|weight range|weighing)\b[^.;]{0,60}\b(?:to|through|less than|at least|under|above)\b/i.test(s),
        hasDoseVolume: /\b(?:volume|mL to be administered|oral syringe|milliliters?)\b/i.test(s),
        formulationNonSubstitutable: /\b(?:not interchangeable|not substitutable|do not substitute|not equivalent on a mg per mg basis)\b/i.test(s),
        foodCondition,
        isProphylaxis: /\b(?:prophylaxis|prophylactic|prevent(?:ion)?)\b/i.test(s),
        procedureTimed: /\b(?:prior to (?:the )?start of surgery|preoperative|intraoperative|postoperatively|during (?:the )?operative procedure|surgical incision)\b/i.test(s),
        hasDialysisTimingCondition: /\b(?:supplemental|additional) dose\b[^.;]{0,120}\b(?:after|prior to|within|following)\b[^.;]{0,80}\b(?:dialysis|hemodialysis|haemodialysis)\b/i.test(s)
      };
    }

    function extractDoseExpressions(text, unitContext = "") {
      const source = String(text || "");
      const re = /\b\d+(?:\.\d+)?(?:,\d{3})*\s*(?:to|–|-)?\s*\d*(?:\.\d+)?\s*(?:million\s+units|mg\/kg(?:\/(?:day|dose|24\s*hours?))?|mcg\/kg(?:\/(?:day|dose|24\s*hours?))?|units\/kg(?:\/(?:day|dose|24\s*hours?))?|mg\/(?:m2|m²)(?:\/(?:day|dose))?|mg|g|grams|mcg|units|IU)(?![A-Za-z0-9²/])/gi;
      const found = [...source.matchAll(re)].map(m => m[0].replace(/\s+/g, " ").trim());
      if (!found.length && amuIsNumericAmount(source) && /\b(?:dose|dosage|amount|regimen)\b/i.test(unitContext)) {
        const headerUnit = amuHeaderDoseUnit(unitContext);
        if (headerUnit) found.push(source.trim() + " " + headerUnit);
      }
      // FDA tables often put the unit exclusively in the column heading/caption
      // (e.g. Dose (mg/kg) | 10). Store the header-derived unit in the index too.
      if (!found.length && /^\d+(?:\.\d+)?$/.test(source.trim())) {
        const context = String(unitContext || "");
        const unit = context.match(/\b(?:mg|mcg|units)\s*\/\s*kg(?:\s*\/\s*(?:day|dose|24\s*hours?))?/i)
          || context.match(/\b(?:mg|mcg|g|grams?|units|IU)\b/i);
        if (unit && /\b(?:dose|dosage|amount|regimen)\b/i.test(context)) found.push(source.trim() + " " + unit[0].replace(/\s+/g, ""));
      }
      return found;
    }

    // FDA label structural taxonomy derived from review of FDA Accessdata labeling and
    // NIH/NLM DailyMed Structured Product Labels for antimicrobial products. FDA-hosted
    // labeling is preferred when available; DailyMed is an official NIH/NLM source for
    // current SPL content, but each SPL may be manufacturer-submitted. These are document
    // patterns, not dosing recommendations.
    function amuContextTreatmentIntent(context) {
      return /\b(?:prophylaxis|prophylactic|prevention|preventive)\b/i.test([context?.label || "", ...(context?.keywords || [])].join(" ")) ? "prophylaxis" : "treatment";
    }
    function amuHeaderMatchesTreatmentIntent(header, intent) {
      const h = String(header || ""), preventive = /\b(?:prophylaxis|prophylactic|prevention|preventive)\b/i.test(h);
      const therapeutic = /\b(?:treatment|therapeutic)\b/i.test(h);
      if (preventive && !therapeutic) return intent === "prophylaxis";
      if (therapeutic && !preventive) return intent !== "prophylaxis";
      return true;
    }
    function amuNonAdministeredQuantityHeader(header) {
      return /\b(?:to dispense|number of (?:bottles|capsules|tablets)|total (?:mg|ml) per treatment course|total course (?:dose|volume|amount)|volume of diluent|reconstitution volume)\b/i.test(String(header || ""));
    }

    function tableCellLooksLikeDose(cell, header, tableText) {
      const c = String(cell || "").trim();
      if (!c || amuNonAdministeredQuantityHeader(header)) return false;
      if (RESOLVER_DOSE_RE.test(c)) return true;
      if (amuHeaderDoseUnit(header) && amuIsNumericAmount(c) && /\b(?:dose|dosage|amount|regimen)\b/i.test(header)) return true;
      const h = String(header || ""), t = String(tableText || "");
      // Header-only units: e.g. Dose (mg/kg) | 10.
      if (/\b(?:dose|dosage|regimen|amount)\b/i.test(h) && /\b(?:mg|mcg|units)\s*\/\s*kg(?:\s*\/\s*(?:day|dose|24\s*hours?))?/i.test(h)
          && /^\d+(?:\.\d+)?$/.test(c)) return true;
      // Some combination-product tables place the ingredient name and units in the header.
      if (/\b(?:sulfamethoxazole|trimethoprim|piperacillin|tazobactam|amoxicillin|clavulanate|ampicillin|sulbactam|imipenem|cilastatin)\b/i.test(h)
          && /\b(?:mg|mcg|g)\s*\/\s*kg(?:\s*\/\s*(?:day|24\s*hours?))?/i.test(h)
          && /^\d+(?:\.\d+)?$/.test(c)) return true;
      // Numeric percentage/fraction modifiers are dosing payloads when explicitly
      // labelled as a percent/fraction of the recommended dose.
      if (/\b(?:percent|percentage|fraction)\b/i.test(h) && (amuIsNumericAmount(c) || /(?:^\s*\d+(?:\.\d+)?\s*%|^\s*(?:1\s*\/\s*2|½|half|full|usual|standard))/i.test(c))) return true;
      // Relative-language renal modifiers are not absolute doses; index them as dose
      // operations so the system can flag them for a linked baseline regimen.
      if (/\b(?:dose|dosage|regimen)\b/i.test(h) && /(?:^|[\s(])(?:half the usual|one.half|½ the|50\s*%|use not recommended|not recommended|usual standard dosage regimen)(?:$|[\s).,])/i.test(c)) return true;
      // Some dose cells omit the unit because it is given in the table caption.
      return /\b\d+(?:\.\d+)?\s*(?:every\s+\d+\s*(?:hours?|hrs?)|once\s+daily|twice\s+daily|daily|q\d+h)\b/i.test(c)
        && /\b(?:dose|dosage|regimen|grams?|mg|mcg|units|total\s+grams?)\b/i.test(h + " " + t);
    }

    function classifyAdaptiveTableStructure(tbl) {
      const headers = (tbl?.headers || []).map(x => String(x || "").trim());
      const rows = tbl?.rows || [];
      const rawTableNotes = tbl?.rawHtml ? amuHtmlCellText(String(tbl.rawHtml)) : "";
      const allTextRaw = String(tbl?.caption || "") + " " + String(tbl?.title || "") + " " + String(tbl?.headerContext || "") + " | " + headers.join(" | ") + " | " + rows.map(r => (r || []).join(" | ")).join(" | ") + " | " + rawTableNotes;
      const allText = typeof normalizeLabelStructureText === "function" ? normalizeLabelStructureText(allTextRaw) : allTextRaw;
      const roles = headers.map((h, i) => {
        const x = typeof normalizeLabelStructureText === "function" ? normalizeLabelStructureText(h) : h.toLowerCase();
        const role = {
          indication: /\b(infections?|indications?|conditions?|diseases?|syndromes?|diagnoses?|type of infection|organisms?)\b/i.test(x),
          renal: /\b(crcl|creatinine clearance|egfr|gfr|renal function|hemodialysis|haemodialysis|capd|dialysis)\b/i.test(x),
          weightBand: /\b(body weight|weight range|weight band|weight category)\b/i.test(x),
          population: /\b(adults?|adolescents?|pediatric|paediatric|children|child|infants?|neonates?|newborns?|age|age group|birth through|years? of age|months? of age|weight|weighing|lbs?|pounds?)\b/i.test(x) && !/\bmg\s*\/\s*kg|mcg\s*\/\s*kg|units\s*\/\s*kg/i.test(x),
          max: /\b(max(?:imum)?|up to a maximum)\b/i.test(x),
          duration: /\b(duration|days? of treatment|course length|treatment length|postoperatively)\b/i.test(x) && !/infusion|\b(?:dose|dosage|regimen)\b/i.test(x),
          frequency: /\b(interval|frequency|dosing interval|administration interval|every \d+ hours?|doses? per day)\b/i.test(x),
          route: /\b(?:route|administration route)\b/i.test(x),
          severity: /\b(severity|mild|moderate|severe)\b/i.test(x),
          dose: /\b(dose|dosage|regimen|amount)\b/i.test(x),
          percentDose: /\b(percent(?:age)?|fraction)\b/i.test(x) && /\b(dose|dosage|regimen)\b/i.test(x),
          volume: /\b(volume|mL to be administered|milliliters? to be administered)\b/i.test(x),
          infusionTime: /\b(infusion time|infusion duration|duration of infusion|infusion rate)\b/i.test(x),
          treatmentPhase: /\b(loading|maintenance|initial dose|subsequent doses?|treatment phase|induction|consolidation|suppression)\b/i.test(x),
          dayAxis: /\b(treatment day|day of therapy|days? [1-9]|weeks? [1-9]|week of therapy|treatment week)\b/i.test(x),
          surfaceArea: /\b(body surface area|bsa)\b|mg\s*\/\s*m(?:2|²)/i.test(x),
          regimenOption: /\b(?:single|one|two|three|multiple|alternative)\s*[- ]?dose regimen\b|\bregimen\s*(?:option|[ab12])\b/i.test(x),
          procedurePhase: /\b(preoperative|pre.?op|intraoperative|intra.?op|postoperative|post.?op|prior to.*surgery|during.*procedure)\b/i.test(x),
          formulation: /\b(formulation|dosage form|strength|concentration|suspension|solution|tablet|capsule|chewable|delayed.release|extended.release|injection|premixed bag)\b/i.test(x),
          component: /\b(sulfamethoxazole|trimethoprim|piperacillin|tazobactam|amoxicillin|clavulanate|ampicillin|sulbactam|imipenem|cilastatin|quinupristin|dalfopristin|ceftazidime|avibactam|ceftolozane|vaborbactam|relebactam|durlobactam|ticarcillin)\b/i.test(x)
        };
        role.cellHasDose = rows.some(r => tableCellLooksLikeDose(r?.[i], h, allText));
        role.cellHasVolume = rows.some(r => /^\s*\d+(?:\.\d+)?\s*mL\s*$/i.test(String(r?.[i] || "")));
        return { index: i, header: h, ...role };
      });
      const renalCols = roles.filter(r => r.renal);
      const indicationCols = roles.filter(r => r.indication);
      const populationCols = roles.filter(r => r.population);
      const weightBandCols = roles.filter(r => r.weightBand);
      const percentDoseCols = roles.filter(r => r.percentDose || /percent of (?:the )?(?:recommended|usual|standard) dose/i.test(r.header));
      const volumeCols = roles.filter(r => r.volume || r.cellHasVolume);
      const regimenOptionCols = roles.filter(r => r.regimenOption);
      const formulationCols = roles.filter(r => r.formulation);
      const doseCols = roles.filter(r => !amuNonAdministeredQuantityHeader(r.header) && (r.dose || r.cellHasDose) && !r.renal && !r.duration && !r.max && !r.frequency && !r.severity && !r.percentDose && !r.infusionTime && !r.volume && !/\bconcentration|\bstrength|mg\s*\/\s*(?:\d+\s*)?ml/i.test(r.header));
      const allLower = typeof normalizeLabelStructureText === "function" ? normalizeLabelStructureText(allText) : allText.toLowerCase();
      const hasWeight = /\bmg\s*\/\s*kg|\bmcg\s*\/\s*kg|\bunits\s*\/\s*kg|weight.based|weighing\b/i.test(allText);
      const hasGestational = /\bgestational age|\bga\b|postnatal age|\bpna\b|pre.term|premature neonat/i.test(allText);
      const hasLoading = /\bloading dose|initial dose|followed by|thereafter|maintenance dose|day 1\b|days? 2 through/i.test(allText);
      const hasDialysis = /\b(hemodialysis|haemodialysis|peritoneal dialysis|capd|crrt)\b/i.test(allText);
      const hasPercentInterval = percentDoseCols.length > 0 && roles.some(r => r.frequency);
      const hasAlternativeSchedule = regimenOptionCols.length >= 2 || (/\bsingle dose regimen\b/i.test(allLower) && /\btwo.dose regimen\b/i.test(allLower));
      const hasRelativeDoseModifier = /(?:^|[\s(])(?:half the usual|one.half|½ the|50\s*%|percent of (?:the )?(?:recommended|usual|standard) dose|use not recommended)(?:$|[\s).,])/i.test(allLower);
      const hasDialysisTimingSupplement = /\b(?:supplemental|additional) dose\b[^.]{0,180}\b(?:after|prior to|within|following)\b[^.]{0,100}\b(?:dialysis|hemodialysis|haemodialysis)\b/i.test(allText);
      const hasWeightBandVolume = weightBandCols.length > 0 && doseCols.length > 0 && volumeCols.length > 0;
      const hasComponentColumns = roles.filter(r => r.component && (r.dose || r.cellHasDose || /\b(?:mg|mcg|g)\s*\/\s*kg/i.test(r.header))).length >= 2;
      const hasProcedurePhases = /\b(preoperative|pre.?op)\b/i.test(allText) && /\b(intraoperative|intra.?op|during lengthy operative)\b/i.test(allText) && /\b(postoperative|post.?op)\b/i.test(allText);
      let family = "general_table";
      if (tbl?.inferredHeaderRoles) family = "headerless_indication_regimen_pairs";
      else if (renalCols.length && indicationCols.length && doseCols.length) family = "renal_by_indication_matrix";
      else if (renalCols.length && hasPercentInterval) family = "renal_percent_interval_matrix";
      else if (renalCols.length && hasAlternativeSchedule) family = "renal_regimen_option_matrix";
      else if (renalCols.length && doseCols.length && hasRelativeDoseModifier) family = "renal_relative_dose_adjustment_table";
      else if (renalCols.length && doseCols.length) family = "renal_adjustment_matrix";
      else if (roles.some(r => r.dayAxis) && doseCols.length) family = "day_indexed_treatment_schedule";
      else if (roles.some(r => r.treatmentPhase) && doseCols.length) family = "phase_specific_treatment_matrix";
      else if (roles.some(r => r.surfaceArea) && doseCols.length) family = "body_surface_area_dose_matrix";
      else if (hasWeightBandVolume) family = "weight_band_dose_volume_matrix";
      else if (weightBandCols.length && doseCols.length) family = "weight_band_dose_matrix";
      else if (hasAlternativeSchedule) family = "alternative_regimen_schedule_matrix";
      else if (hasComponentColumns) family = "multi_component_dose_matrix";
      else if (hasProcedurePhases) family = "procedure_phase_prophylaxis_matrix";
      else if (formulationCols.length && (doseCols.length || volumeCols.length)) family = "formulation_strength_concentration_matrix";
      else if (indicationCols.length && populationCols.length && doseCols.length) family = "indication_population_matrix";
      else if (indicationCols.length && doseCols.length) family = "indication_dose_matrix";
      else if (populationCols.length && doseCols.length) family = "population_dose_matrix";
      else if (doseCols.length && headers.some(h => /normal renal function/i.test(h))) family = "baseline_to_renal_adjustment_matrix";
      const rowAxisRenal = renalCols.some(r => r.index === 0);
      const columnAxisRenal = renalCols.some(r => r.index > 0);
      const rowAxisIndication = indicationCols.some(r => r.index === 0);
      const weightBasis = /\bideal body weight\b/i.test(allText) ? "ideal_body_weight"
        : /\btotal body weight\b/i.test(allText) ? "total_body_weight"
        : /\bactual body weight\b/i.test(allText) ? "actual_body_weight"
        : /\blean body weight\b/i.test(allText) ? "lean_body_weight"
        : /\badjusted body weight\b/i.test(allText) ? "adjusted_body_weight" : "not_specified";
      return {
        family,
        dimensions: {
          indication: indicationCols.map(r => r.index), renal: renalCols.map(r => r.index), population: populationCols.map(r => r.index),
          weightBand: weightBandCols.map(r => r.index), dose: doseCols.map(r => r.index), percentDose: percentDoseCols.map(r => r.index),
          volume: volumeCols.map(r => r.index), regimenOption: regimenOptionCols.map(r => r.index), formulation: formulationCols.map(r => r.index),
          component: roles.filter(r => r.component).map(r => r.index), infusionTime: roles.filter(r => r.infusionTime).map(r => r.index),
          procedurePhase: roles.filter(r => r.procedurePhase).map(r => r.index),
          treatmentPhase: roles.filter(r => r.treatmentPhase).map(r => r.index), dayAxis: roles.filter(r => r.dayAxis).map(r => r.index),
          bodySurfaceArea: roles.filter(r => r.surfaceArea).map(r => r.index),
          duration: roles.filter(r => r.duration).map(r => r.index), frequency: roles.filter(r => r.frequency).map(r => r.index),
          maximum: roles.filter(r => r.max).map(r => r.index), route: roles.filter(r => r.route).map(r => r.index), severity: roles.filter(r => r.severity).map(r => r.index)
        },
        axes: { rowAxisRenal, columnAxisRenal, rowAxisIndication },
        flags: {
          weightBased: hasWeight, gestationalPostnatalAge: hasGestational, sequentialOrLoading: hasLoading, dialysis: hasDialysis,
          weightBandDoseVolume: hasWeightBandVolume, relativeDoseModifier: hasRelativeDoseModifier,
          percentDoseAndInterval: hasPercentInterval, alternativeRegimenSchedules: hasAlternativeSchedule,
          dialysisTimingSupplement: hasDialysisTimingSupplement, multipleActiveIngredientComponents: hasComponentColumns,
          procedureTimedProphylaxis: hasProcedurePhases, weightBasis,
          phaseSpecific: roles.some(r => r.treatmentPhase), dayIndexed: roles.some(r => r.dayAxis),
          bodySurfaceArea: roles.some(r => r.surfaceArea)
        },
        rowCount: rows.length, columnCount: headers.length
      };
    }

    function classifyFdaDosingStructure(rawText, tables, sourceSections, rawIndications) {
      const text = String(rawText || "");
      const allRaw = (text + " " + (rawIndications || "") + " " + (tables || []).map(t => (t.caption || "") + " " + (t.headers || []).join(" ") + " " + (t.rows || []).map(r => r.join(" ")).join(" ") + " " + (t.rawHtml ? amuHtmlCellText(String(t.rawHtml)) : "")).join(" ")).toLowerCase();
      const all = typeof normalizeLabelStructureText === "function" ? normalizeLabelStructureText(allRaw) : allRaw;
      const patternText = all;
      const tableProfiles = (tables || []).map((t, i) => ({ tableIndex: t.sourceIndex ?? i, ...classifyAdaptiveTableStructure(t) }));
      const families = new Set(tableProfiles.map(t => t.family));
      const add = (condition, name) => { if (condition) families.add(name); };
      add(/\b\d+\s*mg\s*\/\s*kg|\b\d+\s*mcg\s*\/\s*kg|\bmg\/kg\/day|\bweight\s*based\b/.test(all), "weight_based_prose");
      add(/\b(pediatric|paediatric|children|infants?|neonates?|newborns?)\b/.test(all) && /\b(adult|adolescents?)\b/.test(all), "multiple_population_branches");
      add(/\bgestational age|\bga\b|postnatal age|\bpna\b/.test(all), "gestational_and_postnatal_age_branch");
      add(/\b(loading dose|initial dose|followed by|thereafter|maintenance dose|day 1|days? 2 through)\b/.test(all), "sequential_or_loading_maintenance_regimen");
      add(/\b(crcl|creatinine clearance|egfr|gfr)\b/.test(all), "measured_renal_thresholds");
      add(/\b(hemodialysis|haemodialysis|peritoneal dialysis|capd|crrt)\b/.test(all), "dialysis_specific_branch");
      add(/\b(child.pugh|hepatic impairment|liver impairment|cirrhosis)\b/.test(all), "hepatic_impairment_branch");
      add(/\b(no experience|not studied|insufficient information|not recommended|avoid use|contraindicated)\b/.test(all), "evidence_gap_or_restriction");
      add(/\b(maximum dose|max dose|not to exceed|up to a maximum)\b/.test(all), "maximum_dose_cap");
      add(/\b(divided into|divided doses|in divided doses|two divided doses|three divided doses)\b/.test(all), "divided_daily_dose");
      add(/\b(therapeutic drug monitoring|serum concentration|trough|auc|area under the curve)\b/.test(all), "monitoring_or_exposure_guided_dosing");
      add(/\b(no dosage adjustment|no dose adjustment)\b/.test(all), "explicit_no_adjustment_statement");
      add(/\b(intravenous|intramuscular|oral|subcutaneous)\b/.test(all), "route_specific_administration");
      add(/\b(\d+\s*(?:to|–|-)\s*\d+\s*days?|for\s+\d+\s*days?)\b/.test(all), "duration_explicit");
      add(/\b(?:percent|percentage) of (?:the )?(?:recommended|usual|standard) dose|\b(?:half|one.half|½) the (?:usual|recommended|standard) (?:dose|dosage|regimen)\b/.test(all), "relative_or_percentage_dose_adjustment");
      add(/\bpercent of (?:the )?(?:recommended|usual|standard) dose\b[\s\S]{0,90}\bdosing interval\b|\bdosing interval\b[\s\S]{0,90}\bpercent of (?:the )?(?:recommended|usual|standard) dose\b/.test(all), "percentage_plus_interval_renal_matrix");
      add(/\b(?:supplemental|additional) dose\b[^.]{0,180}\b(?:after|prior to|within|following)\b[^.]{0,100}\b(?:dialysis|hemodialysis|haemodialysis)\b/.test(all), "dialysis_timing_dependent_supplement");
      add(/\b(?:single|one)[ -]dose regimen\b[\s\S]{0,200}\b(?:two|2)[ -]dose regimen\b/.test(all), "alternative_complete_regimen_schedules");
      add(/\b(?:not interchangeable|not substitutable|do not substitute|not equivalent on a mg per mg basis)\b/.test(all), "formulation_non_substitutability");
      add(/\bideal body weight\b/.test(all), "ideal_body_weight_dosing");
      add(/\btotal body weight\b/.test(all), "total_body_weight_dosing");
      add(/\blean body weight\b/.test(all), "lean_body_weight_dosing");
      add(/\b(?:body weight|weight range)\b[\s\S]{0,120}\b(?:volume|mL to be administered)\b/.test(all), "weight_band_to_dose_volume_conversion");
      add(/\b(?:sulfamethoxazole|trimethoprim)\b[\s\S]{0,100}\b(?:mg\s*\/\s*kg|mg\s*\/\s*day)\b[\s\S]{0,100}\b(?:sulfamethoxazole|trimethoprim)\b/.test(all), "multiple_active_ingredient_dose_components");
      add(new Set(extractDoseComponents(all).map(x => x.component)).size >= 2, "multiple_active_ingredient_dose_components");
      add(/\b(?:preoperative|pre.?op)\b[\s\S]{0,180}\b(?:intraoperative|intra.?op|during lengthy operative)\b[\s\S]{0,180}\b(?:postoperative|post.?op)\b/.test(all), "procedure_phase_prophylaxis_schedule");
      add(/\b(?:with food|with a full meal|fasting|without food|acidic carbonated beverage)\b/.test(all), "food_or_administration_condition");
      add(/\b(?:for intravenous use only|not for intramuscular|do not administer orally|intravenous infusion over)\b/.test(all), "route_and_infusion_constraints");
      add(/\b(?:mg\s*\/\s*m2|mg\s*\/\s*m²|body surface area)\b/.test(all), "body_surface_area_dose_basis");
      add(/\b(?:initial dose|loading dose)\b[\s\S]{0,100}\b(?:followed by|thereafter|maintenance dose|every \d+ hours?)\b/.test(all), "initial_then_maintenance_sequence");
      add(/\b(?:dose should be individualized|dosing should be individualized|individualize the dose|adjust dose based on response)\b/.test(all), "clinician_individualized_dose_instruction");
      add(/\b(?:not expected to be effective for|should only be used for|only indicated for|not indicated for)\b/.test(all), "indication_exclusivity_or_negative_scope");
      add(/\b(?:not recommended for use|alternative formulation .* should be considered|only in patients who require the entire)\b/.test(all), "available_dose_unit_or_formulation_constraint");
      add(/\b(?:single.use|single dose|single-dose|one.time|one-time)\b[\s\S]{0,100}\b(?:sachet|packet|vial|bottle|bag)\b/.test(all), "single_use_packaged_dose");
      add(/\b(?:sachet|packet|vial|premixed bag)\b[\s\S]{0,100}\b(?:mg|g|mcg|units)\b/.test(all), "packaged_unit_strength_constraint");
      add(/\b(?:less than|below|under|<)\s*\d+(?:\.\d+)?\s*(?:ml\/min|ml\s*\/\s*min)\b[\s\S]{0,100}\b(?:not recommended|contraindicated|avoid|do not use)\b/.test(all)
        || /\b(?:not recommended|contraindicated|avoid|do not use)\b[\s\S]{0,120}\b(?:crcl|creatinine clearance|egfr|gfr)?[\s\S]{0,80}(?:less than|below|under|<)\s*\d+(?:\.\d+)?\s*(?:ml\/min|ml\s*\/\s*min)\b/.test(all), "renal_threshold_avoid_or_not_recommended");
      add(/\b(?:auc|area under the curve|trough|serum concentration|plasma concentration)\b[\s\S]{0,160}\b(?:adjust|individualize|monitor|target)\b/.test(all), "concentration_guided_dose_adjustment");
      add(/\b(?:infuse|infusion|administered intravenously)\b[\s\S]{0,100}\b(?:at least|over|for)\s*\d+\s*(?:minutes?|hours?)\b/.test(all), "minimum_or_fixed_infusion_duration");
      add(/(?:\b(?:mg\s*\/\s*5\s*ml|mg\s*\/\s*ml|mg\s*\/\s*\d+\s*ml)\b[\s\S]{0,140}\b(?:suspension|solution|concentration|formulation)\b|\b(?:suspension|solution|concentration|formulation)\b[\s\S]{0,140}\b(?:mg\s*\/\s*5\s*ml|mg\s*\/\s*ml|mg\s*\/\s*\d+\s*ml)\b)/.test(all), "formulation_concentration_and_volume");
      add(/\b(?:calcium.containing|intravenous calcium)\b[\s\S]{0,180}\b(?:neonat\w*|newborn\w*|infant\w*|ceftriaxone|contraindicat|do not)\b/.test(all) || /\b(?:neonat\w*|newborn\w*|infant\w*)\b[\s\S]{0,180}\b(?:calcium.containing|intravenous calcium)\b/.test(all), "neonatal_calcium_coadministration_prohibition");
      add(/\b(?:either|alternatively)\b[\s\S]{0,180}\b(?:single (?:dose|infusion)|once)\b[\s\S]{0,180}\b(?:or|alternatively|followed by)\b[\s\S]{0,180}\b(?:one week later|7 days later|second dose|two doses)\b/.test(all)
        || /\b(?:single[ -]dose (?:regimen|option|schedule)|single infusion)\b[\s\S]{0,250}\b(?:or|alternatively)\b[\s\S]{0,250}\b(?:two[ -]dose|second dose|one week later|7 days later|followed by)\b/.test(all), "alternative_complete_regimen_schedules");
      add(/\b(?:take|administer|give)\b[\s\S]{0,100}\b(?:with food|with a meal|on an empty stomach|fasting|without food)\b/.test(all), "food_timing_administration_condition");
      ADAPTIVE_ADDITIONAL_FORMATS.forEach(format => add(format.re.test(patternText), format.family));
      const sectionList = (sourceSections || []).map((x, i) => ({ index: x.sourceIndex ?? i, chars: String(x.text || "").length, opening: String(x.text || "").slice(0, 180) }));
      const ordered = [
        "headerless_indication_regimen_pairs", "indication_dose_matrix", "renal_by_indication_matrix", "renal_percent_interval_matrix", "renal_relative_dose_adjustment_table",
        "renal_regimen_option_matrix", "renal_adjustment_matrix", "baseline_to_renal_adjustment_matrix", "weight_band_dose_volume_matrix",
        "weight_band_dose_matrix", "alternative_regimen_schedule_matrix", "multi_component_dose_matrix", "procedure_phase_prophylaxis_matrix",
        "indication_population_matrix", "population_dose_matrix", "general_table", "weight_based_prose", "multiple_population_branches",
        "gestational_and_postnatal_age_branch", "sequential_or_loading_maintenance_regimen", "initial_then_maintenance_sequence",
        "measured_renal_thresholds", "percentage_plus_interval_renal_matrix", "relative_or_percentage_dose_adjustment",
        "dialysis_specific_branch", "dialysis_timing_dependent_supplement", "hepatic_impairment_branch", "maximum_dose_cap",
        "divided_daily_dose", "monitoring_or_exposure_guided_dosing", "explicit_no_adjustment_statement", "evidence_gap_or_restriction",
        "alternative_complete_regimen_schedules", "formulation_non_substitutability", "ideal_body_weight_dosing", "total_body_weight_dosing",
        "lean_body_weight_dosing", "weight_band_to_dose_volume_conversion", "multiple_active_ingredient_dose_components",
        "procedure_phase_prophylaxis_schedule", "food_or_administration_condition", "route_and_infusion_constraints", "body_surface_area_dose_basis",
        "clinician_individualized_dose_instruction", "indication_exclusivity_or_negative_scope", "available_dose_unit_or_formulation_constraint",
        "single_use_packaged_dose", "packaged_unit_strength_constraint", "renal_threshold_avoid_or_not_recommended",
        "concentration_guided_dose_adjustment", "minimum_or_fixed_infusion_duration", "formulation_concentration_and_volume",
        "neonatal_calcium_coadministration_prohibition", "formulation_strength_concentration_matrix", "food_timing_administration_condition",
        "route_specific_administration", "duration_explicit"
      ];
      const detected = [...new Set([...ordered, "phase_specific_treatment_matrix", "day_indexed_treatment_schedule", "body_surface_area_dose_matrix", ...ADAPTIVE_ADDITIONAL_FORMATS.map(f => f.family)])].filter(x => families.has(x));
      const strategy = [];
      if (families.has("headerless_indication_regimen_pairs")) strategy.push("Bind each complete dose-and-schedule cell to its explicit indication cell; inferred column roles never create or alter an amount.");
      if (families.has("indication_dose_matrix") || families.has("indication_population_matrix")) strategy.push("Match the indication row first; then select only the patient-compatible population column and combine related dose, maximum, interval and duration cells.");
      if (families.has("renal_by_indication_matrix")) strategy.push("Evaluate the renal row and indication column together; do not borrow a dose from a neighbouring indication column.");
      if (families.has("renal_percent_interval_matrix")) strategy.push("A percentage-of-reference-dose cell and interval cell are separate renal operations. Link both to the correct baseline regimen and preserve both values; do not treat the percentage alone as a complete dose.");
      if (families.has("renal_relative_dose_adjustment_table")) strategy.push("Relative statements such as half the usual regimen or use not recommended require a baseline dose link. Do not invent the underlying absolute dose.");
      if (families.has("renal_adjustment_matrix") || families.has("baseline_to_renal_adjustment_matrix") || families.has("renal_regimen_option_matrix")) strategy.push("Treat a renal adjustment table as a linked adjustment layer unless it explicitly contains a complete context-matched regimen. Keep complete schedule alternatives distinct.");
      if (families.has("weight_band_dose_volume_matrix")) strategy.push("A weight-band dose/volume table is a discrete lookup, not a mg/kg formula. Match the exact weight band, dose, concentration and volume; do not interpolate between rows.");
      if (families.has("multi_component_dose_matrix")) strategy.push("Preserve each active ingredient's dose separately. Never add or merge mg/kg amounts for combination products unless the label explicitly defines a combined amount.");
      if (families.has("alternative_regimen_schedule_matrix")) strategy.push("Single-dose and multi-dose schedules are alternative complete regimens. Keep each option ordered and do not concatenate them into one schedule.");
      if (families.has("procedure_phase_prophylaxis_matrix")) strategy.push("Perioperative prophylaxis is phase-timed (pre-incision, intraoperative redose, postoperative window) and must not be presented as an infection-treatment regimen.");
      if (families.has("formulation_non_substitutability")) strategy.push("Bind dosing to the exact labeled formulation. A non-substitutable formulation warning blocks transferring doses between products sharing an active ingredient.");
      if (families.has("ideal_body_weight_dosing") || families.has("total_body_weight_dosing") || families.has("lean_body_weight_dosing")) strategy.push("Record the label's explicit weight scalar (ideal, total, actual, lean, adjusted). If the required scalar is unavailable, do not calculate a patient-specific mg dose from a different weight scalar.");
      if (families.has("dialysis_timing_dependent_supplement")) strategy.push("A dialysis supplement may depend on dose timing relative to dialysis. Keep the condition attached and require the relevant timing before determining applicability.");
      if (families.has("procedure_phase_prophylaxis_schedule")) strategy.push("Separate treatment from prophylaxis intent and preserve procedure-phase timing and any stop window.");
      if (families.has("monitoring_or_exposure_guided_dosing") || families.has("concentration_guided_dose_adjustment")) strategy.push("Do not invent a fixed dose when the label requires concentration/AUC-guided individualization; store the monitoring target and require a separate clinician-reviewed titration workflow.");
      if (families.has("single_use_packaged_dose") || families.has("packaged_unit_strength_constraint")) strategy.push("Keep labeled pack size and available dose units separate from the calculated patient dose; flag when the exact dose cannot be measured with the selected presentation.");
      if (families.has("renal_threshold_avoid_or_not_recommended")) strategy.push("A renal cutoff may prohibit or discourage use rather than define a reduced dose. Preserve the restriction as a hard safety condition, not as a numeric dose adjustment.");
      if (families.has("minimum_or_fixed_infusion_duration")) strategy.push("Preserve minimum or fixed infusion time as an administration constraint; do not confuse it with the dosing interval.");
      if (families.has("neonatal_calcium_coadministration_prohibition")) strategy.push("Treat neonatal calcium coadministration wording as a separate contraindication/compatibility rule and require the relevant age and infusion context.");
      if (families.has("formulation_concentration_and_volume") || families.has("formulation_strength_concentration_matrix")) strategy.push("Treat each formulation, strength and concentration as a distinct presentation. Convert an amount to volume only from the matched product concentration stated in that label.");
      ADAPTIVE_ADDITIONAL_FORMATS.filter(f => families.has(f.family)).forEach(f => strategy.push(f.strategy));
      if (families.has("phase_specific_treatment_matrix") || families.has("day_indexed_treatment_schedule")) strategy.push("Retain the ordered treatment phase or treatment-day axis; do not select one phase row as an independent complete regimen.");
      if (families.has("body_surface_area_dose_matrix")) strategy.push("A BSA-derived amount requires the label-specific surface-area formula and matched patient measurement. Never replace mg/m² with mg/kg.");
      if (!strategy.length) strategy.push("Use heading-scoped prose/table associations; if a dose cannot be bound to indication and patient qualifiers, leave it unresolved.");
      return { version: "fda-label-structure-v7", detected, tableProfiles, sectionCount: sectionList.length, sections: sectionList, strategy };
    }

    function buildAdaptiveRegimenIndex(rawText, tables, sourceSections, rawIndications) {
      const candidates = [];
      const text = String(rawText || "");
      splitLabelSentences(text).flatMap(amuExpandPopulationClauses).forEach((clause, index) => {
        if (!RESOLVER_DOSE_RE.test(clause) || /\b(?:do not administer|not recommended|should not be used|not indicated)\b/i.test(clause)) return;
        const sourceOffset = text.indexOf(clause);
        candidates.push({
          id: `prose-${index + 1}`, sourceType: "prose", sourceField: "dosage_and_administration",
          sourceIndex: sourceOffset >= 0 ? sourceOffset : null, sourceText: clause,
          doseExpressions: extractDoseExpressions(clause), doseComponents: extractDoseComponents(clause), frequencies: amuFindFrequencies(clause).labels,
          routes: amuFindRoutes(clause), duration: (clause.match(/\bfor\s+(?:at least\s+)?\d+(?:\s*(?:to|–|-)\s*\d+)?\s*(?:days?|weeks?)\b/i) || [])[0] || "",
          qualifiers: extractAdaptiveQualifiers(clause), weightBasis: extractAdaptiveQualifiers(clause).weightBasis, doseComponents: extractDoseComponents(clause), structuralFamilies: []
        });
      });
      (tables || []).forEach((table, tableIndex) => {
        const headers = table.headers || [];
        const tableStructure = classifyAdaptiveTableStructure(table);
        (table.rows || []).forEach((row, rowIndex) => {
          row.forEach((cell, columnIndex) => {
            if (!tableCellLooksLikeDose(cell, headers[columnIndex], String(table.caption || "") + " " + headers.join(" "))) return;
            const sourceText = headers.map((h, i) => `${h}: ${row[i] || ""}`).filter(Boolean).join(" | ");
            candidates.push({
              id: `table-${table.sourceIndex ?? tableIndex}-row-${rowIndex + 1}-col-${columnIndex + 1}`,
              sourceType: "table_row", sourceField: table.sourceField || "dosage_and_administration_table",
              tableIndex: table.sourceIndex ?? tableIndex, rowIndex, columnIndex,
              sourceText, tableHeaders: headers.slice(), row: row.slice(), tableFamily: tableStructure.family,
              doseExpressions: extractDoseExpressions(cell, headers[columnIndex] + " " + String(table.caption || "")), doseComponents: extractDoseComponents(sourceText), frequencies: amuFindFrequencies(cell).labels,
              routes: amuFindRoutes(cell), duration: (String(cell).match(/\bfor\s+\d+(?:\s*(?:to|–|-)\s*\d+)?\s*(?:days?|weeks?)\b/i) || [])[0] || "",
              qualifiers: extractAdaptiveQualifiers(headers.join(" ") + " " + sourceText), weightBasis: tableStructure.flags.weightBasis, tableStructure: tableStructure
            });
          });
        });
      });
      const structure = classifyFdaDosingStructure(text, tables, sourceSections, rawIndications);
      candidates.forEach(c => {
        c.structuralFamilies = structure.detected.slice();
        c.localStructuralFamilies = ADAPTIVE_ADDITIONAL_FORMATS.filter(f => f.re.test(c.sourceText || "")).map(f => f.family);
        c.presentationPolicy = c.localStructuralFamilies.length || c.qualifiers?.hasLoadingOrMaintenanceStep || c.qualifiers?.hasDividedDailyDose
          ? "preserve_all_steps_and_conditions" : "compact_only_if_lossless";
      });
      return {
        version: "adaptive-label-index-v8",
        sourceStatus: text || (tables || []).length ? "label_dosing_content_present" : "label_dosing_content_missing",
        candidateCount: candidates.length,
        structure,
        candidates
      };
    }

    // Measure-aware renal matching. Each label threshold is evaluated only against
    // the corresponding patient measurement; CrCl is never inferred from eGFR.
    function resolverRenalFits(s, profile) {
      return renalClauseFitsPatient(s, profile);
    }

    // Reads the heading part of a unit (numbered subsection title, or "Lead-in:" before the first colon).
    function resolverHeadPortion(t) {
      const numbered = /^\(?\d+\.\d+(?:\.\d+)*\)?\s+[A-Z]/.test(t);
      const lead = t.match(/^([A-Z][^:]{2,150}):(?:\s|$)/);
      const dose = t.search(RESOLVER_DOSE_RE);
      if (numbered) {
        let end = t.length;
        if (lead) end = Math.min(end, lead[0].length);
        if (dose >= 0) end = Math.min(end, dose);
        return { numbered: true, text: t.slice(0, end) };
      }
      if (lead && (dose < 0 || lead[0].length <= dose)) return { numbered: false, text: lead[1] };
      return { numbered: false, text: "" };
    }

    function resolverScopeFromHead(h) {
      const s = { pop: null, age: null, weight: null, renal: null, hepatic: false, pregnancy: false };
      const matchText = normalizeLabelStructureText(h);
      const ped = RESOLVER_POP_PED.test(matchText), adult = RESOLVER_POP_ADULT.test(matchText);
      if (ped && !adult) s.pop = "pediatric"; else if (adult && !ped) s.pop = "adult";
      if (/\b(age|aged|months?|years?|older than|younger than|at least)\b/i.test(h) && /\d/.test(h)) s.age = h;
      if (/\b(weight|weighing|body weight)\b/i.test(h)) s.weight = h;
      if (RESOLVER_RENAL.test(matchText)) s.renal = h;
      if (/\b(hepatic impairment|child.pugh|cirrhosis|hepatic dysfunction|impaired hepatic)\b/i.test(matchText)) { s.hepatic = true; s.hepaticText = h; }
      if (/\b(pregnan(?:t|cy)|maternal)\b/i.test(h)) s.pregnancy = true;
      return s;
    }

    function resolverScopeDefinesAnything(s) { return !!(s.pop || s.age || s.weight || s.renal || s.hepatic || s.pregnancy); }

    // Does this unit apply to the active patient? Own words first, then the headings above it.
    function resolverUnitFits(t, sec, lead, profile) {
      if (!dosingClauseFitsPatient(t, profile)) return false;
      const ownPop = RESOLVER_POP_PED.test(t) || RESOLVER_POP_ADULT.test(t);
      const pop = lead.pop || sec.pop;
      if (!ownPop) {
        if (!profile.pediatric && pop === "pediatric") return false;
        if (profile.pediatric && pop === "adult") return false;
      }
      const age = lead.age || sec.age, weight = lead.weight || sec.weight;
      if (age && !ageClauseFitsPatient(age + " " + t, profile)) return false;
      if (weight && !weightClauseFitsPatient(weight + " " + t, profile)) return false;
      const renal = lead.renal || sec.renal;
      if (renal || RESOLVER_RENAL.test(t)) {
        if (!resolverRenalFits((renal || "") + " " + t, profile)) return false;
      }
      if ((lead.hepatic || sec.hepatic) && !hepaticClauseFitsPatient((lead.hepaticText || "") + " " + (sec.hepaticText || "") + " " + t, profile)) return false;
      if (!profile.pregnancy && (lead.pregnancy || sec.pregnancy)) return false;
      return true;
    }

    // One pass over the raw label text. Every unit is classified for indication (rel) and for
    // patient fit, using the headings above it (population / age / weight / renal / indication).
    // rel: 2 = names the active disease, 0 = names a different disease, 1 = no indication named.
    // Older labels organize one shared regimen by organism and anatomical site.
    // A site alone never establishes an indication: both the selected organism and
    // its matching dosing heading must agree. Keep the original heading in evidence.
    function resolverOrganismSiteBranch(text, context) {
      const keys = (context.keywords || []).map(normalizeClinicalKeyword);
      const organism = normalizeClinicalKeyword(context.pathogen || "");
      const s = String(text || "");
      const gas = /streptococcus pyogenes|group a (?:strep|streptococcus)/.test(organism);
      const upperThroat = keys.some(k => /^(?:streptococcal )?pharyngitis$|^tonsillitis$|^strep throat$/.test(k));
      if (gas && upperThroat && /^streptococcal infections?\b/i.test(s)
          && /\bupper respiratory tract\b/i.test(s)
          && !/\b(?:pneumococcal|staphylococcal|fusospirochet|vincent|prophylaxis|prevention)\b/i.test(s)) {
        return "Streptococcal upper respiratory infections (label branch)";
      }
      return "";
    }

    function resolverEnterococcalSpeciesContradicts(text, context) {
      const selected = normalizeClinicalKeyword(context?.pathogen || "").match(/\b(?:enterococcus|e) (faecalis|faecium)\b/)?.[1];
      if (!selected) return false;
      const source = normalizeClinicalKeyword(text);
      const other = selected === "faecalis" ? "faecium" : "faecalis";
      return new RegExp("\\b" + other + "\\b").test(source)
        && !new RegExp("\\b" + selected + "\\b").test(source);
    }

    function buildRegimenUnits(rawText, context, profile) {
      const ctxKeys = resolverExpandKeywords(context.keywords || []);
      const parts = splitLabelSentences(rawText)
        .flatMap(s => s.split(/(?<=;\s)(?=[A-Z][^:;.]{2,90}:\s)/))
        .flatMap(s => amuExpandPopulationClauses(s));
      const emptyScope = () => ({ pop: null, age: null, weight: null, renal: null, hepatic: false, pregnancy: false });
      let sec = emptyScope(), lead = emptyScope();
      let indication = null; // current indication scope; reset at numbered subsection boundaries
      let indicationHeading = "";
      const units = [];
      parts.forEach(part => {
        const t = part.trim();
        if (!t) return;
        const head = resolverHeadPortion(t);
        const hay = resolverHay(t);
        const ctxTerms = resolverIndicationTermsIn(t).filter(term => resolverTermIsContext(term, ctxKeys));
        const otherTerms = resolverIndicationTermsIn(t).filter(term => !resolverTermIsContext(term, ctxKeys));
        const organismSiteBranch = resolverOrganismSiteBranch(t, context);
        const ctxOwn = ctxKeys.some(k => resolverHasKeyword(hay, k));
        // A passage that mixes the selected syndrome with another distinct indication is
        // ambiguous. Do not let a broad mixed sentence become a confident disease match.
        const knownGasContext = /streptococcus pyogenes|group a (?:strep|streptococcus)/.test(normalizeClinicalKeyword(context.pathogen || ""));
        const contradictoryOrganism = (knownGasContext && /^(?:pneumococcal|staphylococcal|fusospirochetosis|vincent[’'s ]*s?\s+infection)\b/i.test(t))
          || resolverEnterococcalSpeciesContradicts(t, context);
        const own = contradictoryOrganism ? "other" : (organismSiteBranch ? "ctx" : ((ctxOwn && otherTerms.length) ? "mixed" : (ctxOwn ? "ctx" : (otherTerms.length ? "other" : null))));

        if (head.numbered) {
          sec = resolverScopeFromHead(head.text); lead = emptyScope(); indication = null; indicationHeading = "";
        } else if (head.text) {
          const ls = resolverScopeFromHead(head.text);
          if (resolverScopeDefinesAnything(ls)) {
            if (!RESOLVER_DOSE_RE.test(t) && /\b(?:dosage|dose|recommendations)\b/i.test(t) && /\bfor\b/i.test(t)) {
              sec = ls; lead = emptyScope();
            } else lead = ls;
          } else if (own) lead = emptyScope();
        }
        if (own) {
          indication = own;
          indicationHeading = head.text || (ctxTerms.length ? t : otherTerms.length ? t : "");
        }
        const effective = own || indication;
        const rel = effective === "ctx" ? 2 : effective === "mixed" ? 3 : effective === "other" ? 0 : 1;
        const hasDose = RESOLVER_DOSE_RE.test(t) && !/\b(?:do not administer|not recommended|should not be used|not indicated)\b/i.test(t);
        const fits = resolverUnitFits(t, sec, lead, profile);
        const renalBranch = !!(sec.renal || lead.renal || RESOLVER_RENAL.test(t));
        const scopeText = [sec.age, sec.weight, sec.renal, sec.pop, lead.age, lead.weight, lead.renal, lead.pop]
          .filter(Boolean).join(" | ");
        units.push({
          text: t, hasDose, rel, fits, renalBranch,
          indicationLabel: organismSiteBranch,
          populationScope: [sec.age, lead.age].filter(Boolean).join("; "),
          source: {
            sourceType: "prose", sourceField: "dosage_and_administration",
            sourceText: t, sourceHeading: head.text || scopeText || indicationHeading,
            indicationHeading,
            sourceOffset: null
          },
          qualifiers: extractAdaptiveQualifiers([scopeText, indicationHeading, t].filter(Boolean).join(" "))
        });
      });
      return units;
    }

    function regimenSignature(text) {
      return String(text).toLowerCase().replace(/[^a-z0-9.\/ ]+/g, " ").replace(/\s+/g, " ").trim();
    }

    function enrichUnitsFromAdaptiveIndex(units, index) {
      const candidates = index?.candidates || [];
      (units || []).forEach(unit => {
        let candidate = null;
        if (unit.fromTable) {
          candidate = candidates.find(c => c.sourceType === "table_row" &&
            c.tableIndex === unit.source?.tableIndex && c.rowIndex === unit.source?.rowIndex &&
            (c.doseExpressions || []).some(d => normalizeClinicalKeyword(unit.doseText).includes(normalizeClinicalKeyword(d))));
        } else {
          const target = normalizeClinicalKeyword(unit.text);
          candidate = candidates.find(c => c.sourceType === "prose" && normalizeClinicalKeyword(c.sourceText) === target)
            || candidates.find(c => c.sourceType === "prose" && target.includes(normalizeClinicalKeyword(c.sourceText)));
        }
        if (candidate) {
          unit.source = { ...(unit.source || {}), candidateId: candidate.id, sourceOffset: candidate.sourceIndex ?? unit.source?.sourceOffset ?? null };
          unit.qualifiers = { ...(candidate.qualifiers || {}), ...(unit.qualifiers || {}) };
        }
      });
      return units;
    }

    function resolveMatchingRegimens(rawDosing, context, tables, routeHint, structuredIndex, labelProvenance, rawIndications = "") {
      if (!context || !context.keywords?.length) return { status: "none", reason: "no-context" };
      const raw = String(rawDosing || "").replace(/\s+/g, " ").trim();
      const hasTables = !!(tables && tables.length);
      if (!raw && !hasTables) return { status: "none", reason: "empty" };
      const profile = getActiveDosingPhysiology();
      const hasGestationalBranch = (structuredIndex?.structure?.detected || []).includes("gestational_and_postnatal_age_branch")
        || /\b(gestational age|postnatal age|preterm|premature neonat)\b/i.test(raw);
      if (hasGestationalBranch && profile.age < 0.25
          && (!Number.isFinite(profile.gestationalAgeWeeks) || !Number.isFinite(profile.postnatalAgeDays))) {
        return { status: "unresolved", reason: "neonatal-ga-pna-required", requiresGestationalAge: true, requiresPostnatalAge: true };
      }

      // pathogen/disease context + patient physiology, in one scoped pass (label text + label tables)
      const textUnits = enrichUnitsFromAdaptiveIndex(raw ? buildRegimenUnits(raw, context, profile) : [], structuredIndex);
      const tableUnits = enrichUnitsFromAdaptiveIndex(hasTables ? buildTableRegimenUnits(tables, context, profile, rawIndications, raw) : [], structuredIndex);
      tableUnits.forEach(unit => {
        const sourceScope = [unit.text, unit.scopeHeaders, unit.source?.sourceHeading, unit.source?.sourceText, unit.source?.sourceScope].filter(Boolean).join(" ");
        if (resolverEnterococcalSpeciesContradicts(sourceScope, context)) { unit.rel = 0; unit.fits = false; }
      });
      let units = textUnits;
      if (tableUnits.length) {
        // some labels repeat the table inside the text; keep only the structured table rows
        const sigs = tableUnits.map(u => regimenSignature(u.doseText)).filter(Boolean);
        const rowSigs = tableUnits.map(u => {
          if (u.source?.tableIndex == null) return "";
          const table = tables.find(t => t.sourceIndex === u.source.tableIndex);
          return regimenSignature((table?.rows?.[u.source?.rowIndex] || []).join(" "));
        }).filter(sig => sig.length >= 40);
        units = textUnits.filter(u => !(u.hasDose && [...sigs, ...rowSigs].some(sg => regimenSignature(u.text).includes(sg)))).concat(tableUnits);
      }
      const dosed = units.filter(u => u.hasDose);
      const specificAny = dosed.some(u => u.rel === 2 || u.rel === 3);
      const potentiallyRelevant = specificAny ? dosed.filter(u => u.rel === 2 || u.rel === 3) : dosed.filter(u => u.rel === 1);
      const relevantUnitText = u => [u.text, u.source?.sourceHeading || "", u.source?.sourceText || ""].join(" ");
      const hasRelevantCrClClause = potentiallyRelevant.some(u => /\b(?:crcl|creatinine clearance)\b/i.test(relevantUnitText(u)));
      const hasRelevantUnspecifiedRenalClause = potentiallyRelevant.some(u => {
        const source = relevantUnitText(u);
        const genericRenal = /\b(?:renal impairment|renal dysfunction|renal failure|impaired renal function)\b/i.test(source);
        const namedMetric = /\b(?:crcl|creatinine clearance|egfr|gfr|hemodialysis|haemodialysis|dialysis|crrt)\b/i.test(source);
        const explicitlyNoAdjustment = /no\s+(?:dosage|dose)\s+adjustment\s+(?:is\s+)?(?:needed|required|recommended|necessary)/i.test(source);
        return genericRenal && !namedMetric && !explicitlyNoAdjustment;
      });
      const normalRenalAssumed = canAssumeNormalRenalFunction(profile);
      const crclRequired = (hasRelevantCrClClause || !!tableUnits.requiresCrClValue) && !Number.isFinite(profile.crcl) && profile.dialysis === "none" && !normalRenalAssumed;
      const ambiguousIndication = dosed.some(u => u.rel === 3);
      const labelIsIndicationSpecific = dosed.some(u => u.rel !== 1);
      let chosenUnits = [], basis = "specific";
      if (specificAny) {
        chosenUnits = dosed.filter(u => u.rel === 2 && u.fits);
      } else if (!labelIsIndicationSpecific) {
        // Indication-agnostic dose lines are only used when the label names no indication-specific dosing at all.
        chosenUnits = dosed.filter(u => u.rel === 1 && u.fits);
        basis = "general";
      }
      // A standard upper-clearance band is a baseline dose under the explicit
      // normal-function assumption. Mixed-indication prose cannot be an adjustment.
      const isAssumedStandardUnit = u => normalRenalAssumed && isStandardRenalBranch(
        [u.scopeHeaders || "", u.text, u.source?.sourceHeading || "", u.source?.sourceScope || ""].join(" "));
      const renalUnits = dosed.filter(u => u.renalBranch && u.fits
        && (specificAny ? u.rel === 2 : u.rel === 1) && !isAssumedStandardUnit(u));
      const baseUnits = chosenUnits.filter(u => !u.renalBranch || isAssumedStandardUnit(u));
      const standaloneRenalMatrix = (tableUnits || []).some(u => u.fromTable && u.tableFamily === "renal_by_indication_matrix" && u.fits && u.rel === 2);
      // Do not fall back to the unadjusted baseline dose when a relevant CrCl branch
      // exists but the patient has not entered a direct CrCl measurement.
      if (crclRequired) return { status: "unresolved", reason: "crcl-required", requiresCrCl: true };
      if (hasRelevantUnspecifiedRenalClause && !normalRenalAssumed) return { status: "unresolved", reason: "renal-metric-unclear" };
      // If a structurally recognized renal adjustment matrix cannot be linked to the
      // selected base regimen, never display that base regimen as though unadjusted dosing
      // were established for this patient.
      if (tableUnits.renalMatrixUnlinked && !normalRenalAssumed && (Number.isFinite(profile.crcl) || Number.isFinite(profile.egfr) || profile.dialysis !== "none")) {
        return { status: "unresolved", reason: "renal-adjustment-table-unlinked", renalMatrixEvidence: tableUnits.renalMatrixEvidence || [] };
      }
      if (ambiguousIndication && !chosenUnits.length) return { status: "unresolved", reason: "ambiguous-indication" };
      if (!baseUnits.length) {
        if (tableUnits.skippedRelevant) return { status: "unresolved", reason: "table-ambiguous" };
        if (!renalUnits.length) return { status: "none", reason: specificAny ? "no-fit" : "no-match" };
      }
      // Some label tables contain only the patient's applicable renal branch. In that
      // case it is the matched regimen, not an adjustment that must be paired with a
      // separate base-dose sentence.
      const primaryUnits = standaloneRenalMatrix ? renalUnits : (baseUnits.length ? baseUnits : renalUnits);
      const separateRenalUnits = standaloneRenalMatrix ? [] : (baseUnits.length ? renalUnits.filter(u => !baseUnits.includes(u) && !baseUnits.some(b => regimenSignature(b.doseText || b.text) === regimenSignature(u.doseText || u.text))) : []);

      // one bullet per distinct regimen (alternatives written on one line stay together as one bullet)
      const tidy = u => cleanDosingSentence(u.text.replace(/^\(?\d+\.\d+(?:\.\d+)*\)?\s+/, ""));
      const collect = list => {
        const out = [];
        list.forEach(u => {
          const c = u.fromTable ? { text: u.doseText, label: u.severity || "", fromTable: true } : { text: tidy(u), label: u.indicationLabel || "", populationScope: u.populationScope || "" };
          if (!c.text) return;
          const sig = regimenSignature(c.label + " " + c.text);
          const evidence = {
            sourceType: u.source?.sourceType || (u.fromTable ? "table_row" : "prose"),
            sourceField: u.source?.sourceField || "dosage_and_administration",
            sourceText: u.source?.sourceText || u.text,
            sourceHeading: u.source?.sourceHeading || "",
            tableIndex: u.source?.tableIndex ?? null,
            rowIndex: u.source?.rowIndex ?? null,
            candidateId: u.source?.candidateId || "",
            qualifiers: u.qualifiers || extractAdaptiveQualifiers(u.text),
            tableFamily: u.tableFamily || u.source?.tableFamily || "",
            tableNotes: u.source?.tableNotes || [], sourceScope: u.source?.sourceScope || u.scopeHeaders || "",
            labelStructure: structuredIndex?.structure?.detected || []
          };
          const prior = out.find(r => r.sig === sig);
          if (prior) {
            if (!prior.evidence.some(e => e.sourceField === evidence.sourceField && e.sourceText === evidence.sourceText)) prior.evidence.push(evidence);
          } else out.push({ ...c, sig, evidence: [evidence] });
        });
        return out;
      };
      const regimens = collect(primaryUnits);
      const renalAdjust = collect(separateRenalUnits);
      if (!regimens.length) return { status: "none", reason: "no-match" };
      if (regimens.length > REGIMEN_MAX) return { status: "unresolved", reason: "too-many", count: regimens.length };
      if (renalAdjust.length > 2) return { status: "unresolved", reason: "too-many-renal", count: renalAdjust.length };
      if ([...regimens, ...renalAdjust].some(r => !r.fromTable && r.text.length > REGIMEN_MAX_CHARS && !amuStructuredRegimenSummary(r.text, { routeHint }))) return { status: "unresolved", reason: "too-long" };

      // every bullet must compress to "dose frequency (route)"; otherwise keep the complex flag rather than show a distorted line
      for (const r of [...regimens, ...renalAdjust]) {
        r.concise = amuPresentRegimen(r.text, { routeHint });
        if (r.concise && r.populationScope) {
          const age = r.populationScope.match(/(\d+(?:\.\d+)?)\s*(months?|years?|weeks?)\s*(?:of age\s*)?(?:and|or)\s*(?:older|above|over)/i);
          if (age) r.concise += `; age ≥${age[1]} ${age[2].toLowerCase()}`;
        }
        if (!r.concise) return { status: "unresolved", reason: "not-compressible" };
      }

      // course duration, only when the context-matched, patient-fitting text states exactly one
      const scopedText = units.filter(u => u.fits && !u.renalBranch && !u.fromTable && (u.rel === 2 || (basis === "general" && u.rel === 1))).map(u => u.text).join(" ");
      const durations = [...new Set([...scopedText.matchAll(/\b(?:for\s+)?(\d+\s*(?:to|–|-)\s*\d+|\d+)\s*(days|weeks)\b/gi)]
        .map(m => `${m[1].replace(/\s+/g, " ")} ${m[2].toLowerCase()}`))];
      const carriesDuration = regimens.some(r => / for \d/.test(r.concise));
      const selectedUnits = [...primaryUnits, ...separateRenalUnits];
      const crclUsed = Number.isFinite(profile.crcl) && selectedUnits.some(u => /\b(?:crcl|creatinine clearance)\b/i.test([u.text, u.source?.sourceHeading || "", u.source?.sourceText || ""].join(" ")));
      return { status: "ok", basis, regimens, renalAdjust, durations: carriesDuration ? [] : durations, crclUsed, crclValue: profile.crcl, normalRenalAssumed, assumedFromEgfr: profile.egfr, labelProvenance: labelProvenance || {} };
    }

    function sourceTableConditions(notes) {
      return (Array.isArray(notes) ? notes : [notes]).map(note => String(note || "").trim()).filter(Boolean).join("\n");
    }

    function regimenSourceConditions(evidence) {
      if (evidence?.sourceType === "table_conditions") return "";
      const notes = sourceTableConditions(evidence?.tableNotes);
      const isTable = /table/.test(evidence?.sourceType || "") || /_table$/.test(evidence?.sourceField || "");
      if (!isTable) return notes;
      // Some SPL records inline a footnote in an indication or duration cell.
      // Quote the complete cell containing an explicit condition, not an inferred
      // replacement dose, so organism, route and endpoint qualifiers stay attached.
      const conditionalCells = String(evidence?.sourceText || "").split(/\s*\|\s*/).filter(cell =>
        /\b(?:for|in)\b[^|;]{0,140}\b(?:use|administer|give|reduce|increase|avoid)\b/i.test(cell)
        || /\b(?:only|except|not recommended|do not|until|in combination with|coadministered)\b/i.test(cell));
      return [...new Set([notes, ...conditionalCells].filter(Boolean))].join("\n");
    }

    function buildResolvedDosingBullets(res, context) {
      const hasConditions = r => (r.evidence || []).some(ev => regimenSourceConditions(ev));
      const n = res.regimens.length;
      const bullets = res.regimens.map((r, i) => ({
        color: hasConditions(r) ? "amber" : "blue",
        tag: hasConditions(r) ? `${r.label || (n > 1 ? `Table regimen ${i + 1}` : "Table regimen")} — conditions apply` : (r.label || (n > 1 ? `Regimen ${i + 1}` : (res.basis === "specific" ? "Matched Regimen" : "General Label Dose"))),
        text: r.concise,
        evidence: r.evidence || [],
        labelProvenance: res.labelProvenance || {}
      }));
      (res.renalAdjust || []).forEach(r => bullets.push({ color: "amber", tag: "Renal Adjustment", text: r.concise, evidence: r.evidence || [], labelProvenance: res.labelProvenance || {} }));
      // Footnotes can change the route, organism-specific dose or course endpoint.
      // Preserve every note associated with a selected source table; do not decide
      // that an unparsed condition is irrelevant or silently use the baseline dose.
      const conditionSources = new Map();
      [...res.regimens, ...(res.renalAdjust || [])].forEach(r => (r.evidence || []).forEach(ev => {
        const text = regimenSourceConditions(ev);
        const key = text.replace(/\s+/g, " ").trim();
        if (key && !conditionSources.has(key)) conditionSources.set(key, { text, evidence: ev });
      }));
      conditionSources.forEach(({ text, evidence }) => {
        const shortEnough = text.length <= 1400;
        bullets.push({ color: "amber", tag: shortEnough ? "Source-table conditions — review with regimen" : "Full table conditions require review",
          text: shortEnough ? text : `This source table has ${text.length.toLocaleString()} characters of conditions that may change the dose, route or duration. Review the complete conditions in FDA label evidence below before interpreting this conditional table regimen.`,
          evidence: [{ ...evidence, sourceType: "table_conditions", sourceText: text, tableNotes: [] }],
          labelProvenance: res.labelProvenance || {} });
      });
      if (res.normalRenalAssumed) bullets.push({ color: "blue", tag: "Unflagged Label Text", text: `Ordinary-function text branch selected. CrCl was left blank, eGFR ${Math.round(res.assumedFromEgfr)} mL/min/1.73 m² is within 90–130, and no dialysis is selected, so label sentences that are not limited to renal impairment are shown. No CrCl was calculated and no dose is recommended.` });
      if (res.crclUsed) bullets.push({ color: "blue", tag: "Unflagged Label Text", text: `CrCl text filter applied to label sentences that state a CrCl threshold. Entered value: ${Math.round(res.crclValue)} mL/min. eGFR was not converted into CrCl, and this line is not a dose recommendation.` });
      if (res.durations.length === 1) bullets.push({ color: "emerald", tag: "Course Window", text: res.durations[0] });
      else if (res.durations.length > 1) bullets.push({ color: "emerald", tag: "Duration Options", text: res.durations.slice(0, 4).join("; ") });
      if (SHOW_REGIMEN_FILTER_SUMMARY) {
        const p = getActiveDosingPhysiology();
        const bits = [context.label, p.age < 1 ? `${Math.round(p.age * 12)} mo` : `${+p.age.toFixed(1)} y`, `${Math.round(p.weightKg)} kg`];
        if (p.dialysis !== "none") bits.push(String(p.dialysis).toUpperCase());
        if (Number.isFinite(p.crcl)) bits.push(`CrCl ${Math.round(p.crcl)} mL/min`);
        else if (Number.isFinite(p.egfr)) bits.push(`eGFR ${Math.round(p.egfr)} mL/min/1.73 m²`);
        if (p.pregnancy) bits.push("pregnant");
        if (p.hepatic) bits.push(`hepatic Child-Pugh ${p.hepaticClass}`);
        bullets.push({ color: "blue", tag: "Filters Applied", text: bits.join(" • ") });
      }
      return bullets;
    }

    // Console helper for tuning: AMU_debugRegimens("azithromycin") lists how each unit of that
    // drug's label text was classified for the active filters (rel 2 = active disease, 0 = other, 1 = none named).
    window.AMU_debugRegimens = function (drugName) {
      const d = currentFetchedDrugs.find(x => String(x.genericName).toLowerCase().includes(String(drugName).toLowerCase()));
      if (!d) return console.warn("Drug not in the current results:", drugName);
      const ctx = getActiveClinicalDosingContext();
      const profile = getActiveDosingPhysiology();
      console.log("context:", ctx, "\nphysiology:", profile);
      console.log("openFDA label provenance:", d.labelProvenance, "| dosing fields:", d.fdaDoseFieldKeys);
      console.log("adaptive structured regimen index:", d.structuredRegimenIndex);
      console.log("FDA label structural profile:", d.structuredRegimenIndex?.structure);
      (d.rawDosingTables || []).forEach((t, i) => console.log("table structure " + i, classifyAdaptiveTableStructure(t)));
      console.log("parsed tables:", (d.rawDosingTables || []).length);
      (d.rawDosingTables || []).forEach((t, i) => { console.log("table " + i + " headers:", t.headers); console.table(t.rows.map(r => ({ ...r }))); });
      if (ctx) {
        const raw = String(d.rawDosingTextOnly ?? d.rawDosing ?? "").replace(/\s+/g, " ").trim();
        const all = buildRegimenUnits(raw, ctx, profile).concat(buildTableRegimenUnits(d.rawDosingTables, ctx, profile, d.rawIndications, raw));
        console.table(all.map(u => ({ rel: u.rel, dose: u.hasDose, fits: u.fits, table: !!u.fromTable, text: u.text.slice(0, 140) })));
      }
      return resolveMatchingRegimens(d.rawDosingTextOnly ?? d.rawDosing, ctx, d.rawDosingTables, amuRouteAbbrev(d.route), d.structuredRegimenIndex, d.labelProvenance, d.rawIndications);
    };

    function inferRouteType(route) {
      const value = String(route || "").toLowerCase();
      if (/intravenous|\biv\b/.test(value)) return "iv";
      if (/intramuscular|\bim\b/.test(value)) return "im";
      if (/oral|\bpo\b/.test(value)) return "oral";
      if (/subcutaneous|\bsc\b/.test(value)) return "sc";
      if (/inhal|nebul/.test(value)) return "inhaled";
      if (/topical|cutaneous/.test(value)) return "topical";
      return "other";
    }

    function extractRouteAdministrationGuidance(drug) {
      const routeType = inferRouteType(drug.route);
      const sentences = splitLabelSentences(drug.rawDosing || "");
      let pattern;
      if (routeType === "iv") pattern = /\b(infus(?:e|ion)|dilut(?:e|ion)|slow intravenous|intravenous push|iv push|flush(?:ed|ing)?\b)/i;
      else if (routeType === "im") pattern = /\b(deep intramuscular|intramuscular injection|injection site|inject slowly)\b/i;
      else if (routeType === "oral") pattern = /\b(with food|without food|empty stomach|take with|swallow|chew|crush|food may|separate from antacids)\b/i;
      else if (routeType === "sc") pattern = /\b(subcutaneous injection|injection site|rotate injection sites|inject slowly)\b/i;
      else if (routeType === "inhaled") pattern = /\b(nebuliz|inhaler|rinse (?:the )?mouth|inhale)\b/i;
      else if (routeType === "topical") pattern = /\b(apply|rub into|affected area|thin layer)\b/i;
      else pattern = /\b(infus(?:e|ion)|dilut(?:e|ion)|injection site|with food|empty stomach|apply)\b/i;

      const matches = [...new Set(sentences.filter(sentence => {
        const hasTimedIvInstruction = routeType === "iv" && /\b(intravenous|\biv\b)/i.test(sentence) &&
          /\b(?:over|for)\s+(?:at\s+least\s+)?\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|hrs?)\b/i.test(sentence);
        if (!pattern.test(sentence) && !hasTimedIvInstruction) return false;
        // Do not turn ordinary indication-specific dose sentences into route tooltips.
        if (/\b\d+(?:\.\d+)?\s*(?:mg\/kg|mg|g|mcg|units)\b/i.test(sentence) &&
            !/\b(infus(?:e|ion)|dilut(?:e|ion)|slow intravenous|intravenous push|iv push)\b/i.test(sentence) &&
            !hasTimedIvInstruction) return false;
        return true;
      }))].slice(0, 2);
      return matches.join(" ") || "No additional route-specific administration instruction was identified in the retrieved FDA dosing section.";
    }

    function renderRouteBadge(drug) {
      const route = String(drug.route || "Systemic");
      const kind = inferRouteType(route);
      const heading = ({ iv: "IV administration", im: "IM administration", oral: "Oral administration", sc: "Subcutaneous administration", inhaled: "Inhaled administration", topical: "Topical administration" })[kind] || "Route information";
      const guidance = extractRouteAdministrationGuidance(drug);
      return `
        <span tabindex="0" role="note" aria-label="${esc(route)}. ${esc(guidance)}" class="relative group inline-flex text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold cursor-help focus:outline-none focus:ring-2 focus:ring-blue-400">
          ${esc(route)}
          <span class="hidden group-hover:block group-focus:block absolute left-0 top-full mt-2 w-64 sm:w-80 p-2.5 rounded-lg bg-slate-900 text-slate-100 border border-slate-600 shadow-xl z-50 whitespace-normal font-normal normal-case text-[11px] leading-relaxed">
            <span class="block text-[10px] uppercase tracking-wider font-extrabold text-sky-300 mb-1">${heading}</span>
            ${esc(guidance)}
          </span>
        </span>
      `;
    }

    function distillSection2Interactions(rawDdi, rawBoxed, genericName) {
      const bullets = [];
      const combined = `${rawDdi} ${rawBoxed}`.toLowerCase();

      if (combined.includes("monoamine oxidase") || combined.includes("serotonin") || combined.includes("maoi") || combined.includes("ssri")) {
        bullets.push({ color: "red", tag: "Parsed caution phrase", text: "Retrieved text matched a serotonin / MAOI phrase. Open the monograph. This parser flag is not an instruction to avoid a medicine." });
      }
      if (combined.includes("qtc") || combined.includes("qt interval") || combined.includes("torsades")) {
        bullets.push({ color: "red", tag: "Parsed caution phrase", text: "Retrieved text matched a QTc / QT-interval phrase. Open the monograph. This parser flag is not a safety or prescribing judgment." });
      }
      if (combined.includes("valproic") || combined.includes("valproate")) {
        bullets.push({ color: "red", tag: "Parsed caution phrase", text: "Retrieved text matched a valproate phrase. Open the monograph. This parser flag does not describe the size of any concentration change." });
      }
      if (combined.includes("cyp3a4") || combined.includes("simvastatin") || combined.includes("atorvastatin")) {
        bullets.push({ color: "red", tag: "Parsed caution phrase", text: "Retrieved text matched a CYP3A4 or named-statin phrase. Open the monograph. This parser flag is not an interaction ruling." });
      }
      if (combined.includes("antacid") || combined.includes("magnesium") || combined.includes("calcium") || combined.includes("iron") || combined.includes("chelat")) {
        bullets.push({ color: "amber", tag: "Parsed adjustment phrase", text: "Retrieved text matched a multivalent-cation or chelation phrase. Open the monograph rather than treating this flag as a dosing interval." });
      }
      if (combined.includes("warfarin") || combined.includes("inr") || combined.includes("prothrombin time")) {
        bullets.push({ color: "amber", tag: "Parsed adjustment phrase", text: "Retrieved text matched a warfarin / INR / prothrombin phrase. Open the monograph. This flag is not a monitoring order." });
      }
      if (combined.includes("nephrotoxic") || combined.includes("aminoglycoside") || combined.includes("furosemide")) {
        bullets.push({ color: "amber", tag: "Parsed adjustment phrase", text: "Retrieved text matched a nephrotoxicity, aminoglycoside, or loop-diuretic phrase. Open the monograph. This flag is not a toxicity ruling." });
      }
      if (bullets.length === 0) {
        bullets.push({ color: "emerald", tag: "No Flag Detected in Parsed Text", text: extractCleanSentence(rawDdi, "interaction", 140) || "No interaction caution phrase was detected in the parsed excerpt. That is not a finding that the label is silent or that combined use is appropriate." });
      }
      return bullets.slice(0, 3);
    }

    function distillSection3RenalPopulations(rawPop, rawDose, renalProfile) {
      const bullets = [];
      const combined = `${rawPop} ${rawDose}`.toLowerCase();
      const profileSource = renalProfile?.source || "legacy_matrix";

      if (profileSource === "no_fda_label") {
        bullets.push({ color: "amber", tag: "Source Check Required", text: "No product-specific FDA label renal dosing text was retrieved. No dose adjustment is inferred." });
      } else if (profileSource === "formulation_specific_review") {
        bullets.push({ color: "blue", tag: "Formulation-specific renal review", text: renalProfile.adjustedDose });
      } else if (profileSource === "legacy_matrix") {
        bullets.push({ color: "amber", tag: "Legacy app renal reference (not FDA-label-derived)", text: renalProfile.adjustedDose });
      } else if (renalProfile?.contraLevel?.includes("SAFE")) {
        bullets.push({ color: "emerald", tag: "No Flag Detected in Parsed Text", text: renalProfile.adjustedDose });
      } else {
        bullets.push({ color: "blue", tag: "Renal label review", text: extractCleanSentence(rawPop, "renal", 240) || "No specific renal adjustment was identified in the retrieved label excerpt." });
      }

      const hepaticText = extractCleanSentence(rawPop, "hepatic", 260) || extractCleanSentence(rawDose, "hepatic", 260);
      if (hepaticText && /hepatic|liver|child.pugh/i.test(hepaticText) && /adjust|monitor|avoid|contraindicat|not recommend|not studied|impair/i.test(hepaticText)) {
        bullets.push({ color: "blue", tag: "FDA hepatic-label text", text: hepaticText });
      } else {
        const pregnancyText = extractCleanSentence(rawPop, "pregnan", 200);
        if (pregnancyText && !pregnancyText.toLowerCase().includes("consult product insert")) {
          bullets.push({ color: "blue", tag: "FDA specific-populations text", text: pregnancyText });
        } else {
          bullets.push({ color: "blue", tag: "Specific-populations evidence", text: "No explicit hepatic dose-adjustment statement was identified in the retrieved label excerpt. This is not evidence that adjustment is unnecessary." });
        }
      }
      return bullets.slice(0, 2);
    }

    function extractCleanSentence(text, keyword, maxLen) {
      if (!text) return "";
      const cleaned = text
        .replace(/^\s*(?:\(\d+(?:\.\d+)*\)\s*)?\d+(?:\.\d+)*\s+(?:[A-Z]{2,}[A-Z&,\/-]*\s+)*/, "")
        .replace(/^\s*\(\d+(?:\.\d+)*\)\s*/, "").trim();
      const sentences = cleaned.split(/(?<=[.?!])\s+/);
      if (keyword) {
        // Keep a small explicit stem vocabulary used by existing summary callers;
        // full disease keywords use phrase boundaries and the shared equivalents.
        const stem = /^(?:pregnan|neonat|contraindicat|hypersensitiv|chelat)$/i.test(keyword) ? normalizeClinicalKeyword(keyword) : "";
        const found = sentences.find(s => textContainsClinicalKeyword(s, keyword)
          || (stem && normalizeClinicalKeyword(s).split(" ").some(word => word.startsWith(stem))));
        if (found) return found; // the complete sentence, never truncated
      }
      let out = ""; // otherwise: whole sentences only, within the length budget
      for (const s of sentences) { if (out && (out + " " + s).length > maxLen) break; out += (out ? " " : "") + s; }
      return out;
    }

    function scanPharmacologicalRisks(genericName, epcList, ddiText, boxedText, popText) {
      const badges = [];
      const combined = `${genericName} ${epcList.join(" ")} ${ddiText} ${boxedText} ${popText}`.toLowerCase();
      if (boxedText) badges.push({ label: "FDA Boxed Warning", color: "bg-rose-100 text-rose-900 border-rose-300", icon: "fa-skull-crossbones" });
      if (combined.includes("serotonin syndrome") || combined.includes("monoamine oxidase")) badges.push({ label: "Serotonin / MAOI Alert", color: "bg-rose-100 text-rose-900 border-rose-300", icon: "fa-brain" });
      if (combined.includes("qtc") || combined.includes("qt interval")) badges.push({ label: "QTc Prolongation", color: "bg-purple-100 text-purple-900 border-purple-300", icon: "fa-heart-pulse" });
      if (combined.includes("cyp3a4") || combined.includes("cyp1a2")) badges.push({ label: "CYP450 Inhibitor", color: "bg-indigo-100 text-indigo-900 border-indigo-300", icon: "fa-flask" });
      if (combined.includes("chelat") || (combined.includes("calcium") && combined.includes("magnesium"))) badges.push({ label: "Cation Chelation (Ca/Mg/Fe)", color: "bg-amber-100 text-amber-900 border-amber-300", icon: "fa-magnet" });
      return badges;
    }

    // =========================================================================
    // 11. ALLERGY EVALUATION & TOP-PINNED DATA HUB RENDERING
    // =========================================================================
    function evaluateDrugAllergyStatus(drug, allergyState) {
      const text = `${esc(drug.genericName)} ${drug.epcClasses.join(" ")}`.toLowerCase();
      const isPenicillin = text.includes("penicillin") || /(amoxicillin|ampicillin|piperacillin|nafcillin|oxacillin|cloxacillin|dicloxacillin|methicillin)/.test(text);
      const isCephalosporin = text.includes("cephalosporin") || /(ceftriaxone|cefazolin|cefepime|ceftazidime|cefotaxime|cefuroxime|cefalexin|cephalexin|ceftaroline|cefoxitin|cefotetan|cefiderocol)/.test(text);
      const isCarbapenem = text.includes("carbapenem") || /(meropenem|ertapenem|imipenem|doripenem)/.test(text);
      const isMacrolide = text.includes("macrolide") || /(azithromycin|clarithromycin|erythromycin|fidaxomicin)/.test(text);
      const isQuinolone = text.includes("fluoroquinolone") || text.includes("quinolone") || /(ciprofloxacin|levofloxacin|moxifloxacin|ofloxacin|delafloxacin|gatifloxacin)/.test(text);
      const isTetracycline = text.includes("tetracycline") || /(doxycycline|minocycline|tigecycline|omadacycline)/.test(text);
      const isSulfa = text.includes("sulfonamide") || /(sulfamethoxazole|sulfadiazine)/.test(text);
      const isAminoglycoside = text.includes("aminoglycoside") || /(gentamicin|tobramycin|amikacin|streptomycin|plazomicin)/.test(text);
      const isGlycopeptide = text.includes("glycopeptide") || /(vancomycin|dalbavancin|oritavancin|telavancin)/.test(text);
      const isLincosamide = text.includes("lincosamide") || /(clindamycin|lincomycin)/.test(text);

      if (isPenicillin && allergyState.pcn !== "none") {
        return { status: "BLOCKED", specificAllergy: "Penicillin-class filter", reason: "Penicillin-class text matched the selected class filter" };
      }
      if (isCephalosporin && allergyState.cephalosporin) {
        return { status: "BLOCKED", specificAllergy: "Cephalosporin-class filter", reason: "Cephalosporin-class text matched the selected class filter" };
      }
      if ((isCephalosporin || isCarbapenem) && allergyState.pcn === "severe") {
        return { status: "BLOCKED", specificAllergy: "Severe-reaction beta-lactam filter", reason: "Beta-lactam text matched the selected severe-reaction class filter" };
      }
      if ((isCephalosporin || isCarbapenem) && allergyState.pcn === "mild") {
        return { status: "CAUTION", specificAllergy: "Mild penicillin-rash class filter", reason: "Mild-rash class filter selected. Cephalosporin and carbapenem text is flagged for review. This filter does not estimate cross-reactivity." };
      }
      if (isMacrolide && allergyState.macrolide) {
        return { status: "BLOCKED", specificAllergy: "Macrolide-class filter", reason: "Macrolide-class text matched the selected class filter" };
      }
      if (isQuinolone && allergyState.quinolone) {
        return { status: "BLOCKED", specificAllergy: "Fluoroquinolone-class filter", reason: "Fluoroquinolone-class text matched the selected class filter" };
      }
      if (isTetracycline && allergyState.tetracycline) {
        return { status: "BLOCKED", specificAllergy: "Tetracycline-class filter", reason: "Tetracycline-class text matched the selected class filter" };
      }
      if (isSulfa && allergyState.sulfa) {
        return { status: "BLOCKED", specificAllergy: "Sulfonamide-class filter", reason: "Sulfonamide-class text matched the selected class filter" };
      }
      if (isAminoglycoside && allergyState.aminoglycoside) {
        return { status: "BLOCKED", specificAllergy: "Aminoglycoside-class filter", reason: "Aminoglycoside-class text matched the selected class filter" };
      }
      if (isGlycopeptide && allergyState.glycopeptide) {
        return { status: "BLOCKED", specificAllergy: "Glycopeptide-class filter", reason: "Glycopeptide-class text matched the selected class filter" };
      }
      if (isLincosamide && allergyState.lincosamide) {
        return { status: "BLOCKED", specificAllergy: "Lincosamide-class filter", reason: "Lincosamide-class text matched the selected class filter" };
      }
      return { status: "SAFE", specificAllergy: null, reason: "No allergy-class flag on this filter" };
    }

    function getAllergyState() {
      return {
        pcn: document.querySelector('input[name="pcnStatus"]:checked').value,
        cephalosporin: document.getElementById("alg_cephalosporin").checked,
        macrolide: document.getElementById("alg_macrolide").checked,
        quinolone: document.getElementById("alg_quinolone").checked,
        tetracycline: document.getElementById("alg_tetracycline").checked,
        sulfa: document.getElementById("alg_sulfa").checked,
        aminoglycoside: document.getElementById("alg_aminoglycoside").checked,
        glycopeptide: document.getElementById("alg_glycopeptide").checked,
        lincosamide: document.getElementById("alg_lincosamide").checked,
        renalFlag: document.getElementById("renalFlag").checked
      };
    }

    function resetAllergies() {
      AMUApp.resetBranchFields();
      ptGaWeeks = null; ptPnaDays = null; if ($id("gaWeeksInput")) $id("gaWeeksInput").value = ""; if ($id("pnaDaysInput")) $id("pnaDaysInput").value = ""; updatePtNote();
      egfr = 100; crcl = null; $id("egfrRng").disabled = false; $id("egfrNum").value = 100; $id("egfrRng").value = 100; $id("crclNum").value = ""; $id("crclRng").value = 0; $id("crclRng").disabled = true; $id("useCrClInput").checked = false; document.querySelector('input[name="rrtMode"][value="none"]').checked = true; syncRenalMetric(); updateRenalState();
      document.querySelector('input[name="pcnStatus"][value="none"]').checked = true;
      ["alg_cephalosporin", "alg_macrolide", "alg_quinolone", "alg_tetracycline", "alg_sulfa", "alg_aminoglycoside", "alg_glycopeptide", "alg_lincosamide", "renalFlag", "ptPreg"].forEach(id => {
        document.getElementById(id).checked = false;
      });
      if ($id("ptHepClass")) $id("ptHepClass").value = "none";
      if (currentNihPillNames.length > 0) renderNihIngredientPills();
      if (currentFetchedDrugs.length > 0) reFilterCurrentResults();
    }

    function doesDrugMatchDiseaseSubfilter(drug) {
      if (drug.isSelectedPinned) return true;
      if ((currentSearchLevel === "SYNDROME" || currentSearchLevel === "PATHOGEN") &&
          !isFormulationCompatibleWithSystemicInfection(drug)) return false;

      // Syndrome searches use curated pathogen-to-agent associations only.
      if (currentSearchLevel === "SYNDROME") {
        const map = getSyndromeClinicalMap();
        if (!map) return false;
        const selectedPathogens = activeSyndromePathogenId === "all"
          ? map.pathogens
          : map.pathogens.filter(p => p.id === activeSyndromePathogenId);
        return selectedPathogens.some(p => p.agents.some(agent => drugMatchesCuratedAgent(drug, agent)));
      }

      if (currentSearchLevel === "PATHOGEN" && activePathogenProfile) {
        if (activeDiseaseFilterId === "all") {
          return (activePathogenProfile.curatedDrugs || []).some(agent => drugMatchesCuratedAgent(drug, agent));
        }
        const curatedAgents = getPathogenDiseaseAgentSet() || [];
        const matched = curatedAgents.some(agent => drugMatchesCuratedAgent(drug, agent)&&(!amuCuratedProductPreference(agent)||drug.isCuratedFallback||curatedProductMatches(drug,agent)));
        if (!matched) return false;
        if (activePathogenProfile?.canonical === "Streptococcus pyogenes" && activeDiseaseFilterId === "pharyngitis" && /penicillin\s*g/i.test(drug.genericName)) {
          const formulation = `${drug.genericName} ${drug.activeIngredientSource || ""} ${drug.brandName || ""}`;
          const routeAndLabel = `${drug.route || ""} ${drug.rawDosing || ""}`;
          // For uncomplicated GAS pharyngitis, Penicillin G here means the benzathine
          // IM product. Do not conflate it with aqueous IV Penicillin G formulations.
          if (!/benzathine|bicillin\s*l.?a/i.test(formulation) || /procaine|bicillin\s*c.?r/i.test(formulation) || !/intramuscular|\bim\b/i.test(routeAndLabel)) return false;
        }
        return true;
      }

      if (currentSearchLevel !== "PATHOGEN" || activeDiseaseFilterId === "all") return true;
      // Dynamic/unknown organisms: require direct disease evidence, but never substring-match a drug name.
      const selected = extractDynamicSyndromesFromFdaCards(currentFetchedDrugs).find(d => d.id === activeDiseaseFilterId);
      const filterKeywords = selected?.keywords || [];
      if (!filterKeywords.length) return false;
      const combined = `${drug.rawIndications || ""} ${drug.rawMicro || ""}`;
      return resolverExpandKeywords(filterKeywords).some(k => textContainsClinicalKeyword(combined, k));
    }

    function reFilterCurrentResults() {
      return AMUApp.withRenderState(renderCurrentResults);
    }
    function renderCurrentResults() {
      AMUApp.queueAnalysis(currentFetchedDrugs);
      if (currentFetchedDrugs.length === 0 && !(currentSearchLevel==='PATHOGEN' && activePathogenProfile && firstLineKnowledge()?.record(activePathogenProfile.canonical,activeDiseaseFilterId))) return;
      if (currentNihPillNames.length > 0) renderNihIngredientPills();

      const allergyState = getAllergyState();
      const safeContainer = document.getElementById("liveResultsContainer");
      const excludedWrapper = document.getElementById("excludedContainerWrapper");
      const excludedContainer = document.getElementById("excludedResultsContainer");

      const visibleMainCards = [];
      const blockedDrawerDrugs = [];

      const diseaseFilteredDrugs = currentFetchedDrugs.filter(doesDrugMatchDiseaseSubfilter);

      diseaseFilteredDrugs.forEach(drug => {
        const evalResult = evaluateDrugAllergyStatus(drug, allergyState);
        if (evalResult.status === "BLOCKED" && !drug.forceShowEvenIfAllergic) {
          blockedDrawerDrugs.push({ ...drug, evalResult });
        } else {
          visibleMainCards.push({ ...drug, evalResult });
          if (evalResult.status === "BLOCKED") {
            blockedDrawerDrugs.push({ ...drug, evalResult });
          }
        }
      });

      const eligibleCount = visibleMainCards.filter(d => d.evalResult.status !== "BLOCKED").length;
      document.getElementById("drugCountBadge").textContent = `${eligibleCount} unflagged by allergy filter / ${blockedDrawerDrugs.length} matched allergy-class filter`;

      if (visibleMainCards.length === 0) {
        safeContainer.innerHTML = renderGuidelineChoices([], allergyState.renalFlag) + (diseaseFilteredDrugs.length === 0
          ? `<div class="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">No agents matched the current pathogen / presentation filter. Try another presentation, or select a drug in the NIH bar above.</div>`
          : `<div class="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">Every matching record hit the selected allergy-class text filter. That is a class-name match, not a clinical contraindication ruling. Select a drug in the NIH bar or in the matched list below to pin its record.</div>`);
      } else {
        safeContainer.innerHTML = renderWithCombos(visibleMainCards, allergyState.renalFlag);
      }

      if (blockedDrawerDrugs.length > 0) {
        excludedWrapper.classList.remove("hidden");
        excludedContainer.innerHTML = blockedDrawerDrugs.map(d => `
          <div onclick="pinContraindicatedDrugToTop('${d.id}')" class="cursor-pointer bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors shadow-sm">
            <div>
              <span class="font-extrabold text-rose-950 underline">${esc(d.genericName)}</span>
              <span class="text-rose-700 ml-1.5">(${esc(d.epcClasses[0] || "Antimicrobial")})</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                <i class="fa-solid fa-ban mr-1"></i>Filter match: ${d.evalResult.specificAllergy}
              </span>
              <span class="text-[11px] font-bold text-rose-800 hover:underline">
                Pin Data Hub to #1 ↑
              </span>
            </div>
          </div>
        `).join("");
      } else {
        excludedWrapper.classList.add("hidden");
      }
    }

    // Source identity belongs to the exact displayed passage, never to a search hit
    // or ingredient association. This registry also supports future official-source adapters.
    let REGIMEN_SOURCE_REGISTRY = AMUApp.reference("legacySourceRegistry");
    function safeOfficialSourceUrl(value, hosts) {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && hosts.some(host => url.hostname === host || url.hostname.endsWith("." + host)) ? url.href : "";
      } catch (_) { return ""; }
    }
    function hasRetrievedOpenFdaLabel(record) {
      const p = record?.labelProvenance || record || {};
      return !p.testOnly && !record?.testOnly && !record?._amuLabel?.testOnly && String(p.source || "").toLowerCase() === "openfda" && p.status === "retrieved"
        && !!(p.labelId || p.setId) && record?.labelSourceStatus !== "no_fda_label_retrieved" && !record?.isCuratedFallback;
    }
    function regimenSourceDescriptor(provenance, evidence, requireDoseField = true) {
      const p = provenance || {};
      const passages = (Array.isArray(evidence) ? evidence : []).filter(ev => String(ev.sourceText || "").trim());
      if (!passages.length || !['retrieved','reference'].includes(p.status)) return null;
      if (hasRetrievedOpenFdaLabel(p)) {
        if (requireDoseField && !passages.some(ev => /^dosage_and_administration(?:_table)?$/.test(ev.sourceField || ""))) return null;
        const sourceUrl = safeOfficialSourceUrl(p.sourceUrl, ["api.fda.gov"])
          || `https://api.fda.gov/drug/label.json?search=${p.labelId ? "id" : "set_id"}:${encodeURIComponent(p.labelId || p.setId)}`;
        return { label: "FDA label", sourceName: "openFDA", url: sourceUrl, color: "bg-blue-100 text-blue-900 border-blue-200" };
      }
      const source = REGIMEN_SOURCE_REGISTRY[String(p.source || "").toLowerCase()];
      const sourceUrl = source && safeOfficialSourceUrl(p.sourceUrl || p.url, source.hosts);
      if (!sourceUrl) return null;
      return { label: source.label, sourceName: source.label, url: sourceUrl, color: "bg-violet-100 text-violet-900 border-violet-200" };
    }
    function externalRegimenFitsPatient(bullet, drug, context, profile) {
      // Source verification and filter compatibility are independent. An external
      // adapter must bind indication branches before contextual dosing is enabled.
      // Until then, external excerpts are available in the drug view and inspector.
      if (context) return false;
      const passages = (bullet.evidence || []).map(ev => `${ev.sourceHeading || ""} ${ev.sourceText || ""}`.trim()).filter(Boolean);
      if (!passages.length) return false;
      return passages.every(text => dosingClauseFitsPatient(text, profile)
        && !(profile.pregnancy && /\bnonpregnant\b|\bnot (?:for|in) pregnan/i.test(text)));
    }
    function renderRegimenSourceBadge(b) {
      const checked = Object.prototype.hasOwnProperty.call(b, "engineSource");
      const descriptor = checked
        ? (b.engineSource ? {label:b.engineSource.label,sourceName:b.engineSource.sourceId,url:b.engineSource.url,color:"bg-blue-100 text-blue-900 border-blue-200"} : null)
        : regimenSourceDescriptor(b.regimenProvenance || b.labelProvenance, b.evidence);
      return descriptor ? `<a data-regimen-source="${esc(descriptor.sourceName)}" href="${esc(descriptor.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex border rounded px-1.5 py-0.5 text-[9px] font-bold ml-1 ${descriptor.color}" title="Source of this displayed passage">${esc(descriptor.label)} ↗</a>` : "";
    }
    function renderRecordSourceBadge(drug) {
      if (hasRetrievedOpenFdaLabel(drug)) return `<span data-record-source="openFDA" class="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded px-2 py-0.5">openFDA record retrieved</span>`;
      const external = (drug.dosingBullets || []).map(b => regimenSourceDescriptor(b.regimenProvenance || drug.regimenProvenance, b.evidence)).find(Boolean);
      return external ? `<a data-record-source="${esc(external.sourceName)}" href="${esc(external.url)}" target="_blank" rel="noopener noreferrer" class="text-[9px] font-bold border rounded px-2 py-0.5 ${external.color}">${esc(external.label)} ↗</a>`
        : `<span data-record-source="unavailable" class="text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded px-2 py-0.5">Regimen source unavailable</span>`;
    }

    function renderBulletItem(b, isRenalActive, isSection1) {
      const styles = {
        red: { dot: "bg-rose-500", bg: "bg-rose-50/90 border-rose-200 text-rose-950", tag: "bg-rose-200/80 text-rose-900" },
        amber: { dot: "bg-amber-500", bg: "bg-amber-50/90 border-amber-200 text-amber-950", tag: "bg-amber-200/80 text-amber-900" },
        blue: { dot: "bg-blue-500", bg: "bg-blue-50/70 border-blue-200 text-slate-800", tag: "bg-blue-200/70 text-blue-900" },
        emerald: { dot: "bg-emerald-500", bg: "bg-emerald-50/80 border-emerald-200 text-emerald-950", tag: "bg-emerald-200/80 text-emerald-900" }
      }[b.color] || { dot: "bg-slate-400", bg: "bg-slate-50 border-slate-200", tag: "bg-slate-200 text-slate-800" };

      // Only a matched, source-bound renal regimen supersedes normal dosing.
      const evidenceSource = b.engineSource ? {sourceName:b.engineSource.label} : regimenSourceDescriptor(b.regimenProvenance || b.labelProvenance, b.evidence, false);
      const evidenceTitle = evidenceSource ? `${evidenceSource.sourceName} evidence` : "Source excerpt • attribution unverified";

      return `
        <li class="p-2 rounded-lg border ${styles.bg} text-[11px] leading-snug flex items-start gap-2">
          <span class="w-2 h-2 rounded-full ${styles.dot} mt-1 shrink-0"></span>
          <div>
            <span class="font-bold px-1.5 py-0.2 rounded text-[10px] mr-1 ${styles.tag}">${esc(b.tag)}:</span>
            ${b.superseded ? `<s class="text-slate-500" style="text-decoration:line-through">${esc(b.text)}</s>` : `<span>${esc(b.text)}</span>`}${isSection1 ? renderRegimenSourceBadge(b) : ""}
            ${Array.isArray(b.evidence) && b.evidence.length ? `<details class="mt-1.5 text-[10px] text-slate-600"><summary class="cursor-pointer font-semibold underline decoration-dotted">${esc(evidenceTitle)}${isSection1 ? " &amp; source conditions" : ""} (${b.evidence.length} source${b.evidence.length === 1 ? "" : "s"})</summary><div class="mt-1 space-y-1.5">${b.evidence.map(ev => `<div class="rounded border border-slate-200 bg-white/80 p-1.5"><div class="font-bold text-slate-500">${esc(ev.sourceField || "dosage_and_administration")}${ev.tableIndex !== null && ev.tableIndex !== undefined ? ` • table ${Number(ev.tableIndex) + 1}, row ${Number(ev.rowIndex) + 1}` : ""}${ev.candidateId ? ` • candidate ${esc(ev.candidateId)}` : ""}</div>${hasRetrievedOpenFdaLabel(b.labelProvenance) ? `<div class="text-slate-400">openFDA label ${esc(b.labelProvenance.setId || b.labelProvenance.labelId)}${b.labelProvenance.effectiveTime ? ` • effective ${esc(b.labelProvenance.effectiveTime)}` : ""}</div>` : ""}${b.labelProvenance && (b.labelProvenance.brandName || b.labelProvenance.dosageForm || b.labelProvenance.route) ? `<div class="text-slate-400">${esc([b.labelProvenance.brandName, b.labelProvenance.dosageForm, b.labelProvenance.route].filter(Boolean).join(" • "))}</div>` : ""}${ev.sourceHeading ? `<div class="text-slate-500">Scope: ${esc(ev.sourceHeading)}</div>` : ""}${ev.tableFamily ? `<div class="text-indigo-600">Detected table type: ${esc(ev.tableFamily.replace(/_/g, " "))}</div>` : ""}${ev.labelStructure && ev.labelStructure.length ? `<div class="text-slate-400">Label patterns: ${esc(ev.labelStructure.slice(0, 5).map(x => x.replace(/_/g, " ")).join(" · "))}</div>` : ""}<div class="mt-0.5 font-mono whitespace-normal">${esc(ev.sourceText || "")}</div>${regimenSourceConditions(ev) ? `<div class="mt-1 rounded border border-amber-200 bg-amber-50 p-1.5 text-amber-950 whitespace-pre-line"><b>Source-table conditions:</b> ${esc(regimenSourceConditions(ev))}</div>` : ""}</div>`).join("")}</div></details>` : ""}
          </div>
        </li>
      `;
    }

    function renderSelfRegulationFlag(flagObj, drugId, sectionKey) {
      if (!flagObj) return "";
      const safePreview = esc(flagObj.previewExcerpt);
      return `
        <li 
          onclick="openMonographModal('${drugId}', '${sectionKey}', '${flagObj.reasonSummary.replace(/'/g, "\\'")}')"
          class="relative group cursor-pointer p-2.5 rounded-lg bg-purple-950 text-purple-100 border border-purple-500 hover:bg-purple-900 transition-all text-[11px] leading-snug flex items-start gap-2 shadow-sm"
        >
          <i class="fa-solid fa-triangle-exclamation text-amber-400 mt-0.5 shrink-0"></i>
          <div class="flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="font-extrabold text-amber-300 uppercase tracking-wider text-[10px]">
                Self-Regulation Flag: ${flagObj.reasonSummary}
              </span>
              <span class="text-[10px] bg-purple-800 text-purple-200 px-1.5 py-0.5 rounded border border-purple-600 shrink-0">
                Hover Preview • Click Full Text ↗
              </span>
            </div>
            <p class="text-[10px] text-purple-200 mt-0.5">
              Nuance exceeds safe single-bullet compression. Hover to preview raw FDA source or click to open full monograph.
            </p>
          </div>

          <div class="hidden group-hover:block absolute left-0 bottom-full mb-2 w-full sm:w-96 p-3 rounded-xl bg-slate-900 text-slate-100 border-2 border-amber-400 shadow-2xl z-40 pointer-events-none">
            <div class="text-[10px] font-bold uppercase text-amber-300 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between">
              <span>Raw FDA Source Quick-View (${esc(flagObj.drugName)})</span>
              <span>Click to Expand Full Page</span>
            </div>
            <p class="text-[11px] text-slate-200 font-mono leading-relaxed">${safePreview}</p>
          </div>
        </li>
      `;
    }

    function openMonographModal(drugId, sectionKey, reasonSummary) {
      const record = monographStore[drugId];
      if (!record) return;
      const drug = currentFetchedDrugs.find(d => d.id === drugId);
      const sectionMap = {
        dose: { title: "Dosage & Administration", text: record.rawDosing },
        ddi: { title: "Drug Interactions & Cautions", text: record.rawInteractions },
        renal: { title: "Specific Populations / Renal", text: record.rawRenalPop }
      }[sectionKey];
      if (!sectionMap) return;
      let provenance = [record.labelProvenance, drug?.labelProvenance].find(p => hasRetrievedOpenFdaLabel(p)) || {};
      const retrievedFda = hasRetrievedOpenFdaLabel(provenance);
      let sectionText = sectionMap.text;
      let excerptOnly = false;
      let descriptor = retrievedFda ? regimenSourceDescriptor(provenance, [{ sourceText: sectionText, sourceField: "dosage_and_administration" }], false) : null;
      // A no-label fallback must not mask the independently verified source of a
      // displayed external regimen. Dose provenance does not attest other sections.
      if (!retrievedFda && sectionKey === "dose") {
        const externalBullets = (drug?.dosingBullets || []).map(b => {
          const p = b.regimenProvenance || drug?.regimenProvenance;
          const source = p && String(p.source).toLowerCase() !== "openfda" && regimenSourceDescriptor(p, b.evidence);
          return source ? { bullet: b, provenance: p, source } : null;
        }).filter(Boolean);
        const storedSource = record.regimenProvenance && regimenSourceDescriptor(record.regimenProvenance,
          [{ sourceText: record.rawDosing, sourceField: "external_source" }], false);
        if (storedSource && String(record.regimenProvenance.source).toLowerCase() !== "openfda") {
          provenance = record.regimenProvenance;
          descriptor = storedSource;
        } else if (externalBullets.length) {
          const first = externalBullets[0];
          provenance = first.provenance;
          descriptor = first.source;
          sectionText = [...new Set(externalBullets.filter(item => item.source.url === first.source.url)
            .flatMap(item => item.bullet.evidence || []).map(ev => String(ev.sourceText || "").trim()).filter(Boolean))].join("\n\n");
          excerptOnly = true;
        }
      }
      const availabilityNotice = /^(?:No (?:dosage|drug-interaction|use-in-specific|FDA|matching FDA)|FDA .*not retrieved|Official .*not retrieved)/i.test(String(sectionText || ""));
      const sourceName = retrievedFda ? "openFDA product label" : (descriptor?.sourceName || "Source unavailable");
      document.getElementById("modalSectionTag").textContent = `${sectionMap.title} — ${sourceName}`;
      document.getElementById("modalDrugTitle").textContent = `${record.genericName} — Source Inspector`;
      document.getElementById("modalReasonBanner").textContent = descriptor && availabilityNotice
        ? "A source record was retrieved, but this section was not returned. The notice below is generated by the app, not quoted from the source."
        : excerptOnly
        ? "Only the cited source excerpts are stored for this external regimen. Open the linked publication for its complete text and verify the active indication and patient filters."
        : descriptor
        ? `${reasonSummary || "Source review"}. Displaying the complete text available in this retrieved source record; check the linked source for the current complete publication.`
        : "No verified product-label source was retrieved for this record. The message below is an availability notice, not an official monograph.";
      document.getElementById("modalSourceAttribution").innerHTML = descriptor
        ? `Source: <a class="text-blue-700 underline" href="${esc(descriptor.url)}" target="_blank" rel="noopener noreferrer">${esc(sourceName)} ↗</a>${provenance.effectiveTime ? ` • effective ${esc(provenance.effectiveTime)}` : ""}`
        : "Source unavailable — ingredient associations do not establish a dosing regimen.";
      document.getElementById("modalRawTextBody").textContent = sectionText || "No section text retrieved.";
      document.getElementById("monographModal").classList.remove("hidden");
    }

    function closeMonographModal() {
      document.getElementById("monographModal").classList.add("hidden");
    }

    function toggleFullArticle(elementId, btnEl) {
      const el = document.getElementById(elementId);
      const isHidden = el.classList.contains("hidden");
      el.classList.toggle("hidden", !isHidden);
      if (!btnEl.dataset.closedLabel) btnEl.dataset.closedLabel = btnEl.innerHTML;
      btnEl.innerHTML = isHidden
        ? `<i class="fa-solid fa-chevron-up mr-1"></i>Hide Source Text`
        : btnEl.dataset.closedLabel;
    }

    function renalFlagLabel(level) {
      const text = String(level || "");
      if (/SAFE/i.test(text)) return "No renal caution flag in app screen";
      if (/CONTRAINDICATION|CONTRAINDICAT|NEUROTOX|NEPHROTOX/i.test(text)) return "Renal caution phrase in app screen";
      return text;
    }

    function renderDistilledDrugCard(drug, isRenalActive) {
      const isAllergyBlocked = drug.evalResult.status === "BLOCKED";
      const isCaution = drug.evalResult.status === "CAUTION";

      const visibleRiskBadges = [...drug.autoBadges, ...AMUApp.additionalRiskBadges(drug)];
      const dosingContext = getActiveClinicalDosingContext();
      const dosingSourceForDisplay = String(drug.rawDosing || "");
      const verifiedFdaRecord = hasRetrievedOpenFdaLabel(drug);
      const renalView = AMUApp.renalView(drug);
      const visibleDosingBullets = renalView.adjusted ? renalView.normal : AMUApp.bulletsFor(drug);
      const visibleRenalBullets = drug.renalBullets.filter(b => !/^(?:Legacy app renal reference|Formulation-specific renal review)/i.test(b.tag || "")
        && !(renalView.adjusted && /^(?:FDA renal-label text|Renal label review)/i.test(b.tag || "")));
      const visibleSelfReg1 = null; // Declarative interpreter supplies resolution notices.

      let statusBadge = `<span class="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-check mr-1"></i>No allergy-class flag on this filter</span>`;
      if (isAllergyBlocked) {
        statusBadge = `<span class="bg-rose-600 text-white border border-rose-800 text-[10px] font-extrabold px-3 py-1 rounded-full"><i class="fa-solid fa-ban mr-1"></i>Allergy-class filter match: ${drug.evalResult.specificAllergy}</span>`;
      } else if (isCaution) {
        statusBadge = `<span class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">${drug.evalResult.reason}</span>`;
      }

      const rp = drug.renalProfile;
      const isRenalContra = rp.contraLevel.includes("CONTRAINDICATION") || rp.contraLevel.includes("NEUROTOXICITY") || rp.contraLevel.includes("NEPHROTOXIC");
      if (isRenalActive && isRenalContra && rp.contraNote) visibleRenalBullets.unshift({color:"red",tag:"App renal screening caution",text:rp.contraNote});

      const showExpand1 = !!dosingSourceForDisplay && hasMeaningfulExtraText(dosingSourceForDisplay, visibleDosingBullets);
      const showExpand2 = hasMeaningfulExtraText(drug.rawInteractions, drug.interactionBullets);
      const showExpand3 = hasMeaningfulExtraText(drug.rawRenalPop, drug.renalBullets);

      const suffix = `_${drug.id}`;
      const syndromeCoverage = currentSearchLevel === "SYNDROME" ? getSyndromeCoverageForDrug(drug) : [];
      const syndromeCoverageHtml = syndromeCoverage.length ? `
        <div class="flex flex-wrap items-center gap-1 mt-1.5">
          <span class="text-[9px] font-extrabold uppercase tracking-wide text-indigo-600">Relevant pathogen${syndromeCoverage.length > 1 ? "s" : ""}:</span>
          ${syndromeCoverage.map(p => `<span class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">${esc(p.label)}</span>`).join("")}
        </div>` : "";
      const cardBorder = isAllergyBlocked 
        ? "border-rose-600 ring-4 ring-rose-500/20 shadow-xl" 
        : (drug.isSelectedPinned ? "border-blue-600 ring-4 ring-blue-500/15 shadow-lg" : (isRenalActive ? (isRenalContra ? "border-rose-500 shadow-lg" : "border-fuchsia-500 shadow-md") : (isCaution ? "border-amber-300" : "border-slate-200")));

      return `
        <article id="drug_card_${drug.id}" class="bg-white rounded-xl border-2 ${cardBorder} ${patientRing(drug)} p-5 space-y-4 transition-all">
          
          <!-- PINNED SELECTED DRUG INDICATOR BAR -->
          ${drug.isSelectedPinned ? `
            <div class="flex items-center justify-between bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs">
              <span class="font-bold text-emerald-400 flex items-center gap-1.5">
                <i class="fa-solid fa-thumbtack"></i> Selected Active Drug Data Hub (Pinned to #1)
              </span>
              <button onclick="selectSingleActiveIngredient('${jsArg(drug.genericName)}', null)" class="text-[11px] text-slate-300 hover:text-white underline">
                Unpin Drug
              </button>
            </div>
          ` : ''}

          ${renderPatientBlock(drug)}
          <!-- HIGH-CONTRAST ALLERGY CONTRAINDICATION WARNING BANNER -->
          ${isAllergyBlocked ? `
            <div class="allergy-contra-banner text-white p-4 rounded-xl border-2 border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="bg-white text-rose-700 p-2 rounded-lg shrink-0 mt-0.5">
                  <i class="fa-solid fa-skull-crossbones text-lg"></i>
                </div>
                <div>
                  <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                    Selected record matches the allergy-class text filter
                  </span>
                  <h4 class="text-sm font-extrabold text-white mt-0.5">
                    Allergy-class filter match: ${esc(drug.evalResult.specificAllergy)}
                  </h4>
                  <p class="text-xs text-rose-100 mt-0.5">
                    <strong>${esc(drug.genericName)}</strong> matched the <strong>${esc(drug.epcClasses[0] || "selected")}</strong> class filter. It is pinned because it was selected. This is not a clinical contraindication ruling.
                  </p>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-extrabold text-slate-900">${esc(drug.genericName)}</h3>
                ${drug.brandName ? `<span class="text-xs text-slate-400 font-medium">(${esc(drug.brandName)})</span>` : ''}
                ${renderRouteBadge(drug)}
                ${renderRecordSourceBadge(drug)}
                ${currentSearchLevel === "PATHOGEN" && activePathogenProfile?.canonical === "Streptococcus pyogenes" && activeDiseaseFilterId === "pharyngitis" && /benzathine|bicillin\s*l.?a/i.test(`${drug.genericName} ${drug.brandName || ""} ${drug.activeIngredientSource || ""}`) ? `<span class="text-[9px] font-bold bg-sky-100 text-sky-900 border border-sky-200 rounded px-2 py-0.5">Guideline-listed IM option</span>` : ''}
              </div>
              <p class="text-[11px] font-semibold text-blue-600 mt-0.5">${esc(drug.epcClasses.join(" • ") || "Systemic Antimicrobial")}</p>
              ${syndromeCoverageHtml}
            </div>
            <div class="flex items-center gap-1.5 self-start flex-wrap">
              ${isRenalActive ? `<span class="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${isRenalContra ? 'bg-rose-600 text-white' : 'bg-fuchsia-700 text-white'}"><i class="fa-solid fa-kidneys mr-1"></i>${renalView.adjusted && !isRenalContra ? "Renal text branch selected" : esc(renalFlagLabel(rp.contraLevel))}</span>` : ''}
              ${statusBadge}
            </div>
          </div>

          ${AMUApp.renderRenalPanel(drug, renalView)}

          ${visibleRiskBadges.length > 0 ? `
            <div class="flex flex-wrap gap-1.5">
              ${visibleRiskBadges.map(b => `
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${b.color}">
                  <i class="fa-solid ${b.icon}"></i> ${b.label}
                </span>
              `).join("")}
            </div>
          ` : ''}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div class="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-col justify-between space-y-2.5">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <i class="fa-solid fa-syringe text-blue-600"></i> 1. Dosing &amp; Administration Summary
                  </span>
                  <button type="button" title="Inspect dosing source and attribution" aria-label="Inspect dosing source and attribution" onclick="openMonographModal('${jsArg(drug.id)}', 'dose', 'Complete dosage and administration source')" class="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100">
                    <i class="fa-solid fa-book-open text-[13px]"></i>
                  </button>
                </div>
                <ul class="space-y-1.5">
                  ${visibleDosingBullets.map(b => renderBulletItem(b, isRenalActive, true)).join("")}
                  ${renderSelfRegulationFlag(visibleSelfReg1, drug.id, 'dose')}
                </ul>
                ${AMUApp.renderAnalysisDetails(drug)}
              </div>

            </div>

            <div class="p-3.5 rounded-xl bg-purple-50/30 border border-purple-200/80 flex flex-col justify-between space-y-2.5">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <i class="fa-solid fa-pills text-purple-600"></i> 2. Drug-interaction phrases in parsed text
                  </span>
                  <button type="button" title="Inspect interaction source and attribution" aria-label="Inspect interaction source and attribution" onclick="openMonographModal('${jsArg(drug.id)}', 'ddi', 'Complete drug interactions and cautions source')" class="text-purple-700 hover:text-purple-950 p-1 rounded hover:bg-purple-100">
                    <i class="fa-solid fa-book-open text-[13px]"></i>
                  </button>
                </div>
                <ul class="space-y-1.5">
                  ${drug.interactionBullets.map(b => renderBulletItem(b, isRenalActive, false)).join("")}
                  ${verifiedFdaRecord ? renderSelfRegulationFlag(drug.selfReg2, drug.id, 'ddi') : ''}
                </ul>
              </div>

            </div>
          </div>

          <div class="p-3.5 rounded-xl ${isRenalActive ? 'bg-fuchsia-50 border-2 border-fuchsia-400' : 'bg-slate-50/80 border-slate-200'} border space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <i class="fa-solid fa-prescription-bottle-medical text-amber-600"></i> 3. Renal, Hepatic &amp; Specific Populations Summary
              </span>
              ${showExpand3 ? `
                <button onclick="toggleFullArticle('renal_full${suffix}', this)" class="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center">
                  <i class="fa-solid fa-book-open mr-1"></i>View Source Text
                </button>
              ` : ''}
            </div>
            <ul class="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              ${visibleRenalBullets.map(b => renderBulletItem(b, isRenalActive, false)).join("")}
              ${verifiedFdaRecord ? renderSelfRegulationFlag(drug.selfReg3, drug.id, 'renal') : ''}
            </ul>
            ${showExpand3 ? `
              <div id="renal_full${suffix}" class="hidden mt-2 p-2.5 rounded bg-white border border-slate-200 text-[11px] text-slate-600 max-h-48 overflow-y-auto custom-scroll leading-relaxed">
                ${esc(drug.rawRenalPop)}
              </div>
            ` : ''}
          </div>

        </article>
      `;
    }

    // =========================================================================
    // 12. PAGE 2: 24-HOUR DAILY POLL + CLEAN OPEN-ACCESS EUROPE PMC FETCHER
    // =========================================================================
    // Resistance dashboard and literature functions: amu-resistance.js

    // =========================================================================
    // 13. v1.3: PATIENT PROFILE, RESISTANCE-AWARE CARDS, FIRST-LINE COMBOS, ALT ROUTES
    // =========================================================================
    let ptUS = false, ptAge = 40, ptKg = 70, ptGaWeeks = null, ptPnaDays = null;
    const $id = i => document.getElementById(i);

    function setPtInputs() {
      const w = ptUS ? ptKg * 2.20462 : ptKg;
      [["ageNum", ptAge], ["ageRng", ptAge], ["wtNum", w], ["wtRng", w]].forEach(([i, v]) => {
        const el = $id(i);
        if (document.activeElement !== el) el.value = i.startsWith("age") ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
      });
    }
    function updatePtNote() {
      const g = ptAge < 0.08 ? "Neonate (≤28 d)" : ptAge < 1 ? "Infant" : ptAge < 12 ? "Child" : ptAge < 18 ? "Adolescent" : "Adult";
      $id("ptNote").textContent = `Text-filter band: ${g} • ${ptKg.toFixed(1)} kg / ${(ptKg * 2.20462).toFixed(1)} lb`;
      $id("neonatalContextGroup")?.classList.toggle("hidden", ptAge >= 0.25);
    }
    function syncPt(k, v) {
      v = parseFloat(v);
      if (isNaN(v) || v < 0) return;
      if (k === "age") ptAge = v; else ptKg = ptUS ? v / 2.20462 : v;
      setPtInputs(); updatePtNote(); reFilterCurrentResults();
    }
    function syncNeonatal(kind, value) {
      const parsed = value === "" ? null : Number(value);
      if (kind === "ga") ptGaWeeks = Number.isFinite(parsed) ? parsed : null;
      if (kind === "pna") ptPnaDays = Number.isFinite(parsed) ? parsed : null;
      reFilterCurrentResults();
    }
    function toggleUnits() {
      ptUS = !ptUS;
      $id("wtRng").max = ptUS ? 440 : 200;
      $id("unitBtn").textContent = ptUS ? "US (lb)" : "Metric (kg)";
      $id("wtUnit").textContent = ptUS ? "lb" : "kg";
      setPtInputs();
    }

    // eGFR 30–59: [level, text] — only well-established FDA-label thresholds
    let RENAL_MOD = AMUApp.reference("legacyRenalModerate");
    function patientFlags(d) {
      const n = d.genericName.toLowerCase(), U = d.genericName.toUpperCase(), A = ptAge, f = [];
      let cur = "";
      const add = (l, t) => {
        const isExcerpt = /^FDA (?:pediatric|pregnancy) text:/.test(t) && hasRetrievedOpenFdaLabel(d);
        const clean = isExcerpt
          ? String(t).replace(/^FDA (pediatric|pregnancy) text:/, "Product-label $1 excerpt:")
          : String(t).replace(/\bFDA(?:[- ]class)?(?: (?:labeling|label|warning))?\b/gi, "app reference");
        f.push({ l, t: `${isExcerpt ? "" : "<span class=\"font-semibold\">Legacy app reference, not a prescribing instruction:</span> "}${clean}`, src: cur, evidenceSource: isExcerpt ? "retrieved_label" : "legacy_app" });
      };
      const P = $id("ptPreg").checked, H = ($id("ptHepClass")?.value || "none") !== "none";

      if (A < 18 && /floxacin/.test(n)) add("amber", "Age <18 text filter: legacy note of a fluoroquinolone age limit in class labeling (tendon/musculoskeletal toxicity). Open the monograph.");
      if (A < 8 && /(doxycycline|minocycline|tetracycline)/.test(n)) add("red", "Age <8: tetracyclines cause permanent tooth discoloration — avoid unless benefit outweighs risk (FDA labeling).");
      if (A < 18 && /tigecycline/.test(n)) add("red", "Age <18: safety/efficacy not established; boxed all-cause mortality warning (FDA label).");
      if (A < 0.08 && /ceftriaxone/.test(n)) add("red", "Neonate: contraindicated in hyperbilirubinemic/premature neonates and in neonates ≤28 d receiving calcium-containing IV fluids (FDA label).");
      if (A < 0.17 && /sulfamethoxazole/.test(n)) add("red", "Infant <2 months: contraindicated (FDA label).");
      if (A < 18) {
        const pk = isCombinationProductName(d.activeIngredientSource || d.genericName) ? null : Object.keys(PED_DOSE).find(x => U.includes(x));
        if (A < 0.25) add("blue", "Under 3 months: dosing is age/gestation-specific — use specialist/pharmacy dosing (not computed).");
        else if (pk) add("blue", `Pediatric dose (FDA label, ${ptKg.toFixed(1)} kg): ` + PED_DOSE[pk](ptKg, A) + (ptKg >= 40 ? " — ≥40 kg: adult dosing may apply." : ""));
        else add("blue", `Pediatric dosing is weight-based (${ptKg.toFixed(1)} kg entered): follow the label's mg/kg table — not computed for this drug.`);
        const s = extractCleanSentence(d.rawRenalPop, "pediatric", 230);
        if (s && /pediatric|children|infant|neonat/i.test(s)) add("blue", "FDA pediatric text: " + esc(s));
      }
      if (P) { cur = "preg";
        if (/cycline/.test(n)) add("red", "Pregnancy: tetracyclines can cause fetal harm and tooth/bone discoloration — avoid (FDA labeling).");
        if (/floxacin/.test(n)) add("amber", "Pregnancy: avoid unless no safer alternative exists.");
        if (/(gentamicin|tobramycin|amikacin|plazomicin)/.test(n)) add("amber", "Pregnancy: aminoglycosides can cause fetal harm (eighth-nerve toxicity) — FDA class warning.");
        if (/sulfamethoxazole/.test(n)) add("amber", "Pregnancy: avoid in 1st trimester (folate antagonism) and near term (neonatal kernicterus risk).");
        if (/(voriconazole|fluconazole)/.test(n)) add("amber", "Pregnancy: azoles may cause fetal harm (FDA); use only if benefit justifies risk.");
        if (/nitrofurantoin/.test(n)) add("amber", "Pregnancy: contraindicated at term/labor (neonatal hemolytic anemia).");
        const s = extractCleanSentence(d.rawRenalPop, "pregnan", 230);
        if (s && /pregnan/i.test(s)) add("blue", "FDA pregnancy text: " + esc(s));
      }
      if (H) { cur = "hep";
        if (/metronidazole/.test(n)) add("amber", "Severe hepatic impairment (Child-Pugh C): reduce dose by 50% (FDA label).");
        if (/tigecycline/.test(n)) add("amber", "Child-Pugh C: 100 mg load, then 25 mg q12h (FDA label).");
        if (/voriconazole/.test(n)) add("amber", "Child-Pugh A/B: standard load, then halve maintenance; C: no data — use only if benefit outweighs risk (FDA label).");
        if (/rifampin/.test(n)) add("amber", "Impaired liver function: use only if necessary, under close supervision (FDA label).");
        if (/ceftriaxone/.test(n)) add("amber", "Hepatic + renal impairment together: cap at 2 g/day (FDA label).");
        if (/clindamycin/.test(n)) add("amber", "Moderate–severe liver disease: half-life prolonged — monitor LFTs.");
      }
      cur = "renal";
      const mode = rrtMode();
      if (mode === "crrt") {
        add("amber", "CRRT: clearance differs from eGFR <30 — do NOT apply the <30 reductions (risk of underdosing). " + (/(meropenem|piperacillin|vancomycin|cefepime|ceftazidime)/.test(n) ? "Commonly needs higher doses than <30 schedules; dose with CRRT-specific references and TDM." : "Dose with CRRT-specific references/pharmacy and TDM where available."));
      } else if (mode === "hd") {
        const hk = Object.keys(HD_NOTE).find(x => U.includes(x));
        if (hk) add("amber", "Intermittent HD: " + HD_NOTE[hk]);
      } else if (Number.isFinite(crcl)) {
        const k = Object.keys(RENAL_MOD).find(x => U.includes(x));
        if (k && crcl <= RENAL_MOD[k][2]) add(RENAL_MOD[k][0], `CrCl ${Math.round(crcl)} mL/min: ` + RENAL_MOD[k][1]);
      }
      if (Number.isFinite(egfr) && egfr > 130 && /(cillin|cef|penem|aztreonam|vancomycin|gentamicin|amikacin|tobramycin)/.test(n)) {
        add("amber", "Augmented renal clearance (eGFR >130): risk of subtherapeutic levels — consider extended/continuous infusion or more frequent dosing for time-dependent agents, with TDM.");
      }
      cur = "wt";
      if (A >= 18) {
        const m = x => Math.round(x).toLocaleString();
        if (/daptomycin/.test(n)) {
          const context = getActiveClinicalDosingContext();
          const contextText = context ? normalizeClinicalKeyword(`${context.label} ${(context.keywords || []).join(" ")}`) : "";
          if (!context) {
            add("blue", `Weight-based (actual body weight, FDA label): 4 mg/kg skin = ${m(4 * ptKg)} mg; 6 mg/kg S. aureus bacteremia/endocarditis = ${m(6 * ptKg)} mg.`);
          } else if (/\b(bacteremia|septicemia|endocarditis|bloodstream)\b/.test(contextText)) {
            add("blue", `Weight-based (actual body weight, FDA label): 6 mg/kg for S. aureus bacteremia/endocarditis = ${m(6 * ptKg)} mg.`);
          } else if (/\b(skin|cellulitis|abscess|wound|soft tissue)\b/.test(contextText)) {
            add("blue", `Weight-based (actual body weight, FDA label): 4 mg/kg for skin/skin-structure infection = ${m(4 * ptKg)} mg.`);
          }
        }
        if (/vancomycin/.test(n)) add("blue", `Loading 20–25 mg/kg actual body weight = ${m(20 * ptKg)}–${m(Math.min(25 * ptKg, 3000))} mg (commonly capped at 3 g); maintenance by AUC/TDM.`);
        if ((ptKg >= 100 || ptKg < 50) && /(gentamicin|tobramycin|amikacin)/.test(n)) add("amber", "Extreme body weight: aminoglycosides dose on ideal/adjusted body weight (needs height) — calculate per protocol and use TDM.");
      }
      f.push(...AMUApp.additionalPatientFlags(d));
      return f;
    }

    // Resistance bullets: pathogen scope → that pathogen; syndrome scope → surveilled pathogens linked to that syndrome
    let RES_STOP = AMUApp.reference("resistanceStopWords");
    function resistanceLines(d) {
      const reg = $id("regionSelect").value, key = d.genericName.toLowerCase().split(" ")[0], out = [];
      let pool = [];
      if (currentSearchLevel === "PATHOGEN" && activePathogenProfile) {
        pool = resistanceSurveillanceDB.filter(p => p.pathogen === activePathogenProfile.canonical);
      } else if (currentSearchLevel === "SYNDROME") {
        const t = ($id("activeDiseaseHeader").textContent.toLowerCase().match(/[a-z]{3,}/g) || []).filter(x => !RES_STOP.includes(x));
        if (t.includes("ventilator") || t.includes("nosocomial")) t.push("hap");
        pool = resistanceSurveillanceDB.filter(p => t.some(x => p.clinicalSyndromes.toLowerCase().includes(x)));
      }
      const settings = AMUApp.reference("resistanceSettings") || {};
      const regName = settings.regions?.[reg] || reg;
      pool.forEach(p => p.drugs.filter(e => e.antibiotic.toLowerCase().includes(key)).forEach(e => {
        const r = e.rates?.[reg];
        if (!Number.isFinite(r) || r < 0 || r > 100) return;
        const hi = r >= (settings.highThreshold ?? 25), mid = r >= (settings.mediumThreshold ?? 10);
        out.push({ l: hi ? "red" : mid ? "amber" : "emerald", t: `<b>${esc(p.pathogen)}</b> vs ${esc(e.antibiotic)}: <b>${r}%</b> is an illustrative repository figure (${esc(regName)}), not an official WHO, ECDC, or CDC rate. ${hi ? "The figure is at or above this page's high threshold. That is not an instruction to avoid a drug." : mid ? "The figure is between this page's thresholds. It is not a susceptibility recommendation." : "No flag is implied by a lower illustrative figure. It is not a finding that the organism is susceptible."}` });
      }));
      return out;
    }

    // One alternative route only where the drug stays effective (no entry = none; scroll for other agents)
    let ALT_ROUTE = AMUApp.reference("alternativeRoutes");

    function renderPatientBlock(d) {
      const col = { red: "bg-rose-50 border-rose-300 text-rose-950", amber: "bg-amber-50 border-amber-300 text-amber-950", emerald: "bg-emerald-50 border-emerald-300 text-emerald-950", blue: "bg-blue-50 border-blue-200 text-slate-800" };
      const li = (x, ic) => `<li class="p-1.5 rounded border text-[11px] leading-snug ${col[x.l]}"><i class="fa-solid ${ic} mr-1"></i>${x.t}</li>`;
      const res = resistanceLines(d).map(x => li(x, "fa-bacteria")).join("");
      const all = patientFlags(d), isB = x => (x.src === "preg" || x.src === "hep") && x.l !== "blue";
      const banners = all.filter(isB).map(bannerHtml).join("");
      const pf = all.filter(x => !isB(x)).map(x => li(x, "fa-user-injured")).join("");
      let badges = "";
      if (currentSearchLevel === "PATHOGEN" && activeDiseaseFilterId === "all" && activePathogenProfile && activePathogenProfile.diseases) {
        const txt = `${d.rawIndications} ${d.rawDosing}`;
        const hits = activePathogenProfile.diseases.filter(x => x.id !== "all" && resolverExpandKeywords(x.keywords.filter(k => !isKnownDrugKeyword(k))).some(k => textContainsClinicalKeyword(txt, k)));
        if (hits.length) badges += `<div class="flex flex-wrap items-center gap-1"><span class="text-[9px] uppercase font-bold text-slate-400">Fits:</span>${hits.map(h => `<span class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">${h.label}</span>`).join("")}</div>`;
      }
      const sub = activePathogenProfile && activePathogenProfile.diseases ? ((activePathogenProfile.diseases.find(x => x.id === activeDiseaseFilterId) || {}).label || "") : "";
      const hdr = ($id("activeDiseaseHeader").textContent + " " + sub).toLowerCase();
      const k = Object.keys(ALT_ROUTE).find(x => d.genericName.toUpperCase().includes(x));
      if (k && !/mening|brain abscess|endocarditis/.test(hdr)) badges += `<div class="text-[10px] text-slate-600"><i class="fa-solid fa-route mr-1 text-sky-600"></i>Alternative route if primary is unavailable: <b>${ALT_ROUTE[k]}</b> <span class="text-slate-400">(only if gut absorption, site and severity allow)</span></div>`;
      if (!res && !pf && !badges && !banners) return "";
      return `<div class="space-y-1.5">${banners}${res ? `<ul class="space-y-1">${res}</ul>` : ""}${pf ? `<ul class="space-y-1">${pf}</ul>` : ""}${badges}</div>`;
    }

    // Treatment preference is explicit guideline metadata. It never comes from
    // label order, broad ingredient substrings, or a successful API lookup.
    let FIRST_LINE_COMBOS = AMUApp.reference("guidelineCombinations");
    let FIRST_LINE_OPTIONS = AMUApp.reference("guidelineOptions");
    function activeFirstLineContextKey() {
      if (currentSearchLevel === "PATHOGEN" && activePathogenProfile) return `${activePathogenProfile.canonical}|${activeDiseaseFilterId}`;
      if (currentSearchLevel !== "SYNDROME") return "";
      const map = getSyndromeClinicalMap();
      const heading = normalizeClinicalKeyword(map?.contextKeywords?.[0] || "");
      if (heading === "streptococcal pharyngitis") return "Streptococcus pyogenes|pharyngitis";
      if (heading === "chlamydia trachomatis") return "Chlamydia trachomatis|uncomplicated";
      if (heading === "bacterial meningitis" && activeSyndromePathogenId === "pneumococcus") return "Streptococcus pneumoniae|meningitis";
      if (heading === "bacterial meningitis" && activeSyndromePathogenId === "listeria") return "Listeria monocytogenes|meningitis";
      return "";
    }
    function renderFirstLineFrame(cards, renal, meta) {
      if (!cards.length) return "";
      return `<section data-first-line="true" class="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-3 space-y-2"><div class="flex items-center justify-between flex-wrap gap-1"><div class="text-xs font-extrabold uppercase text-emerald-900">${esc(meta.title)} <span class="font-normal normal-case">— guideline layer</span></div><a data-treatment-choice-source="${esc(meta.source)}" href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-[9px] font-bold rounded border border-violet-200 bg-violet-50 text-violet-900 px-2 py-0.5">${esc(meta.source)} ↗</a></div>${meta.note ? `<p class="text-[11px] text-emerald-950">${esc(meta.note)}</p>` : ""}${cards.map(d => renderDistilledDrugCard(d, renal)).join("")}</section>`;
    }
    function eligibleFirstLineCard(drug, renal) {
      const hasExternalRegimen = (drug.dosingBullets || []).some(b => {
        const p = b.regimenProvenance || drug.regimenProvenance;
        return p && String(p.source).toLowerCase() !== "openfda" && regimenSourceDescriptor(p, b.evidence)
          && externalRegimenFitsPatient(b, drug, getActiveClinicalDosingContext(), getActiveDosingPhysiology());
      });
      return (hasRetrievedOpenFdaLabel(drug) || hasExternalRegimen) && drug.evalResult?.status !== "BLOCKED" && contraAssess(drug, renal).s < 1;
    }
    function matchesFirstLineCombinationIngredient(drug, ingredient) {
      if (!drugMatchesCuratedAgent(drug, ingredient) || !/intravenous|\biv\b/i.test(drug.route || "")) return false;
      if (ingredient === "Penicillin G" && /benzathine|procaine|bicillin/i.test(`${drug.activeIngredientSource || ""} ${drug.brandName || ""}`)) return false;
      return true;
    }
    const firstLineKnowledgeCache = new WeakMap();
    function firstLineKnowledge() {
      const database=AMUApp.database;
      if (!database?.referenceCollections?.firstLineGuidance || !globalThis.AMUTreatmentGuidance) return null;
      if (!firstLineKnowledgeCache.has(database)) firstLineKnowledgeCache.set(database,AMUTreatmentGuidance.create(database));
      return firstLineKnowledgeCache.get(database);
    }
    function activeGuidelineRecord() {
      return currentSearchLevel==='PATHOGEN' && activePathogenProfile ? firstLineKnowledge()?.record(activePathogenProfile.canonical,activeDiseaseFilterId) : null;
    }
    function guidelineSourceLink(group) {
      return group.source ? `<a class="underline font-semibold text-emerald-800" href="${esc(group.source.url)}" target="_blank" rel="noopener noreferrer">${esc(group.source.title)} ↗</a>` : '';
    }
    function guidelineAgentNames(group) {
      return (group.agents||[]).map(agent=>`${agent.name}${agent.routes?.length?' ('+agent.routes.join(' / ').toLowerCase()+')':''}`).join(group.kind==='sequence'?' → ':group.kind==='combination'?' + ':'; ');
    }
    function renderGuidelineChoices(cards,renal) {
      const entry=activeGuidelineRecord();
      if (!entry) return '';
      const knowledge=firstLineKnowledge(),pathogen=activePathogenProfile.canonical,patient=AMUApp.patient();
      if (activeDiseaseFilterId==='all') {
        return `<div class="space-y-3 mb-3" data-first-line-overview="true"><p class="text-xs text-slate-600">First-line treatment by infection. Select a presentation to see its treatment choices and product cards.</p>${knowledge.overview(pathogen,patient).map(item=>{
          const preferred=item.groups.length>0;
          return `<section data-guidance-context="${esc(pathogen+'|'+item.id)}" ${preferred?'data-first-line="true"':''} style="border:2px solid ${preferred?'#6ee7b7':'#cbd5e1'};border-radius:12px;padding:12px" class="${preferred?'bg-emerald-50/40':'bg-slate-50'}"><button type="button" class="text-left text-sm font-extrabold underline ${preferred?'text-emerald-900':'text-slate-800'}" onclick="selectPathogenDiseaseFilter('${jsArg(item.id)}')">${esc(item.label)}</button>${item.groups.map(group=>`<div class="mt-2 text-xs"><b>${esc(group.title)}</b>${group.agents?.length?`<p>${esc(guidelineAgentNames(group))}</p>`:''}${group.qualifier?`<p class="mt-1">${esc(group.qualifier)}</p>`:''}${group.externalCompanions?.length?`<p>Required additional components: ${esc(group.externalCompanions.join('; '))}</p>`:''}${guidelineSourceLink(group)}</div>`).join('')}${!preferred?`<p class="text-xs mt-1">${esc(item.entry?.note||'Guideline review required.')}</p>`:''}</section>`;
        }).join('')}</div>`;
      }
      const plan=knowledge.plan(pathogen,activeDiseaseFilterId,patient,cards,drugMatchesCuratedAgent,d=>eligibleFirstLineCard(d,renal));
      if (!plan.groups.length) {
        const heading=['review_required','source_index'].includes(entry.status)?'Treatment selection requires a defined clinical branch':'No single standard first-line regimen for this view';
        return `<div data-guidance-status="${esc(entry.status)}" class="mb-3 rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs"><b>${esc(heading)}</b><p>${esc(entry.note)}</p>${(entry.sourceRefs||[]).map(id=>guidelineSourceLink({source:AMUApp.database.referenceCollections.firstLineGuidance.sources[id]})).join(' · ')}</div>` + plan.remaining.map(d=>renderDistilledDrugCard(d,renal)).join('');
      }
      return plan.groups.map(group=>{
        const type=group.kind==='combination'?'Combination — required components':group.kind==='sequence'?'Sequential treatment — complete all stages':group.kind==='procedure'?'Primary management':'Options — choose an appropriate agent';
        const missing=group.missing.length&&!group.choiceOnly?`<p data-missing-first-line-products="true" class="text-xs text-amber-900">No eligible retrieved product card is shown for: ${esc(group.missing.join(', '))}. The guideline choice remains listed; its dose and suitability require review.${['combination','sequence'].includes(group.kind)?' A displayed component alone is not the complete regimen.':''}</p>`:'';
        return `<section data-first-line="true" data-first-line-group="${esc(group.id)}" data-guidance-context="${esc(pathogen+'|'+activeDiseaseFilterId)}" style="border:2px solid #6ee7b7;border-radius:12px;padding:12px" class="mb-3 bg-emerald-50/40 space-y-2"><div class="text-sm font-extrabold text-emerald-900">First-line · ${esc(group.title)}</div><div class="text-[11px] font-semibold text-emerald-900">${esc(type)}${group.conditional?' · Conditions apply':''}</div>${group.agents?.length?`<p class="text-xs font-semibold">${esc(guidelineAgentNames(group))}</p>`:''}${group.qualifier?`<p class="text-xs text-emerald-950">${esc(group.qualifier)}</p>`:''}<div class="text-[11px]">${guidelineSourceLink(group)}</div>${group.externalCompanions?.length?`<p class="text-xs font-semibold">Required additional components: ${esc(group.externalCompanions.join('; '))}</p>`:''}${missing}${group.shared.length?`<p class="text-xs">Shared component card shown in another first-line group: ${esc(group.shared.join(', '))}.</p>`:''}${group.members.map(d=>renderDistilledDrugCard(d,renal)).join('')}</section>`;
      }).join('') + (plan.remaining.length?`<section class="space-y-2"><div class="text-xs font-bold text-slate-600">Other retrieved agents — role and source to review</div>${plan.remaining.map(d=>renderDistilledDrugCard(d,renal)).join('')}</section>`:'');
    }
    function renderTopCards(cards, renal) {
      if (activeGuidelineRecord()) {
        const guidance=renderGuidelineChoices(cards,renal);
        return activeDiseaseFilterId==='all'?guidance+cards.map(d=>renderDistilledDrugCard(d,renal)).join(''):guidance;
      }
      const render = d => renderDistilledDrugCard(d, renal);
      const key = activeFirstLineContextKey();
      const c = FIRST_LINE_COMBOS[key];
      if (c) {
        const inC = d => eligibleFirstLineCard(d, renal) && c.drugs.some(k => matchesFirstLineCombinationIngredient(d, k));
        const mem = cards.filter(inC), rest = cards.filter(d => !inC(d));
        if (mem.length) {
          const missing = c.drugs.filter(k => !mem.some(d => matchesFirstLineCombinationIngredient(d, k)));
          const note = c.note + (missing.length ? ` Complete combination not displayed: ${missing.join(", ")} has no eligible retrieved product card for this profile. Do not interpret a remaining component as the complete regimen.` : "");
          return renderFirstLineFrame(mem, renal, { ...c, note }) + rest.map(render).join("");
        }
      }
      const preference = FIRST_LINE_OPTIONS[key];
      const physiology = getActiveDosingPhysiology();
      if (preference && (!preference.nonpregnantAdultsOnly || (physiology.age >= 18 && !physiology.pregnancy))) {
        const used = new Set();
        let html = "";
        preference.options.forEach(option => {
          const members = cards.filter(d => !used.has(d) && eligibleFirstLineCard(d, renal)
            && drugMatchesCuratedAgent(d, option.agent) && option.route.test(d.route || ""));
          members.forEach(d => used.add(d));
          html += renderFirstLineFrame(members, renal, { ...preference, title: option.title });
        });
        if (used.size) return html + cards.filter(d => !used.has(d)).map(render).join("");
      }
      if (key === "Streptococcus pyogenes|pharyngitis") {
        const isOralFirstLine = d => eligibleFirstLineCard(d, renal)
          && (drugMatchesCuratedAgent(d, "Amoxicillin") || drugMatchesCuratedAgent(d, "Penicillin V")) && /oral|\bpo\b/i.test(d.route || "");
        const isBenzathineIm = d => eligibleFirstLineCard(d, renal) && drugMatchesCuratedAgent(d, "Penicillin G")
          && /benzathine|bicillin\s*l.?a/i.test(`${d.activeIngredientSource || ""} ${d.brandName || ""}`)
          && !/procaine|bicillin\s*c.?r/i.test(`${d.activeIngredientSource || ""} ${d.brandName || ""}`) && /intramuscular|\bim\b/i.test(d.route || "");
        const isMacrolide = d => drugMatchesCuratedAgent(d, "Azithromycin") || drugMatchesCuratedAgent(d, "Clarithromycin");
        const oral = cards.filter(isOralFirstLine);
        const im = cards.filter(d => !oral.includes(d) && isBenzathineIm(d));
        const allergyAlt = cards.filter(d => !oral.includes(d) && !im.includes(d) && isMacrolide(d));
        const grouped = [...oral, ...im, ...allergyAlt];
        const rest = cards.filter(d => !grouped.includes(d));
        const source = { source: "CDC guideline", sourceUrl: "https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/strep-throat.html" };
        let html = renderFirstLineFrame(oral, renal, { ...source, title: "Preferred oral options" });
        html += renderFirstLineFrame(im, renal, { ...source, title: "First-line intramuscular option", note: "Benzathine penicillin G is a guideline-listed option for confirmed GAS pharyngitis. The product is IM-only; the dose must match the patient's age and weight." });
        if (allergyAlt.length) html += `<section class="rounded-xl border border-amber-300 bg-amber-50/50 p-3 space-y-2"><div class="text-xs font-extrabold uppercase text-amber-900">Selected penicillin-allergy alternatives <span class="font-normal normal-case">— verify allergy type and local susceptibility</span></div>${allergyAlt.map(render).join("")}</section>`;
        if (rest.length) html += `<section class="space-y-2"><div class="text-xs font-extrabold uppercase text-slate-600">Other retrieved agents / evidence to review</div>${rest.map(render).join("")}</section>`;
        return html || cards.map(render).join("");
      }
      return cards.map(render).join("");
    }

    // ===== v1.16: expanded FDA label format catalogue and evidence-first regimen extraction =====
    let egfr = 100;
    let crcl = null;
    function rrtMode() { return document.querySelector('input[name="rrtMode"]:checked').value; }
    function renalMetricMode() { return $id("useCrClInput")?.checked ? "crcl" : "egfr"; }
    function activeRenalInputValue() { return renalMetricMode() === "crcl" ? crcl : egfr; }
    function syncRenalMetric() {
      const useCrCl = renalMetricMode() === "crcl";
      $id("useCrClInput").closest(".renal-metric-selector").dataset.metric = useCrCl ? "crcl" : "egfr";
      $id("egfrInputGroup").classList.toggle("hidden", useCrCl);
      $id("crclInputGroup").classList.toggle("hidden", !useCrCl);
      updateRenalMetricStatus();
      updateRenalState(); reFilterCurrentResults();
    }
    function updateRenalMetricStatus() {
      const p = getActiveDosingPhysiology();
      const calculation = AMUApp.calculation?.();
      const derived = calculation?.status === "resolved" ? calculation.result : null;
      const metric = renalMetricMode();
      const value = metric === "crcl" ? p.crcl : p.egfr;
      let status = Number.isFinite(value)
        ? `${metric === "crcl" ? "CrCl" : "eGFR"} input selected: ${Math.round(value)} ${metric === "crcl" ? "mL/min" : "mL/min/1.73 m²"}.`
        : `${metric === "crcl" ? "CrCl" : "eGFR"} input selected; no value entered.`;
      if (metric === "egfr" && Number.isFinite(p.crcl)) status += ` Entered CrCl ${Math.round(p.crcl)} mL/min remains available for CrCl-specific branches.`;
      if (derived) status += ` Equation result ${derived.value.toFixed(2)} ${derived.unit} (${derived.label}) selects CrCl-labelled sentences only. It is not a dose, and eGFR was not converted into CrCl.`;
      else if (AMUApp.isRenalCalculationActive?.() && !Number.isFinite(p.crcl)) status += " Complete the CrCl calculator or enter CrCl separately.";
      else if (canAssumeNormalRenalFunction(p)) status += ` No CrCl entered. eGFR ${Math.round(p.egfr)} is within 90–130 and dialysis is off, so the ordinary-function text branch is selected. No CrCl was calculated and no dose is recommended.`;
      else if (!Number.isFinite(p.crcl)) status += " CrCl-specific label sentences need a separately entered CrCl. This eGFR value does not stand in for CrCl.";
      if (p.dialysis !== "none") status += ` Dialysis mode: ${p.dialysis.toUpperCase()}; no normal-function assumption.`;
      $id("renalMetricStatus").textContent = status;
    }
    function updateRenalState() {
      updateRenalMetricStatus();
      const m = rrtMode();
      const cutoff=AMUApp.database?.policies?.quantity?.uiRenalScreening?.severeThreshold ?? 30;
      const effectiveCrCl=AMUApp.patient?.().crcl ?? crcl;
      const severe=(Number.isFinite(effectiveCrCl)&&effectiveCrCl<cutoff)||(Number.isFinite(egfr)&&egfr<cutoff);
      $id("renalFlag").checked=m==="hd"||(m==="none"&&severe);
      if (Number.isFinite(egfr)) {
        const e = egfr;
        const s = e > 130 ? "Text-filter band: eGFR >130" : e >= 90 ? "Text-filter band: eGFR ≥90" : e >= 60 ? "Text-filter band: eGFR 60–89" : e >= 45 ? "Text-filter band: eGFR 45–59" : e >= 30 ? "Text-filter band: eGFR 30–44" : e >= 15 ? "Text-filter band: eGFR 15–29" : "Text-filter band: eGFR <15";
        $id("egfrStage").textContent = s;
      } else $id("egfrStage").textContent = "No eGFR entered. The ordinary-function text branch is not selected.";
      if (Number.isFinite(crcl)) {
        const c = crcl;
        $id("crclStage").textContent = c >= 90 ? "CrCl ≥90 mL/min" : c >= 60 ? "CrCl 60–89 mL/min" : c >= 30 ? "CrCl 30–59 mL/min" : c >= 15 ? "CrCl 15–29 mL/min" : "CrCl <15 mL/min";
      } else {
        $id("crclStage").textContent = "Enter CrCl to evaluate CrCl-specific FDA label branches.";
      }
    }
    function syncEgfr(v, src) {
      if (v !== undefined) {
        AMUApp.clearPageOverride?.("egfr");
        const parsed = parseFloat(v);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 160) {
          egfr = null;
          $id("egfrNum").value = "";
          $id("egfrRng").disabled = true;
        } else {
          egfr = parsed;
          if (src !== "num") $id("egfrNum").value = parsed;
          if (src !== "rng") $id("egfrRng").value = parsed;
          $id("egfrRng").disabled = false;
        }
      }
      updateRenalState(); reFilterCurrentResults();
    }
    function syncCrCl(v, src) {
      if (v !== undefined) {
        AMUApp.clearPageOverride?.("crcl");
        v = parseFloat(v);
        if (!Number.isFinite(v) || v < 0 || v > 160) {
          crcl = null;
          $id("crclNum").value = "";
          $id("crclRng").disabled = true;
          $id("crclRng").value = 0;
        } else {
          crcl = v;
          $id("crclNum").value = Math.round(v);
          $id("crclRng").value = Math.min(160, v);
          $id("crclRng").disabled = false;
        }
      }
      updateRenalState(); reFilterCurrentResults();
    }

    let HD_NOTE = AMUApp.reference("legacyHemodialysisNotes");
    // Pediatric weight-based doses taken from FDA labeling (≥3 months). Ranges computed from entered weight.
    const pm = x => Math.round(x).toLocaleString();
    let PED_DOSE = AMUApp.pediatricDoseFunctions();
    function bannerHtml(x) {
      const red = x.l === "red", preg = x.src === "preg";
      return `<div class="${red ? "allergy-contra-banner border-rose-300" : "caution-banner border-amber-200"} text-white p-4 rounded-xl border-2 flex items-start gap-3">
        <div class="bg-white ${red ? "text-rose-700" : "text-amber-700"} p-2 rounded-lg shrink-0 mt-0.5"><i class="fa-solid ${red ? "fa-skull-crossbones" : preg ? "fa-person-pregnant" : "fa-triangle-exclamation"} text-lg"></i></div>
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">Active ${preg ? "Pregnancy" : "Hepatic Impairment"} Alert</span>
          <h4 class="text-sm font-extrabold text-white mt-0.5">${red ? "Legacy reference flag" : "Legacy reference note"} — ${preg ? "pregnancy text" : "hepatic text"}</h4>
          <p class="text-xs ${red ? "text-rose-100" : "text-amber-50"} mt-0.5">${x.t}</p>
        </div></div>`;
    }
    function patientRing(d) {
      const f = patientFlags(d).filter(x => (x.src === "preg" || x.src === "hep") && x.l !== "blue");
      return f.some(x => x.l === "red") ? "!border-rose-600 ring-4 ring-rose-500/30 shadow-xl" : f.length ? "!border-amber-500 ring-2 ring-amber-400/40" : "";
    }

    // EU-only agents: no FDA label exists → point to the EU/national regulator, offer closest FDA-labelled class members
    let EU_ONLY = AMUApp.reference("euOnlyAgents");
    function showEuOnlyNotice(raw) {
      const hit = EU_ONLY[raw.trim().toLowerCase()];
      if (!hit) return false;
      renderWelcomeHomeState();
      $id("activeDiseaseHeader").textContent = hit[0].toUpperCase() + " — EU-authorised agent (no FDA label)";
      $id("queryModeTag").textContent = "EU-Only Agent";
      $id("liveResultsContainer").innerHTML = `<div class="bg-white rounded-xl border-2 border-sky-300 p-5 space-y-3 text-xs text-slate-700">
        <p><b>${hit[0]}</b> is not FDA-approved, so this app has no monograph for it and will not guess one. Use the official EU/national product information (SmPC): <a class="text-blue-600 underline" href="https://www.ema.europa.eu/en/medicines" target="_blank" rel="noopener noreferrer">EMA medicines</a> • <a class="text-blue-600 underline" href="https://www.sukl.cz" target="_blank" rel="noopener noreferrer">SÚKL (Czech Republic)</a>.</p>
        ${hit[1].length ? `<p>Closest FDA-labelled ${hit[2]} members (similar class, <b>not</b> interchangeable doses):</p><div class="flex flex-wrap gap-1.5">${hit[1].map(a => `<button onclick="executeUntangleSearch('${a}', true)" class="px-2.5 py-1 rounded bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 font-semibold text-[11px]">${a}</button>`).join("")}</div>` : `<p>No FDA-labelled agent is a true equivalent.</p>`}</div>`;
      return true;
    }

    // ===== v1.5: ranking by contraindication, minimized rows, escaping helpers =====
    function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
    function jsArg(s) { return esc(String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")); }

    // score: 0 none • 0.5 dose-adjust only • 1 relative contraindication • 2 absolute contraindication
    function contraAssess(d, renal) {
      let s = 0; const why = [];
      if (renal) {
        const L = d.renalProfile.contraLevel;
        const r = /SAFE|NO FORMULATION-SPECIFIC MATRIX RULE|SOURCE UNAVAILABLE/.test(L) ? 0 : /ABSOLUTE/.test(L) ? 2 : /SYNERGY/.test(L) ? 0.5 : /CONTRAINDICAT|NEUROTOX|NEPHROTOX/.test(L) ? 1 : 0.5;
        if (r >= 1) why.push("Renal: " + L);
        s = Math.max(s, r);
      }
      patientFlags(d).forEach(x => {
        if (x.l === "blue" || x.l === "emerald") return;
        const label = x.src === "preg" ? "Pregnancy" : x.src === "hep" ? "Hepatic" : x.src === "renal" ? "Kidney band" : x.src === "wt" ? "Body weight" : "Age";
        const r = (x.src === "renal" || x.src === "wt") ? (x.l === "red" ? 2 : 0.5) : (x.l === "red" ? 2 : 1);
        if (r >= 1) why.push(label + (r >= 2 ? ": legacy reference flag" : ": legacy reference note"));
        s = Math.max(s, r);
      });
      if (d.evalResult && d.evalResult.status === "CAUTION") s = Math.max(s, 0.5);
      return { s, why };
    }
    function minimizedRow(d, renal, a) {
      const abs = a.s >= 2;
      return `<details class="rounded-lg border ${abs ? "border-rose-300 bg-rose-50/60" : "border-amber-300 bg-amber-50/60"}">
        <summary class="cursor-pointer list-none px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span><i class="fa-solid fa-chevron-right text-[10px] mr-1.5 text-slate-400"></i><b class="text-slate-900">${esc(d.genericName)}</b> <span class="text-slate-500">(${esc(d.epcClasses[0] || "Antimicrobial")})</span></span>
          <span class="flex flex-wrap gap-1">${a.why.map(w => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${abs ? "bg-rose-600" : "bg-amber-500"}">${esc(w)}</span>`).join("")}<span class="text-[10px] text-slate-500 underline">expand</span></span>
        </summary>
        <div class="p-2">${renderDistilledDrugCard(d, renal)}</div></details>`;
    }
    function renderWithCombos(cards, renal) {
      const scored = cards.map((d, i) => ({ d, i, a: contraAssess(d, renal) }));
      const pinned = scored.filter(x => x.d.isSelectedPinned);
      const rest = scored.filter(x => !x.d.isSelectedPinned).sort((x, y) => x.a.s - y.a.s || (x.d.diversityRank ?? x.i) - (y.d.diversityRank ?? y.i));
      const clean = rest.filter(x => x.a.s < 1), rel = rest.filter(x => x.a.s >= 1 && x.a.s < 2), abs = rest.filter(x => x.a.s >= 2);
      const top = [...pinned, ...(clean.length ? clean : rel)];
      const mini = clean.length ? [...rel, ...abs] : abs;
      let html = renderTopCards(top.map(x => x.d), renal);
      if (!clean.length && rel.length) html = `<div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 font-semibold"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Every retrieved card has a text-filter flag for these branch parameters. Cards with fewer flags are listed first. A flag is a text match, not a determination that a drug is contraindicated.</div>` + html;
      if (mini.length) html += `<div class="pt-3 mt-2 border-t border-slate-300 space-y-2"><h3 class="text-xs font-bold uppercase tracking-wider text-rose-700"><i class="fa-solid fa-ban mr-1"></i>Filter-flagged for these branch parameters — minimized (click a row to expand)</h3>${mini.map(x => minimizedRow(x.d, renal, x.a)).join("")}</div>`;
      const activeKey = currentSearchLevel === "PATHOGEN" && activePathogenProfile ? `${activePathogenProfile.canonical}|${activeDiseaseFilterId}` : "";
      if (activeKey && activeGuidelineRecord()) {
        html = `<div class="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-950">Green frames mark agents named in the cited public source for this indexed presentation. The frame is a source index, not a prescribing order. Branch-filter flags still apply. Each dose panel identifies its own source, and a source index does not establish a matching label dose.</div>` + html;
      } else if (activeKey && !FIRST_LINE_COMBOS[activeKey] && activeKey !== "Streptococcus pyogenes|pharyngitis") {
        html = `<div class="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">Cards follow the selected pathogen or presentation index and the branch-parameter flags. Card order is not a treatment ranking. A label-text match does not establish comparative preference.</div>` + html;
      }
      return html;
    }

    $id("regionSelect").addEventListener("change", reFilterCurrentResults);

  
    function AMU_refreshDatabaseReferences() {
      antimicrobialDrugGroups = AMUApp.reference("drugGroups");
      antimicrobialDrugCatalog = AMUApp.reference("drugCatalog");
      pathogenKnowledgeGraph = AMUApp.reference("pathogenProfiles");
      canonicalSyndromeTerms = AMUApp.reference("syndromeTerms");
      SYNDROME_CLINICAL_MAP = AMUApp.reference("syndromeMap");
      PATHOGEN_DISEASE_AGENT_SETS = AMUApp.reference("pathogenDiseaseAgents");
      directoryTaxonomy = AMUApp.reference("directory");
      FIRST_LINE_COMBOS = AMUApp.reference("guidelineCombinations");
      FIRST_LINE_OPTIONS = AMUApp.reference("guidelineOptions");
      renalPharmacokineticsMatrix = AMUApp.reference("legacyRenalProfiles");
      RENAL_MOD = AMUApp.reference("legacyRenalModerate");
      HD_NOTE = AMUApp.reference("legacyHemodialysisNotes");
      ALT_ROUTE = AMUApp.reference("alternativeRoutes");
      RES_STOP = AMUApp.reference("resistanceStopWords");
      EU_ONLY = AMUApp.reference("euOnlyAgents");
      REGIMEN_SOURCE_REGISTRY = AMUApp.reference("legacySourceRegistry");
      resistanceSurveillanceDB = AMUApp.reference("resistanceSurveillance");
      PED_DOSE = AMUApp.pediatricDoseFunctions();
      LABEL_WORDING_EQUIVALENTS = AMUApp.lexicon("wordingEquivalents");
      CLINICAL_RETRIEVAL_EXPANSIONS = AMUApp.lexicon("retrievalExpansions");
      CLINICAL_CONTEXT_SYNONYMS = AMUApp.lexicon("contextSynonyms");
      RESOLVER_CONTEXT_ALIASES = AMUApp.lexicon("contextAliases");
      CLINICAL_KEYWORD_ABBREVIATIONS = AMUApp.lexicon("abbreviations");
      RESOLVER_INDICATION_TERMS = AMUApp.lexicon("indicationTerms");
    }
