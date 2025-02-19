import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import firebaseConfig from "./config/firebase.js"; 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

let quill, isEditing = false, currentAirportData = null;

document.addEventListener('DOMContentLoaded', () => {
  quill = new Quill('#additionalInformation', {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }]
      ]
    }
  });
});

function getNumericBox(value) {
  let bg = value === "3" ? "red" : value === "2" ? "orange" : "";
  return `<span style="width:40px;height:20px;line-height:20px;display:inline-block;text-align:center;border:1px solid black;${bg ? 'background-color:' + bg + ';' : ''}">${value}</span>`;
}

function getYesNoBox(value) {
  let bg = value.toUpperCase() === "YES" ? "green" : "";
  return `<span style="width:40px;height:20px;line-height:20px;display:inline-block;text-align:center;border:1px solid black;${bg ? 'background-color:' + bg + ';' : ''}">${value}</span>`;
}

const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') { 
  body.classList.replace('light-mode', 'dark-mode'); 
  themeToggleBtn.textContent = 'Light Mode'; 
} else { 
  body.classList.replace('dark-mode', 'light-mode'); 
  themeToggleBtn.textContent = 'Dark Mode'; 
}

function toggleTheme() {
  if (body.classList.contains('dark-mode')) {
    body.classList.replace('dark-mode', 'light-mode');
    localStorage.setItem('theme', 'light');
    themeToggleBtn.textContent = 'Dark Mode';
  } else {
    body.classList.replace('light-mode', 'dark-mode');
    localStorage.setItem('theme', 'dark');
    themeToggleBtn.textContent = 'Light Mode';
  }
}
themeToggleBtn.addEventListener('click', toggleTheme);

airportCodeInput.addEventListener('input', function() {
  this.value = this.value.toUpperCase();
});
airportCodeInput.addEventListener('keyup', function(event) {
  if (event.key === "Enter") fetchAirportData();
});

async function fetchAirportData() {
  const code = airportCodeInput.value.trim().toUpperCase();
  if (!code) {
    responseOutput.textContent = "Please enter a valid airport code.";
    return;
  }
  try {
    const snapshot = await get(ref(db, "airports/" + code));
    if (!snapshot.exists()) {
      responseOutput.textContent = `No matching airport found for code: ${code}`;
      currentAirportData = null;
      return;
    }
    const data = snapshot.val();
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
          <div class="level-value">${getYesNoBox(data.gcr)}</div>
        </div>
        <div class="level-box">
          <div class="level-title">PPR</div>
          <div class="level-value">${getYesNoBox(data.ppr)}</div>
        </div>
      </div>
      <div class="airport-additional-info">
        <div class="airport-info-title">Additional Information</div>
        <p class="airport-info-content">${data.additionalInformation || 'No additional information available.'}</p>
      </div>
    `;
  } catch (error) {
    console.error("Error fetching data:", error);
    responseOutput.textContent = "Error: " + (error.message || JSON.stringify(error));
    currentAirportData = null;
  }
}
fetchAirportBtn.addEventListener('click', fetchAirportData);

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
  airportName.value = '';
  country.value = '';
  email.value = '';
  generalEmail.value = '';
  contactNumber.value = '';
  summerLevel.value = '';
  winterLevel.value = '';
  gcr.value = '';
  ppr.value = '';
  if (quill) quill.root.innerHTML = '';
}

function populateForm(airport) {
  editAirportCode.value = airport.airportCode || '';
  airportName.value = airport.airportName || '';
  country.value = airport.country || '';
  email.value = airport.email || '';
  generalEmail.value = airport.generalEmail || '';
  contactNumber.value = airport.contactNumber || '';
  summerLevel.value = airport.summerLevel || '';
  winterLevel.value = airport.winterLevel || '';
  gcr.value = airport.gcr || '';
  ppr.value = airport.ppr || '';
  if (quill) quill.clipboard.dangerouslyPasteHTML(airport.additionalInformation || '');
}

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
    gcr: gcr.value.trim(),
    ppr: ppr.value.trim(),
    additionalInformation: quill ? quill.root.innerHTML.trim() : ''
  };
  try {
    await set(ref(db, "airports/" + code), airportData);
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
          <div class="level-value">${getYesNoBox(airportData.gcr)}</div>
        </div>
        <div class="level-box">
          <div class="level-title">PPR</div>
          <div class="level-value">${getYesNoBox(airportData.ppr)}</div>
        </div>
      </div>
      <div class="airport-additional-info">
        <div class="airport-info-title">Additional Information</div>
        <p class="airport-info-content">${airportData.additionalInformation || 'No additional information available.'}</p>
      </div>
    `;
  } catch (error) {
    console.error("Error saving data:", error);
    alert("Error saving data: " + (error.message || JSON.stringify(error)));
  }
}

document.getElementById('saveAirportBtn').addEventListener('click', saveAirportData);
