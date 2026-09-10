import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { filterIndex } from '../../domain/search';
import { usePokedex } from '../../state/pokedexContext';

export interface IndexViewProps {
  inputRef: RefObject<HTMLInputElement | null>;
}

function describeNotice(
  outcome: ReturnType<typeof usePokedex>['searchOutcome'],
  query: string,
  matches: number,
  indexFailed: boolean,
): string | null {
  if (outcome?.status === 'out-of-range') {
    return `No. ${outcome.id} IS OUTSIDE THE KANTO INDEX — ENTRIES RUN 001 TO 151`;
  }
  if (outcome?.status === 'no-match') {
    return `NO ENTRY MATCHES “${outcome.query.toUpperCase()}” — TRY A NAME OR A NUMBER`;
  }
  if (query.trim().length > 0 && matches === 0) {
    return `NO ENTRY MATCHES “${query.trim().toUpperCase()}” — TRY A NAME OR A NUMBER`;
  }
  if (indexFailed) {
    return 'INDEX RELAY OFFLINE — NUMBER SEARCH STILL AVAILABLE';
  }
  return null;
}

/** Searchable list of all 151 Kanto entries. */
export function IndexView({ inputRef }: IndexViewProps) {
  const dex = usePokedex();
  const { state } = dex;
  const entries = useMemo(() => filterIndex(state.index, state.query), [state.index, state.query]);
  const activeRow = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRow.current?.scrollIntoView?.({ block: 'nearest' });
  }, [state.selectedId, entries.length]);

  const notice = describeNotice(
    dex.searchOutcome,
    state.query,
    entries.length,
    state.indexStatus === 'error',
  );

  return (
    <div className="view view-enter">
      <form
        className="index__search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          dex.submitSearch();
        }}
      >
        <label className="index__label" htmlFor="dex-search">
          FIND
        </label>
        <input
          id="dex-search"
          ref={inputRef}
          className="index__input"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="NAME OR NUMBER"
          value={state.query}
          onChange={(event) => dex.setQuery(event.target.value)}
          aria-describedby={notice ? 'dex-search-notice' : undefined}
        />
        {state.query.length > 0 ? (
          <>
            <button type="submit" className="index__clear">
              GO
            </button>
            <button
              type="button"
              className="index__clear"
              onClick={() => {
                dex.setQuery('');
                inputRef.current?.focus();
              }}
            >
              CLR
            </button>
          </>
        ) : null}
      </form>

      {notice ? (
        <p className="index__notice" id="dex-search-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="index__list" role="listbox" aria-label="Kanto Pokédex entries" tabIndex={-1}>
        {entries.length === 0 ? (
          <p className="index__empty">NO ENTRIES TO DISPLAY</p>
        ) : (
          entries.map((entry) => {
            const active = entry.id === state.selectedId;
            return (
              <button
                key={entry.id}
                type="button"
                role="option"
                aria-selected={active}
                ref={active ? activeRow : undefined}
                className={`index__row${active ? ' index__row--active' : ''}`}
                onClick={() => dex.select(entry.id)}
              >
                <span>No.{String(entry.id).padStart(3, '0')}</span>
                <span>{entry.displayName.toUpperCase()}</span>
                <span aria-hidden="true">{active ? '◀' : ''}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="index__hint">
        <span>{entries.length} ENTRIES LISTED</span>
        <span>◀ ▶ STEP · ↑ ↓ CHANGE VIEW</span>
      </div>
    </div>
  );
}
