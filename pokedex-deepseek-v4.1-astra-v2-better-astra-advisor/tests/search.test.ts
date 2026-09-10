import { describe, expect, it } from 'vitest';
import { clampId, isBoundary, resolveQuery, stepId } from '../src/lib/search';
import { GEN1_NAMES } from './fixtures';

const INDEX = GEN1_NAMES.map((name, i) => ({ id: i + 1, name }));

describe('resolveQuery', () => {
  it('resolves names case-insensitively', () => {
    expect(resolveQuery('pikachu', INDEX)).toMatchObject({ kind: 'match', id: 25 });
    expect(resolveQuery('Pikachu', INDEX)).toMatchObject({ kind: 'match', id: 25 });
    expect(resolveQuery('PIKACHU', INDEX)).toMatchObject({ kind: 'match', id: 25 });
    expect(resolveQuery('  pikachu  ', INDEX)).toMatchObject({ kind: 'match', id: 25 });
  });

  it('resolves plain and padded numbers', () => {
    expect(resolveQuery('25', INDEX)).toMatchObject({ kind: 'match', id: 25 });
    expect(resolveQuery('025', INDEX)).toMatchObject({ kind: 'match', id: 25 });
    expect(resolveQuery('#25', INDEX)).toMatchObject({ kind: 'match', id: 25 });
    expect(resolveQuery('1', INDEX)).toMatchObject({ kind: 'match', id: 1 });
    expect(resolveQuery('151', INDEX)).toMatchObject({ kind: 'match', id: 151 });
  });

  it('reports numbers below and above the Generation I range', () => {
    const below = resolveQuery('0', INDEX);
    expect(below.kind).toBe('range');
    const above = resolveQuery('152', INDEX);
    expect(above.kind).toBe('range');
    expect(above.kind === 'range' ? above.message : '').toContain('151');
  });

  it('reports unknown names with a useful message', () => {
    const result = resolveQuery('missingno', INDEX);
    expect(result.kind).toBe('unknown');
    expect(result.kind === 'unknown' ? result.message : '').toContain('MISSINGNO');
  });

  it('reports ambiguous prefixes instead of guessing', () => {
    const result = resolveQuery('nidoran', INDEX);
    expect(result.kind).toBe('unknown');
    expect(result.kind === 'unknown' ? result.message : '').toContain('MATCHES 2');
  });

  it('accepts a unique prefix as a convenience', () => {
    expect(resolveQuery('squir', INDEX)).toMatchObject({ kind: 'match', id: 7 });
  });

  it('treats an empty query as empty', () => {
    expect(resolveQuery('   ', INDEX).kind).toBe('empty');
  });
});

describe('boundary helpers', () => {
  it('clamps to the Generation I range', () => {
    expect(clampId(0)).toBe(1);
    expect(clampId(999)).toBe(151);
    expect(clampId(Number.NaN)).toBe(1);
  });

  it('never steps outside 1..151', () => {
    expect(stepId(1, -1)).toBe(1);
    expect(stepId(151, 1)).toBe(151);
    expect(stepId(75, 1)).toBe(76);
    expect(isBoundary(1, -1)).toBe(true);
    expect(isBoundary(151, 1)).toBe(true);
    expect(isBoundary(75, 1)).toBe(false);
  });
});
