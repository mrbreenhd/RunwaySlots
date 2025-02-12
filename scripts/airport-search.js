import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    // Supabase configuration
    const SUPABASE_URL = "https://fzroaxztagtlutsrguwe.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cm9heHp0YWd0bHV0c3JndXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxMzUwNDYsImV4cCI6MjA1NDcxMTA0Nn0.-df5nDsmZ7HcA2wRHoVFmpZS4ZX5IlqY7nYzYYBrnks";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const airportName = document.getElementById('airportName');
    const country = document.getElementById('country');
    const email = document.getElementById('email');
    const generalEmail = document.getElementById('generalEmail');
    const contactNumber = document.getElementById('contactNumber');
    const summerLevel = document.getElementById('summerLevel');
    const winterLevel = document.getElementById('winterLevel');
    const gcr = document.getElementById('gcr');
    const ppr = document.getElementById('ppr');
    const additionalInformation = document.getElementById('additionalInformation');
    const saveAirportBtn = document.getElementById('saveAirportBtn');

    let isEditing = false;
    let currentAirportData = null;

    // Helper function to return a styled numeric box.
    function getNumericBox(value) {
      let bg = "";
      if (value === "3") {
        bg = "red";
      } else if (value === "2") {
        bg = "orange";
      }
      return `<span style="width:40px; height:20px; line-height:20px; display:inline-block; text-align:center; border:1px solid black; ${bg ? 'background-color:' + bg + ';' : ''}">${value}</span>`;
    }

    // Helper function to return a styled Yes/No box.
    function getYesNoBox(value) {
      let bg = "";
      if (value.toUpperCase() === "YES") {
        bg = "green";
      }
      return `<span style="width:40px; height:20px; line-height:20px; display:inline-block; text-align:center; border:1px solid black; ${bg ? 'background-color:' + bg + ';' : ''}">${value}</span>`;
    }

    // Theme logic
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

    // Force uppercase for the airport code input
    airportCodeInput.addEventListener('input', function() {
      this.value = this.value.toUpperCase();
    });

    // Fetch data on pressing the Enter key
    airportCodeInput.addEventListener('keyup', function(event) {
      if (event.key === "Enter") {
        fetchAirportData();
      }
    });

    // Fetch airport data from the "airportinfo" table
    async function fetchAirportData() {
      const code = airportCodeInput.value.trim().toUpperCase();
      if (!code) {
        responseOutput.textContent = "Please enter a valid airport code.";
        return;
      }
      try {
        const { data, error } = await supabase
          .from("airportinfo")
          .select("*")
          .eq("airportCode", code)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          responseOutput.textContent = `No matching airport found for code: ${code}`;
          currentAirportData = null;
          return;
        }
        currentAirportData = data;
        responseOutput.innerHTML = `
          <div class="result-header">
            <div><strong>Airport Code:</strong> ${data.airportCode}</div>
            <div><strong>Airport Name:</strong> ${data.airportName}</div>
            <div><strong>Country:</strong> ${data.country}</div>
            <div><strong>Email:</strong> ${data.email}</div>
            <div><strong>General Aviation Email:</strong> ${data.generalEmail}</div>
            <div><strong>Contact Number:</strong> ${data.contactNumber}</div>
          </div>
          <div class="levels">
            <div class="level-box">
              <div class="level-title">Summer</div>
              <div class="level-value">${getNumericBox(data.summerLevel || '-')}</div>
            </div>
            <div class="level-box">
              <div class="level-title">Winter</div>
              <div class="level-value">${getNumericBox(data.winterLevel || '-')}</div>
            </div>
            <div class="level-box">
              <div class="level-title">GCR</div>
              <div class="level-value">${getYesNoBox(data.gcr ? "YES" : "NO")}</div>
            </div>
            <div class="level-box">
              <div class="level-title">PPR</div>
              <div class="level-value">${getYesNoBox(data.ppr ? "YES" : "NO")}</div>
            </div>
          </div>
          <div class="airport-additional-info">
            <div class="airport-info-title">Additional Information</div>
            <p class="airport-info-content">
              ${data.additionalInformation || 'No additional information available.'}
            </p>
          </div>
        `;
      } catch (error) {
        console.error("Error fetching data:", error);
        responseOutput.textContent = "Error: " + (error.message || JSON.stringify(error));
        currentAirportData = null;
      }
    }
    fetchAirportBtn.addEventListener('click', fetchAirportData);

    // Show form for adding a new airport
    addAirportBtn.addEventListener('click', () => {
      isEditing = false;
      formTitle.textContent = "Add New Airport";
      clearForm();
      airportForm.style.display = 'block';
    });

    // Show form for editing an existing airport
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

    // Clear the form fields
    function clearForm() {
      editAirportCode.value = '';
      airportName.value = '';
      country.value = '';
      email.value = '';
      generalEmail.value = '';
      contactNumber.value = '';
      summerLevel.value = '';
      winterLevel.value = '';
      gcr.value = '';
      ppr.value = '';
      additionalInformation.value = '';
    }

    // Populate the form fields with data from an existing record
    function populateForm(airport) {
      editAirportCode.value = airport.airportCode || '';
      airportName.value = airport.airportName || '';
      country.value = airport.country || '';
      email.value = airport.email || '';
      generalEmail.value = airport.generalEmail || '';
      contactNumber.value = airport.contactNumber || '';
      summerLevel.value = airport.summerLevel || '';
      winterLevel.value = airport.winterLevel || '';
      gcr.value = airport.gcr ? "YES" : "NO";
      ppr.value = airport.ppr ? "YES" : "NO";
      additionalInformation.value = airport.additionalInformation || '';
    }

    // Save airport data by upserting into the "airportinfo" table
    async function saveAirportData() {
      const code = editAirportCode.value.trim().toUpperCase();
      if (!code) {
        alert("Please enter an airport code.");
        return;
      }
      const airportData = {
        airportCode: code,
        airportName: airportName.value.trim(),
        country: country.value.trim(),
        email: email.value.trim(),
        generalEmail: generalEmail.value.trim(),
        contactNumber: contactNumber.value.trim(),
        summerLevel: summerLevel.value.trim(),
        winterLevel: winterLevel.value.trim(),
        gcr: (gcr.value.trim().toUpperCase() === "YES"),
        ppr: (ppr.value.trim().toUpperCase() === "YES"),
        additionalInformation: additionalInformation.value.trim()
      };
      try {
        const { data, error } = await supabase
          .from("airportinfo")
          .upsert(airportData, { onConflict: "airportCode" });
        if (error) throw error;
        alert(`Airport data for ${code} has been saved successfully.`);
        airportForm.style.display = 'none';
        currentAirportData = airportData;
        responseOutput.innerHTML = `
          <div class="result-header">
            <div><strong>Airport Code:</strong> ${airportData.airportCode}</div>
            <div><strong>Airport Name:</strong> ${airportData.airportName}</div>
            <div><strong>Country:</strong> ${airportData.country}</div>
            <div><strong>Email:</strong> ${airportData.email}</div>
            <div><strong>General Aviation Email:</strong> ${airportData.generalEmail}</div>
            <div><strong>Contact Number:</strong> ${airportData.contactNumber}</div>
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
              <div class="level-value">${getYesNoBox(airportData.gcr ? "YES" : "NO")}</div>
            </div>
            <div class="level-box">
              <div class="level-title">PPR</div>
              <div class="level-value">${getYesNoBox(airportData.ppr ? "YES" : "NO")}</div>
            </div>
          </div>
          <div class="airport-additional-info">
            <div class="airport-info-title">Additional Information</div>
            <p class="airport-info-content">
              ${airportData.additionalInformation || 'No additional information available.'}
            </p>
          </div>
        `;
      } catch (error) {
        console.error("Error saving data:", error);
        alert("Error saving data: " + (error.message || JSON.stringify(error)));
      }
    }
    saveAirportBtn.addEventListener('click', saveAirportData);
