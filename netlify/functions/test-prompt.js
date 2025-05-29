const { generatePrompt } = require('./chatgpt-prompt-template');

// Test data
const testLocation = {
  city: "Boston",
  state: "MA",
  zip: "02108"
};

const testResponses = {
  housingResponses: {
    needsHelp: "yes",
    currentSituation: "Staying with friends temporarily",
    monthsBehind: "2",
    hasEvictionNotice: "no",
    preferredArea: "Near public transportation",
    maxRent: "1200"
  },
  foodResponses: {
    needsHelp: "yes",
    currentAccess: "Sometimes skip meals",
    hasSnap: "no",
    dietaryRestrictions: ["Vegetarian", "Gluten-free"],
    transportationAccess: "yes"
  },
  healthResponses: {
    needsHelp: "no"
  }
};

// Generate and print the prompt
const prompt = generatePrompt(testLocation, testResponses);
console.log("\nGenerated Prompt:\n");
console.log(prompt);
console.log("\n-------------------\n"); 