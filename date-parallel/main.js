const DateParallelWorker = require('./worker.js');
const dateParallel = require('./index.js');

const { calculateDateDifference, calculateDateDifferencesSequential, calculateDateDifferencesParallel, getVersion, getFeatures, getCpuCount } = dateParallel;

console.log('='.repeat(60));
console.log('Date Parallel - High-Performance Date Difference Calculator');
console.log('='.repeat(60));
console.log();

console.log('Version:', getVersion());
console.log('CPU Cores:', getCpuCount());
console.log('Features:', getFeatures().join(', '));
console.log();

const SAMPLE_PAIRS = [
  ['2024-01-01', '2024-01-31'],
  ['2024-02-01', '2024-02-29'],
  ['2024-03-01', '2024-03-31'],
  ['2024-04-01', '2024-04-30'],
  ['2024-05-01', '2024-05-31'],
  ['2024-06-01', '2024-06-30'],
  ['2024-07-01', '2024-07-31'],
  ['2024-08-01', '2024-08-31'],
  ['2024-09-01', '2024-09-30'],
  ['2024-10-01', '2024-10-31'],
];

console.log('Demo: Single Date Difference');
console.log('-'.repeat(40));
const singleResult = calculateDateDifference('2024-01-01', '2024-12-31');
const parts = singleResult.split(',');
console.log(`Result: ${parts[2]} days (${parseFloat(parts[3]).toFixed(2)} weeks)`);
console.log(`Leap Year: ${parts[6]}`);
console.log();

console.log('Demo: Sequential Batch Processing');
console.log('-'.repeat(40));
const seqStart = process.hrtime.bigint();
const seqResultsJson = calculateDateDifferencesSequential(JSON.stringify(SAMPLE_PAIRS));
const seqEnd = process.hrtime.bigint();
const seqTime = Number(seqEnd - seqStart) / 1_000_000;
const seqResults = JSON.parse(seqResultsJson);
console.log(`Processed ${seqResults.length} date pairs in ${seqTime.toFixed(3)}ms`);
console.log();

console.log('Demo: Parallel Batch Processing (Rust + Rayon)');
console.log('-'.repeat(40));
async function runParallelDemo() {
  const parStart = process.hrtime.bigint();
  const parResultsJson = await calculateDateDifferencesParallel(JSON.stringify(SAMPLE_PAIRS));
  const parEnd = process.hrtime.bigint();
  const parTime = Number(parEnd - parStart) / 1_000_000;
  const parResults = JSON.parse(parResultsJson);
  console.log(`Processed ${parResults.count} date pairs in ${parTime.toFixed(3)}ms`);
  console.log(`Parallelized: ${parResults.parallelized}`);
  console.log();

  console.log('Demo: Worker Thread Offloading');
  console.log('-'.repeat(40));
  const worker = new DateParallelWorker();
  const workerStart = process.hrtime.bigint();
  const workerResultsJson = await worker.processBatch(SAMPLE_PAIRS);
  const workerEnd = process.hrtime.bigint();
  const workerTime = Number(workerEnd - workerStart) / 1_000_000;
  const workerResults = JSON.parse(workerResultsJson);
  console.log(`Worker processed ${workerResults.count} pairs in ${workerTime.toFixed(3)}ms`);
  console.log();

  console.log('Performance Comparison:');
  console.log('-'.repeat(40));
  console.log(`Sequential: ${seqTime.toFixed(3)}ms`);
  console.log(`Parallel (Rust): ${parTime.toFixed(3)}ms`);
  console.log(`Worker Thread: ${workerTime.toFixed(3)}ms`);

  if (seqTime > parTime) {
    const speedup = (seqTime / parTime).toFixed(2);
    console.log(`Speedup: ${speedup}x faster with parallel processing`);
  }

  console.log();
  console.log('Demo Complete!');
  console.log('='.repeat(60));

  worker.terminate();
}

runParallelDemo().catch(console.error);
