import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';
import { compareValues, makeObservation, makeReport } from '../src/index.js';
import { ProbeTimeoutError, withTimeout } from '../src/core.js';

const fixtures = JSON.parse(readFileSync(
  fileURLToPath(new URL('../../../fixtures/comparisons.json', import.meta.url)), 'utf8',
)) as Array<{ id: string; expected: unknown; observed: unknown; paths: string[] }>;

describe('shared comparison cases', () => {
  for (const fixture of fixtures) {
    it(fixture.id, () => {
      expect(compareValues(fixture.expected, fixture.observed).map((item) => item.path))
        .toEqual(fixture.paths);
    });
  }
  it('rejects unsupported values', () => {
    expect(() => compareValues({ x: undefined }, {})).toThrow('JSON comparison profile');
    expect(() => compareValues({ x: new Date() }, {})).toThrow('JSON comparison profile');
    expect(() => compareValues({ x: Number.NaN }, {})).toThrow('JSON comparison profile');
  });
  it('makes a report that obeys the shared schema', () => {
    const schema = JSON.parse(readFileSync(
      fileURLToPath(new URL('../../../spec/report-v1.schema.json', import.meta.url)), 'utf8',
    ));
    const report = makeReport('case', 'mcp-typescript-v1', { mcp: '1.29.0' }, [
      { boundary: 'input', expected: { called: true }, observed: { called: true },
        differences: [], allowedDifferences: [] },
    ]);
    expect(new Ajv().validate(schema, report)).toBe(true);
  });
  it('does not call an empty report a pass', () => {
    expect(makeReport('case', 'mcp-typescript-v1', {}, []).outcome).toBe('harness_error');
  });
  it('classifies a timeout separately', async () => {
    await expect(withTimeout(new Promise(() => {}), 5)).rejects.toBeInstanceOf(ProbeTimeoutError);
  });
  it('keeps an allowed difference visible', () => {
    const observation = makeObservation('input', { tag: 'SALE' }, { tag: 'sale' }, [
      { boundary: 'input', path: '/tag', reason: 'The wrapper keeps the original tag' },
    ]);
    expect(observation.differences).toEqual([]);
    expect(observation.allowedDifferences[0].reason).toBe('The wrapper keeps the original tag');
  });
  it('rejects a wildcard allowance', () => {
    expect(() => makeObservation('input', { tag: 'SALE' }, { tag: 'sale' }, [
      { boundary: 'input', path: '/*', reason: 'Ignore all tags' },
    ])).toThrow('exact non-root path');
  });
});
