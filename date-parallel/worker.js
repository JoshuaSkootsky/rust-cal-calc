const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { join } = require('path');

class DateParallelWorker {
  constructor(workerPath = null) {
    this.workerPath = workerPath || __filename;
    this.worker = null;
    this.isRunning = false;
  }

  processBatch(pairs) {
    return new Promise((resolve, reject) => {
      if (this.worker && this.isRunning) {
        reject(new Error('Worker is already processing. Wait for completion or terminate first.'));
        return;
      }

      try {
        this.worker = new Worker(this.workerPath, {
          workerData: { type: 'batch', payload: pairs },
        });

        this.isRunning = true;

        this.worker.on('message', (result) => {
          this.isRunning = false;
          resolve(result);
        });

        this.worker.on('error', (error) => {
          this.isRunning = false;
          reject(error);
        });

        this.worker.on('exit', (code) => {
          this.isRunning = false;
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isRunning = false;
    }
  }
}

if (!isMainThread) {
  let dateParallel;

  async function initializeAndProcess(payload) {
    try {
      const addon = require('./index.js');
      dateParallel = addon;

      const pairsJson = JSON.stringify(payload);
      const resultsJson = await dateParallel.calculateDateDifferencesParallel(pairsJson);

      parentPort.postMessage(resultsJson);
    } catch (error) {
      parentPort.postMessage({
        type: 'error',
        message: error.message,
      });
    }
  }

  if (workerData && workerData.type === 'batch') {
    initializeAndProcess(workerData.payload);
  } else if (workerData && workerData.type === 'shutdown') {
    process.exit(0);
  }
}

module.exports = DateParallelWorker;
