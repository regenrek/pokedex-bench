/** Single source of truth for the device's visible + announced status lines. */

import type { CacheSource, IndexEntry, PokemonDetail } from '../api/types'
import type { LoadStatus } from '../hooks/usePokedex'
import { formatDexNumber, sourceLabel } from './format'

export type StatusTone = 'ready' | 'busy' | 'fault' | 'idle'

export interface StatusDescriptor {
  tone: StatusTone
  /** short uppercase line for the LCD strip */
  text: string
  /** full sentence for the polite live region */
  announce: string
  /** understated cache readout, e.g. `MEMORY` */
  cache: string
}

export interface StatusInput {
  listStatus: LoadStatus
  listError: string | null
  detailStatus: LoadStatus
  detail: PokemonDetail | null
  detailError: string | null
  /** the entry being shown or fetched — the device commits selection immediately */
  targetId: number
  targetEntry: IndexEntry | null
  source: CacheSource | null
}

function target(pendingId: number, entry: IndexEntry | null): string {
  const number = `No. ${formatDexNumber(pendingId)}`
  return entry ? `${number} ${entry.name.toUpperCase()}` : number
}

export function describeStatus(input: StatusInput): StatusDescriptor {
  const {
    listStatus,
    listError,
    detailStatus,
    detail,
    detailError,
    targetId,
    targetEntry,
    source,
  } = input

  if (detailStatus === 'error') {
    return {
      tone: 'fault',
      text: 'LINK FAULT · PRESS RETRY',
      announce: `Could not load entry ${formatDexNumber(targetId)}. ${detailError ?? ''}`.trim(),
      cache: 'FAULT',
    }
  }

  if (detailStatus === 'loading') {
    if (detail) {
      return {
        tone: 'busy',
        text: `UPDATING → ${target(targetId, targetEntry)}`,
        announce: `Loading ${target(targetId, targetEntry)}`,
        cache: 'READING',
      }
    }
    return {
      tone: 'busy',
      text: `SCANNING ${target(targetId, targetEntry)}`,
      announce: `Scanning ${target(targetId, targetEntry)}`,
      cache: 'READING',
    }
  }

  if (detail) {
    const cache = sourceLabel(source)
    return {
      tone: 'ready',
      text: `READY · No. ${formatDexNumber(detail.id)} ${detail.name.toUpperCase()}`,
      announce: `${detail.name}, number ${detail.id}, ready${source && source !== 'network' ? ' from cache' : ''}.`,
      cache,
    }
  }

  if (listStatus === 'error') {
    return {
      tone: 'fault',
      text: 'INDEX LIST FAULT',
      announce: `Index list unavailable. ${listError ?? ''}`.trim(),
      cache: 'FAULT',
    }
  }

  return { tone: 'idle', text: 'STANDBY', announce: 'Standby', cache: 'IDLE' }
}
