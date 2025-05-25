let stateCountyMap = {};

fetch('state_county_map.json')
  .then(response => response.json())
  .then(data => {
    stateCountyMap = data;
    const stateSelect = document.getElementById("stateSelect");
    Object.keys(data).forEach(state => {
      let option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      stateSelect.appendChild(option);
    });
  });

function toggleInputMode() {
  const selected = document.querySelector('input[name="locationType"]:checked').value;
  const zipInput = document.getElementById("zipCode");
  const stateSelect = document.getElementById("stateSelect");
  const countySelect = document.getElementById("countySelect");

  if (selected === "zip") {
    zipInput.disabled = false;
    zipInput.style.opacity = 1;
    stateSelect.disabled = true;
    countySelect.disabled = true;
    stateSelect.style.opacity = 0.5;
    countySelect.style.opacity = 0.5;
  } else {
    zipInput.disabled = true;
    zipInput.style.opacity = 0.5;
    stateSelect.disabled = false;
    countySelect.disabled = false;
    stateSelect.style.opacity = 1;
    countySelect.style.opacity = 1;
  }
}

function populateCounties() {
  const state = document.getElementById("stateSelect").value;
  const countySelect = document.getElementById("countySelect");
  countySelect.innerHTML = "<option value=''>Select a county</option>";
  if (stateCountyMap[state]) {
    stateCountyMap[state].forEach(county => {
      let option = document.createElement("option");
      option.value = county;
      option.textContent = county;
      countySelect.appendChild(option);
    });
  }
}

function startAssessment() {
  const selected = document.querySelector('input[name="locationType"]:checked').value;
  if (selected === "zip") {
    const zip = document.getElementById("zipCode").value;
    localStorage.setItem("location_type", "zip");
    localStorage.setItem("zip_code", zip);
  } else {
    const state = document.getElementById("stateSelect").value;
    const county = document.getElementById("countySelect").value;
    localStorage.setItem("location_type", "region");
    localStorage.setItem("state", state);
    localStorage.setItem("county", county);
  }
  window.location.href = "assessment_start.html";
}

document.addEventListener("DOMContentLoaded", () => {
  toggleInputMode();
  document.getElementById("stateSelect").addEventListener("change", populateCounties);
});