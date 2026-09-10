import { useState } from 'react'
import type { PokemonDetail } from '../api/types'
import type { LoadStatus } from '../hooks/usePokedex'
import { formatDexNumber, formatKilograms, formatMeters } from '../lib/format'
import type { StatusDescriptor } from '../lib/status'
import { typeColor, withAlpha } from '../lib/typeColors'

export interface MainScreenProps {
  detail: PokemonDetail | null
  detailStatus: LoadStatus
  detailError: string | null
  selectedId: number
  status: StatusDescriptor
  onRetry: () => void
}

/** Left LCD: dex number, name, pixel sprite, types and physical facts. */
export function MainScreen({
  detail,
  detailStatus,
  detailError,
  selectedId,
  status,
  onRetry,
}: MainScreenProps) {
  // Track the URL that failed rather than a boolean, so a new entry always retries.
  const [failedSpriteUrl, setFailedSpriteUrl] = useState<string | null>(null)
  const spriteUrl = detail?.spriteUrl ?? null
  const spriteOk = spriteUrl !== null && failedSpriteUrl !== spriteUrl

  const showSkeleton = !detail
  const showEmptyState = !detail && detailStatus === 'error'
  const dexNumber = detail ? detail.id : selectedId

  return (
    <section className="lcd lcd--main" aria-label="Selected entry display">
      <header className="lcd__head">
        <span className="lcd__dexno">No.&nbsp;{formatDexNumber(dexNumber)}</span>
        <span className="lcd__headnote">{detail?.genus ?? 'SPECIES DATA'}</span>
      </header>

      <div className="lcd__body">
        {showEmptyState ? (
          <div className="empty-state" data-testid="main-empty">
            <p className="empty-state__title">NO SIGNAL</p>
            <p className="empty-state__hint">
              The index link dropped before entry {formatDexNumber(selectedId)} arrived.
            </p>
          </div>
        ) : showSkeleton ? (
          <div className="skeleton" data-testid="main-skeleton">
            <div className="skeleton__sprite" />
            <div className="skeleton__lines">
              <span className="skeleton__line skeleton__line--title" />
              <span className="skeleton__line" />
              <span className="skeleton__line skeleton__line--short" />
            </div>
          </div>
        ) : (
          <>
            <div className="sprite-frame">
              {spriteOk ? (
                <img
                  className="sprite-frame__img"
                  src={spriteUrl}
                  alt={`${detail.name} front sprite`}
                  width={200}
                  height={200}
                  decoding="async"
                  onError={() => setFailedSpriteUrl(spriteUrl)}
                />
              ) : (
                <p className="sprite-frame__missing">
                  SPRITE
                  <br />
                  UNAVAILABLE
                </p>
              )}
            </div>

            <div className="facts">
              <h2 className="facts__name">{detail.name}</h2>

              <div className="facts__types" aria-label="Types">
                {detail.types.length > 0 ? (
                  detail.types.map((type) => (
                    <span
                      key={type}
                      className="type-chip"
                      style={{
                        borderColor: withAlpha(typeColor(type), 0.6),
                        background: withAlpha(typeColor(type), 0.2),
                      }}
                    >
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="type-chip type-chip--empty">TYPE —</span>
                )}
              </div>

              <dl className="facts__list">
                <div className="facts__row">
                  <dt>HEIGHT</dt>
                  <dd>{formatMeters(detail.heightMeters)}</dd>
                </div>
                <div className="facts__row">
                  <dt>WEIGHT</dt>
                  <dd>{formatKilograms(detail.weightKilograms)}</dd>
                </div>
                <div className="facts__row">
                  <dt>DEX</dt>
                  <dd>
                    {formatDexNumber(detail.id)} / 151
                    {detail.isLegendary || detail.isMythical ? (
                      <span className="facts__rarity">
                        {detail.isLegendary ? 'LEGENDARY' : 'MYTHICAL'}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </div>

      {detailStatus === 'error' ? (
        <div className="lcd__fault" role="alert">
          <p className="lcd__fault-text">{detailError ?? 'Link fault.'}</p>
          <button type="button" className="lcd__fault-retry" onClick={onRetry}>
            RETRY
          </button>
        </div>
      ) : null}

      <footer className={`lcd__status lcd__status--${status.tone}`} role="status" aria-live="polite">
        <span className="lcd__status-dot" aria-hidden="true" />
        <span className="lcd__status-text">{status.text}</span>
        <span className="lcd__status-cache">{status.cache}</span>
      </footer>
    </section>
  )
}
