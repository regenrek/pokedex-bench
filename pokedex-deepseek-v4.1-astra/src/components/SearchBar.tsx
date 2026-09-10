import { forwardRef } from 'react'
import { SEARCH_ERROR_ID } from './InfoScreen'

export interface SearchBarProps {
  query: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  hasError: boolean
  listReady: boolean
}

/** Physical search slot under the information LCD: labelled input + submit. */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { query, onChange, onSubmit, onClear, hasError, listReady },
  ref,
) {
  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label className="search__label" htmlFor="dex-search">
        SEARCH
      </label>
      <div className="search__field">
        <input
          id="dex-search"
          ref={ref}
          className="search__input"
          type="text"
          name="query"
          value={query}
          placeholder={listReady ? 'pikachu · 25 · Mr. Mime' : 'number 1–151'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? SEARCH_ERROR_ID : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {query ? (
          <button type="button" className="search__clear" onClick={onClear} aria-label="Clear search">
            ✕
          </button>
        ) : null}
        <button type="submit" className="search__submit">
          SCAN
        </button>
      </div>
    </form>
  )
})
