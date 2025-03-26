    /************************************************
     IATA TO ICAO 
    ************************************************/
    const iataToIcao = {
      STN: "EGSS",
      PMI: "LEPA",
      VIE: "LOWW",
      CPH: "EKCH",
      BGY: "LIME",
      BER: "EDDB",
      SKG: "LGTS",
      TIA: "LATI",
      FRA: "EDDF",
      HHN: "EDDF",
      HAM: "EDDH",
      CGN: "EDDK",
      CIA: "LIRA",
      AMS: "EHAM",
      EIN: "EHEH",
      AYT: "LTAI",
      RHO: "LGRP",
      KGS: "LGKO",
      JTR: "LGSR",
      ESB: "LTAC",
      ATH: "LGAV",
      JSI: "LGSK",
      ZTH: "LGZA",
      CFU: "LGKR",
      KSO: "LGKA",
      BRU: "EBBR",
      // add more if needed
    };
    function getIcaoCode(iataCode) {
      return iataToIcao[iataCode.toUpperCase()] || iataCode.toUpperCase();
    }
    function parseInput(input) {
      const parts = input.trim().split(/\s+/);
      const userInputError = document.getElementById("userInputError");
      const slotCodeError = document.getElementById("slotCodeError");
      userInputError.textContent = "";
      userInputError.style.display = "none";
      slotCodeError.textContent = "";
      slotCodeError.style.display = "none";
      if (parts.length !== 7) {
        userInputError.textContent = "Input must have exactly 7 parts.";
        userInputError.style.display = "block";
        return null;
      }
      const [flight, from, to, fullDate, departureTime, arrivalTime, reg] = parts;
      const iataRegex = /^[A-Z]{3}$/;
      if (!iataRegex.test(from.toUpperCase()) || !iataRegex.test(to.toUpperCase())) {
        userInputError.textContent = "Departure/Arrival IATA codes must be three uppercase letters.";
        userInputError.style.display = "block";
        return null;
      }
      const dateRegex = /^\d{2}[A-Z]{3}\d{4}$/;
      if (!dateRegex.test(fullDate.toUpperCase())) {
        userInputError.textContent = "Date must be DDMMMYYYY (e.g., 29DEC2025).";
        userInputError.style.display = "block";
        return null;
      }
      const timeRegex = /^\d{4}$/;
      if (!timeRegex.test(departureTime) || !timeRegex.test(arrivalTime)) {
        userInputError.textContent = "Times must be HHMM (e.g., 1230).";
        userInputError.style.display = "block";
        return null;
      }
      const slotCodeInput = document.getElementById("slotCode").value.trim();
      const slotCodeRegex = /^[A-Z0-9]{6}$/;
      if (!slotCodeRegex.test(slotCodeInput.toUpperCase())) {
        slotCodeError.textContent = "Slot Code must be 6 alphanumeric chars (e.g., 008L45).";
        slotCodeError.style.display = "block";
        return null;
      }
      return {
        flight: flight.toUpperCase(),
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        date: fullDate.slice(0, 5).toUpperCase(),
        fullDate: fullDate.toUpperCase(),
        departureTime,
        arrivalTime,
        reg: reg.toUpperCase(),
        slotCode: slotCodeInput.toUpperCase(),
      };
    }
    function getSlotType() {
      const slotTypeSelect = document.getElementById("slotType");
      return slotTypeSelect ? slotTypeSelect.value : "NEW";
    }
    function buildGcr(data) {
      const { reg, date, slotCode, departureTime, arrivalTime, from, to } = data;
      const departureIcao = getIcaoCode(from);
      const arrivalIcao = getIcaoCode(to);
      const slotType = getSlotType();
      // Constructing a sample GCR format (adjust as needed)
      const flightLine2 = `N ${reg} ${date} ${slotCode} ${departureTime}${arrivalIcao} D`;
      const flightLine1 = `N${reg} ${date} ${slotCode} ${arrivalIcao}${arrivalTime} D`;
      return `GCR
/REG
${departureIcao}
${flightLine2}
${flightLine1}
GI ${slotType} REQ ${departureIcao} PPR / SLOT ID NUMBERS PLS`;
    }
    function formatGcr() {
      const data = parseInput(document.getElementById("userInput").value);
      if (!data) return;
      const gcrOutputStr = buildGcr(data);
      document.getElementById("gcrOutput").textContent = gcrOutputStr;
      document.getElementById("gcrContainer").style.display = "block";
    }
    function copyToClipboard(elementId) {
      const text = document.getElementById(elementId).textContent;
      navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard!'))
        .catch(err => showToast('Failed to copy.'));
    }
    function downloadGcr(elementId) {
      const text = document.getElementById(elementId).textContent;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GCR_${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
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
