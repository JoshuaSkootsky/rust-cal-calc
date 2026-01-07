const { Worker } = require('worker_threads');
const { join } = require('path');
const dateParallel = require('../index.js');

const { calculateDateDifferencesSequential, calculateDateDifferencesParallel, getCpuCount } = dateParallel;

const BATCH_SIZES = [100, 500, 1000, 5000, 10000];
const ITERATIONS = 3;

function generateDatePairs(count) {
  const pairs = [];
  const startYear = 2000;
  const endYear = 2024;

  for (let i = 0; i < count; i++) {
    const startYearNum = startYear + Math.floor(Math.random() * (endYear - startYear));
    const startMonth = 1 + Math.floor(Math.random() * 12);
    const startDay = 1 + Math.floor(Math.random() * 28);
    const startDate = `${startYearNum}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

    const endYearNum = startYearNum + Math.floor(Math.random() * 5);
    const endMonth = 1 + Math.floor(Math.random() * 12);
    const endDay = 1 + Math.floor(Math.random() * 28);
    const endDate = `${endYearNum}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    pairs.push([startDate, endDate]);
  }

  return pairs;
}

function runWorkerBenchmark(pairs) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__dirname + '/../worker.js', {
      workerData: { type: 'batch', payload: pairs },
    });

    const start = process.hrtime.bigint();

    worker.on('message', (result) => {
      const end = process.hrtime.bigint();
      const elapsed = Number(end - start) / 1_000_000;
      resolve(elapsed);
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

async function runBenchmark(size) {
  console.log(`\nBenchmarking with ${size.toLocaleString()} date pairs...`);
  console.log('-'.repeat(50));

  const pairs = generateDatePairs(size);
  const pairsJson = JSON.stringify(pairs);

  console.log('Sequential (JavaScript)...');
  const sequentialTimes = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    calculateDateDifferencesSequential(pairsJson);
    const end = process.hrtime.bigint();
    sequentialTimes.push(Number(end - start) / 1_000_000);
  }
  const seqAvg = sequentialTimes.reduce((a, b) => a + b, 0) / sequentialTimes.length;
  console.log(`  Average: ${seqAvg.toFixed(3)}ms`);

  console.log('Parallel (Rust + Rayon)...');
  const parallelTimes = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    await calculateDateDifferencesParallel(pairsJson);
    const end = process.hrtime.bigint();
    parallelTimes.push(Number(end - start) / 1_000_000);
  }
  const parAvg = parallelTimes.reduce((a, b) => a + b, 0) / parallelTimes.length;
  console.log(`  Average: ${parAvg.toFixed(3)}ms`);

  console.log('Worker Thread...');
  const workerTimes = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const elapsed = await runWorkerBenchmark(pairs);
    workerTimes.push(elapsed);
  }
  const workerAvg = workerTimes.reduce((a, b) => a + b, 0) / workerTimes.length;
  console.log(`  Average: ${workerAvg.toFixed(3)}ms`);

  const speedup = seqAvg / parAvg;

  return {
    size,
    sequential: seqAvg,
    parallel: parAvg,
    worker: workerAvg,
    speedup,
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Date Parallel - Performance Benchmarks');
  console.log('='.repeat(60));
  console.log(`CPU Cores: ${getCpuCount()}`);
  console.log(`Iterations per test: ${ITERATIONS}`);
  console.log();

  const results = [];

  for (const size of BATCH_SIZES) {
    try {
      const result = await runBenchmark(size);
      results.push(result);
    } catch (error) {
      console.error(`Benchmark failed for size ${size}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log('Size\t\tSeq (ms)\tPar (ms)\tWorker (ms)\tSpeedup');
  console.log('-'.repeat(60));

  for (const r of results) {
    console.log(
      `${r.size.toString().padEnd(10)}\t` +
      `${r.sequential.toFixed(2).padEnd(10)}\t` +
      `${r.parallel.toFixed(2).padEnd(10)}\t` +
      `${r.worker.toFixed(2).padEnd(12)}\t` +
      `${r.speedup.toFixed(2)}x`
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('Benchmarks complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
