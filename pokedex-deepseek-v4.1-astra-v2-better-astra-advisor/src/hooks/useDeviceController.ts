/**
 * Device controller: owns selection, LCD view state, the numeric keypad buffer,
 * search resolution, keyboard shortcuts and the status readouts.
 *
 * Keeping this in one hook means the presentational components stay dumb and
 * the interaction rules are testable in one place.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FIRST_ID, LAST_ID } from '../api/pokeapi';
import type { InfoSection, MainTab } from '../lib/entry';
import { INFO_SECTIONS } from '../lib/entry';
import { clampId, isBoundary, resolveQuery, stepId } from '../lib/search';
import type { LampDescriptor } from '../components/LensCluster';
import type { DPadDirection } from '../components/DPad';
import { usePokedexEntry, usePokedexIndex } from './usePokedex';

export interface SearchFeedback {
  tone: 'info' | 'error';
  message: string;
}

export interface DeviceController {
  /* data */
  entry: ReturnType<typeof usePokedexEntry>['entry'];
  status: ReturnType<typeof usePokedexEntry>['status'];
  error: string | null;
  isNavigating: boolean;
  indexEntries: ReturnType<typeof usePokedexIndex>['entries'];
  indexStatus: ReturnType<typeof usePokedexIndex>['status'];
  indexError: string | null;
  reloadIndex: () => void;
  selectedId: number;

  /* view state */
  mainTab: MainTab;
  infoSection: InfoSection;
  indexOpen: boolean;
  query: string;
  numberBuffer: string;
  statusText: string;
  statusTone: 'idle' | 'busy' | 'error' | 'info';
  lamps: LampDescriptor[];
  canGoPrev: boolean;
  canGoNext: boolean;

  /* actions */
  setMainTab: (tab: MainTab) => void;
  setInfoSection: (section: InfoSection) => void;
  setQuery: (value: string) => void;
  goPrev: () => void;
  goNext: () => void;
  select: (id: number) => void;
  submitSearch: () => void;
  retry: () => void;
  pressDigit: (digit: string) => void;
  clearEntry: () => void;
  commitEntry: () => void;
  confirm: () => void;
  cancel: () => void;
  toggleIndex: () => void;
  closeIndex: () => void;
  pressDpad: (direction: DPadDirection) => void;
}

const NOTE_TIMEOUT_MS = 2200;
const MAX_ENTRY_DIGITS = 3;

export function useDeviceController(initialId: number = FIRST_ID): DeviceController {
  const [selectedId, setSelectedId] = useState(() => clampId(initialId));
  const [mainTab, setMainTab] = useState<MainTab>('DATA');
  const [infoSection, setInfoSection] = useState<InfoSection>('SUMMARY');
  const [indexOpen, setIndexOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<SearchFeedback | null>(null);
  const [numberBuffer, setNumberBuffer] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const index = usePokedexIndex();
  const { entry, status, error, isNavigating, retry } = usePokedexEntry(selectedId);

  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashNote = useCallback((message: string) => {
    setNote(message);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), NOTE_TIMEOUT_MS);
  }, []);

  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  const resetTransient = useCallback(() => {
    setFeedback(null);
    setNumberBuffer('');
    setNote(null);
  }, []);

  const select = useCallback(
    (id: number) => {
      const next = clampId(id);
      resetTransient();
      setIndexOpen(false);
      setSelectedId(next);
      setMainTab('DATA');
    },
    [resetTransient],
  );

  const goPrev = useCallback(() => {
    setSelectedId((current) => {
      if (isBoundary(current, -1)) {
        flashNote(`AT INDEX START — No. ${String(FIRST_ID).padStart(3, '0')}`);
        return current;
      }
      setFeedback(null);
      setNumberBuffer('');
      return stepId(current, -1);
    });
  }, [flashNote]);

  const goNext = useCallback(() => {
    setSelectedId((current) => {
      if (isBoundary(current, 1)) {
        flashNote(`AT INDEX END — No. ${LAST_ID}`);
        return current;
      }
      setFeedback(null);
      setNumberBuffer('');
      return stepId(current, 1);
    });
  }, [flashNote]);

  const reloadIndex = useCallback(() => {
    setFeedback(null);
    index.reload();
  }, [index]);

  const submitSearch = useCallback(() => {
    if (index.status !== 'ready' || index.entries.length === 0) {
      setFeedback(
        index.status === 'error'
          ? {
              tone: 'error',
              message: 'INDEX UNAVAILABLE — CONFIRM, THEN RETRY INDEX',
            }
          : { tone: 'info', message: 'INDEX STILL LOADING — TRY AGAIN' },
      );
      return;
    }
    const result = resolveQuery(query, index.entries);
    switch (result.kind) {
      case 'match':
        select(result.id);
        setFeedback({
          tone: 'info',
          message: `LOADED No. ${String(result.id).padStart(3, '0')}`,
        });
        break;
      case 'empty':
        setFeedback({ tone: 'info', message: 'ENTER A NAME OR NUMBER' });
        break;
      case 'range':
        setFeedback({ tone: 'error', message: result.message.toUpperCase() });
        break;
      case 'unknown':
        setFeedback({ tone: 'error', message: result.message.toUpperCase() });
        break;
    }
  }, [index.entries, index.status, query, select]);

  const pressDigit = useCallback((digit: string) => {
    setFeedback(null);
    setNumberBuffer((current) => {
      const next = current.length >= MAX_ENTRY_DIGITS ? digit : current + digit;
      return next.replace(/^0+(?=\d)/, '');
    });
  }, []);

  const clearEntry = useCallback(() => {
    setNumberBuffer('');
    setFeedback(null);
  }, []);

  const commitEntry = useCallback(() => {
    if (!numberBuffer) {
      flashNote('KEYPAD IDLE — ENTER A NUMBER');
      return;
    }
    const numeric = Number.parseInt(numberBuffer, 10);
    if (!Number.isFinite(numeric) || numeric < FIRST_ID || numeric > LAST_ID) {
      setFeedback({
        tone: 'error',
        message: `No. ${numberBuffer} IS OUTSIDE 001–151`,
      });
      setNumberBuffer('');
      return;
    }
    select(numeric);
  }, [flashNote, numberBuffer, select]);

  const toggleIndex = useCallback(() => {
    setIndexOpen((open) => !open);
    setFeedback(null);
  }, []);

  const closeIndex = useCallback(() => setIndexOpen(false), []);

  const cancel = useCallback(() => {
    setQuery('');
    setFeedback(null);
    setNumberBuffer('');
    setIndexOpen(false);
    setMainTab('DATA');
  }, []);

  const confirm = useCallback(() => {
    if (numberBuffer) {
      commitEntry();
      return;
    }
    if (status === 'error') {
      retry();
      return;
    }
    // CONFIRM always opens the index; when the index failed to load its dialog
    // is where the RETRY INDEX control lives.
    toggleIndex();
  }, [commitEntry, numberBuffer, retry, status, toggleIndex]);

  const pressDpad = useCallback(
    (direction: DPadDirection) => {
      switch (direction) {
        case 'left':
          goPrev();
          break;
        case 'right':
          goNext();
          break;
        case 'down':
          setInfoSection((current) => {
            const at = INFO_SECTIONS.indexOf(current);
            return INFO_SECTIONS[(at + 1) % INFO_SECTIONS.length]!;
          });
          break;
        case 'up':
          setInfoSection((current) => {
            const at = INFO_SECTIONS.indexOf(current);
            return INFO_SECTIONS[(at - 1 + INFO_SECTIONS.length) % INFO_SECTIONS.length]!;
          });
          break;
      }
    },
    [goNext, goPrev],
  );

  /* Keyboard: arrows navigate, Escape closes the index. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (event.key === 'Escape') {
        if (indexOpen) {
          event.preventDefault();
          setIndexOpen(false);
        }
        return;
      }
      if (typing) return;
      // Declared widgets own their own arrow keys.
      const widget =
        target instanceof HTMLElement
          ? target.closest('[role="dialog"], [role="tablist"], [role="listbox"]')
          : null;
      if (widget) return;
      if (indexOpen) return;
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goPrev();
          break;
        case 'ArrowDown':
          event.preventDefault();
          pressDpad('down');
          break;
        case 'ArrowUp':
          event.preventDefault();
          pressDpad('up');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, indexOpen, pressDpad]);

  const statusText = useMemo(() => {
    if (feedback) return feedback.message;
    if (note) return note;
    if (numberBuffer) return `ENTRY ${numberBuffer}▮`;
    if (status === 'error') return error ?? 'LINK FAILURE';
    if (status === 'loading') return entry ? 'SCANNING…' : 'LINKING…';
    if (status === 'idle') return 'STANDBY';
    return 'RECORD READY';
  }, [error, feedback, note, numberBuffer, status, entry]);

  const statusTone = useMemo<'idle' | 'busy' | 'error' | 'info'>(() => {
    if (feedback) return feedback.tone === 'error' ? 'error' : 'info';
    if (note) return 'info';
    if (status === 'error') return 'error';
    if (status === 'loading') return 'busy';
    if (numberBuffer) return 'info';
    return 'idle';
  }, [feedback, note, numberBuffer, status]);

  const lamps = useMemo<LampDescriptor[]>(
    () => [
      { tone: 'red', label: 'POWER', state: 'on' },
      { tone: 'amber', label: 'SCAN', state: status === 'loading' ? 'blink' : 'off' },
      {
        tone: 'green',
        label: 'LINK',
        state: status === 'error' ? 'off' : status === 'loading' ? 'blink' : 'on',
      },
    ],
    [status],
  );

  return {
    entry,
    status,
    error,
    isNavigating,
    indexEntries: index.entries,
    indexStatus: index.status,
    indexError: index.error,
    reloadIndex,
    selectedId,
    mainTab,
    infoSection,
    indexOpen,
    query,
    numberBuffer,
    statusText,
    statusTone,
    lamps,
    canGoPrev: selectedId > FIRST_ID,
    canGoNext: selectedId < LAST_ID,
    setMainTab,
    setInfoSection,
    setQuery,
    goPrev,
    goNext,
    select,
    submitSearch,
    retry,
    pressDigit,
    clearEntry,
    commitEntry,
    confirm,
    cancel,
    toggleIndex,
    closeIndex,
    pressDpad,
  };
}
