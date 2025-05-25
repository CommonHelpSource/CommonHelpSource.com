
function startAssessment() {
  const zip = document.getElementById('zipCode').value;
  localStorage.setItem('user_zip', zip);
  window.location.href = 'assessment_start.html';
}
