/** Full-screen LCD states: cold boot, hard failure, background refresh. */

export function BootOverlay() {
  return (
    <div className="lcd-overlay" role="status">
      <div className="lcd-overlay__inner">
        <span className="lcd-overlay__title">MONSTER INDEX</span>
        <span className="lcd-overlay__text">MODEL MA-01 · KANTO ARCHIVE</span>
        <div className="progress" aria-hidden="true">
          <div className="progress__fill" />
        </div>
        <div className="boot-log">
          <span>SPINNING UP CARTRIDGE…</span>
          <span>LINKING TO POKÉAPI RELAY…</span>
        </div>
      </div>
    </div>
  );
}

export interface ErrorOverlayProps {
  message: string;
  onRetry(): void;
}

export function ErrorOverlay({ message, onRetry }: ErrorOverlayProps) {
  return (
    <div className="lcd-overlay" role="alert">
      <div className="lcd-overlay__inner">
        <span className="lcd-overlay__title">LINK ERROR</span>
        <span className="lcd-overlay__text">{message}</span>
        <span className="lcd-overlay__text">
          THE ARCHIVE COULD NOT BE REACHED. CHECK THE CONNECTION AND TRY AGAIN.
        </span>
        <button type="button" className="lcd-button" onClick={onRetry}>
          RETRY LINK
        </button>
      </div>
    </div>
  );
}

export function StaleNotice({ message, onRetry }: ErrorOverlayProps) {
  return (
    <div className="lcd-notice" role="alert">
      <span>{message}</span>
      <button type="button" className="lcd-button lcd-button--small" onClick={onRetry}>
        RETRY
      </button>
    </div>
  );
}

export function RefreshFlag() {
  return (
    <div className="refresh-flag" role="status">
      <span className="refresh-flag__dot" aria-hidden="true" />
      READING ENTRY…
    </div>
  );
}

export function KeypadPreview({ preview, onConfirm }: { preview: string; onConfirm(): void }) {
  return (
    <div className="keypad-preview" role="status">
      <span>{preview}</span>
      <button type="button" className="lcd-button lcd-button--small" onClick={onConfirm}>
        OK
      </button>
    </div>
  );
}
