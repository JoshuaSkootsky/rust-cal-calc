// calc.js
const { getDayOfWeek } = require('./index');

// Test some dates
try {
    console.log("Testing date calculations:");
    console.log("2024-02-02:",  getDayOfWeek(2024, 2, 2));
    console.log("2024-01-01:",  getDayOfWeek(2024, 1, 1));
    console.log("2023-12-25:",  getDayOfWeek(2023, 12, 25));
} catch (error) {
    console.error("Error:", error);
}