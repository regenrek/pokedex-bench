import { describe, expect, it } from 'vitest';
import { filterIndex, normalizeName, resolveSearch } from './search';
import type { IndexEntry } from '../api/pokeapi';
import { kantoNames } from '../test/fixtures';

function buildIndex(): IndexEntry[] {
  return kantoNames().map((slug, position) => ({
    id: position + 1,
    slug,
    displayName: slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
  }));
}

const index = buildIndex();

describe('resolveSearch', () => {
  it('reports an empty query', () => {
    expect(resolveSearch('', index)).toEqual({ status: 'empty' });
    expect(resolveSearch('   ', index)).toEqual({ status: 'empty' });
  });

  it.each(['pikachu', 'Pikachu', 'PIKACHU', '  pikachu  '])('resolves the name %j', (query) => {
    expect(resolveSearch(query, index)).toEqual({
      status: 'match',
      id: 25,
      label: 'Pikachu',
      via: 'name',
    });
  });

  it.each(['25', '025', '#25', ' 25 '])('resolves the number %j', (query) => {
    expect(resolveSearch(query, index)).toEqual({
      status: 'match',
      id: 25,
      label: 'Pikachu',
      via: 'number',
    });
  });

  it('resolves the first and last legal entries', () => {
    expect(resolveSearch('1', index)).toMatchObject({ status: 'match', id: 1 });
    expect(resolveSearch('001', index)).toMatchObject({ status: 'match', id: 1 });
    expect(resolveSearch('151', index)).toMatchObject({ status: 'match', id: 151 });
  });

  it('rejects numbers outside the Kanto window', () => {
    expect(resolveSearch('152', index)).toEqual({ status: 'out-of-range', id: 152 });
    expect(resolveSearch('0', index)).toEqual({ status: 'out-of-range', id: 0 });
    expect(resolveSearch('9999', index)).toEqual({ status: 'out-of-range', id: 9999 });
  });

  it('reports an unknown name', () => {
    expect(resolveSearch('agumon', index)).toEqual({ status: 'no-match', query: 'agumon' });
  });

  it('accepts unambiguous prefixes', () => {
    expect(resolveSearch('pika', index)).toMatchObject({ status: 'match', id: 25 });
  });

  it('matches names regardless of punctuation or spacing', () => {
    const special: IndexEntry[] = [
      { id: 122, slug: 'mr-mime', displayName: 'Mr. Mime' },
      { id: 83, slug: 'farfetchd', displayName: "Farfetch'd" },
    ];
    expect(resolveSearch('mr mime', special)).toMatchObject({ status: 'match', id: 122 });
    expect(resolveSearch('Mr. Mime', special)).toMatchObject({ status: 'match', id: 122 });
    expect(resolveSearch('farfetchd', special)).toMatchObject({ status: 'match', id: 83 });
  });
});

describe('normalizeName', () => {
  it('strips case, punctuation and separators', () => {
    expect(normalizeName('Mr. Mime')).toBe('mrmime');
    expect(normalizeName('mr-mime')).toBe('mrmime');
    expect(normalizeName('Nidoran♀')).toBe('nidoran');
  });
});

describe('filterIndex', () => {
  it('returns everything for a blank query', () => {
    expect(filterIndex(index, '')).toHaveLength(151);
  });

  it('filters by partial name', () => {
    expect(filterIndex(index, 'char').map((entry) => entry.id)).toEqual([4, 5, 6]);
  });

  it('filters by dex number', () => {
    expect(filterIndex(index, '025').map((entry) => entry.id)).toEqual([25]);
  });

  it('returns nothing for a query that cannot match', () => {
    expect(filterIndex(index, 'zzzz')).toHaveLength(0);
  });
});
