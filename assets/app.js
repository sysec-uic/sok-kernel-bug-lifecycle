// sok-kernel-bug-lifecycle companion site: theme toggle, data tables, systems explorer.
(function () {
  "use strict";

  // ---------- theme ----------
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.dataset.theme = saved;
  } catch (e) { /* storage unavailable */ }
  document.getElementById("themeToggle").addEventListener("click", () => {
    const dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) { /* ignore */ }
  });

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- coverage-gap matrix (Table 5) ----------
  const MK = { f: '<span class="mk full" title="dedicated kernel technique">●</span>',
               p: '<span class="mk part" title="generic only">◐</span>',
               n: '<span class="mk none" title="none">○</span>' };
  const coverage = [
    ["UAF", 979, "ffpp"], ["OOB", 633, "ffpp"], ["uninit (UBI)", 497, "fppp"],
    ["null-deref", 592, "fppp"], ["GPF", 524, "fppp"], ["data-race", 199, "fpnn"],
    ["deadlock/lock", 470, "fpnn"], ["hang/stall", 351, "fpnn"], ["mem-leak", 243, "ffpp"],
    ["WARNING/other", 2238, "fppn"],
  ];
  document.getElementById("coverageBody").innerHTML = coverage.map(([c, n, m]) =>
    `<tr><td>${c}</td><td class="num">${n.toLocaleString()}</td>${[...m].map((k) => `<td>${MK[k]}</td>`).join("")}</tr>`).join("");

  // ---------- patch-generation benchmark (Table 4) ----------
  const bench = [
    ["one-shot baseline", 65, 48, 12, "0/6", "0/8", 2, 21],
    ["Best-of-N", 55, 44, 18, "0/6", "1/8", 3, 20],
    ["ChatRepair", 55, 39, 14, "0/6", "0/8", 0, 6],
    ["ThinkRepair", 66, 45, 12, "1/6", "0/8", 0, 23],
    ["RepairAgent", 59, 41, 15, "0/6", "1/8", 1, 4],
    ["AutoCodeRover", 55, 41, 14, "1/6", "1/8", 2, 9],
    ["RGym SimpleAgent", 60, 42, 11, "0/6", "0/8", 2, 14],
    ["RGym ExplorationAgent", 56, 44, 16, "2/6", "2/8", 4, 16],
    ["CrashFixer", 61, 45, 15, "2/6", "3/8", 5, 20],
    "Recent code agents, high reasoning effort",
    ["Claude Code CLI, claude-fable-5-1", 62, 45, 19, "2/6", "3/8", 3, 19],
    ["Codex CLI, gpt-5.6-Terra", 64, 46, 21, "3/6", "2/8", 4, 17],
    "Given a localization oracle (target files / functions)",
    ["kGym oracle, files", 100, 95, 15, "2/6", "2/8", 0, 10],
    ["kGym oracle, +functions", 95, 80, 48, "1/6", "1/8", 2, 4],
  ];
  const maxFixed = Math.max(...bench.filter(Array.isArray).map((r) => r[6]));
  document.getElementById("benchBody").innerHTML = bench.map((r) => typeof r === "string"
    ? `<tr class="group"><td colspan="8">${r}</td></tr>`
    : `<tr><td>${r[0]}</td>${r.slice(1).map((v, i) => `<td${i === 5 && v === maxFixed ? ' class="hi"' : ""}>${v}</td>`).join("")}</tr>`).join("");

  // ---------- systems explorer ----------
  const VENUE_SHORT = [
    [/Security and Privacy/i, "IEEE S&P"], [/USENIX Security/i, "USENIX Security"],
    [/Network and Distributed System/i, "NDSS"], [/Computer and Communications Security/i, "ACM CCS"],
    [/AsiaCCS/i, "AsiaCCS"], [/Operating Systems Principles/i, "SOSP"],
    [/Architectural Support/i, "ASPLOS"], [/USENIX Annual/i, "USENIX ATC"],
    [/Offensive Technologies/i, "WOOT"], [/ESEC\/FSE|Foundations of Software Engineering/i, "ESEC/FSE"],
    [/Software Testing and Analysis/i, "ISSTA"], [/Automated Software Engineering/i, "ASE"],
    [/Mining Software Repositories/i, "MSR"], [/Transactions on Software Engineering and Methodology/i, "TOSEM"],
    [/Transactions on Software Engineering/i, "IEEE TSE"], [/Programming Languages/i, "PACMPL"],
    [/ACSAC/i, "ACSAC"], [/ESORICS/i, "ESORICS"], [/NeurIPS/i, "NeurIPS D&B"],
    [/International Conference on Software Engineering|\bICSE\b/i, "ICSE"],
    [/Operating Systems Design/i, "OSDI"], [/EuroSys/i, "EuroSys"], [/RAID/i, "RAID"],
  ];
  const shortVenue = (v) => { for (const [re, s] of VENUE_SHORT) if (re.test(v)) return s; return v; };
  const STAGE_ORDER = { S1: 1, S2: 2, S3: 3, S4: 4, S5: 5 };
  const STAGE_NAMES = { S1: "Discovery", S2: "Triage", S3: "Generation", S4: "Validation", S5: "Integration" };
  const TYPE_ABBR = { Fuzzing: "F", Static: "S", Hybrid: "H", Empirical: "E" };

  const state = { q: "", stage: "all", llm: false, sort: "stage", dir: 1 };
  let systems = [];

  const detailText = (s) => s.stage === "S1"
    ? [s.type, s.target, s.bugClass, ...s.techniques].join(" ")
    : [s.focus, s.automation].join(" ");

  const detailHTML = (s) => s.stage === "S1"
    ? `<span class="pill" title="${esc(s.type)}">${TYPE_ABBR[s.type] || esc(s.type)}</span>` +
      `<span class="pill">${esc(s.target)}</span><span class="pill">${esc(s.bugClass)}</span>` +
      s.techniques.map((t) => `<span class="pill k" title="${esc(techNames[t] || t)}">${esc(t)}</span>`).join("")
    : `<span class="pill">${esc(s.focus)}${s.userSpace ? " (U)" : ""}</span>` +
      `<span class="pill k" title="automation level">${esc(s.automation)}</span>`;

  let techNames = {};

  function render() {
    const q = state.q.trim().toLowerCase();
    const rows = systems.filter((s) =>
      (state.stage === "all" || s.stage === state.stage) &&
      (!state.llm || s.llm) &&
      (!q || s._hay.includes(q)));
    const key = state.sort;
    rows.sort((a, b) => {
      let x, y;
      if (key === "stage") { x = STAGE_ORDER[a.stage]; y = STAGE_ORDER[b.stage]; if (x === y) return a._i - b._i; }
      else if (key === "year") { x = +a.year || 0; y = +b.year || 0; }
      else if (key === "venue") { x = shortVenue(a.venue).toLowerCase(); y = shortVenue(b.venue).toLowerCase(); }
      else if (key === "detail") { x = detailText(a).toLowerCase(); y = detailText(b).toLowerCase(); }
      else { x = a.system.toLowerCase(); y = b.system.toLowerCase(); }
      return (x < y ? -1 : x > y ? 1 : 0) * state.dir;
    });
    const body = document.getElementById("sysBody");
    body.innerHTML = rows.length ? rows.map((s) => {
      const href = s.url || `https://scholar.google.com/scholar?q=${encodeURIComponent(s.title)}`;
      return `<tr>
        <td><span class="sname">${esc(s.system)}</span>${s.llm ? '<span class="llm" title="LLM-based">★</span>' : ""}
          <span class="ptitle"><a href="${esc(href)}" rel="noopener">${esc(s.title)}</a></span></td>
        <td><span class="tag ${s.stage.toLowerCase()}">${s.stage}</span> ${STAGE_NAMES[s.stage]}</td>
        <td>${detailHTML(s)}</td>
        <td title="${esc(s.venue)}">${esc(shortVenue(s.venue))}</td>
        <td class="num">${esc(s.year)}</td></tr>`;
    }).join("") : '<tr><td colspan="5" class="muted">No systems match.</td></tr>';
    document.getElementById("count").textContent = `${rows.length} of ${systems.length} systems`;
    document.querySelectorAll(".systems th[data-sort]").forEach((th) => {
      th.setAttribute("aria-sort", th.dataset.sort === key ? (state.dir > 0 ? "ascending" : "descending") : "none");
    });
  }

  function initExplorer(data) {
    techNames = data.techniques;
    systems = data.systems.map((s, i) => ({ ...s, _i: i,
      _hay: [s.system, s.title, s.authors, s.venue, shortVenue(s.venue), s.year, s.stageName, detailText(s),
             ...s.techniques.map((t) => techNames[t] || "")].join(" ").toLowerCase() }));

    const chips = document.getElementById("stageChips");
    const counts = systems.reduce((m, s) => (m[s.stage] = (m[s.stage] || 0) + 1, m), {});
    chips.innerHTML = [["all", `All`], ...Object.keys(STAGE_NAMES).map((k) => [k, `${k} ${STAGE_NAMES[k]} (${counts[k] || 0})`])]
      .map(([k, label]) => `<button type="button" class="chip" data-stage="${k}" aria-pressed="${k === "all"}">${label}</button>`).join("");
    chips.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      state.stage = b.dataset.stage;
      chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
      render();
    });
    document.getElementById("q").addEventListener("input", (e) => { state.q = e.target.value; render(); });
    document.getElementById("llmOnly").addEventListener("change", (e) => { state.llm = e.target.checked; render(); });
    document.querySelectorAll(".systems th[data-sort]").forEach((th) => th.addEventListener("click", () => {
      const k = th.dataset.sort;
      state.dir = state.sort === k ? -state.dir : (k === "year" ? -1 : 1);
      state.sort = k; render();
    }));
    document.getElementById("techGloss").innerHTML = Object.entries(techNames)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    render();
  }

  fetch("data/systems.json").then((r) => r.json()).then(initExplorer).catch(() => {
    document.getElementById("sysBody").innerHTML =
      '<tr><td colspan="5" class="muted">Could not load data/systems.json. Serve the site over HTTP (e.g. <code>python3 -m http.server</code>).</td></tr>';
  });

  // ---------- copy BibTeX ----------
  const copyBtn = document.getElementById("copyBib");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById("bibtex").textContent);
      copyBtn.textContent = "Copied";
    } catch (e) { copyBtn.textContent = "Select & copy"; }
    setTimeout(() => (copyBtn.textContent = "Copy"), 1600);
  });
})();
