
  <!-- Firebase & JS Logic -->
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
    import { getDatabase, ref, get, set, child } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCIefgXMj...",
      authDomain: "airportsearch-d151a.firebaseapp.com",
      databaseURL: "https://airportsearch-d151a-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "airportsearch-d151a",
      storageBucket: "airportsearch-d151a.appspot.com",
      messagingSenderId: "686237913756",
      appId: "1:686237913756:web:adb3b64de1dbc0fef39359"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // DOM Elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const body = document.body;
    const airportCodeInput = document.getElementById('airportCode');
    const fetchAirportBtn = document.getElementById('fetchAirportBtn');
    const responseOutput = document.getElementById('responseOutput');
    const addAirportBtn = document.getElementById('addAirportBtn');
    const editAirportBtn = document.getElementById('editAirportBtn');
    const airportForm = document.getElementById('airportForm');
    const formTitle = document.getElementById('formTitle');
    const editAirportCode = document.getElementById('editAirportCode');
    const country = document.getElementById('country');
    const email = document.getElementById('email');
    const contactNumber = document.getElementById('contactNumber');
    const gcr = document.getElementById('gcr');
    const ppr = document.getElementById('ppr');
    const summerLevel = document.getElementById('summerLevel');
    const winterLevel = document.getElementById('winterLevel');
    const additionalInformation = document.getElementById('additionalInformation');
    const saveAirportBtn = document.getElementById('saveAirportBtn');

    let isEditing = false;
    let currentAirportData = null;

    // Helper functions to return box HTML based on value.
    function getNumericBox(value) {
      let bg = "";
      if (value === "3") {
        bg = "red";
      } else if (value === "2") {
        bg = "orange";
      }
      // For "1" or any other value, no background color.
      return `<span style="width:40px; height:20px; line-height:20px; display:inline-block; text-align:center; border:1px solid black; ${bg ? 'background-color:' + bg + ';' : ''}">${value}</span>`;
    }

    function getYesNoBox(value) {
      let bg = "";
      if (value.toUpperCase() === "YES") {
        bg = "green";
      }
      // For "NO" or any other value, no background color.
      return `<span style="width:40px; height:20px; line-height:20px; display:inline-block; text-align:center; border:1px solid black; ${bg ? 'background-color:' + bg + ';' : ''}">${value}</span>`;
    }

    /****************************************
     THEME LOGIC
    ****************************************/
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
      themeToggleBtn.textContent = 'Light Mode';
    } else {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
      themeToggleBtn.textContent = 'Dark Mode';
    }

    function toggleTheme() {
      if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = 'Dark Mode';
      } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = 'Light Mode';
      }
    }
    themeToggleBtn.addEventListener('click', toggleTheme);

    /****************************************
     FORCE UPPERCASE & LIMIT INPUT
    ****************************************/
    // Convert user input to uppercase as they type.
    airportCodeInput.addEventListener('input', function() {
      this.value = this.value.toUpperCase();
    });

    // Trigger fetch on pressing the Enter key.
    airportCodeInput.addEventListener('keyup', function(event) {
      if (event.key === "Enter") {
        fetchAirportData();
      }
    });

    /****************************************
     FETCH AIRPORT DATA
    ****************************************/
    async function fetchAirportData() {
      const code = airportCodeInput.value.trim().toUpperCase();
      if (!code) {
        responseOutput.textContent = "Please enter a valid airport code.";
        return;
      }
      try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, code));
        if (!snapshot.exists()) {
          responseOutput.textContent = `No matching airport found for code: ${code}`;
          currentAirportData = null;
          return;
        }
        const airport = snapshot.val();
        currentAirportData = { ...airport, code };
        responseOutput.innerHTML = `
          <div class="result-header">
            <strong>${airport.airportName}</strong> – ${airport.country}
          </div>
          <div class="levels">
            <div class="level-box">
              <div class="level-title">Summer</div>
              <div class="level-value">${getNumericBox(airport.summerLevel || '-')}</div>
            </div>
            <div class="level-box">
              <div class="level-title">Winter</div>
              <div class="level-value">${getNumericBox(airport.winterLevel || '-')}</div>
            </div>
            <div class="level-box">
              <div class="level-title">GCR</div>
              <div class="level-value">${getYesNoBox(airport.gcr || '-')}</div>
            </div>
            <div class="level-box">
              <div class="level-title">PPR</div>
              <div class="level-value">${getYesNoBox(airport.ppr || '-')}</div>
            </div>
          </div>
          <div class="airport-additional-info">
            <div class="airport-info-title">Additional Information</div>
            <p class="airport-info-content">
              ${airport.additionalInformation || 'No additional information available.'}
            </p>
          </div>
        `;
      } catch (error) {
        responseOutput.textContent = "Error: " + error.message;
        currentAirportData = null;
      }
    }
    fetchAirportBtn.addEventListener('click', fetchAirportData);

    /****************************************
     ADD / EDIT AIRPORT
    ****************************************/
    addAirportBtn.addEventListener('click', () => {
      isEditing = false;
      formTitle.textContent = "Add New Airport";
      clearForm();
      airportForm.style.display = 'block';
    });
    editAirportBtn.addEventListener('click', () => {
      if (!currentAirportData) {
        alert("Please search and fetch an airport first before editing.");
        return;
      }
      isEditing = true;
      formTitle.textContent = "Edit Existing Airport";
      populateForm(currentAirportData);
      airportForm.style.display = 'block';
    });

    function clearForm() {
      editAirportCode.value = '';
      country.value = '';
      email.value = '';
      contactNumber.value = '';
      gcr.value = '';
      ppr.value = '';
      summerLevel.value = '';
      winterLevel.value = '';
      additionalInformation.value = '';
    }
    function populateForm(airport) {
      editAirportCode.value = airport.airportName || '';
      country.value = airport.country || '';
      email.value = airport.email || '';
      contactNumber.value = airport.contactNumber || '';
      gcr.value = airport.gcr || '';
      ppr.value = airport.ppr || '';
      summerLevel.value = airport.summerLevel || '';
      winterLevel.value = airport.winterLevel || '';
      additionalInformation.value = airport.additionalInformation || '';
    }

    async function saveAirportData() {
      const code = editAirportCode.value.trim().toUpperCase();
      if (!code) {
        alert("Please enter an airport code.");
        return;
      }
      const airportData = {
        airportName: code,
        country: country.value.trim(),
        email: email.value.trim(),
        contactNumber: contactNumber.value.trim(),
        gcr: gcr.value.trim(),
        ppr: ppr.value.trim(),
        summerLevel: summerLevel.value.trim(),
        winterLevel: winterLevel.value.trim(),
        additionalInformation: additionalInformation.value.trim()
      };
      try {
        const dbRef = ref(db, code);
        await set(dbRef, airportData);
        alert(`Airport data for ${code} has been saved successfully.`);
        airportForm.style.display = 'none';
        if (!isEditing) {
          currentAirportData = null;
        } else {
          currentAirportData = { ...airportData, code };
          responseOutput.innerHTML = `
            <div class="result-header">
              <strong>${airportData.airportName}</strong> – ${airportData.country}
            </div>
            <div class="levels">
              <div class="level-box">
                <div class="level-title">Summer</div>
                <div class="level-value">${getNumericBox(airportData.summerLevel || '-')}</div>
              </div>
              <div class="level-box">
                <div class="level-title">Winter</div>
                <div class="level-value">${getNumericBox(airportData.winterLevel || '-')}</div>
              </div>
              <div class="level-box">
                <div class="level-title">GCR</div>
                <div class="level-value">${getYesNoBox(airportData.gcr || '-')}</div>
              </div>
              <div class="level-box">
                <div class="level-title">PPR</div>
                <div class="level-value">${getYesNoBox(airportData.ppr || '-')}</div>
              </div>
            </div>
            <div class="airport-additional-info">
              <div class="airport-info-title">Additional Information</div>
              <p class="airport-info-content">
                ${airportData.additionalInformation || 'No additional information available.'}
              </p>
            </div>
          `;
        }
      } catch (error) {
        alert("Error saving data: " + error.message);
      }
    }
    saveAirportBtn.addEventListener('click', saveAirportData);
