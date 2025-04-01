/************************************************
     IATA TO ICAO 
************************************************/
const iataToIcao = {
  STN: "EGSS", PMI: "LEPA", VIE: "LOWW", CPH: "EKCH", BGY: "LIME", BER: "EDDB",
  SKG: "LGTS", TIA: "LATI", FRA: "EDDF", HHN: "EDDF", HAM: "EDDH", CGN: "EDDK",
  CIA: "LIRA", AMS: "EHAM", EIN: "EHEH", AYT: "LTAI", RHO: "LGRP", KGS: "LGKO",
  JTR: "LGSR", ESB: "LTAC", ATH: "LGAV", JSI: "LGSK", ZTH: "LGZA", CFU: "LGKR",
  KSO: "LGKA", BRU: "EBBR"
};

function getIcaoCode(iataCode) {
  return iataToIcao[iataCode.toUpperCase()] || iataCode.toUpperCase();
}

function parseInput(input) {
  const parts = input.trim().split(/\s+/);
  if (parts.length !== 7) return null;
  const [flight, from, to, fullDate, departureTime, arrivalTime, reg] = parts;
  const iataRegex = /^[A-Z]{3}$/;
  if (!iataRegex.test(from.toUpperCase()) || !iataRegex.test(to.toUpperCase())) return null;
  const dateRegex = /^\d{2}[A-Z]{3}\d{4}$/;
  if (!dateRegex.test(fullDate.toUpperCase())) return null;
  const timeRegex = /^\d{4}$/;
  if (!timeRegex.test(departureTime) || !timeRegex.test(arrivalTime)) return null;
  const slotCodeInput = document.getElementById("slotCode").value.trim();
  const slotCodeRegex = /^[A-Z0-9]{6}$/;
  if (!slotCodeRegex.test(slotCodeInput.toUpperCase())) return null;
  return {
    flight: flight.toUpperCase(),
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    date: fullDate.slice(0, 5).toUpperCase(),
    fullDate: fullDate.toUpperCase(),
    departureTime,
    arrivalTime,
    reg: reg.toUpperCase(),
    slotCode: slotCodeInput.toUpperCase()
  };
}

function getSlotType() {
  const slotTypeSelect = document.getElementById("slotType");
  return slotTypeSelect ? slotTypeSelect.value : "NEW";
}

function buildStandardGcr(data) {
  const slotType = getSlotType();
  const depMsg = `GCR
/REG
${getIcaoCode(data.from)}
N ${data.reg} ${data.date} ${data.slotCode} ${data.departureTime}${getIcaoCode(data.from)} D
GI ${slotType} REQ ${getIcaoCode(data.from)} PPR / SLOT ID NUMBERS PLS`;
  const arrMsg = `GCR
/REG
${getIcaoCode(data.to)}
N${data.reg} ${data.date} ${data.slotCode} ${data.arrivalTime}${getIcaoCode(data.to)} D
GI ${slotType} REQ ${getIcaoCode(data.to)} PPR / SLOT ID NUMBERS PLS`;
  return { departure: depMsg, arrival: arrMsg };
}

function buildCombinedGcrForAirport(f1, f2, airport) {
  const slotType = getSlotType();
  let departureLine = "";
  let arrivalLine = "";
  if (airport === f1.from && airport === f2.to) {
    departureLine = `N ${f1.reg} ${f1.date} ${f1.slotCode} ${f1.departureTime}${getIcaoCode(f1.from)} D`;
    arrivalLine = `N${f2.reg} ${f2.date} ${f2.slotCode} ${getIcaoCode(f1.from)}${f1.arrivalTime} D`;
  } else if (airport === f1.to && airport === f2.from) {
    departureLine = `N ${f2.reg} ${f2.date} ${f2.slotCode} ${f2.departureTime}${getIcaoCode(f2.to)} D`;
    arrivalLine = `N${f1.reg} ${f1.date} ${f1.slotCode} ${getIcaoCode(f1.from)}${f1.arrivalTime} D`;
  }
  const commonICAO = getIcaoCode(airport);
  return `GCR
/REG
${commonICAO}
${departureLine}
${arrivalLine}
GI ${slotType} REQ ${commonICAO} PPR / SLOT ID NUMBERS PLS`;
}

function formatGcr() {
  const allInput = document.getElementById("userInput").value;
  const lines = allInput.split('\n').filter(line => line.trim() !== '');
  let departureOutputs = "";
  let arrivalOutputs = "";
  let errorMessages = "";
  const flights = [];

  lines.forEach((line, index) => {
    const data = parseInput(line);
    if (!data) {
      errorMessages += "Line " + (index + 1) + " is invalid.\n";
    } else {
      flights.push({ data, index });
    }
  });

  const processed = new Array(flights.length).fill(false);
  const combinedMap = {};

  for (let i = 0; i < flights.length; i++) {
    if (processed[i]) continue;
    const f1 = flights[i].data;
    let paired = false;
    for (let j = i + 1; j < flights.length; j++) {
      if (processed[j]) continue;
      const f2 = flights[j].data;
      if (
        f1.from === f2.to &&
        f1.to === f2.from &&
        f1.reg === f2.reg &&
        f1.date === f2.date &&
        f1.slotCode === f2.slotCode
      ) {
        const msgA = buildCombinedGcrForAirport(f1, f2, f1.from);
        const msgB = buildCombinedGcrForAirport(f1, f2, f1.to);
        combinedMap[f1.from] = combinedMap[f1.from] ? combinedMap[f1.from] + "\n\n" + msgA : msgA;
        combinedMap[f1.to] = combinedMap[f1.to] ? combinedMap[f1.to] + "\n\n" + msgB : msgB;
        processed[i] = true;
        processed[j] = true;
        paired = true;
        break;
      }
    }
    if (!paired) {
      const standard = buildStandardGcr(f1);
      departureOutputs += standard.departure + "\n\n";
      arrivalOutputs += standard.arrival + "\n\n";
      processed[i] = true;
    }
  }

  const userInputError = document.getElementById("userInputError");
  if (errorMessages) {
    userInputError.textContent = errorMessages;
    userInputError.style.display = "block";
  } else {
    userInputError.textContent = "";
    userInputError.style.display = "none";
  }

  const combinedParent = document.getElementById("combinedParentContainer");
  combinedParent.innerHTML = "";
  let hasCombined = false;
  for (const airport in combinedMap) {
    hasCombined = true;
    const container = document.createElement("div");
    container.className = "output-container";
    const heading = document.createElement("div");
    heading.className = "heading";
    heading.textContent = "Combined GCR for " + airport + " (" + getIcaoCode(airport) + "):";
    container.appendChild(heading);

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-button";
    copyBtn.textContent = "Copy " + airport;
    copyBtn.onclick = () => copyText(combinedMap[airport]);
    container.appendChild(copyBtn);

    const emailBtn = document.createElement("button");
    emailBtn.className = "email-button";
    emailBtn.textContent = "Send GCR Email";
    emailBtn.onclick = () => sendGcrEmail(combinedMap[airport]);
    container.appendChild(emailBtn);

    const pre = document.createElement("pre");
    pre.textContent = combinedMap[airport];
    container.appendChild(pre);

    combinedParent.appendChild(container);
  }
  combinedParent.style.display = hasCombined ? "block" : "none";

  if (departureOutputs.trim()) {
    document.getElementById("departureOutput").textContent = departureOutputs.trim();
    document.getElementById("departureContainer").style.display = "block";
  } else {
    document.getElementById("departureContainer").style.display = "none";
  }
  if (arrivalOutputs.trim()) {
    document.getElementById("arrivalOutput").textContent = arrivalOutputs.trim();
    document.getElementById("arrivalContainer").style.display = "block";
  } else {
    document.getElementById("arrivalContainer").style.display = "none";
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Failed to copy.'));
}

function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Failed to copy.'));
}

function sendGcrEmail(text) {
  const subject = "GCR Message";
  const body = text;
  window.location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
