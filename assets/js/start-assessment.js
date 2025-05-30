/**
 * Handles starting a new assessment based on the selected category
 * @param {string} category - The assessment category (e.g., 'housing', 'food', 'id')
 */
function startAssessment(category) {
  // Validate that we have a ZIP code
  const zip = localStorage.getItem('userZipCode');
  if (!zip || !/^\d{5}$/.test(zip)) {
    alert('Please start from the homepage to set your ZIP code.');
    window.location.href = 'index.html';
    return;
  }

  // Special case for health assessment
  if (category === 'health') {
    window.location.href = 'health.html';
    return;
  }

  // Redirect to the appropriate tier 1 assessment page
  window.location.href = `assessment_${category}_tier1.html`;
} 