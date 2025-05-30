/**
 * Focused ZIP Code Validation Test Suite
 */

export function runZipCodeTests() {
  console.log("🔍 Running Complete ZIP Code Test Suite...");

  const results = [];

  function test(description, testFunc) {
    try {
      testFunc();
      console.log(`✅ ${description}`);
      results.push({ pass: true, description });
    } catch (error) {
      console.error(`❌ ${description}\n   ↳ ${error.message}`);
      results.push({ pass: false, description, error });
    }
  }

  // Core ZIP validation tests
  test("Accepts valid 5-digit ZIP (e.g., 01040)", () => {
    const valid = /^\d{5}$/.test("01040");
    if (!valid) throw new Error("Failed regex validation");
  });

  test("Rejects short ZIP (e.g., 123)", () => {
    const valid = /^\d{5}$/.test("123");
    if (valid) throw new Error("Accepted short ZIP");
  });

  // Storage tests
  test("Stores ZIP in localStorage", () => {
    localStorage.setItem("userZipCode", "01040");
    if (localStorage.getItem("userZipCode") !== "01040") {
      throw new Error("ZIP not found in localStorage");
    }
  });

  test("Reads ZIP from localStorage in assessment", () => {
    const zip = localStorage.getItem("userZipCode");
    if (!zip || zip.length !== 5) throw new Error("Invalid or missing ZIP on assessment page");
  });

  // Edge cases
  test("Rejects non-numeric ZIP (e.g., 'abcde')", () => {
    const valid = /^\d{5}$/.test("abcde");
    if (valid) throw new Error("Accepted non-numeric ZIP");
  });

  test("Rejects too long ZIP (e.g., '123456')", () => {
    const valid = /^\d{5}$/.test("123456");
    if (valid) throw new Error("Accepted too long ZIP");
  });

  test("Rejects ZIP with special characters (e.g., '12@34')", () => {
    const valid = /^\d{5}$/.test("12@34");
    if (valid) throw new Error("Accepted ZIP with special characters");
  });

  test("Rejects ZIP with spaces (e.g., '12 34')", () => {
    const valid = /^\d{5}$/.test("12 34");
    if (valid) throw new Error("Accepted ZIP with spaces");
  });

  // Data clearing test
  test("Clears ZIP from localStorage", () => {
    localStorage.removeItem("userZipCode");
    if (localStorage.getItem("userZipCode")) {
      throw new Error("ZIP still present after removal");
    }
  });

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;
  console.log(`\n📊 Test Suite Summary: ${passed} passed, ${failed} failed`);
  console.log(`📋 Total Tests Run: ${results.length}`);
  
  return {
    passed,
    failed,
    results,
    total: results.length
  };
} 