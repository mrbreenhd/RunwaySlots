/******************************************
     THEME TOGGLE LOGIC
    ******************************************/
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    function applyTheme(theme) {
      if (theme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.checked = true;
      } else {
        body.classList.remove('dark-mode');
        themeToggle.checked = false;
      }
    }
    
    themeToggle.addEventListener('change', () => {
      if (themeToggle.checked) {
        localStorage.setItem('theme', 'dark');
        applyTheme('dark');
      } else {
        localStorage.setItem('theme', 'light');
        applyTheme('light');
      }
    });
    
    /******************************************
     1) FETCH emails.json FROM GITHUB PAGES
    ******************************************/
    let airportData = {};
    window.addEventListener("DOMContentLoaded", () => {
      fetch("assets/emails.json")
        .then(response => response.json())
        .then(data => {
          airportData = data;
          console.log("Loaded airport data:", airportData);
        })
        .catch(error => {
          console.error("Error loading emails.json:", error);
        });
    });
    
    function getAirportEmail(airportCode) {
      if (airportData[airportCode]) {
        return airportData[airportCode].email;
      }
      return "slotdesk@ryanair.com";
    }
    
    /******************************************
     2) EXISTING LOGIC & HELPER FUNCTIONS
    ******************************************/
    let currentSlotType = "";
    let currentDepartureAirport = "";
    let currentArrivalAirport = "";
    
    function getDayOfOperation(dayOfWeek) {
      const dayMapping = {
        "Sunday":    "0000007",
        "Monday":    "1000000",
        "Tuesday":   "0200000",
        "Wednesday": "0030000",
        "Thursday":  "0004000",
        "Friday":    "0000500",
        "Saturday":  "0000060"
      };
      return dayMapping[dayOfWeek] || "1000000";
    }
    
    function parseInput(input) {
      const parts = input.trim().split(" ");
      if (parts.length !== 7 && parts.length !== 8) {
        return null;
      }
      const flightRaw = parts[0];
      const from = parts[1];
      const to = parts[2];
      const date = parts[3].slice(0, 5);
      const fullDate = parts[3];
      const departureTime = parts[4];
      const arrivalTime = parts[5];
      const code = parts[6];
      let aircraftType = null;
      if (parts.length === 8) {
        aircraftType = parts[7];
      }
    
      const parsedDate = new Date(fullDate);
      const dayOfWeek = parsedDate.toLocaleDateString("en-US", { weekday: "long" });
      const dayOfOperation = getDayOfOperation(dayOfWeek);
    
      const flightPrefix = flightRaw.slice(0, 2);
      let flightNumber = flightRaw.slice(2);
      const flightDigits = flightNumber.match(/\d+/)?.[0] || "";
      let flightLetters = flightNumber.replace(/\d+/g, "");
      if (flightLetters.endsWith("P")) {
        flightLetters = flightLetters.slice(0, -1);
      }
      const paddedFlightDigits = flightDigits.padStart(3, "0");
      const flight = `${flightPrefix}${paddedFlightDigits}${flightLetters}`;
    
      return {
        flight,
        from,
        to,
        date,
        fullDate,
        departureTime,
        arrivalTime,
        code,
        dayOfOperation,
        aircraftType
      };
    }
    
    function getSelectedOption() {
      return document.getElementById("dropdownMenu").value;
    }
    function getSlotType() {
      const val = document.getElementById("slotType").value;
      return val === "NEW" ? "NEW SLOT" : "CANCEL SLOT";
    }
    function getAircraftReg() {
      const regInput = document.getElementById("regInput").value.trim();
      return regInput || "[UNKNOWN REG]";
    }
    function getCodePrefix(option) {
      switch (option) {
        case "P":
        case "T":
        case "K":
          return "000";
        case "J":
          return "189";
        case "D":
          return "008";
        default:
          return "000";
      }
    }
    
    function getOpCodeSingle(defaultOp, aircraftType) {
      const option = getSelectedOption();
      if (option === "J") {
        if (aircraftType === "7M8") {
          return "1977M8";
        } else if (aircraftType === "738" || aircraftType === "73H") {
          return "18973H";
        } else {
          return aircraftType || defaultOp;
        }
      } else {
        if (aircraftType) {
          if (aircraftType === "738") return "00073H";
          if (aircraftType === "7M8") return "0007M8";
          return aircraftType; 
        } else {
          return getCodePrefix(option) + defaultOp;
        }
      }
    }
    
    function hideAllContainers() {
      document.getElementById("departureContainer").style.display = "none";
      document.getElementById("arrivalContainer").style.display = "none";
      document.getElementById("departureOutput").textContent = "";
      document.getElementById("arrivalOutput").textContent = "";
    }
    
    /******************************************
     3) DEPARTURE FORMAT
    ******************************************/
    function formatDeparture() {
      hideAllContainers();
      const input = document.getElementById("userInput").value;
      const data = parseInput(input);
      if (!data) {
        alert("Error: Invalid input format. Make sure you have 7 or 8 parts.");
        return;
      }
      currentSlotType = getSlotType();
      currentDepartureAirport = data.from;
    
      document.getElementById("departureHeading").textContent = `Departure [${data.from}]`;
      document.getElementById("arrivalHeading").textContent = `Arrival [${data.to}]`;
    
      const { flight, from, to, date, departureTime, dayOfOperation, aircraftType } = data;
      const option = getSelectedOption();
      const opCode = getOpCodeSingle("73H", aircraftType);
      const reg = getAircraftReg();
      const flightType = currentSlotType === "CANCEL SLOT" ? "D" : "N";
    
      const siLine = option === "D"
        ? `SI ${currentSlotType} REQ ${from} // LEARJET REG: ${reg}`
        : `SI ${currentSlotType} REQ ${from}`;
    
      const output = `
SCR 
W24 
${date} 
${from} 
${flightType} ${flight} ${date}${date} ${dayOfOperation} ${opCode} ${departureTime}${to} ${option} 
${siLine}
      `.trim();
    
      document.getElementById("departureOutput").textContent = output;
      document.getElementById("departureContainer").style.display = "block";
    }
    
    /******************************************
     4) ARRIVAL FORMAT
    ******************************************/
    function formatArrival() {
      hideAllContainers();
      const input = document.getElementById("userInput").value;
      const data = parseInput(input);
      if (!data) {
        alert("Error: Invalid input format. Make sure you have 7 or 8 parts.");
        return;
      }
      currentSlotType = getSlotType();
      currentArrivalAirport = data.to;
    
      document.getElementById("departureHeading").textContent = `Departure [${data.from}]`;
      document.getElementById("arrivalHeading").textContent = `Arrival [${data.to}]`;
    
      const { flight, from, to, date, arrivalTime, dayOfOperation, aircraftType } = data;
      const option = getSelectedOption();
      const opCode = getOpCodeSingle("73H", aircraftType);
      const reg = getAircraftReg();
      const flightType = currentSlotType === "CANCEL SLOT" ? "D" : "N";
    
      const siLine = option === "D"
        ? `SI ${currentSlotType} REQ ${to} // LEARJET REG: ${reg}`
        : `SI ${currentSlotType} REQ ${to}`;
    
      const output = `
SCR 
W24 
${date} 
${to} 
${flightType}${flight} ${date}${date} ${dayOfOperation} ${opCode} ${from}${arrivalTime} ${option} 
${siLine}
      `.trim();
    
      document.getElementById("arrivalOutput").textContent = output;
      document.getElementById("arrivalContainer").style.display = "block";
    }
    
    /******************************************
     5) BOTH FORMAT
    ******************************************/
    function formatBoth() {
      hideAllContainers();
      const input = document.getElementById("userInput").value;
      const data = parseInput(input);
      if (!data) {
        alert("Error: Invalid input format. Make sure you have 7 or 8 parts.");
        return;
      }
      currentSlotType = getSlotType();
      currentDepartureAirport = data.from;
      currentArrivalAirport = data.to;
    
      document.getElementById("departureHeading").textContent = `Departure [${data.from}]`;
      document.getElementById("arrivalHeading").textContent = `Arrival [${data.to}]`;
    
      const { flight, from, to, date, departureTime, arrivalTime, dayOfOperation, aircraftType } = data;
      const option = getSelectedOption();
      const opCode = getOpCodeSingle("73H", aircraftType);
      const reg = getAircraftReg();
      const flightType = currentSlotType === "CANCEL SLOT" ? "D" : "N";
    
      const departureSiLine = option === "D"
        ? `SI ${currentSlotType} REQ ${from} // LEARJET REG: ${reg}`
        : `SI ${currentSlotType} REQ ${from}`;
    
      const departureOutputStr = `
SCR 
W24 
${date} 
${from} 
${flightType} ${flight} ${date}${date} ${dayOfOperation} ${opCode} ${departureTime}${to} ${option} 
${departureSiLine}
      `.trim();
    
      const arrivalSiLine = option === "D"
        ? `SI ${currentSlotType} REQ ${to} // LEARJET REG: ${reg}`
        : `SI ${currentSlotType} REQ ${to}`;
    
      const arrivalOutputStr = `
SCR 
W24 
${date} 
${to} 
${flightType}${flight} ${date}${date} ${dayOfOperation} ${opCode} ${from}${arrivalTime} ${option} 
${arrivalSiLine}
      `.trim();
    
      document.getElementById("departureOutput").textContent = departureOutputStr;
      document.getElementById("arrivalOutput").textContent = arrivalOutputStr;
      document.getElementById("departureContainer").style.display = "block";
      document.getElementById("arrivalContainer").style.display = "block";
    }
    
    /******************************************
     6) SEND EMAIL
    ******************************************/
    function sendEmail(type) {
      let output = "";
      let subject = "";
      let airportCode = "";
    
      if (type === "departure") {
        output = document.getElementById("departureOutput").textContent.trim();
        if (!output) {
          alert("No DEPARTURE SCR message found. Please format again.");
          return;
        }
        airportCode = currentDepartureAirport;
        subject = `${currentSlotType} REQ ${airportCode}`;
      } else {
        output = document.getElementById("arrivalOutput").textContent.trim();
        if (!output) {
          alert("No ARRIVAL SCR message found. Please format again.");
          return;
        }
        airportCode = currentArrivalAirport;
        subject = `${currentSlotType} REQ ${airportCode}`;
      }
      const recipientEmail = getAirportEmail(airportCode);
      const ccEmail = "slotdesk@ryanair.com";
      const emailSubject = encodeURIComponent(subject);
      const emailBody = encodeURIComponent(output);
      const mailtoLink = `mailto:${recipientEmail}?cc=${ccEmail}&subject=${emailSubject}&body=${emailBody}`;
      window.location.href = mailtoLink;
    }
