import { useMemo, useRef } from 'react'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { usePokedex } from '../hooks/usePokedex'
import { describeStatus } from '../lib/status'
import { Hinge } from './Hardware'
import { LeftHalf } from './LeftHalf'
import { RightHalf } from './RightHalf'

/** The whole device: casing, screens, controls and their wiring. */
export function PokedexDevice() {
  const dex = usePokedex()
  const searchRef = useRef<HTMLInputElement | null>(null)

  useKeyboardNav({
    onStep: dex.step,
    onFirst: dex.first,
    onLast: dex.last,
    onFocusSearch: () => searchRef.current?.focus(),
  })

  const targetEntry = dex.entryById.get(dex.selectedId) ?? null
  const status = useMemo(
    () =>
      describeStatus({
        listStatus: dex.listStatus,
        listError: dex.listError,
        detailStatus: dex.detailStatus,
        detail: dex.detail,
        detailError: dex.detailError,
        targetId: dex.selectedId,
        targetEntry,
        source: dex.source,
      }),
    [
      dex.listStatus,
      dex.listError,
      dex.detailStatus,
      dex.detail,
      dex.detailError,
      dex.selectedId,
      dex.source,
      targetEntry,
    ],
  )

  const hasQuery = dex.query.trim() !== ''
  const faulted = dex.detailStatus === 'error'
  const confirmCaption = hasQuery ? 'SEARCH' : faulted ? 'RETRY' : 'RESCAN'
  const confirmLabel = hasQuery
    ? 'Confirm search'
    : faulted
      ? 'Retry loading this entry'
      : 'Re-scan this entry from PokéAPI'

  const confirm = () => {
    if (hasQuery) {
      dex.submitSearch()
      return
    }
    if (faulted) {
      dex.retry()
      return
    }
    dex.refresh()
  }

  return (
    <div className="device">
      <LeftHalf
        detail={dex.detail}
        detailStatus={dex.detailStatus}
        detailError={dex.detailError}
        selectedId={dex.selectedId}
        status={status}
        view={dex.view}
        onRetry={dex.retry}
        onStep={dex.step}
        onView={dex.setView}
        canPrev={dex.canPrev}
        canNext={dex.canNext}
      />
      <Hinge />
      <RightHalf
        view={dex.view}
        onView={dex.setView}
        detail={dex.detail}
        detailStatus={dex.detailStatus}
        detailError={dex.detailError}
        entries={dex.entries}
        listStatus={dex.listStatus}
        listError={dex.listError}
        selectedId={dex.selectedId}
        onSelect={dex.select}
        onRetryList={dex.retryList}
        onRetryDetail={dex.retry}
        onStep={dex.step}
        canPrev={dex.canPrev}
        canNext={dex.canNext}
        query={dex.query}
        onQuery={dex.setQuery}
        onSubmitSearch={dex.submitSearch}
        onClearSearch={dex.clearSearch}
        searchError={dex.searchError}
        searchInputRef={searchRef}
        confirmCaption={confirmCaption}
        confirmLabel={confirmLabel}
        onConfirm={confirm}
        cacheLabel={status.cache}
        entryCount={dex.entries.length}
      />

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status.announce}
      </p>
    </div>
  )
}
