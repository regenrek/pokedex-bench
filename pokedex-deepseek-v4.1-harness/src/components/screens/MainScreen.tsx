import type { RefObject } from 'react';
import { VIEW_TITLES } from '../../state/pokedexReducer';
import { usePokedex } from '../../state/pokedexContext';
import { IndexView } from './IndexView';
import { BootOverlay, ErrorOverlay, KeypadPreview, RefreshFlag, StaleNotice } from './Overlays';
import { SpeciesView } from './SpeciesView';
import { StatsView } from './StatsView';

export interface MainScreenProps {
  inputRef: RefObject<HTMLInputElement | null>;
}

/** The large left-hand display: species card, stat sheet or the Kanto index. */
export function MainScreen({ inputRef }: MainScreenProps) {
  const dex = usePokedex();
  const { state } = dex;
  const detail = state.detail;
  const hasFailed = state.detailStatus === 'error';
  const showBoot = dex.isBooting;
  const showHardError = hasFailed && detail === null;

  return (
    <div className="lcd">
      <div className={`lcd__body${dex.isRefreshing ? ' lcd__body--stale' : ''}`}>
        <header className="lcd__head">
          <span className="lcd__id">No. {detail ? detail.dexNumber : '---'}</span>
          <span className="lcd__name">{detail ? detail.displayName.toUpperCase() : 'NO ENTRY'}</span>
          <span className="lcd__head-right">
            {state.source === 'cache' && state.detailStatus === 'ready' ? (
              <span className="lcd-chip">ARCHIVE</span>
            ) : null}
            <span className="lcd__title">{VIEW_TITLES[state.view]}</span>
          </span>
        </header>

        {state.view === 'index' ? (
          <IndexView inputRef={inputRef} />
        ) : detail ? (
          state.view === 'stats' ? (
            <StatsView detail={detail} />
          ) : (
            <SpeciesView detail={detail} />
          )
        ) : (
          <div className="view" />
        )}
      </div>

      {showBoot ? <BootOverlay /> : null}
      {showHardError ? (
        <ErrorOverlay message={state.errorMessage ?? 'UNKNOWN FAULT'} onRetry={dex.retry} />
      ) : null}
      {hasFailed && detail !== null ? (
        <StaleNotice
          message={`No. ${String(state.failedId ?? state.selectedId).padStart(3, '0')} UNAVAILABLE — SHOWING No. ${detail.dexNumber}`}
          onRetry={dex.retry}
        />
      ) : null}
      {!showBoot && !showHardError && dex.isRefreshing ? <RefreshFlag /> : null}
      {dex.keypadPreview ? <KeypadPreview preview={dex.keypadPreview} onConfirm={dex.confirmKeypad} /> : null}
    </div>
  );
}
