import { useEffect, useRef } from 'react'
import type { IndexEntry, PokedexView, PokemonDetail } from '../api/types'
import type { LoadStatus } from '../hooks/usePokedex'
import { formatDexNumber, formatKilograms, formatMeters } from '../lib/format'
import { STAT_BAR_MAX } from '../api/transform'

export const SEARCH_ERROR_ID = 'dex-search-error'

const VIEWS: { id: PokedexView; label: string }[] = [
  { id: 'data', label: 'DATA' },
  { id: 'stats', label: 'STATS' },
  { id: 'index', label: 'INDEX' },
]

export interface InfoScreenProps {
  view: PokedexView
  onView: (view: PokedexView) => void
  detail: PokemonDetail | null
  detailStatus: LoadStatus
  detailError: string | null
  entries: IndexEntry[]
  listStatus: LoadStatus
  listError: string | null
  selectedId: number
  onSelect: (id: number) => void
  onRetryList: () => void
  searchError: string | null
  onRetryDetail: () => void
}

/** Right LCD: DATA / STATS / INDEX panels plus the inline search verdict. */
export function InfoScreen({
  view,
  onView,
  detail,
  detailStatus,
  detailError,
  entries,
  listStatus,
  listError,
  selectedId,
  onSelect,
  onRetryList,
  searchError,
  onRetryDetail,
}: InfoScreenProps) {
  const currentRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (view !== 'index') return
    currentRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [view, selectedId, entries.length])

  return (
    <section className="lcd lcd--info" aria-label="Information display">
      <div className="lcd__tabs" role="group" aria-label="Information views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="lcd__tab"
            aria-pressed={view === item.id}
            onClick={() => onView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="lcd__panel">
        {view === 'data' ? (
          <DataPanel detail={detail} status={detailStatus} error={detailError} onRetry={onRetryDetail} />
        ) : null}
        {view === 'stats' ? (
          <StatsPanel detail={detail} status={detailStatus} error={detailError} onRetry={onRetryDetail} />
        ) : null}
        {view === 'index' ? (
          <IndexPanel
            entries={entries}
            listStatus={listStatus}
            listError={listError}
            selectedId={selectedId}
            onSelect={onSelect}
            onRetryList={onRetryList}
            currentRef={currentRef}
          />
        ) : null}
      </div>

      <div className="lcd__foot">
        {searchError ? (
          <p className="lcd__notice" id={SEARCH_ERROR_ID} role="alert">
            <span aria-hidden="true">! </span>
            {searchError}
          </p>
        ) : (
          <p className="lcd__foot-note">
            {listStatus === 'ready'
              ? `${entries.length} ENTRIES · No. ${formatDexNumber(selectedId)}`
              : listStatus === 'error'
                ? 'INDEX LIST OFFLINE'
                : 'READING INDEX…'}
          </p>
        )}
      </div>
    </section>
  )
}

function PanelPlaceholder({
  status,
  error,
  onRetry,
}: {
  status: LoadStatus
  error: string | null
  onRetry: () => void
}) {
  if (status === 'error') {
    return (
      <div className="panel-fault" role="alert">
        <p>{error ?? 'Link fault.'}</p>
        <button type="button" className="lcd__fault-retry" onClick={onRetry}>
          RETRY
        </button>
      </div>
    )
  }
  return (
    <div className="skeleton skeleton--panel" data-testid="panel-skeleton">
      <span className="skeleton__line skeleton__line--title" />
      <span className="skeleton__line" />
      <span className="skeleton__line" />
      <span className="skeleton__line skeleton__line--short" />
    </div>
  )
}

function DataPanel({
  detail,
  status,
  error,
  onRetry,
}: {
  detail: PokemonDetail | null
  status: LoadStatus
  error: string | null
  onRetry: () => void
}) {
  if (!detail) return <PanelPlaceholder status={status} error={error} onRetry={onRetry} />

  return (
    <div className="panel panel--data">
      <p className="panel__flavor">
        {detail.flavorText ?? 'No English species record for this entry.'}
      </p>

      <div className="panel__block">
        <h3 className="panel__label">ABILITIES</h3>
        <ul className="ability-list">
          {detail.abilities.length > 0 ? (
            detail.abilities.map((ability) => (
              <li key={`${ability.name}-${ability.hidden}`} className="ability">
                <span className="ability__name">{ability.name}</span>
                {ability.hidden ? <span className="ability__tag">HIDDEN</span> : null}
              </li>
            ))
          ) : (
            <li className="ability ability--empty">No ability data</li>
          )}
        </ul>
      </div>

      <div className="panel__block">
        <h3 className="panel__label">MEASUREMENTS</h3>
        <dl className="measure-list">
          <div className="measure">
            <dt>HEIGHT</dt>
            <dd>{formatMeters(detail.heightMeters)}</dd>
          </div>
          <div className="measure">
            <dt>WEIGHT</dt>
            <dd>{formatKilograms(detail.weightKilograms)}</dd>
          </div>
        </dl>
      </div>

      {detail.speciesWarning ? (
        <div className="panel__warning">
          <p className="panel__warning-text">
            SPECIES RECORD PARTIAL · {detail.speciesWarning}
          </p>
          <button
            type="button"
            className="lcd__fault-retry"
            disabled={status === 'loading'}
            onClick={onRetry}
          >
            RETRY SPECIES
          </button>
        </div>
      ) : null}
    </div>
  )
}

function StatsPanel({
  detail,
  status,
  error,
  onRetry,
}: {
  detail: PokemonDetail | null
  status: LoadStatus
  error: string | null
  onRetry: () => void
}) {
  if (!detail) return <PanelPlaceholder status={status} error={error} onRetry={onRetry} />
  if (detail.stats.length === 0) {
    return <p className="panel__empty">No base stat data for this entry.</p>
  }

  return (
    <div className="panel panel--stats">
      <h3 className="panel__label">BASE STATS</h3>
      <ul className="stat-list">
        {detail.stats.map((stat) => (
          <li key={stat.key} className="stat">
            <span className="stat__label">{stat.label}</span>
            <span className="stat__track">
              <span
                className="stat__fill"
                style={{ width: `${Math.min(100, (stat.value / STAT_BAR_MAX) * 100)}%` }}
              />
            </span>
            <span className="stat__value">{stat.value}</span>
          </li>
        ))}
      </ul>
      <p className="panel__footnote">BARS SCALED 0–{STAT_BAR_MAX}</p>
    </div>
  )
}

function IndexPanel({
  entries,
  listStatus,
  listError,
  selectedId,
  onSelect,
  onRetryList,
  currentRef,
}: {
  entries: IndexEntry[]
  listStatus: LoadStatus
  listError: string | null
  selectedId: number
  onSelect: (id: number) => void
  onRetryList: () => void
  currentRef: React.RefObject<HTMLButtonElement | null>
}) {
  if (listStatus === 'error' && entries.length === 0) {
    return (
      <div className="panel-fault" role="alert">
        <p>{listError ?? 'Index list unavailable.'}</p>
        <button type="button" className="lcd__fault-retry" onClick={onRetryList}>
          RETRY LIST
        </button>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="skeleton skeleton--panel" data-testid="index-skeleton">
        <span className="skeleton__line" />
        <span className="skeleton__line" />
        <span className="skeleton__line" />
        <span className="skeleton__line" />
      </div>
    )
  }

  return (
    <ul className="index-list" aria-label="Kanto index">
      {entries.map((entry) => {
        const current = entry.id === selectedId
        return (
          <li key={entry.id}>
            <button
              type="button"
              ref={current ? currentRef : undefined}
              className="index-item"
              aria-label={`${formatDexNumber(entry.id)} ${entry.name}`}
              aria-current={current ? 'true' : undefined}
              onClick={() => onSelect(entry.id)}
            >
              <span className="index-item__no">{formatDexNumber(entry.id)}</span>
              <span className="index-item__name">{entry.name}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
