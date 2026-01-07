import dateParallel from './index.js';

const { calculateDateDifference, calculateDateDifferencesSequential, calculateDateDifferencesParallel, getVersion, getFeatures, getCpuCount } = dateParallel;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message} (expected ${expected}, got ${actual})`);
    failed++;
  }
}

function assertApprox(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) <= tolerance) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message} (expected ~${expected}, got ${actual})`);
    failed++;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Date Parallel - Test Suite');
  console.log('='.repeat(60));
  console.log();

  console.log('Version Info Tests:');
  console.log('-'.repeat(40));

  const version = getVersion();
  assert(version && version.length > 0, 'Version should be a non-empty string');
  assert(/^\d+\.\d+\.\d+$/.test(version), 'Version should match semantic versioning');

  const features = getFeatures();
  assert(Array.isArray(features), 'Features should be an array');
  assert(features.includes('napi'), 'Should include napi feature');

  const cpuCount = getCpuCount();
  assert(cpuCount > 0, 'CPU count should be positive');
  assert(Number.isInteger(cpuCount), 'CPU count should be an integer');

  console.log();
  console.log('Single Date Difference Tests:');
  console.log('-'.repeat(40));

  const january = calculateDateDifference('2024-01-01', '2024-01-31');
  assert(january, 'Should return a result object');
  assertEquals(january.days, 30, 'January should have 30 days difference');
  assert(january.isLeapYear, '2024 should be a leap year');

  const february = calculateDateDifference('2024-02-01', '2024-02-29');
  assert(february, 'Should return a result for February');
  assertEquals(february.days, 28, 'February 2024 should have 28 days difference');

  const nonLeapYear = calculateDateDifference('2023-02-01', '2023-02-28');
  assert(!nonLeapYear.isLeapYear, '2023 should not be a leap year');

  const fullYear = calculateDateDifference('2024-01-01', '2025-01-01');
  assertEquals(fullYear.days, 366, 'Full leap year should have 366 days');

  const backwards = calculateDateDifference('2024-12-31', '2024-01-01');
  assert(backwards.days < 0, 'End date before start date should return negative days');

  console.log();
  console.log('Edge Case Tests:');
  console.log('-'.repeat(40));

  const sameDate = calculateDateDifference('2024-06-15', '2024-06-15');
  assertEquals(sameDate.days, 0, 'Same date should return 0 days');

  const leapDay = calculateDateDifference('2024-02-28', '2024-03-01');
  assertEquals(leapDay.days, 2, 'Feb 28 to Mar 1 in leap year should be 2 days');

  const nonLeapLeapDay = calculateDateDifference('2023-02-28', '2023-03-01');
  assertEquals(nonLeapLeapDay.days, 1, 'Feb 28 to Mar 1 in non-leap year should be 1 day');

  console.log();
  console.log('Sequential Batch Tests:');
  console.log('-'.repeat(40));

  const batch1 = [
    { startDate: '2024-01-01', endDate: '2024-01-31' },
    { startDate: '2024-02-01', endDate: '2024-02-29' },
    { startDate: '2024-03-01', endDate: '2024-03-31' },
  ];

  const batchResults1 = calculateDateDifferencesSequential(batch1);
  assert(Array.isArray(batchResults1), 'Should return an array');
  assertEquals(batchResults1.length, 3, 'Should return 3 results');
  assertEquals(batchResults1[0].days, 30, 'First pair should have 30 days');
  assertEquals(batchResults1[1].days, 28, 'Second pair should have 28 days');
  assertEquals(batchResults1[2].days, 30, 'Third pair should have 30 days');

  const emptyBatch = calculateDateDifferencesSequential([]);
  assert(Array.isArray(emptyBatch), 'Empty batch should return an array');
  assertEquals(emptyBatch.length, 0, 'Empty batch should have 0 results');

  console.log();
  console.log('Parallel Batch Tests:');
  console.log('-'.repeat(40));

  const batch2 = [
    { startDate: '2020-01-01', endDate: '2021-01-01' },
    { startDate: '2021-01-01', endDate: '2022-01-01' },
    { startDate: '2022-01-01', endDate: '2023-01-01' },
  ];

  const parallelResult = await calculateDateDifferencesParallel(batch2);
  assert(parallelResult, 'Should return a result object');
  assert(parallelResult.parallelized !== undefined, 'Should have parallelized flag');
  assert(parallelResult.elapsedMs !== undefined, 'Should have elapsedMs');
  assertEquals(parallelResult.count, 3, 'Should have correct count');
  assert(Array.isArray(parallelResult.results), 'Should have results array');
  assertEquals(parallelResult.results.length, 3, 'Results array should have 3 items');

  const emptyParallel = await calculateDateDifferencesParallel([]);
  assertEquals(emptyParallel.count, 0, 'Empty parallel batch should have 0 count');

  console.log();
  console.log('Large Batch Tests:');
  console.log('-'.repeat(40));

  const largeBatch = [];
  for (let i = 0; i < 100; i++) {
    const year = 2000 + Math.floor(i / 10);
    largeBatch.push({
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    });
  }

  const largeResult = calculateDateDifferencesSequential(largeBatch);
  assertEquals(largeResult.length, 100, 'Should process 100 date pairs');
  assert(largeResult[99].days > 0, 'Last pair should have positive days');

  const largeParallel = await calculateDateDifferencesParallel(largeBatch);
  assertEquals(largeParallel.count, 100, 'Parallel should also process 100 pairs');
  assert(largeParallel.elapsedMs >= 0, 'Should have valid elapsed time');

  console.log();
  console.log('='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
