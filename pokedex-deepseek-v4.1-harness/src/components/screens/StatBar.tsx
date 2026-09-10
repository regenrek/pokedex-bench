import type { StatRow } from '../../domain/pokemon';
import { STAT_SEGMENTS } from '../../domain/pokemon';

export function StatBar({ row }: { row: StatRow }) {
  const filled = Math.round(row.ratio * STAT_SEGMENTS);
  return (
    <div className="stat-row">
      <span className="stat-row__label" title={row.longLabel}>
        {row.label}
      </span>
      <span
        className="stat-bar"
        role="img"
        aria-label={`${row.longLabel} base stat ${row.value} of ${STAT_SEGMENTS} segments, ${filled} filled`}
      >
        {Array.from({ length: STAT_SEGMENTS }, (_, index) => (
          <span key={index} className={`stat-seg${index < filled ? ' stat-seg--on' : ''}`} />
        ))}
      </span>
    </div>
  );
}
