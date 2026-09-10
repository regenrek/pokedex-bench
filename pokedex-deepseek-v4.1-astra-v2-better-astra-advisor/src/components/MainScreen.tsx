/** The large left-hand display: species data, base stats and device messages. */
import type { JSX, KeyboardEvent } from 'react';
import type { DexEntry, MainTab } from '../lib/entry';
import { MAIN_TABS } from '../lib/entry';
import type { LoadStatus } from '../hooks/usePokedex';
import { RetroStatBars, StatsView } from './StatsView';
import { IndexOverlay } from './IndexOverlay';
import { Screw } from './Hardware';
import type { IndexEntry } from '../lib/search';

export interface MainScreenProps {
  entry: DexEntry | null;
  status: LoadStatus;
  error: string | null;
  isNavigating: boolean;
  tab: MainTab;
  onTabChange: (tab: MainTab) => void;
  statusText: string;
  statusTone: 'idle' | 'busy' | 'error' | 'info';
  onRetry: () => void;
  index: {
    open: boolean;
    entries: IndexEntry[];
    status: LoadStatus;
    error: string | null;
    onSelect: (id: number) => void;
    onClose: () => void;
    onRetry: () => void;
  };
  selectedId: number;
}

function LoadingPanel(): JSX.Element {
  return (
    <div className="screen-message" data-testid="main-loading">
      <span className="screen-message__title">INITIALISING</span>
      <span className="scan-bars" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="scan-bars__bar" />
        ))}
      </span>
      <span className="screen-message__body">
        Requesting species record from the PokéAPI link…
      </span>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div className="screen-message screen-message--error" data-testid="main-error" role="alert">
      <span className="screen-message__title">LINK FAILURE</span>
      <span className="screen-message__body">{message}</span>
      <button type="button" className="lcd-action" onClick={onRetry}>
        RETRY
      </button>
    </div>
  );
}

/**
 * WAI-ARIA tabs keyboard support: arrows move between views and focus follows
 * the selection. The global device shortcuts deliberately ignore the tablist.
 */
function handleTabsKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  tab: MainTab,
  onTabChange: (tab: MainTab) => void,
): void {
  const current = MAIN_TABS.indexOf(tab);
  let next: MainTab | undefined;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = MAIN_TABS[(current + 1) % MAIN_TABS.length];
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      next = MAIN_TABS[(current - 1 + MAIN_TABS.length) % MAIN_TABS.length];
      break;
    case 'Home':
      next = MAIN_TABS[0];
      break;
    case 'End':
      next = MAIN_TABS[MAIN_TABS.length - 1];
      break;
    default:
      return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (!next) return;
  onTabChange(next);
  const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons[MAIN_TABS.indexOf(next)]?.focus();
}

export function MainScreen({
  entry,
  status,
  error,
  isNavigating,
  tab,
  onTabChange,
  statusText,
  statusTone,
  onRetry,
  index,
  selectedId,
}: MainScreenProps): JSX.Element {
  const showInitialLoading = !entry && (status === 'loading' || status === 'idle');
  const showFatalError = !entry && status === 'error';

  return (
    <div className="bezel bezel--main">
      <Screw className="bezel__screw--tl" />
      <Screw className="bezel__screw--tr" />
      <Screw className="bezel__screw--bl" />
      <Screw className="bezel__screw--br" />
      <div
        className="lcd lcd--main"
        role="region"
        aria-label="Pokédex main display"
        aria-busy={status === 'loading'}
      >
        <div className="main__header">
          <span className="main__dexno">
            No. {entry ? entry.dexNumber : String(selectedId).padStart(3, '0')}
          </span>
          <span className="main__caption">SPECIES DATA</span>
          <span
            className="main__status"
            data-tone={statusTone}
            aria-live="polite"
            data-testid="main-status"
          >
            {statusText}
          </span>
          <div
            className="main__tabs"
            role="tablist"
            aria-label="Main display view"
            onKeyDown={(event) => handleTabsKeyDown(event, tab, onTabChange)}
          >
            {MAIN_TABS.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                className="tab"
                aria-selected={tab === value}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => onTabChange(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {error && entry ? (
          <p className="main__alert" role="status">
            <span>{error}</span>
            <button type="button" className="lcd-action" onClick={onRetry}>
              RETRY
            </button>
          </p>
        ) : null}

        <div className="main__body" key={entry ? entry.id : 'pending'}>
          {showInitialLoading ? <LoadingPanel /> : null}
          {showFatalError ? (
            <ErrorPanel message={error ?? 'UNKNOWN LINK FAILURE'} onRetry={onRetry} />
          ) : null}
          {entry ? (
            tab === 'DATA' ? (
              <div className="main__data">
                <div className="main__name">
                  <span className="main__name-text">{entry.displayName}</span>
                  <span className="main__genus">{entry.genus}</span>
                </div>
                <div className="main__sprite-cell">
                  {entry.spriteUrl ? (
                    <img
                      className="main__sprite"
                      src={entry.spriteUrl}
                      alt={`${entry.displayName} front sprite`}
                      width={96}
                      height={96}
                      decoding="async"
                    />
                  ) : (
                    <span className="main__sprite--missing">NO SPRITE DATA</span>
                  )}
                </div>
                <RetroStatBars entry={entry} />
                <div className="main__facts">
                  <span className="fact__key">TYPE</span>
                  <span className="fact__value">
                    <span className="type-chips">
                      {entry.types.map((type) => (
                        <span className="type-chip" key={type}>
                          {type.toUpperCase()}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="fact__key">HEIGHT</span>
                  <span className="fact__value">{entry.height}</span>
                  <span className="fact__key">WEIGHT</span>
                  <span className="fact__value">{entry.weight}</span>
                  <span className="fact__key">ABILITY</span>
                  <span className="fact__value">
                    <span className="ability-list">
                      {entry.abilities.map((ability) => (
                        <span key={ability}>{ability}</span>
                      ))}
                    </span>
                  </span>
                </div>
                <div className="main__flavor">
                  <p>{entry.flavor || 'No Pokédex entry recorded for this species.'}</p>
                </div>
              </div>
            ) : (
              <StatsView entry={entry} />
            )
          ) : null}
        </div>

        {isNavigating ? <span className="lcd__scan-overlay" aria-hidden="true" /> : null}

        {index.open ? (
          <IndexOverlay
            entries={index.entries}
            currentId={selectedId}
            onSelect={index.onSelect}
            onClose={index.onClose}
            onRetry={index.onRetry}
            status={index.status}
            error={index.error}
          />
        ) : null}
      </div>
    </div>
  );
}
