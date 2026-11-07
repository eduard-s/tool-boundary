export type Outcome = 'pass' | 'fail' | 'unsupported' | 'harness_error';
export type Boundary = 'input' | 'result' | 'error';
export type Json = null | string | number | boolean | Json[] | { [key: string]: Json };

export interface Difference {
  path: string;
  expected: Json;
  observed: Json;
}

export interface Allowance {
  boundary: Boundary;
  path: string;
  reason: string;
}

export interface AllowedDifference extends Difference {
  reason: string;
}

export interface Observation {
  boundary: Boundary;
  expected: Json;
  observed: Json;
  differences: Difference[];
  allowedDifferences: AllowedDifference[];
}

export interface ProbeReport {
  schemaVersion: 1;
  caseId: string;
  runtime: 'node';
  adapter: string;
  dependencyVersions: Record<string, string>;
  outcome: Outcome;
  observations: Observation[];
  input?: Json;
  message?: string;
}

const missing = { kind: 'missing' } as const;

function isObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJson(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value) &&
    (!Number.isInteger(value) || Number.isSafeInteger(value));
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      if (!Object.hasOwn(value, index) || !isJson(value[index])) return false;
    }
    return true;
  }
  if (isObject(value)) return Object.entries(value).every(([key, item]) =>
    typeof key === 'string' && item !== undefined && isJson(item)) &&
    Object.getOwnPropertySymbols(value).length === 0;
  return false;
}

function containsReserved(value: Json): boolean {
  if (isObject(value) && Object.keys(value).length === 1 && value.kind === 'missing') return true;
  if (Array.isArray(value)) return value.some(containsReserved);
  if (isObject(value)) return Object.values(value).some((item) => containsReserved(item as Json));
  return false;
}

export function compareValues(expected: unknown, observed: unknown): Difference[] {
  if (!isJson(expected) || !isJson(observed)) {
    throw new Error('The JSON comparison profile does not support this value');
  }
  if (containsReserved(expected) || containsReserved(observed)) {
    throw new Error('The value contains the reserved missing marker');
  }
  const differences: Difference[] = [];
  const escape = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1');
  const walk = (left: Json, right: Json, path: string): void => {
    if (Array.isArray(left) && Array.isArray(right)) {
      for (let index = 0; index < Math.max(left.length, right.length); index++) {
        const child = `${path}/${index}`;
        if (index >= left.length) differences.push({ path: child, expected: missing, observed: right[index] });
        else if (index >= right.length) differences.push({ path: child, expected: left[index], observed: missing });
        else walk(left[index], right[index], child);
      }
      return;
    }
    if (isObject(left) && isObject(right)) {
      for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
        const child = `${path}/${escape(key)}`;
        if (!(key in left)) differences.push({ path: child, expected: missing, observed: right[key] as Json });
        else if (!(key in right)) differences.push({ path: child, expected: left[key] as Json, observed: missing });
        else walk(left[key] as Json, right[key] as Json, child);
      }
      return;
    }
    if (typeof left !== typeof right || Array.isArray(left) !== Array.isArray(right) ||
      isObject(left) !== isObject(right) || left !== right) {
      differences.push({ path, expected: left, observed: right });
    }
  };
  walk(expected, observed, '');
  return differences;
}

export function makeObservation(
  boundary: Boundary,
  expected: Json,
  observed: Json,
  allowances: Allowance[] = [],
): Observation {
  const selected = new Map<string, string>();
  for (const rule of allowances) {
    if (!rule.path.startsWith('/') || rule.path.includes('*') || !rule.reason.trim()) {
      throw new Error('An allowance needs an exact non-root path and a reason');
    }
    if (rule.boundary === boundary) {
      if (selected.has(rule.path)) throw new Error('An allowance path can occur only once per boundary');
      selected.set(rule.path, rule.reason);
    }
  }
  const differences: Difference[] = [];
  const allowedDifferences: AllowedDifference[] = [];
  for (const difference of compareValues(expected, observed)) {
    const reason = selected.get(difference.path);
    if (reason === undefined) differences.push(difference);
    else allowedDifferences.push({ ...difference, reason });
  }
  return { boundary, expected, observed, differences, allowedDifferences };
}

export function makeReport(
  caseId: string,
  adapter: string,
  dependencyVersions: Record<string, string>,
  observations: Observation[],
  outcome?: Outcome,
  message?: string,
  input?: Json,
): ProbeReport {
  if ((outcome === 'pass' || outcome === 'fail') && observations.length === 0) {
    throw new Error('A pass or fail report needs an observation');
  }
  const hasDifferences = observations.some((item) => item.differences.length);
  const result = outcome ?? (observations.length === 0 ? 'harness_error' :
    hasDifferences ? 'fail' : 'pass');
  if (result === 'pass' && hasDifferences) {
    throw new Error('A passing report cannot contain differences');
  }
  if (result === 'fail' && !hasDifferences) {
    throw new Error('A failing report needs a difference');
  }
  return {
    schemaVersion: 1,
    caseId,
    runtime: 'node',
    adapter,
    dependencyVersions,
    outcome: result,
    observations,
    ...(input !== undefined ? { input } : {}),
    ...(message ? { message } : {}),
  };
}

export function reportToJson(report: ProbeReport): string {
  return JSON.stringify(report, null, 2);
}

export class ProbeTimeoutError extends Error {
  constructor(milliseconds: number) {
    super(`Probe timed out after ${milliseconds} ms`);
    this.name = 'ProbeTimeoutError';
  }
}

export async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    throw new Error('The probe timeout must be positive');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ProbeTimeoutError(milliseconds)), milliseconds);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
