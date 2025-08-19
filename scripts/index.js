//BACK UP EMAILS, HARD-CODED//
let airportData = {};
window.addEventListener("DOMContentLoaded", () => {
  fetch("assets/emails.json")
    .then(r => r.json())
    .then(data => { airportData = data; })
    .catch(err => console.error("Error loading emails.json:", err));
});

function getAirportEmail(airportCode) {
  const code = String(airportCode || "").trim().toUpperCase();
  if (code && airportData[code] && airportData[code].email) {
    return airportData[code].email;
  }
  return "slotdesk@ryanair.com";
}

function validateSeats(el) {
  if (!el) return;
  el.value = (el.value || "").replace(/[^\d]/g, "").slice(0, 3);
}
function toSeat3(n) {
  const x = parseInt(n, 10);
  if (Number.isNaN(x)) return null;
  const v = Math.max(0, Math.min(999, x));
  return String(v).padStart(3, "0");
}
function normalizeAc(ac) {
  const t = String(ac || "").toUpperCase().trim();
  if (t === "738") return "73H";
  return t || "73H";
}
function normalizeFlightNo(raw) {
  if (!raw) return "";
  const m = /^([A-Za-z]{2})(\d+)([A-Za-z]*)$/i.exec(raw.trim());
  if (!m) return raw.toUpperCase();
  const [, pfx, digits, tail] = m;
  const padded = String(parseInt(digits, 10)).padStart(3, "0");
  return (pfx + padded + (tail || "")).toUpperCase();
}
function formatDateDDMON(dateStr) {
  if (!dateStr) return "";
  const dt = new Date(dateStr);
  if (isNaN(dt)) return "";
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const mon = months[dt.getUTCMonth()];
  return dd + mon;
}
function dayOfOpFromDate(dateStr) {
  const dt = new Date(dateStr);
  const day = dt.toLocaleDateString("en-US", { weekday: "long" });
  const map = {
    "Sunday":    "0000007",
    "Monday":    "1000000",
    "Tuesday":   "0200000",
    "Wednesday": "0030000",
    "Thursday":  "0004000",
    "Friday":    "0000500",
    "Saturday":  "0000060"
  };
  return map[day] || "1000000";
}

function getCodePrefix(option) {
  // Non-J service prefixes
  switch (String(option || "").toUpperCase()) {
    case "P":
    case "T":
    case "K":
    case "X":
      return "000";
    case "D":
      return "008";
    default:
      return "000";
  }
}
function buildOpCode(defaultAc, aircraftType, seatsOverride, serviceOption) {
  const ac = normalizeAc(aircraftType || defaultAc);
  const opt = String(serviceOption || "").toUpperCase();

  if (opt === "J") {
    // Seats + AC (prefer user seats)
    let seats = toSeat3(seatsOverride);
    if (!seats) {
      // fallback seats by type
      if (ac === "7M8") seats = "197";
      else if (ac === "73H") seats = "189";
      else if (ac === "320") seats = "180";
      else seats = "000";
    }
    return `${seats}${ac}`;
  }

  // Non-J services
  return `${getCodePrefix(opt)}${ac}`;
}

function showMessage(containerId, msg, ok = true) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = msg;
  el.className = ok ? "success" : "error";
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3500);
}
function copyToClipboard(txt) {
  return navigator.clipboard.writeText(txt)
    .then(() => true)
    .catch(() => {
      try {
        const ta = document.createElement("textarea");
        ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch { return false; }
    });
}

const SEASON_CODE = "S25"; 

function buildDepartureSCR({ from, to, dateStr, time, flight, svc, seats, ac, slotAction }) {
  const date = formatDateDDMON(dateStr);
  const day = dayOfOpFromDate(dateStr);
  const opCode = buildOpCode("73H", ac, seats, svc);
  const flightType = (slotAction === "CANCEL") ? "D" : "N"; 
  const si = `SI ${slotAction} SLOT REQ ${from}`;

  return [
    "SCR",
    SEASON_CODE,
    date,
    from,
    `${flightType} ${flight} ${date}${date} ${day} ${opCode} ${time}${to} ${svc}`,
    si
  ].join("\n");
}

function buildArrivalSCR({ from, to, dateStr, time, flight, svc, seats, ac, slotAction }) {
  const date = formatDateDDMON(dateStr);
  const day = dayOfOpFromDate(dateStr);
  const opCode = buildOpCode("73H", ac, seats, svc);
  const flightType = (slotAction === "CANCEL") ? "D" : "N";
  const si = `SI ${slotAction} SLOT REQ ${to}`;

  return [
    "SCR",
    SEASON_CODE,
    date,
    to,
    `${flightType}${flight} ${date}${date} ${day} ${opCode} ${from}${time} ${svc}`,
    si
  ].join("\n");
}

function showSCR(btn) {
  const form = btn.closest(".scr-form");
  if (!form) return;

  const slotAction = form.dataset.slotAction || "NEW"; // NEW or CANCEL
  const isArrival = (form.querySelector(".slotType")?.value || "").toUpperCase() === "ARRIVAL";

  const fields = {
    airport: form.querySelector(".airportCode")?.value.trim().toUpperCase(),
    flight: normalizeFlightNo(form.querySelector(".flightNumber")?.value),
    dateStr: form.querySelector(".dateField")?.value,
    seats: form.querySelector(".numberOfSeats")?.value,
    ac: form.querySelector(".aircraftType")?.value,
    time: form.querySelector(".timeField")?.value,
    do: form.querySelector(".destinationOrigin")?.value.trim().toUpperCase(),
    svc: (form.querySelector(".serviceType")?.value || "").toUpperCase()
  };

  if (!fields.airport || !fields.flight || !fields.dateStr || !fields.time || !fields.do || !fields.svc) {
    alert("Please complete all fields.");
    return;
  }

  const args = {
    from: isArrival ? fields.do : fields.airport,
    to:   isArrival ? fields.airport : fields.do,
    dateStr: fields.dateStr,
    time: fields.time,
    flight: fields.flight,
    svc: fields.svc,
    seats: fields.seats,
    ac: fields.ac,
    slotAction
  };

  const msg = isArrival ? buildArrivalSCR(args) : buildDepartureSCR(args);
  const out = form.querySelector(".scrOutput");
  if (out) out.textContent = msg;

  appendLogRow(slotAction, msg);
}

function emailSCR(btn) {
  const form = btn.closest(".scr-form");
  if (!form) return;

  const slotAction = form.dataset.slotAction || "NEW";
  const isArrival = (form.querySelector(".slotType")?.value || "").toUpperCase() === "ARRIVAL";

  // Prefer just-rendered content; if empty, render now
  let msg = form.querySelector(".scrOutput")?.textContent.trim();
  if (!msg) {
    showSCR(btn);
    msg = form.querySelector(".scrOutput")?.textContent.trim();
    if (!msg) { alert("No SCR content to email."); return; }
  }

  const airport = (form.querySelector(".airportCode")?.value || "").trim().toUpperCase();
  const subject = `${slotAction} SLOT REQ ${airport}`;
  const to = getAirportEmail(isArrival ? airport : airport); // same either way here
  const cc = "slotdesk@ryanair.com";

  const href = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
  window.location.href = href;
}

function showChangeSCR(btn) {
  const box = btn.closest(".change-scr-container");
  if (!box) return;

  // OLD
  const oldSlot = (box.querySelector(".old_slotType")?.value || "Arrival").toUpperCase();
  const old_args = {
    from: oldSlot === "ARRIVAL" ? (box.querySelector(".old_do")?.value || "").toUpperCase()
                                : (box.querySelector(".old_airport")?.value || "").toUpperCase(),
    to:   oldSlot === "ARRIVAL" ? (box.querySelector(".old_airport")?.value || "").toUpperCase()
                                : (box.querySelector(".old_do")?.value || "").toUpperCase(),
    dateStr: box.querySelector(".old_date")?.value,
    time: box.querySelector(".old_time")?.value,
    flight: normalizeFlightNo(box.querySelector(".old_flightNo")?.value),
    svc: (box.querySelector(".old_stc")?.value || "").toUpperCase(),
    seats: box.querySelector(".old_seats")?.value,
    ac: box.querySelector(".old_acType")?.value,
    slotAction: "CHANGE" // for SI line wording
  };

  // NEW
  const newSlot = (box.querySelector(".new_slotType")?.value || "Arrival").toUpperCase();
  const new_args = {
    from: newSlot === "ARRIVAL" ? (box.querySelector(".new_do")?.value || "").toUpperCase()
                                : (box.querySelector(".new_airport")?.value || "").toUpperCase(),
    to:   newSlot === "ARRIVAL" ? (box.querySelector(".new_airport")?.value || "").toUpperCase()
                                : (box.querySelector(".new_do")?.value || "").toUpperCase(),
    dateStr: box.querySelector(".new_date")?.value,
    time: box.querySelector(".new_time")?.value,
    flight: normalizeFlightNo(box.querySelector(".new_flightNo")?.value),
    svc: (box.querySelector(".new_stc")?.value || "").toUpperCase(),
    seats: box.querySelector(".new_seats")?.value,
    ac: box.querySelector(".new_acType")?.value,
    slotAction: "CHANGE"
  };

  // Validate quick essentials
  if (!old_args.from || !old_args.to || !old_args.dateStr || !old_args.time || !old_args.flight || !old_args.svc) {
    alert("Please complete all OLD request fields.");
    return;
  }
  if (!new_args.from || !new_args.to || !new_args.dateStr || !new_args.time || !new_args.flight || !new_args.svc) {
    alert("Please complete all NEW request fields.");
    return;
  }

  const oldMsg = (oldSlot === "ARRIVAL") ? buildArrivalSCR(old_args) : buildDepartureSCR(old_args);
  const newMsg = (newSlot === "ARRIVAL") ? buildArrivalSCR(new_args) : buildDepartureSCR(new_args);

  const combined = oldMsg + "\n\n" + newMsg + "\n";
  const out = box.querySelector(".change-scrOutput");
  if (out) out.textContent = combined;

  appendLogRow("CHANGE", combined);
}

function emailChangeSCR(btn) {
  const box = btn.closest(".change-scr-container");
  if (!box) return;

  // Prefer rendered content; render if absent
  let msg = box.querySelector(".change-scrOutput")?.textContent.trim();
  if (!msg) {
    showChangeSCR(btn);
    msg = box.querySelector(".change-scrOutput")?.textContent.trim();
    if (!msg) { alert("No SCR content to email."); return; }
  }

  // Prefer NEW airport as subject target; fallback to OLD
  const targetApt = (box.querySelector(".new_airport")?.value || box.querySelector(".old_airport")?.value || "").toUpperCase();
  const subject = `CHANGE SCR REQ ${targetApt}`;
  const to = getAirportEmail(targetApt || ""); // fallback handled inside
  const cc = "slotdesk@ryanair.com";

  const href = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
  window.location.href = href;
}

/* =========================
   7) Add/remove forms
   ========================= */
function addNewSlotForm() {
  const tpl = document.getElementById("newSlotTemplate");
  if (!tpl) return;
  const node = tpl.content.cloneNode(true);
  document.getElementById("formsContainer").appendChild(node);
}
function addCancelSlotForm() {
  const tpl = document.getElementById("cancelSlotTemplate");
  if (!tpl) return;
  const node = tpl.content.cloneNode(true);
  document.getElementById("formsContainer").appendChild(node);
}
function addChangeScrForm() {
  const tpl = document.getElementById("changeScrTemplate");
  if (!tpl) return;
  const node = tpl.content.cloneNode(true);
  document.getElementById("formsContainer").appendChild(node);
}
function removeForm(btn) {
  // remove the nearest .scr-form or .change-scr-container
  const box = btn.closest(".scr-form") || btn.closest(".change-scr-container");
  if (box && box.parentNode) box.parentNode.removeChild(box);
}

/* =========================
   8) Log table + CSV export
   ========================= */
function appendLogRow(action, message) {
  const logContainer = document.getElementById("logContainer");
  const tbody = document.querySelector("#logTable tbody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  const tdA = document.createElement("td");
  const tdM = document.createElement("td");

  tdA.textContent = action;
  tdM.textContent = message;

  tr.appendChild(tdA);
  tr.appendChild(tdM);
  tbody.appendChild(tr);

  if (logContainer) logContainer.style.display = "";
}
function downloadCSV() {
  const rows = [["Slot Action","SCR Message"]];
  document.querySelectorAll("#logTable tbody tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    rows.push([tds[0]?.textContent || "", (tds[1]?.textContent || "").replace(/\n/g, "\\n")]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "scr_log.csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

/* Expose functions to HTML inline handlers */
window.validateSeats = validateSeats;
window.addNewSlotForm = addNewSlotForm;
window.addCancelSlotForm = addCancelSlotForm;
window.addChangeScrForm = addChangeScrForm;
window.removeForm = removeForm;
window.showSCR = showSCR;
window.emailSCR = emailSCR;
window.showChangeSCR = showChangeSCR;
window.emailChangeSCR = emailChangeSCR;
window.downloadCSV = downloadCSV;
window.scrollToTop = scrollToTop;
