/** Error raised by the API layer so UI code never has to inspect raw fetch failures. */
export class PokeApiError extends Error {
  readonly status: number | null;
  readonly kind: 'network' | 'http' | 'parse' | 'not-found' | 'aborted';

  constructor(
    kind: PokeApiError['kind'],
    message: string,
    options: { status?: number | null; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'PokeApiError';
    this.kind = kind;
    this.status = options.status ?? null;
  }

  /** True when the request was intentionally cancelled (unmount / superseded). */
  get isAbort(): boolean {
    return this.kind === 'aborted';
  }

  /** Short, human-readable line rendered on the Pokédex LCD. */
  get userMessage(): string {
    switch (this.kind) {
      case 'not-found':
        return 'ENTRY NOT FOUND IN INDEX';
      case 'http':
        return `LINK FAULT ${this.status ?? '???'}`;
      case 'parse':
        return 'CORRUPT DATA PACKET';
      case 'aborted':
        return 'TRANSMISSION CANCELLED';
      case 'network':
      default:
        return 'NO SIGNAL FROM RELAY';
    }
  }
}

export function toPokeApiError(error: unknown): PokeApiError {
  if (error instanceof PokeApiError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new PokeApiError('aborted', 'Request aborted', { cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new PokeApiError('network', message, { cause: error });
}

/** Maps any thrown value onto a short line the LCD can display. */
export function describeError(error: unknown): string {
  if (error instanceof PokeApiError) return error.userMessage;
  if (error instanceof Error && error.message) return error.message;
  return 'UNKNOWN FAULT';
}
