 /********************************************
     HELPER: Format Date as ddMMM (e.g. "08FEB")
    ********************************************/
    function formatDate(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const month = monthNames[date.getMonth()];
      return day + month;
    }

    /********************************************
     LOGIC FOR HISTORIC LOG
    ********************************************/
    const STORAGE_KEY = "historicLog";

    function getHistoricLog() {
      const logData = localStorage.getItem(STORAGE_KEY);
      return logData ? JSON.parse(logData) : [];
    }
    function setHistoricLog(logEntries) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logEntries));
    }

    // Returns displayed log entries along with their index in the main log array.
    // It also filters by fromDate, toDate, serviceType, and flightType.
    function getDisplayedLogEntries() {
      const allEntries = getHistoricLog();
      const fromDate = document.getElementById('fromDate').value;
      const toDate = document.getElementById('toDate').value;
      const serviceType = document.getElementById('serviceType').value;
      const flightType = document.getElementById('flightType').value;
      let displayed = [];
      allEntries.forEach((entry, idx) => {
        let include = true;
        if (fromDate && (!entry.timestamp || entry.timestamp.slice(0,10) < fromDate)) {
          include = false;
        }
        if (toDate && (!entry.timestamp || entry.timestamp.slice(0,10) > toDate)) {
          include = false;
        }
        if (serviceType && serviceType !== "all" && (!entry.direction || entry.direction.toUpperCase() !== serviceType.toUpperCase())) {
          include = false;
        }
        if (flightType && flightType !== "all") {
          if (!entry.flightType || entry.flightType.toLowerCase() !== flightType.toLowerCase()) {
            include = false;
          }
        }
        if (include) {
          displayed.push({ data: entry, index: idx });
        }
      });
      return displayed;
    }

    // Use this function on other pages to add entries
    function addLogEntry(entry) {
      const logEntries = getHistoricLog();
      logEntries.push(entry);
      setHistoricLog(logEntries);
      populateLogTable();
    }

    // Global variable to store which log entry is being edited for SCR changes
    let currentScrIndex = null;

    // Populate the table with displayed log entries.
    // For each entry, add three buttons:
    // 1. "Show SCR" / "Hide SCR" toggle button
    // 2. "Cancel SCR" button (now disabled)
    // 3. "Change SCR" button to update the SCR message using a modal with a pre-filled template.
    function populateLogTable() {
      const tableBody = document.querySelector("#logTable tbody");
      tableBody.innerHTML = "";

      const displayedEntries = getDisplayedLogEntries();
      displayedEntries.forEach((entryObj, displayIndex) => {
        const entry = entryObj.data;
        const globalIndex = entryObj.index;

        // Main row (searchable)
        const tr = document.createElement("tr");
        tr.dataset.searchText = [
          entry.flightNumber,
          entry.airport,
          entry.direction,
          entry.timestamp
        ].join(" ").toLowerCase();
        // Also store the global index for updating purposes
        tr.dataset.index = globalIndex;

        // # Column
        const numberTd = document.createElement("td");
        numberTd.textContent = displayIndex + 1;
        tr.appendChild(numberTd);

        // Flight Number
        const flightTd = document.createElement("td");
        flightTd.textContent = entry.flightNumber;
        tr.appendChild(flightTd);

        // Airport
        const airportTd = document.createElement("td");
        airportTd.textContent = entry.airport;
        tr.appendChild(airportTd);

        // Type (Arrival/Departure or Service Type)
        const typeTd = document.createElement("td");
        typeTd.textContent = entry.direction;
        tr.appendChild(typeTd);

        // Timestamp
        const timestampTd = document.createElement("td");
        timestampTd.textContent = entry.timestamp;
        tr.appendChild(timestampTd);

        // Action cell: add three buttons
        const actionTd = document.createElement("td");
        
        // Toggle SCR button
        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = "Show SCR";
        actionTd.appendChild(toggleBtn);
        
        // Cancel SCR button (disabled)
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel SCR";
        cancelBtn.disabled = true;
        actionTd.appendChild(cancelBtn);
        
        // Change SCR button
        const changeBtn = document.createElement("button");
        changeBtn.textContent = "Change SCR";
        actionTd.appendChild(changeBtn);
        
        tr.appendChild(actionTd);
        tableBody.appendChild(tr);

        // Second row: SCR message row
        const scrRow = document.createElement("tr");
        const scrTd = document.createElement("td");
        scrTd.colSpan = 6;
        const scrMessageDiv = document.createElement("div");
        scrMessageDiv.className = "scr-message";
        scrMessageDiv.textContent = entry.scrMessage || "[No SCR content found]";
        scrTd.appendChild(scrMessageDiv);
        scrRow.appendChild(scrTd);
        tableBody.appendChild(scrRow);

        // Toggle SCR message visibility when "Show SCR" is clicked.
        toggleBtn.addEventListener("click", function() {
          if (!scrMessageDiv.style.display || scrMessageDiv.style.display === "none") {
            scrMessageDiv.style.display = "block";
            toggleBtn.textContent = "Hide SCR";
          } else {
            scrMessageDiv.style.display = "none";
            toggleBtn.textContent = "Show SCR";
          }
        });

        // Change SCR: open the Change SCR modal with a pre-filled template.
        changeBtn.addEventListener("click", function() {
          currentScrIndex = globalIndex;
          const logs = getHistoricLog();
          const original = logs[globalIndex].scrMessage || "[No original SCR]";
          // Extract original SCR info from line 5 if available:
          let originalInfo = "";
          const originalLines = original.split("\n");
          if (originalLines.length >= 5) {
            originalInfo = originalLines[4].trim();
          } else {
            originalInfo = original;
          }
          // Use current date and log entry's airport for dynamic values:
          const currentDate = formatDate(new Date());
          const airportCode = logs[globalIndex].airport || "UNK";
          // Build the dynamic template:
          const template = "SCR\n" +
                           "W24\n" +
                           currentDate + "\n" +
                           airportCode + "\n" +
                           "C " + originalInfo + "\n" +
                           "R \n\n" +
                           "SI SLOT CHG REQ " + airportCode;
          document.getElementById("changeScrTextarea").value = template;
          document.getElementById("changeScrModal").style.display = "block";
        });
      });
    }

    // Filter the table rows based on the search input.
    function filterTable() {
      const searchTerm = document.getElementById("searchBar").value.trim().toLowerCase();
      const tableBody = document.querySelector("#logTable tbody");
      const rows = tableBody.querySelectorAll("tr[data-search-text]");
      rows.forEach(row => {
        if (row.dataset.searchText.includes(searchTerm)) {
          row.style.display = "";
          // If SCR message is toggled open, show its row too
          const nextRow = row.nextElementSibling;
          if (nextRow && nextRow.querySelector(".scr-message").style.display !== "none") {
            nextRow.style.display = "";
          }
        } else {
          row.style.display = "none";
          // Also hide the SCR row
          const nextRow = row.nextElementSibling;
          if (nextRow) nextRow.style.display = "none";
        }
      });
    }

    // Download the table as CSV (including the SCR message).
    function downloadLogAsCSV() {
      const firstName = document.getElementById("firstName").value.trim();
      const lastName  = document.getElementById("lastName").value.trim();

      if (!firstName || !lastName) {
        alert("Please enter both your first and last name before downloading the CSV.");
        return;
      }

      // Create operator initials
      const operatorInitials = (firstName[0] + lastName[0]).toUpperCase();

      // Current UTC date/time for filename
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const filename = `${year}${month}${day}${hours}${minutes}_${operatorInitials}.csv`;

      // Use filtered entries if any filter is set; otherwise, use all historic entries.
      const fromDate = document.getElementById('fromDate').value;
      const toDate = document.getElementById('toDate').value;
      const serviceType = document.getElementById('serviceType').value;
      const flightType = document.getElementById('flightType').value;
      let entries;
      if(fromDate || toDate || (serviceType && serviceType !== "all") || (flightType && flightType !== "all")){
        entries = getDisplayedLogEntries().map(item => item.data);
      } else {
        entries = getHistoricLog();
      }

      // CSV Header
      const header = ["Number", "Flight Number", "Airport", "Type", "Timestamp", "SCR Message"];

      // Prepare rows array
      const rows = [];
      rows.push([`Operator: ${firstName} ${lastName}`]);
      rows.push([]);
      rows.push(header);

      // Add data rows
      entries.forEach((entry, index) => {
        const scrMsg = entry.scrMessage || "";
        const safeScrMsg = scrMsg
          .replace(/"/g, '""')
          .replace(/\r?\n/g, '\\n')
          .replace(/\r/g, '\\n');
        rows.push([
          index + 1,
          entry.flightNumber || "",
          entry.airport || "",
          entry.direction || "",
          entry.timestamp || "",
          `"${safeScrMsg}"`
        ]);
      });

      const csvContent = rows.map(row => row.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    /********************************************
     EVENT LISTENERS FOR MODALS
    ********************************************/
    // Filter Modal: Open/Close/Apply/Clear
    document.getElementById('openFilterModal').addEventListener('click', () => {
      document.getElementById('filterModal').style.display = 'block';
    });
    document.querySelector('#filterModal .close').addEventListener('click', () => {
      document.getElementById('filterModal').style.display = 'none';
    });
    document.getElementById('applyFilters').addEventListener('click', () => {
      populateLogTable();
      document.getElementById('filterModal').style.display = 'none';
    });
    document.getElementById('clearFilters').addEventListener('click', () => {
      document.getElementById('fromDate').value = "";
      document.getElementById('toDate').value = "";
      document.getElementById('serviceType').value = "all";
      document.getElementById('flightType').value = "all";
      populateLogTable();
      document.getElementById('filterModal').style.display = 'none';
    });

    // Change SCR Modal: "Send Email" (formerly "Save Changes")
    document.getElementById("saveScrChanges").addEventListener("click", function() {
      const newScr = document.getElementById("changeScrTextarea").value;
      if (currentScrIndex !== null) {
        const logs = getHistoricLog();
        logs[currentScrIndex].scrMessage = newScr;
        setHistoricLog(logs);
        populateLogTable();
        const flightNumber = logs[currentScrIndex].flightNumber || "";
        const subject = encodeURIComponent("SCR Change Request for " + flightNumber);
        const body = encodeURIComponent(newScr);
        window.location.href = "mailto:?subject=" + subject + "&body=" + body;
        currentScrIndex = null;
        document.getElementById("changeScrModal").style.display = "none";
      }
    });
    document.getElementById("cancelScrChanges").addEventListener("click", function() {
      currentScrIndex = null;
      document.getElementById("changeScrModal").style.display = "none";
    });
    document.getElementById("changeScrClose").addEventListener("click", function() {
      currentScrIndex = null;
      document.getElementById("changeScrModal").style.display = "none";
    });

    // Wire up search and CSV download events
    document.getElementById("downloadCSV").addEventListener("click", downloadLogAsCSV);
    document.getElementById("searchBar").addEventListener("input", filterTable);

    // On DOMContentLoaded, simply populate the table with stored logs.
    window.addEventListener("DOMContentLoaded", () => {
      populateLogTable();
    });
