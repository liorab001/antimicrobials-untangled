/* Live resistance application module retained from V1.18. */
    let resistanceSurveillanceDB = AMUApp.reference("resistanceSurveillance");
    let lastDailyPollDate = null;
    let amuResistancePoll = 0;
    let amuLiteratureRequest = 0;

    async function runDailyResistancePoll(force) {
      const todayUtc = new Date().toISOString().slice(0, 10);
      document.getElementById("dailyPollTimestamp").textContent = `OA literature index check: ${todayUtc} UTC — reference resistance rates are static`;
      renderResistanceDashboard();
      if (!force && lastDailyPollDate === todayUtc) return;
      lastDailyPollDate = todayUtc;
      const poll = ++amuResistancePoll;
      await Promise.allSettled(resistanceSurveillanceDB.map(async item => {
        item.pollStatus = "loading";
        try {
          const q = encodeURIComponent(`(${item.pathogen} antibiotic resistance) AND OPEN_ACCESS:y`);
          const res = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${q}&resultType=lite&pageSize=1&format=json`, {signal: AbortSignal.timeout(15000)});
          if (!res.ok) throw new Error(`Europe PMC HTTP ${res.status}`);
          const data = await res.json();
          if (!Number.isFinite(data.hitCount)) throw new Error("No study count returned");
          item.livePapersCount = data.hitCount;
          item.pollStatus = "success";
          item.pollDate = todayUtc;
        } catch (e) { item.pollStatus = "failed"; }
      }));
      if (poll !== amuResistancePoll) return;
      renderResistanceDashboard();
      const settings = AMUApp.reference("resistanceSettings") || {};
      fetchLiveSurveillancePapers(settings.defaultPaperQuery || resistanceSurveillanceDB[0]?.pmcQuery || "antimicrobial resistance surveillance");
    }

    function renderResistanceDashboard() {
      const region = document.getElementById("regionSelect").value;
      const gram = document.getElementById("gramSelect").value;
      const container = document.getElementById("resistanceCardsContainer");
      const todayUtc = new Date().toISOString().slice(0, 10);
      const settings = AMUApp.reference("resistanceSettings") || {};
      const highThreshold = settings.highThreshold ?? 25, mediumThreshold = settings.mediumThreshold ?? 10;

      const filtered = resistanceSurveillanceDB.filter(p => gram === "all" || p.gram === gram);

      container.innerHTML = filtered.map(item => `
        <article class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-bold text-slate-900 italic">${esc(item.pathogen)}</h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">${esc(item.priority)}</span>
                ${Number.isFinite(item.livePapersCount) ? `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <i class="fa-solid fa-lock-open mr-1"></i>OA index checked ${esc(item.pollDate || todayUtc)}: ${item.livePapersCount.toLocaleString()} total matching studies${item.pollStatus === "failed" ? " (refresh failed; prior count)" : ""}
                  </span>
                ` : `<span class="text-[10px] text-slate-400">${item.pollStatus === "failed" ? "OA index unavailable — use Refresh to retry" : item.pollStatus === "loading" ? "Checking Open-Access index…" : "OA index not checked yet"}</span>`}
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">Syndromes: ${esc(item.clinicalSyndromes)}</p>
            </div>
            <button onclick="fetchLiveSurveillancePapers('${jsArg(item.pmcQuery || item.pathogen)}')" class="self-start text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 shrink-0">
              <i class="fa-solid fa-lock-open"></i>
              <span>Load OA Papers</span>
            </button>
          </div>

          <div class="space-y-3">
            ${item.drugs.map(d => {
              const rawRate = d.rates?.[region];
              const rate = Number.isFinite(rawRate) && rawRate >= 0 && rawRate <= 100 ? rawRate : null;
              let barColor = "bg-emerald-500";
              let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
              let clinicalLabel = `Illustrative figure below ${mediumThreshold}%. Not an official rate and not a susceptibility finding.`;
              if (rate !== null && rate >= highThreshold) {
                barColor = "bg-rose-600";
                badgeColor = "bg-rose-100 text-rose-900 border-rose-300";
                clinicalLabel = `Illustrative figure at or above ${highThreshold}%. Not an official rate and not an instruction.`;
              } else if (rate !== null && rate >= mediumThreshold) {
                barColor = "bg-amber-500";
                badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
                clinicalLabel = `Illustrative figure between ${mediumThreshold}% and ${highThreshold}%. Not an official rate.`;
              }

              if (rate === null) clinicalLabel = "No reference rate for the selected region";
              return `
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span class="text-xs font-bold text-slate-800">${esc(d.antibiotic)}</span>
                      <span class="text-[11px] text-slate-400 block sm:inline sm:ml-2">(${esc(d.mechanism)})</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-bold ${d.direction === 'up' ? 'text-rose-600' : (d.direction === 'down' ? 'text-emerald-600' : 'text-slate-500')}">${esc(d.trend5Yr)} (5yr)</span>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}">${rate === null ? "Unavailable" : rate + "% illustrative"}</span>
                    </div>
                  </div>
                  <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div class="${barColor} h-full rounded-full" style="width: ${rate === null ? 0 : Math.min(100, rate)}%"></div>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-slate-500">
                    <span>${clinicalLabel}</span>
                    <span class="font-mono text-slate-400">Illustration trace: ${esc((d.history || []).map(h => h + '%').join(' → '))}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </article>
      `).join("");
    }

    function europePmcLicenseDeed(raw) {
      const value = String(raw || "").trim();
      if (!value) return null;
      if (/^https?:\/\//i.test(value)) return { label: "License link returned by Europe PMC", url: value };
      const statedVersion = (value.match(/\b(1\.0|2\.0|2\.5|3\.0|4\.0)\b/) || [])[1] || "";
      const token = value.toLowerCase().replace(/[_-]+/g, " ").replace(/\b(?:1\.0|2\.0|2\.5|3\.0|4\.0)\b/g, "").replace(/\s+/g, " ").trim();
      const families = {
        "cc by": ["CC BY", "by"],
        "cc by nc": ["CC BY-NC", "by-nc"],
        "cc by sa": ["CC BY-SA", "by-sa"],
        "cc by nc sa": ["CC BY-NC-SA", "by-nc-sa"],
        "cc by nd": ["CC BY-ND", "by-nd"],
        "cc by nc nd": ["CC BY-NC-ND", "by-nc-nd"],
        "cc0": ["CC0", "zero"],
        "cc 0": ["CC0", "zero"]
      };
      const family = families[token];
      if (!family) return { label: value, url: "" };
      if (family[1] === "zero") return { label: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" };
      const version = statedVersion || "4.0";
      const label = statedVersion
        ? `${family[0]} ${statedVersion}`
        : `${family[0]} 4.0 (record did not state a version; 4.0 deed linked)`;
      return { label, url: `https://creativecommons.org/licenses/${family[1]}/${version}/` };
    }

    function europePmcAttribution(paper) {
      const title = String(paper.title || "Title not returned").replace(/<[^>]*>/g, "");
      const authors = String(paper.authorString || "").replace(/<[^>]*>/g, "").trim() || "Creator names were not returned by Europe PMC";
      const doi = String(paper.doi || "").replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim();
      const pmcid = String(paper.pmcid || "").toUpperCase();
      const pmid = String(paper.pmid || "").replace(/\D/g, "");
      let href = "";
      let label = "";
      if (/^10\.\S+$/i.test(doi)) {
        href = "https://doi.org/" + doi;
        label = "DOI " + doi;
      } else if (/^PMC\d+$/.test(pmcid)) {
        href = "https://europepmc.org/article/PMC/" + pmcid;
        label = pmcid + " on Europe PMC";
      } else if (pmid) {
        href = "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/";
        label = "PMID " + pmid;
      }
      const sourceLink = href
        ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-sky-400 hover:underline shrink-0">${esc(label)} ↗</a>`
        : `<span class="text-[10px] text-slate-500">Source link not returned</span>`;
      const deed = europePmcLicenseDeed(paper.license);
      const licenseHtml = !deed
        ? "No Creative Commons license was returned with this record. Open the source before reusing the text. The bullet below is a shortened extract."
        : deed.url
          ? `License: <a href="${esc(deed.url)}" target="_blank" rel="noopener noreferrer" class="underline">${esc(deed.label)}</a>. The bullet below is a shortened extract.`
          : `License text returned: ${esc(deed.label)}. Open the source before reusing the text. The bullet below is a shortened extract.`;
      return { title, authors, sourceLink, licenseHtml };
    }

    async function fetchLiveSurveillancePapers(customQuery) {
      const inputEl = document.getElementById("pmcQueryInput");
      const rawQuery = customQuery || inputEl.value.trim() || "antimicrobial resistance surveillance";
      if (!customQuery && !isQuerySafeFromPii(rawQuery)) return;
      if (customQuery) inputEl.value = customQuery;

      const request = ++amuLiteratureRequest;
      const loading = document.getElementById("pmcLoading");
      const list = document.getElementById("pmcResultsList");
      loading.classList.remove("hidden");
      list.innerHTML = "";

      try {
        const oaQuery = `(${rawQuery}) AND OPEN_ACCESS:y`;
        const encoded = encodeURIComponent(oaQuery);
        const res = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&resultType=core&pageSize=6&format=json`, {signal: AbortSignal.timeout(15000)});
        if (!res.ok) throw new Error(`Europe PMC HTTP ${res.status}`);
        const data = await res.json();
        if (request !== amuLiteratureRequest) return;
        const papers = (data?.resultList?.result || []).filter(p => p.isOpenAccess === "Y");

        if (papers.length === 0) {
          list.innerHTML = `<div class="text-xs text-slate-400 p-3">No Open-Access surveillance papers matched "${esc(rawQuery)}". (Subscription-only articles are excluded for copyright compliance.)</div>`;
        } else {
          list.innerHTML = papers.map((p, idx) => {
            const cleanAbstract = (p.abstractText || "Open-Access metadata record.").replace(/<[^>]*>/g, "");
            const summaryBullet = extractCleanSentence(cleanAbstract, "resistance", 155);
            const showFullAbs = cleanAbstract.length > summaryBullet.length + 30;
            const attribution = europePmcAttribution(p);
            return `
              <div class="p-3 rounded-lg bg-slate-800/90 border border-slate-700 space-y-2 text-xs">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="text-[9px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700">
                    <i class="fa-solid fa-lock-open mr-1"></i>Open-access record
                  </span>
                  ${attribution.sourceLink}
                </div>
                <div class="text-[10px] text-slate-300 leading-snug"><span class="text-slate-500">Creators:</span> ${esc(attribution.authors)}</div>
                <div class="text-[10px] text-slate-400">${esc(p.journalTitle || "Journal not returned")} (${esc(p.pubYear || "Year not returned")})</div>
                <h4 class="font-bold text-white text-[11px] leading-snug">${esc(attribution.title)}</h4>
                <div class="text-[10px] text-sky-300 leading-snug">${attribution.licenseHtml}</div>
                <div class="p-2 rounded bg-slate-900/90 border border-slate-700 text-[11px] text-slate-300">
                  <span class="text-amber-400 font-bold">Shortened extract:</span> ${esc(summaryBullet)}
                </div>
                ${showFullAbs ? `
                  <button onclick="toggleFullArticle('pmc_abs_${idx}', this)" class="text-[10px] text-blue-400 hover:underline font-semibold">
                    <i class="fa-solid fa-book-open mr-1"></i>View returned abstract text
                  </button>
                  <div id="pmc_abs_${idx}" class="hidden p-2 rounded bg-slate-950 text-[11px] text-slate-400 leading-relaxed max-h-40 overflow-y-auto custom-scroll">
                    ${esc(cleanAbstract)}
                  </div>
                ` : ''}
              </div>
            `;
          }).join("");
        }
      } catch (e) {
        if (request !== amuLiteratureRequest) return;
        list.innerHTML = `<div class="text-xs text-rose-400 p-3">Error connecting to Europe PMC Open-Access API.</div>`;
      } finally {
        if (request === amuLiteratureRequest) loading.classList.add("hidden");
      }
    }


