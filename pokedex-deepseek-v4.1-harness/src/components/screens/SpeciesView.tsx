import { formatAbilityLine, type PokemonDetail } from '../../domain/pokemon';
import { spriteZoom } from '../../domain/spriteFrames';
import { typeColor } from '../../domain/typeColors';
import { formatKilograms, formatMetres } from '../../utils/format';
import { StatBar } from './StatBar';

export function TypeChips({ types }: { types: string[] }) {
  if (types.length === 0) {
    return <span className="field__value field__value--dim">UNKNOWN</span>;
  }
  return (
    <span className="type-chips">
      {types.map((type) => (
        <span key={type} className="type-chip" style={{ ['--chip-color' as string]: typeColor(type) }}>
          <span className="type-chip__swatch" aria-hidden="true" />
          {type}
        </span>
      ))}
    </span>
  );
}

/** Default readout: sprite, stat bars, physical data and the Pokédex entry. */
export function SpeciesView({ detail }: { detail: PokemonDetail }) {
  const sprite = detail.sprite;
  return (
    <div className="view view-enter" key={detail.id}>
      <div className="species__main">
        <div className="sprite-stage">
          <span className="sprite-stage__scan" aria-hidden="true" />
          {sprite ? (
            <img
              src={sprite}
              alt={`${detail.displayName} pixel sprite`}
              width={96}
              height={96}
              style={{ ['--sprite-zoom' as string]: spriteZoom(detail.id) }}
            />
          ) : (
            <div className="sprite-placeholder">NO IMAGE</div>
          )}
          <span className="sprite-stage__caption" aria-hidden="true">
            KANTO {detail.dexNumber}
          </span>
        </div>
        <div className="stat-list">
          {detail.stats.map((row) => (
            <StatBar key={row.key} row={row} />
          ))}
        </div>
      </div>

      <div className="species__foot">
        <div className="field-grid">
          <div className="field">
            <span className="field__key">TYPE</span>
            <TypeChips types={detail.types} />
          </div>
          <div className="field">
            <span className="field__key">HEIGHT</span>
            <span className="field__value">{formatMetres(detail.heightM)}</span>
          </div>
          <div className="field">
            <span className="field__key">WEIGHT</span>
            <span className="field__value">{formatKilograms(detail.weightKg)}</span>
          </div>
          <div className="field field--wide">
            <span className="field__key">ABILITY</span>
            <span className="field__value field__value--wrap" title={formatAbilityLine(detail)}>
              {formatAbilityLine(detail)}
            </span>
          </div>
        </div>
        <p className="flavor">
          <strong>{detail.genus.toUpperCase()}.</strong> {detail.flavorText || 'No Pokédex entry on file.'}
        </p>
      </div>
    </div>
  );
}
