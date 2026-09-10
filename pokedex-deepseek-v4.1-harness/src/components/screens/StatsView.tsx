import { STAT_SEGMENTS, type PokemonDetail } from '../../domain/pokemon';
import { spriteZoom } from '../../domain/spriteFrames';
import { formatKilograms, formatMetres } from '../../utils/format';
import { TypeChips } from './SpeciesView';

function strongest(detail: PokemonDetail): string {
  const best = [...detail.stats].sort((a, b) => b.value - a.value)[0];
  return best ? `${best.label} ${best.value}` : '—';
}

/** Full numeric stat readout — the "DATA over chart" screen. */
export function StatsView({ detail }: { detail: PokemonDetail }) {
  return (
    <div className="view view-enter" key={detail.id}>
      <div className="stats__body">
        <div className="stats__rows">
          {detail.stats.map((row) => {
            const filled = Math.round(row.ratio * STAT_SEGMENTS);
            return (
              <div className="stat-big" key={row.key}>
                <span title={row.longLabel}>{row.label}</span>
                <span className="stat-bar" role="img" aria-label={`${row.longLabel} ${row.value}`}>
                  {Array.from({ length: STAT_SEGMENTS }, (_, index) => (
                    <span key={index} className={`stat-seg${index < filled ? ' stat-seg--on' : ''}`} />
                  ))}
                </span>
                <span className="stat-big__value">{row.value}</span>
              </div>
            );
          })}
          <div className="stat-big stat-big--total">
            <span>TOTAL</span>
            <span />
            <span className="stat-big__value">{detail.statTotal}</span>
          </div>
        </div>

        <aside className="stats__aside">
          {detail.sprite ? (
            <div className="stats-portrait">
              <img
                src={detail.sprite}
                alt={`${detail.displayName} sprite`}
                width={96}
                height={96}
                style={{ ['--sprite-zoom' as string]: spriteZoom(detail.id) }}
              />
            </div>
          ) : null}
          <div className="section-label">PROFILE</div>
          <div className="mini-list">
            <div className="mini-list__row">
              <span>SPECIES</span>
              <span title={detail.genus}>{detail.genus.toUpperCase()}</span>
            </div>
            <div className="mini-list__row">
              <span>TYPE</span>
              <span>
                <TypeChips types={detail.types} />
              </span>
            </div>
            <div className="mini-list__row">
              <span>HEIGHT</span>
              <span>{formatMetres(detail.heightM)}</span>
            </div>
            <div className="mini-list__row">
              <span>WEIGHT</span>
              <span>{formatKilograms(detail.weightKg)}</span>
            </div>
            {detail.abilities.map((ability) => (
              <div className="mini-list__row" key={ability.name}>
                <span>{ability.hidden ? 'HIDDEN' : 'ABILITY'}</span>
                <span title={ability.displayName}>{ability.displayName.toUpperCase()}</span>
              </div>
            ))}
            <div className="mini-list__row">
              <span>BEST</span>
              <span>{strongest(detail)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
