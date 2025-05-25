import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import firebaseConfig from "../config/firebase.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// UI refs
const airportCodeInput = document.getElementById('airportCode');
const fetchAirportBtn  = document.getElementById('fetchAirportBtn');
const responseOutput   = document.getElementById('responseOutput');
const addAirportBtn    = document.getElementById('addAirportBtn');
const editAirportBtn   = document.getElementById('editAirportBtn');
const airportForm      = document.getElementById('airportForm');
const formTitle        = document.getElementById('formTitle');
const editAirportCode  = document.getElementById('editAirportCode');
const editAirportICAO  = document.getElementById('editAirportICAO');
const airportName      = document.getElementById('airportName');
const country          = document.getElementById('country');
const email            = document.getElementById('email');
const generalEmail     = document.getElementById('generalEmail');
const contactNumber    = document.getElementById('contactNumber');
const summerLevel      = document.getElementById('summerLevel');
const winterLevel      = document.getElementById('winterLevel');
const gcr              = document.getElementById('gcr');
const ppr              = document.getElementById('ppr');

let quill, currentAirportData = null;

// Initialize Quill
document.addEventListener('DOMContentLoaded', () => {
  quill = new Quill('#additionalInformation', {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold','italic','underline','strike'],
        [{ list: 'ordered' },{ list: 'bullet' }],
        [{ align: [] }]
      ]
    }
  });
});

// Helpers to render levels
function getNumericBox(v) {
  const bg = v === "3" ? "red" : v === "2" ? "orange" : "";
  return `<span style="
    width:40px;height:20px;line-height:20px;
    display:inline-block;text-align:center;
    border:1px solid black;${bg?`background-color:${bg};`:''}
  ">${v}</span>`;
}
function getYesNoBox(v) {
  const bg = (v||"").toUpperCase()==="YES" ? "green" : "";
  return `<span style="
    width:40px;height:20px;line-height:20px;
    display:inline-block;text-align:center;
    border:1px solid black;${bg?`background-color:${bg};`:''}
  ">${v}</span>`;
}

// Uppercase airport code
airportCodeInput.addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});
airportCodeInput.addEventListener('keyup', e => {
  if (e.key === 'Enter') fetchAirportData();
});

// Fetch & display
async function fetchAirportData() {
  const code = airportCodeInput.value.trim().toUpperCase();
  responseOutput.innerHTML = '';  // clear old
  if (!code) {
    responseOutput.textContent = "Error 2 - PLEASE RETYPE AIRPORT CODE.";
    return;
  }
  try {
    const snap = await get(ref(db, `airports/${code}`));
    if (!snap.exists()) {
      responseOutput.textContent = `Error 1 - AIRPORT NOT FOUND: ${code}`;
      return;
    }
    const d = snap.val();
    currentAirportData = d;

    responseOutput.innerHTML = `
      <div class="result-header">
        <div class="field-row"><strong>Airport Code:</strong><span>${d.airportCode}</span></div>
        <div class="field-row"><strong>Airport ICAO:</strong><span>${d.airportIcao}</span></div>
        <div class="field-row"><strong>Airport Name:</strong><span>${d.airportName}</span></div>
        <div class="field-row"><strong>Country:</strong><span>${d.country}</span></div>
        <div class="field-row">
          <strong>Email:</strong>
          <span id="emailVal">${d.email}</span>
          <button class="copy-btn" data-copy-target="emailVal">📋</button>
        </div>
        <div class="field-row">
          <strong>General Aviation Email:</strong>
          <span id="genEmailVal">${d.generalEmail}</span>
          <button class="copy-btn" data-copy-target="genEmailVal">📋</button>
        </div>
        <div class="field-row">
          <strong>Contact Number:</strong>
          <span id="contactVal">${d.contactNumber}</span>
          <button class="copy-btn" data-copy-target="contactVal">📋</button>
        </div>
      </div>
      <div class="levels">
        <div class="level-box">
          <div class="level-title">Summer</div>
          <div class="level-value">${getNumericBox(d.summerLevel||'-')}</div>
        </div>
        <div class="level-box">
          <div class="level-title">Winter</div>
          <div class="level-value">${getNumericBox(d.winterLevel||'-')}</div>
        </div>
        <div class="level-box">
          <div class="level-title">GCR</div>
          <div class="level-value">${getYesNoBox(d.gcr)}</div>
        </div>
        <div class="level-box">
          <div class="level-title">PPR</div>
          <div class="level-value">${getYesNoBox(d.ppr)}</div>
        </div>
      </div>
      <div class="airport-additional-info">
        <div class="airport-info-title">Additional Information</div>
        <p class="airport-info-content">
          ${d.additionalInformation||'No additional information available.'}
        </p>
      </div>
    `;
  } catch (err) {
    console.error(err);
    responseOutput.textContent = `Error: ${err.message||err}`;
  }
}
fetchAirportBtn.addEventListener('click', fetchAirportData);

// Show Add/Edit form
addAirportBtn.addEventListener('click', () => {
  currentAirportData = null;
  formTitle.textContent = "Add New Airport";
  clearForm();
  airportForm.style.display = 'block';
});
editAirportBtn.addEventListener('click', () => {
  if (!currentAirportData) {
    return alert("Please fetch an airport first.");
  }
  formTitle.textContent = "Edit Existing Airport";
  populateForm(currentAirportData);
  airportForm.style.display = 'block';
});

function clearForm() {
  [ editAirportCode, editAirportICAO, airportName, country,
    email, generalEmail, contactNumber,
    summerLevel, winterLevel, gcr, ppr
  ].forEach(el => el.value = '');
  if (quill) quill.root.innerHTML = '';
}

function populateForm(a) {
  editAirportCode.value   = a.airportCode   || '';
  editAirportICAO.value   = a.airportIcao   || '';
  airportName.value       = a.airportName   || '';
  country.value           = a.country       || '';
  email.value             = a.email         || '';
  generalEmail.value      = a.generalEmail  || '';
  contactNumber.value     = a.contactNumber || '';
  summerLevel.value       = a.summerLevel   || '';
  winterLevel.value       = a.winterLevel   || '';
  gcr.value               = a.gcr           || '';
  ppr.value               = a.ppr           || '';
  if (quill) quill.clipboard.dangerouslyPasteHTML(a.additionalInformation||'');
}

// Save and re-render via fetchAirportData
async function saveAirportData() {
  const code = editAirportCode.value.trim().toUpperCase();
  if (!code) return alert("Please enter an airport code.");
  responseOutput.innerHTML = '';  // clear old

  const a = {
    airportCode:   code,
    airportIcao:   editAirportICAO.value.trim(),
    airportName:   airportName.value.trim(),
    country:       country.value.trim(),
    email:         email.value.trim(),
    generalEmail:  generalEmail.value.trim(),
    contactNumber: contactNumber.value.trim(),
    summerLevel:   summerLevel.value.trim(),
    winterLevel:   winterLevel.value.trim(),
    gcr:           gcr.value.trim(),
    ppr:           ppr.value.trim(),
    additionalInformation: quill?quill.root.innerHTML.trim():''
  };

  try {
    await set(ref(db, `airports/${code}`), a);
    alert(`Airport data for ${code} saved.`);
    airportForm.style.display = 'none';
    currentAirportData = a;
    fetchAirportData();
  } catch (err) {
    console.error(err);
    alert("Save failed: " + (err.message||err));
  }
}
document.getElementById('saveAirportBtn').addEventListener('click', saveAirportData);

// Copy-handler
document.addEventListener('click', async e => {
  if (!e.target.classList.contains('copy-btn')) return;
  const tgt = e.target.dataset.copyTarget;
  const span = document.getElementById(tgt);
  if (!span) return;
  try {
    await navigator.clipboard.writeText(span.textContent.trim());
    e.target.textContent = '✅';
    setTimeout(() => e.target.textContent = '📋', 1000);
  } catch {
    alert('Copy failed');
  }
});
