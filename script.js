function startAssessment() {
  const zip = document.getElementById("zipCode").value;
  if (!zip || zip.length < 5) {
    alert("Please enter a valid ZIP code.");
    return;
  }
  localStorage.setItem("location_type", "zip");
  localStorage.setItem("zip_code", zip);
  window.location.href = "assessment_start.html";
}