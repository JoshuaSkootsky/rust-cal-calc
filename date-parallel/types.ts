export interface DatePair {
  startDate: string;
  endDate: string;
}

export interface DateDifference {
  startDate: string;
  endDate: string;
  days: number;
  weeks: number;
  months: number;
  years: number;
  isLeapYear: boolean;
}

export interface BatchResult {
  results: DateDifference[];
  elapsedMs: number;
  count: number;
  parallelized: boolean;
}

export interface WorkerMessage {
  type: 'batch';
  payload: DatePair[];
}

export interface WorkerResponse {
  type: 'result';
  payload: BatchResult;
}

export interface WorkerError {
  type: 'error';
  message: string;
}

export type WorkerIncomingMessage = WorkerMessage | { type: 'shutdown' };

export type WorkerOutgoingMessage = WorkerResponse | WorkerError;

export declare function calculateDateDifference(startDate: string, endDate: string): DateDifference;

export declare function calculateDateDifferencesSequential(pairs: DatePair[]): DateDifference[];

export declare function calculateDateDifferencesParallel(pairs: DatePair[]): Promise<BatchResult>;

export declare class DateParallelWorker {
  constructor(workerPath?: string);
  processBatch(pairs: DatePair[]): Promise<BatchResult>;
  terminate(): void;
}

export declare const VERSION: string;
export declare const FEATURES: string[];
