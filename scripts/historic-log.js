  /********************************************
     THEME TOGGLE
    ********************************************/
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'light';

    function applyTheme(theme) {
      if (theme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.checked = true;
      } else {
        body.classList.remove('dark-mode');
        themeToggle.checked = false;
      }
    }
    applyTheme(savedTheme);

    themeToggle.addEventListener('change', () => {
      if (themeToggle.checked) {
        localStorage.setItem('theme', 'dark');
        applyTheme('dark');
      } else {
        localStorage.setItem('theme', 'light');
        applyTheme('light');
      }
    });

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

    // Only entries from "today"
    function getTodayLogEntries() {
      const logEntries = getHistoricLog();
      const todayISO = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      return logEntries.filter(entry => entry.timestamp?.slice(0,10) === todayISO);
    }

    // Use this function on other pages to add entries
    function addLogEntry(entry) {
      const logEntries = getHistoricLog();
      logEntries.push(entry);
      setHistoricLog(logEntries);
      populateLogTable();
    }

    // Fill the table with today's log entries
    function populateLogTable() {
      const tableBody = document.querySelector("#logTable tbody");
      tableBody.innerHTML = "";
      const todayEntries = getTodayLogEntries();

      todayEntries.forEach((entry, index) => {
        // Main row (searchable)
        const tr = document.createElement("tr");
        tr.dataset.searchText = [
          entry.flightNumber,
          entry.airport,
          entry.direction,
          entry.timestamp
        ].join(" ").toLowerCase();

        // # Column
        const numberTd = document.createElement("td");
        numberTd.textContent = index + 1;
        tr.appendChild(numberTd);

        // Flight Number
        const flightTd = document.createElement("td");
        flightTd.textContent = entry.flightNumber;
        tr.appendChild(flightTd);

        // Airport
        const airportTd = document.createElement("td");
        airportTd.textContent = entry.airport;
        tr.appendChild(airportTd);

        // Type (Arrival/Departure)
        const typeTd = document.createElement("td");
        typeTd.textContent = entry.direction;
        tr.appendChild(typeTd);

        // Timestamp
        const timestampTd = document.createElement("td");
        timestampTd.textContent = entry.timestamp;
        tr.appendChild(timestampTd);

        // Action
        const actionTd = document.createElement("td");
        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = "Show SCR";
        actionTd.appendChild(toggleBtn);
        tr.appendChild(actionTd);

        tableBody.appendChild(tr);

        // Second row: SCR message
        const scrRow = document.createElement("tr");
        const scrTd = document.createElement("td");
        scrTd.colSpan = 6;

        const scrMessageDiv = document.createElement("div");
        scrMessageDiv.className = "scr-message";
        scrMessageDiv.textContent = entry.scrMessage || "[No SCR content found]";
        scrTd.appendChild(scrMessageDiv);
        scrRow.appendChild(scrTd);
        tableBody.appendChild(scrRow);

        // Toggle the SCR message row
        toggleBtn.addEventListener("click", function() {
          if (!scrMessageDiv.style.display || scrMessageDiv.style.display === "none") {
            scrMessageDiv.style.display = "block";
            toggleBtn.textContent = "Hide SCR";
          } else {
            scrMessageDiv.style.display = "none";
            toggleBtn.textContent = "Show SCR";
          }
        });
      });
    }

    // Filter the table rows based on the search input
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

    // Download the table as CSV (including the SCR message)
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

      const todayEntries = getTodayLogEntries();

      // CSV Header
      const header = ["Number", "Flight Number", "Airport", "Type", "Timestamp", "SCR Message"];

      // Prepare rows array
      const rows = [];
      rows.push([`Operator: ${firstName} ${lastName}`]);
      rows.push([]);
      rows.push(header);

      // Add data rows
      todayEntries.forEach((entry, index) => {
        const scrMsg = entry.scrMessage || "";
        // Escape double quotes and replace newlines so the CSV cell isn’t broken
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

      // Create a Blob and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    // Wire up event handlers
    document.getElementById("downloadCSV").addEventListener("click", downloadLogAsCSV);
    document.getElementById("searchBar").addEventListener("input", filterTable);
    window.addEventListener("DOMContentLoaded", populateLogTable);
