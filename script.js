let stateCountyMap = {};

fetch('state_county_map.json')
  .then(response => response.json())
  .then(data => {
    stateCountyMap = data;
    const stateSelect = document.getElementById("stateSelect");
    Object.keys(data).forEach(state => {
      let option = document.createElement("option");
      option.value = state;
      option.text = state;
      stateSelect.appendChild(option);
    });
  });

function toggleInputMode() {
  const zipInput = document.getElementById("zipCode");
  const stateSelect = document.getElementById("stateSelect");
  const countySelect = document.getElementById("countySelect");
  const selectedMode = document.querySelector('input[name="locationType"]:checked').value;
  if (selectedMode === "zip") {
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
  if (state && stateCountyMap[state]) {
    stateCountyMap[state].forEach(county => {
      let option = document.createElement("option");
      option.value = county;
      option.text = county;
      countySelect.appendChild(option);
    });
  }
}

function startAssessment() {
  const selectedMode = document.querySelector('input[name="locationType"]:checked').value;
  if (selectedMode === "zip") {
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