/** The right-hand information LCD: area map, section menu and section detail. */
import { useMemo, type JSX } from 'react';
import type { DexEntry, InfoSection } from '../lib/entry';
import { INFO_SECTIONS } from '../lib/entry';


const MAP_COLUMNS = 8;
const MAP_ROWS = 6;

interface MapPattern {
  cells: boolean[];
  markerX: number;
  markerY: number;
  sector: string;
}

/** Deterministic locator pattern derived from the Pokédex number. */
function buildMap(id: number): MapPattern {
  let seed = id * 2654435761;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Two soft landmasses instead of noise, so the panel reads as a map.
  const centres = [
    { x: 1.4 + next() * 2.4, y: 1.2 + next() * 1.9, r: 1.7 + next() * 1.1 },
    { x: 4.6 + next() * 2.4, y: 2.6 + next() * 2, r: 1.4 + next() * 1.2 },
  ];

  const cells: boolean[] = [];
  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let column = 0; column < MAP_COLUMNS; column += 1) {
      const inside = centres.some((centre) => {
        const dx = (column - centre.x) * 0.86;
        const dy = row - centre.y;
        return Math.hypot(dx, dy) < centre.r + next() * 0.85 - 0.3;
      });
      cells.push(inside);
    }
  }

  return {
    cells,
    markerX: 14 + next() * 72,
    markerY: 16 + next() * 68,
    sector: `S-${String(Math.floor(next() * 89) + 10)}`,
  };
}

export interface InfoScreenProps {
  entry: DexEntry | null;
  section: InfoSection;
  onSectionChange: (section: InfoSection) => void;
  isNavigating: boolean;
  selectedId: number;
}

function DetailBody({
  entry,
  section,
}: {
  entry: DexEntry;
  section: InfoSection;
}): JSX.Element {
  switch (section) {
    case 'SUMMARY':
      return (
        <>
          <span className="info__detail-row">
            <span>SPECIES</span>
            <span>{entry.genus}</span>
          </span>
          <span className="info__detail-row">
            <span>HEIGHT</span>
            <span>{entry.height}</span>
          </span>
          <span className="info__detail-row">
            <span>WEIGHT</span>
            <span>{entry.weight}</span>
          </span>
          <span className="info__detail-row">
            <span>TYPE</span>
            <span>{entry.types.join(' / ').toUpperCase()}</span>
          </span>
        </>
      );
    case 'HABITAT':
      return (
        <>
          <span className="info__detail-row">
            <span>HABITAT</span>
            <span>{entry.habitat.toUpperCase()}</span>
          </span>
          <span className="info__detail-row">
            <span>CAPTURE RATE</span>
            <span>{entry.captureRate ?? '—'}</span>
          </span>
          <span className="info__detail-row">
            <span>COLOUR</span>
            <span>{entry.color.toUpperCase()}</span>
          </span>
          <span className="info__detail-note">Source: PokéAPI species record.</span>
        </>
      );
    case 'BEHAVIOR':
      return (
        <span className="info__detail-note">
          {entry.flavor || 'No field notes recorded for this species.'}
        </span>
      );
    case 'DIET':
      return (
        <>
          <span className="info__detail-row">
            <span>EGG GROUP</span>
            <span>{entry.eggGroups.join(', ').toUpperCase() || '—'}</span>
          </span>
          <span className="info__detail-row">
            <span>GROWTH</span>
            <span>{entry.growthRate.toUpperCase()}</span>
          </span>
          <span className="info__detail-note">
            PokéAPI holds no diet field; species record shown.
          </span>
        </>
      );
    case 'NOTES':
      return (
        <>
          <span className="info__detail-row">
            <span>NATIONAL</span>
            <span>No. {entry.dexNumber}</span>
          </span>
          <span className="info__detail-row">
            <span>GEN</span>
            <span>{entry.generation}</span>
          </span>
          <span className="info__detail-row">
            <span>BASE EXP</span>
            <span>{entry.baseExperience ?? '—'}</span>
          </span>
          <span className="info__detail-row">
            <span>FRIENDSHIP</span>
            <span>{entry.baseHappiness ?? '—'}</span>
          </span>
          <span className="info__detail-row">
            <span>CLASS</span>
            <span>
              {entry.isLegendary
                ? 'LEGENDARY'
                : entry.isMythical
                  ? 'MYTHICAL'
                  : 'STANDARD'}
            </span>
          </span>
        </>
      );
    default:
      return <span className="info__detail-note">No data.</span>;
  }
}

export function InfoScreen({
  entry,
  section,
  onSectionChange,
  isNavigating,
  selectedId,
}: InfoScreenProps): JSX.Element {
  const map = useMemo(
    () => buildMap(entry?.id ?? selectedId),
    [entry?.id, selectedId],
  );

  return (
    <div className="bezel bezel--info">
      <div
        className="lcd lcd--info"
        role="region"
        aria-label="Pokédex information display"
        aria-busy={isNavigating}
      >
        <div className="info__header">
          <span className="info__title">AREA MAP</span>
          <span className="info__range">
            RANGE
            <span className="info__bars" aria-hidden="true">
              {[3, 5, 7, 9].map((height, index) => (
                <span
                  key={height}
                  style={{ height: `${height * 10}%` }}
                  data-off={entry === null || index > 2 ? 'true' : 'false'}
                />
              ))}
            </span>
          </span>
        </div>

        <div className="info__body">
          <div className="info__map" aria-hidden="true">
            {map.cells.map((land, index) => (
              <span key={index} className="info__map-cell" data-land={land} />
            ))}
            <span
              className="info__map-marker"
              style={{ left: `${map.markerX}%`, top: `${map.markerY}%` }}
            />
          </div>
          <div className="info__menu" role="group" aria-label="Information section">
            {INFO_SECTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className="info__menu-item"
                aria-pressed={section === value}
                onClick={() => onSectionChange(value)}
              >
                <span className="info__menu-cursor" aria-hidden="true">
                  ▸
                </span>
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="info__detail" data-testid="info-detail">
          <span className="info__detail-title">
            {section} · {map.sector}
          </span>
          {entry ? (
            <DetailBody entry={entry} section={section} />
          ) : (
            <span className="info__detail-note">
              {isNavigating ? 'Scanning…' : 'Awaiting species record.'}
            </span>
          )}
        </div>

        <div className="info__dots" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="info__dot"
              data-active={INFO_SECTIONS.indexOf(section) % 4 === index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
