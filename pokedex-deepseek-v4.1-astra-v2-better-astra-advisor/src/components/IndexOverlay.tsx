/** Compact index of the 151 Generation I Pokémon, shown over the main LCD. */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from 'react';
import { displayName, formatDexNumber } from '../lib/format';
import type { IndexEntry } from '../lib/search';

export interface IndexOverlayProps {
  entries: IndexEntry[];
  currentId: number;
  onSelect: (id: number) => void;
  onClose: () => void;
  onRetry: () => void;
  status: 'loading' | 'ready' | 'error' | 'idle';
  error: string | null;
}

const PAGE_STEP = 10;

export function IndexOverlay({
  entries,
  currentId,
  onSelect,
  onClose,
  onRetry,
  status,
  error,
}: IndexOverlayProps): JSX.Element {
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const [cursor, setCursor] = useState(() => {
    const found = entries.findIndex((entry) => entry.id === currentId);
    return found === -1 ? 0 : found;
  });

  /* Remember where focus came from and move it into the index (ARIA dialog). */
  useEffect(() => {
    restoreFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      restoreFocusTo.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (entries.length === 0) return;
    const target = entries[Math.min(cursor, entries.length - 1)];
    if (!target) return;
    const node = itemRefs.current.get(target.id);
    node?.focus();
    node?.scrollIntoView({ block: 'nearest' });
  }, [cursor, entries]);

  /* Focus must enter the dialog even when the list is empty (loading/error). */
  useEffect(() => {
    if (entries.length > 0) return;
    const fallback = status === 'error' ? retryRef.current : closeRef.current;
    fallback?.focus();
  }, [entries.length, status]);

  const moveCursor = useCallback(
    (next: number) => {
      const total = entries.length;
      if (total === 0) return;
      const clamped = Math.max(0, Math.min(total - 1, next));
      setCursor(clamped);
    },
    [entries.length],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveCursor(cursor + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveCursor(cursor - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveCursor(cursor + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveCursor(cursor - 1);
        break;
      case 'PageDown':
        event.preventDefault();
        moveCursor(cursor + PAGE_STEP);
        break;
      case 'PageUp':
        event.preventDefault();
        moveCursor(cursor - PAGE_STEP);
        break;
      case 'Home':
        event.preventDefault();
        moveCursor(0);
        break;
      case 'End':
        event.preventDefault();
        moveCursor(entries.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="index-overlay" role="dialog" aria-label="Pokémon index">
      <div className="index-overlay__header">
        <span className="index-overlay__title">INDEX 001–151</span>
        <span className="index-overlay__hint">↑↓ SELECT · CANCEL TO CLOSE</span>
        <button
          type="button"
          className="lcd-action"
          ref={closeRef}
          onClick={onClose}
        >
          CLOSE
        </button>
      </div>

      {status === 'loading' && entries.length === 0 ? (
        <p className="screen-message__body">READING INDEX…</p>
      ) : null}

      {status === 'error' && entries.length === 0 ? (
        <div className="index-overlay__error">
          <p className="screen-message__body">{error ?? 'INDEX UNAVAILABLE'}</p>
          <button
            type="button"
            className="lcd-action"
            ref={retryRef}
            onClick={onRetry}
          >
            RETRY INDEX
          </button>
        </div>
      ) : null}

      <div
        className="index-list"
        role="listbox"
        aria-label="Generation I Pokémon"
        onKeyDown={onKeyDown}
      >
        {entries.map((entry, position) => {
          const isCurrent = entry.id === currentId;
          return (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={isCurrent}
              aria-current={isCurrent}
              tabIndex={position === cursor ? 0 : -1}
              ref={(node) => {
                if (node) itemRefs.current.set(entry.id, node);
                else itemRefs.current.delete(entry.id);
              }}
              className="index-list__item"
              onClick={() => onSelect(entry.id)}
            >
              <span className="index-list__no">{formatDexNumber(entry.id)}</span>
              <span className="index-list__name">{displayName(entry.name)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
