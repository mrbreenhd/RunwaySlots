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

    // --- Parse input ---
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
    function emailMsg(subj, body) {
      window.open(`mailto:slotdesk@ryanair.com?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`, "_blank");
    }

    // --- Build static NEW/CANCEL block ---
    function buildStaticBlock(apt, entries, mode) {
      const lines = ["GCR", "/REG", apt];
      // choose prefixes
      const prefArr = mode === "CANCEL" ? "D"  : "N";
      const prefDep = mode === "CANCEL" ? "D " : "N ";

      // arrivals
      entries.filter(e => e.to === apt).forEach(e => {
        lines.push(
          `${prefArr}${e.reg} ${e.date} 008${e.acType} ${e.from}${e.arr} ${e.svc}`
        );
      });
      // departures
      entries.filter(e => e.from === apt).forEach(e => {
        lines.push(
          `${prefDep}${e.reg} ${e.date} 008${e.acType} ${e.dep}${e.to} ${e.svc}`
        );
      });

      // footer
      let footer = "";
      if (mode === "NEW")    footer = `GI NEW SLOT REQ ${apt} PPR / SLOT ID NUMBER PLS`;
      if (mode === "CANCEL") footer = `GI SLOT CANX REQ ${apt} PPR / SLOT ID NUMBER PLS`;
      lines.push(footer);

      return lines.join("\n");
    }

    function buildChangeGCRBlock(apt, entries) {
      const lines = ["GCR", "/REG", apt, ""];

      // arrival
      const arr = entries.find(e => e.to === apt);
      if (arr) {
        lines.push(
          `C${arr.reg} ${arr.date} 009${arr.acType} ${arr.from}${arr.arr} ${arr.svc}`
        );
      }
      // departure
      const dep = entries.find(e => e.from === apt);
      if (dep) {
        lines.push(
          `C ${dep.reg} ${dep.date} 009${dep.acType} ${dep.dep}${dep.to} ${dep.svc}`
        );
      }

      lines.push("");  // blank

      // R-lines
      if (arr) {
        lines.push(
          `R${arr.reg} ${arr.date} 009${arr.acType} ${arr.from}${arr.arr} ${arr.svc}`
        );
      }
      if (dep) {
        lines.push(
          `R ${dep.reg} ${dep.date} 009${dep.acType} ${dep.dep}${dep.to} ${dep.svc}`
        );
      }

      lines.push("", `GI SLOT CHG REQ ${apt}`);
      return lines.join("\n");
    }

    // --- Main ---
    document.getElementById("formatBtn").onclick = () => {
      const entries = parseInput(document.getElementById("userInput").value);
      if (!entries.length) { showError("No valid flights."); return; }
      const mode = document.getElementById("slotType").value;
      const airports = new Set(entries.flatMap(e => [e.from, e.to]));
      const out = document.getElementById("outputList");
      out.innerHTML = "";

      airports.forEach(apt => {
        let text, heading;
        if (mode === "CHANGE") {
          text = buildChangeGCRBlock(apt, entries);
          heading = `Change GCR [${apt}]`;
        } else {
          text = buildStaticBlock(apt, entries, mode);
          heading = `GCR [${apt}]`;
        }

        const block = document.createElement("div");
        block.className = "output-container";

        const hd = document.createElement("div");
        hd.className = "heading";
        hd.textContent = heading;
        block.appendChild(hd);

        const pre = document.createElement("pre");
        pre.textContent = text;
        block.appendChild(pre);

        const actions = document.createElement("div");
        actions.className = "action-buttons";

        const copyBtn = document.createElement("button");
        copyBtn.textContent = mode === "CHANGE" ? "Update & Copy" : "Copy";
        copyBtn.onclick = () => copyToClipboard(text);
        actions.appendChild(copyBtn);

        const emailBtn = document.createElement("button");
        emailBtn.textContent = mode === "CHANGE" ? "Update & Email" : "Email";
        emailBtn.onclick = () => emailMsg(`${mode==="CHANGE"?"GCR CHANGE":"GCR"} ${apt}`, text);
        actions.appendChild(emailBtn);

        block.appendChild(actions);
        out.appendChild(block);
      });

      showSuccess(`Rendered ${airports.size} block(s) in ${mode} mode.`);
    };
