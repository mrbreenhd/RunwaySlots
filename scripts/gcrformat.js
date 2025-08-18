function initFirebaseSafe() {
  try {
    if (!window.firebase || !firebase.initializeApp) return false;
    const cfg = window.firebaseConfig; 
    if (!cfg || !cfg.apiKey) return false;
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    return true;
  } catch (e) {
    console.warn("Firebase init skipped:", e);
    return false;
  }
}
const FIREBASE_READY = initFirebaseSafe();

 function showError(msg) {
      const e = document.getElementById("errorMessage");
      e.textContent = msg; e.style.display = "block";
      setTimeout(() => e.style.display = "none", 4000);
    }
    function showSuccess(msg) {
      const s = document.getElementById("successMessage");
      s.textContent = msg; s.style.display = "block";
      setTimeout(() => s.style.display = "none", 4000);
    }
    async function copyToClipboard(txt) {
      try {
        await navigator.clipboard.writeText(txt);
        showSuccess("Copied to clipboard!");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = txt; ta.style.position="fixed"; ta.style.opacity=0;
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showSuccess("Copied to clipboard!");
      }
    }

    const monthMap = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
    const monthAbbr = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

    function parseDateString(ds) {
      const m = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(ds);
      if (!m) return null;
      return new Date(Date.UTC(+m[3], monthMap[m[2]], +m[1]));
    }
    function fmtDate(dt) {
      return String(dt.getUTCDate()).padStart(2,'0') + monthAbbr[dt.getUTCMonth()];
    }
    function parseInput(raw) {
      return raw.trim().split("\n").map(ln => {
        const p = ln.trim().split(/\s+/);
        if (p.length < 8) return null;
        const [flight, from, to, ds, dep, arr, ac, reg] = p;
        const dt = parseDateString(ds);
        if (!dt) return null;
        return {
          flight: flight.toUpperCase(),
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          date: fmtDate(dt),
          dep, arr,
          acType: ac.toUpperCase(),
          reg: reg.toUpperCase(),
          svc: "D"
        };
      }).filter(x => x);
    }

    function seatCodeForAcType(acType) {
      const t = String(acType || "").toUpperCase();
      if (t === "CL5") return "009";
      if (t === "L45") return "008";
      return "008";
    }

    const DEFAULT_EMAIL = "slotdesk@ryanair.com";

    async function getAirportEmailsByIcao(icaoCode) {
      const fallback = [DEFAULT_EMAIL];
      const icao = (icaoCode || "").trim();
      if (!icao || !FIREBASE_READY || !firebase.database) return fallback;

      try {
        const candidates = [icao, icao.toUpperCase(), icao.toLowerCase()];
        let emails = [];
        for (const key of candidates) {
          const snap = await firebase.database()
            .ref("airports")
            .orderByChild("airportIcao")
            .equalTo(key)
            .once("value");
          if (snap.exists()) {
            snap.forEach(child => {
              const val = child.val() || {};
              if (val.email) emails.push(val.email);
            });
            if (emails.length) break;
          }
        }
        emails = emails
          .flatMap(s => String(s).split(/[;,]\s*/))
          .map(s => s.trim())
          .filter(s => s && /\S+@\S+\.\S+/.test(s));
        if (!emails.length) return fallback;

        const uniq = [];
        const seen = new Set();
        for (const e of emails) { const k=e.toLowerCase(); if(!seen.has(k)){ seen.add(k); uniq.push(e);} }
        return uniq;
      } catch (err) {
        console.warn("Email lookup failed for", icao, err);
        return fallback;
      }
    }

    function buildMailto(toList, subject, body) {
      const to = Array.isArray(toList) ? toList.join(",") : String(toList || DEFAULT_EMAIL);
      return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    /**********************
     * SUBJECT BY MODE
     **********************/
    function subjectForMode(mode, apt) {
      const ICAO = (apt || "").toUpperCase();
      if (mode === "NEW")     return `NEW GCR REQ '${ICAO}'`;
      if (mode === "CHANGE")  return `CHANGE GCR SLOT REQ '${ICAO}'`;
      if (mode === "CANCEL")  return `CANCEL GCR SLOT REQ '${ICAO}'`;
      return `GCR '${ICAO}'`;
    }
    function displayModeLabel(mode) {
      if (mode === "NEW") return "NEW SLOT";
      if (mode === "CHANGE") return "CHANGE SLOT";
      if (mode === "CANCEL") return "CANCEL SLOT";
      return mode;
    }

    /**********************
     * GCR BUILDERS
     **********************/
    function buildStaticBlock(apt, entries, mode) {
      const lines = ["GCR", "/REG", apt];
      const prefArr = mode === "CANCEL" ? "D"  : "N";
      const prefDep = mode === "CANCEL" ? "D " : "N ";

      // arrivals (to this airport)
      entries.filter(e => e.to === apt).forEach(e => {
        const seatCode = seatCodeForAcType(e.acType);
        lines.push(`${prefArr}${e.reg} ${e.date} ${seatCode}${e.acType} ${e.from}${e.arr} ${e.svc}`);
      });
      // departures (from this airport)
      entries.filter(e => e.from === apt).forEach(e => {
        const seatCode = seatCodeForAcType(e.acType);
        lines.push(`${prefDep}${e.reg} ${e.date} ${seatCode}${e.acType} ${e.dep}${e.to} ${e.svc}`);
      });

      let footer = "";
      if (mode === "NEW")    footer = `GI NEW SLOT REQ ${apt} PPR / SLOT ID NUMBER PLS`;
      if (mode === "CANCEL") footer = `GI SLOT CANX REQ ${apt} PPR / SLOT ID NUMBER PLS`;
      lines.push(footer);

      return lines.join("\n");
    }

    // CHANGE mode: Pair C/R lines for ARR and DEP and for each airport
    function buildChangeGCRBlockDetailed(apt, entries) {
      const lines = ["GCR", "/REG", apt];
      let rArrIdx = null, rDepIdx = null;

      const arr = entries.find(e => e.to === apt);
      if (arr) {
        const seatCode = seatCodeForAcType(arr.acType);
        const cArr = `C${arr.reg} ${arr.date} ${seatCode}${arr.acType} ${arr.from}${arr.arr} ${arr.svc}`;
        const rArr = `R${arr.reg} ${arr.date} ${seatCode}${arr.acType} ${arr.from}${arr.arr} ${arr.svc}`;
        lines.push(cArr);
        lines.push(rArr);
        rArrIdx = lines.length - 1; // index of R-arrival
      }

      const dep = entries.find(e => e.from === apt);
      if (dep) {
        const seatCode = seatCodeForAcType(dep.acType);
        const cDep = `C ${dep.reg} ${dep.date} ${seatCode}${dep.acType} ${dep.dep}${dep.to} ${dep.svc}`;
        const rDep = `R ${dep.reg} ${dep.date} ${seatCode}${dep.acType} ${dep.dep}${dep.to} ${dep.svc}`;
        lines.push(cDep);
        lines.push(rDep);
        rDepIdx = lines.length - 1; // index of R-departure
      }

      lines.push(`GI SLOT CHG REQ ${apt}`);

      return { lines, rArrIdx, rDepIdx };
    }

    /**********************
     * MAIN
     **********************/
    document.getElementById("formatBtn").onclick = async () => {
      const entries = parseInput(document.getElementById("userInput").value);
      if (!entries.length) { showError("No valid flights."); return; }
      const mode = document.getElementById("slotType").value;

      const airports = Array.from(new Set(entries.flatMap(e => [e.from, e.to])));
      const out = document.getElementById("outputList");
      out.innerHTML = "";

      // fetch emails for each ICAO
      const emailMap = {};
      await Promise.all(
        airports.map(async apt => { emailMap[apt] = await getAirportEmailsByIcao(apt); })
      );

      airports.forEach(apt => {
        let text;
        const heading = (mode === "CHANGE") ? `Change GCR [${apt}]` : `GCR [${apt}]`;
        const modeLabel = displayModeLabel(mode);
        const emails = emailMap[apt] && emailMap[apt].length ? emailMap[apt] : [DEFAULT_EMAIL];
       
        let rArrIdx = null, rDepIdx = null, lines = null;
        if (mode === "CHANGE") {
          const res = buildChangeGCRBlockDetailed(apt, entries);
          lines = res.lines;
          rArrIdx = res.rArrIdx;
          rDepIdx = res.rDepIdx;
          text = lines.join("\n");
        } else {
          text = buildStaticBlock(apt, entries, mode);
          lines = text.split("\n");
        }

        // --- Render block ---
        const block = document.createElement("div");
        block.className = "output-container";

        const hd = document.createElement("div");
        hd.className = "heading";
        hd.textContent = heading;
        block.appendChild(hd);

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.innerHTML = `
          <span class="label">Mode:</span> <span class="pill">${modeLabel}</span>
          <span class="label">Emails:</span> ${emails.map(e => `<span class="pill">${e}</span>`).join(" ")}
          ${mode === "CHANGE" ? `<span class="label">R-lines:</span> <span class="pill">editable below</span>` : ""}
        `;
        block.appendChild(meta);

        const pre = document.createElement("pre");
        pre.textContent = text;
        block.appendChild(pre);

        const actions = document.createElement("div");
        actions.className = "action-buttons";

        const getCurrentText = () => lines.join("\n");

        const copyBtn = document.createElement("button");
        copyBtn.textContent = mode === "CHANGE" ? "Update & Copy" : "Copy";
        copyBtn.onclick = () => copyToClipboard(getCurrentText());
        actions.appendChild(copyBtn);

        const emailBtn = document.createElement("button");
        emailBtn.textContent = mode === "CHANGE" ? "Update & Email" : "Email";
        emailBtn.onclick = () => {
          const subj = subjectForMode(mode, apt);
          const href = buildMailto(emails, subj, getCurrentText());
          window.location.href = href;
        };
        actions.appendChild(emailBtn);

        block.appendChild(actions);

        // --- Editors for R lines (CHANGE mode only) ---
        if (mode === "CHANGE") {
          if (rArrIdx !== null) {
            const editA = document.createElement("div");
            editA.className = "r-edit";
            const taA = document.createElement("textarea");
            taA.value = lines[rArrIdx] || "";
            const lblA = document.createElement("label");
            lblA.textContent = "Edit Arrival line:";
            const btnA = document.createElement("button");
            btnA.textContent = "Apply Arrival line";
            btnA.onclick = () => {
              lines[rArrIdx] = taA.value.trim();
              pre.textContent = getCurrentText();
              showSuccess("Arrival line updated.");
            };
            editA.appendChild(lblA);
            editA.appendChild(taA);
            editA.appendChild(btnA);
            block.appendChild(editA);
          }
          if (rDepIdx !== null) {
            const editD = document.createElement("div");
            editD.className = "r-edit";
            const taD = document.createElement("textarea");
            taD.value = lines[rDepIdx] || "";
            const lblD = document.createElement("label");
            lblD.textContent = "Edit Departure line:";
            const btnD = document.createElement("button");
            btnD.textContent = "Apply Departure line";
            btnD.onclick = () => {
              lines[rDepIdx] = taD.value.trim();
              pre.textContent = getCurrentText();
              showSuccess("Departure line updated.");
            };
            editD.appendChild(lblD);
            editD.appendChild(taD);
            editD.appendChild(btnD);
            block.appendChild(editD);
          }
        }

        out.appendChild(block);
      });

      showSuccess(`Generated ${airports.length} block(s) in ${displayModeLabel(mode)} mode.${FIREBASE_READY ? "" : " (If Database is offline, it will use the default email address.)"}`);
    };

    /********************** CLEAR BUTTON **********************/
    document.getElementById("clearBtn").onclick = () => {
      // Clear the input box
      const ta = document.getElementById("userInput");
      if (ta) ta.value = "";
      // Clear any generated outputs
      const out = document.getElementById("outputList");
      if (out) out.innerHTML = "";
      // Hide messages
      const err = document.getElementById("errorMessage");
      const ok = document.getElementById("successMessage");
      if (err) { err.textContent = ""; err.style.display = "none"; }
      if (ok)  { ok.textContent = "";  ok.style.display = "none"; }
    };
