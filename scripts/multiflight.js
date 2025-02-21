/******************************************
 1) FETCH EMAIL FROM FIREBASE (with service type check)
******************************************/
async function getAirportEmail(airportCode, serviceType) {
  try {
    const snapshot = await firebase.database().ref("airports/" + airportCode).once("value");
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (serviceType === "D") {
        // For service type D, use emailGeneral if available; otherwise, fall back to email.
        return data.emailGeneral || data.email || "slotdesk@ryanair.com";
      } else {
        // For service types P, K, T, J, use the "email" field.
        return data.email || "slotdesk@ryanair.com";
      }
    } else {
      return "slotdesk@ryanair.com";
    }
  } catch (error) {
    console.error("Error fetching email from Firebase:", error);
    return "slotdesk@ryanair.com";
  }
}

/******************************************
 3) LOGGING (Historic Log)
******************************************/
const STORAGE_KEY = "historicLog";
function getHistoricLog() {
  const logData = localStorage.getItem(STORAGE_KEY);
  return logData ? JSON.parse(logData) : [];
}
function setHistoricLog(logEntries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logEntries));
}
function addLogEntry(entry) {
  const logEntries = getHistoricLog();
  logEntries.push(entry);
  setHistoricLog(logEntries);
  console.log("Log entry added:", entry);
}

/******************************************
 4) HELPER FUNCTIONS & PARSING LOGIC
******************************************/
let currentSlotType = "";
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
  const lines = input.trim().split("\n");
  const parsedEntries = [];
  for (let line of lines) {
    const parts = line.trim().split(" ");
    if (parts.length !== 7 && parts.length !== 8) {
      console.warn("Invalid input format for line:", line);
      continue;
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
    if (isNaN(parsedDate)) {
      console.warn("Invalid date for line:", line);
      continue;
    }
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
    parsedEntries.push({
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
    });
  }
  return parsedEntries;
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
function getOperationCode(option) {
  if (option === "D") return "LJ4";
  return "73H";
}
function getCurrentDate() {
  const dateObj = new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
  return `${day}${month}`;
}

/******************************************
 5) UI FEEDBACK (ERROR / SUCCESS)
******************************************/
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}
function showSuccess(message) {
  const successDiv = document.getElementById("successMessage");
  successDiv.textContent = message;
  successDiv.style.display = "block";
  setTimeout(() => {
    successDiv.style.display = "none";
  }, 5000);
}

/******************************************
 6) CORE: Format, Display, Send
******************************************/
function formatSCRMessages() {
  const input = document.getElementById("userInput").value;
  const parsedEntries = parseInput(input);
  if (parsedEntries.length === 0) {
    showError("No valid flight entries found. Please check your input.");
    return;
  }
  currentSlotType = getSlotType();
  const option = getSelectedOption();
  const codePrefix = getCodePrefix(option);
  const reg = getAircraftReg();
  const outputList = document.getElementById("outputList");
  outputList.innerHTML = "";

  // Group flights by airport
  const airportGroups = {};
  parsedEntries.forEach((data) => {
    const { from, to } = data;
    if (!airportGroups[from]) {
      airportGroups[from] = { airportCode: from, flights: [] };
    }
    airportGroups[from].flights.push({ type: 'departure', data });
    if (!airportGroups[to]) {
      airportGroups[to] = { airportCode: to, flights: [] };
    }
    airportGroups[to].flights.push({ type: 'arrival', data });
  });
  // Remove duplicate flight entries per airport
  Object.keys(airportGroups).forEach(airportCode => {
    const seen = new Set();
    airportGroups[airportCode].flights = airportGroups[airportCode].flights.filter(flightEntry => {
      const uniqueKey = flightEntry.type + flightEntry.data.flight;
      if (seen.has(uniqueKey)) {
        return false;
      } else {
        seen.add(uniqueKey);
        return true;
      }
    });
  });
  // Generate SCR message per group
  Object.values(airportGroups).forEach((group, groupIndex) => {
    const { airportCode, flights } = group;
    const scrLines = [];
    scrLines.push("SCR");
    scrLines.push("W24");
    scrLines.push(getCurrentDate());
    scrLines.push(airportCode);
    flights.forEach(flightEntry => {
      const { type, data } = flightEntry;
      const { flight, date, dayOfOperation, departureTime, arrivalTime, from, to, aircraftType } = data;
      const flightType = currentSlotType === "CANCEL SLOT" ? "D" : "N";
      let opCode;
      if (aircraftType) {
        if (option === "J") {
          if (aircraftType === "7M8") {
            opCode = "1977M8";
          } else if (aircraftType === "738" || aircraftType === "73H") {
            opCode = "18973H";
          } else {
            opCode = aircraftType;
          }
        } else {
          opCode = (aircraftType === "738" ? "73H" : (aircraftType === "197" ? "7M8" : aircraftType));
        }
      } else {
        opCode = getOperationCode(option);
      }
      if (type === 'departure') {
        if (option === "J") {
          scrLines.push(`${flightType} ${flight} ${date}${date} ${dayOfOperation} ${opCode} ${departureTime}${to} ${option}`);
        } else {
          scrLines.push(`${flightType} ${flight} ${date}${date} ${dayOfOperation} ${codePrefix}${opCode} ${departureTime}${to} ${option}`);
        }
      }
      else if (type === 'arrival') {
        if (option === "J") {
          scrLines.push(`${flightType}${flight} ${date}${date} ${dayOfOperation} ${opCode} ${from}${arrivalTime} ${option}`);
        } else {
          scrLines.push(`${flightType}${flight} ${date}${date} ${dayOfOperation} ${codePrefix}${opCode} ${from}${arrivalTime} ${option}`);
        }
      }
    });
    // SI line: build subject based on slot type
    let siLine;
    if (currentSlotType === "NEW SLOT") {
      siLine = `SI NEW SLOT REQ ${airportCode}`;
    } else {
      siLine = `SI SLOT CANX REQ ${airportCode}`;
    }
    scrLines.push(siLine);
    const scrOutput = scrLines.join("\n");
    const scrGroup = document.createElement("div");
    scrGroup.classList.add("scr-group");
    const headingDiv = document.createElement("div");
    headingDiv.classList.add("heading");
    headingDiv.textContent = `SCR [${airportCode}]`;
    const outputDiv = document.createElement("div");
    outputDiv.classList.add("output-container");
    outputDiv.innerHTML = `<pre>${scrOutput}</pre>`;
    const sendButtonContainer = document.createElement("div");
    sendButtonContainer.classList.add("send-button-container");
    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send Email";
    sendBtn.dataset.airportCode = airportCode;
    sendBtn.dataset.groupIndex = groupIndex;
    sendButtonContainer.appendChild(sendBtn);
    scrGroup.appendChild(headingDiv);
    scrGroup.appendChild(outputDiv);
    scrGroup.appendChild(sendButtonContainer);
    scrGroup.dataset.scrOutput = scrOutput;
    scrGroup.dataset.airportCode = airportCode;
    outputList.appendChild(scrGroup);
    // Log to Historic Log
    const combinedFlightNumbers = flights.map(e => e.data.flight).join(", ");
    const combinedDirections = flights.map(e => e.type).join("/");
    const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
    addLogEntry({
      flightNumber: combinedFlightNumbers,
      airport: airportCode,
      direction: combinedDirections,
      timestamp: timestamp,
      scrMessage: scrOutput
    });
  });
  showSuccess(`Formatted ${parsedEntries.length} flight(s) successfully.`);
  attachSendButtonsListeners();
}
function attachSendButtonsListeners() {
  const sendButtons = document.querySelectorAll(".scr-group .send-button-container button");
  sendButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const airportCode = button.dataset.airportCode;
      const scrOutput = button.parentElement.parentElement.dataset.scrOutput;
      await sendEmail(airportCode, scrOutput);
    });
  });
}
async function sendEmail(airportCode, scrOutput) {
  let subject;
  if (currentSlotType === "NEW SLOT") {
    subject = "NEW SLOT REQ " + airportCode;
  } else {
    subject = "SLOT CANX REQ " + airportCode;
  }
  const arrivalServiceType = document.getElementById("arrivalServiceType").value;
  const departureServiceType = document.getElementById("departureServiceType").value;
  const emailServiceType = (arrivalServiceType === "D" || departureServiceType === "D") ? "D" : arrivalServiceType;
  
  const recipientEmail = await getAirportEmail(airportCode, emailServiceType);
  const ccEmail = "slotdesk@ryanair.com";
  const emailSubject = encodeURIComponent(subject);
  const emailBody = encodeURIComponent(scrOutput);
  const mailtoLink = `mailto:${recipientEmail}?cc=${encodeURIComponent(ccEmail)}&subject=${emailSubject}&body=${emailBody}`;
  window.open(mailtoLink, '_blank');
  showSuccess(`Email for ${airportCode} has been triggered.`);
}
function sendAllEmails() {
  const outputList = document.getElementById("outputList");
  const scrGroups = outputList.getElementsByClassName("scr-group");
  if (scrGroups.length === 0) {
    showError("No SCR messages to send. Please format first.");
    return;
  }
  let emailsSent = 0;
  const totalEmails = scrGroups.length;
  Array.from(scrGroups).forEach((scrGroup, index) => {
    const airportCode = scrGroup.dataset.airportCode;
    const scrOutput = scrGroup.dataset.scrOutput;
    setTimeout(async () => {
      await sendEmail(airportCode, scrOutput);
      emailsSent += 1;
      if (emailsSent === totalEmails) {
        showSuccess("All SCR emails have been triggered.");
      }
    }, index * 1000);
  });
}
document.getElementById("formatBtn").addEventListener("click", formatSCRMessages);
document.getElementById("sendAllBtn").addEventListener("click", sendAllEmails);
