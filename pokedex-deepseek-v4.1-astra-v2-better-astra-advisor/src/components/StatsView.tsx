/** Base-stat readout used by the STATS view of the main display. */
import type { JSX } from 'react';
import type { DexEntry } from '../lib/entry';
import { specialStat } from '../lib/entry';
import { statBarPercent } from '../lib/format';

/**
 * Compact Generation I style readout (HP / ATK / DEF / SPD / SPC) shown next to
 * the sprite on the DATA view, mirroring the original device screen.
 */
export function RetroStatBars({ entry }: { entry: DexEntry }): JSX.Element {
  const value = (key: string) =>
    entry.stats.find((stat) => stat.key === key)?.value ?? 0;
  const special = specialStat(entry.stats) ?? 0;

  const rows = [
    { label: 'HP', value: value('hp') },
    { label: 'ATK', value: value('attack') },
    { label: 'DEF', value: value('defense') },
    { label: 'SPD', value: value('speed') },
    { label: 'SPC', value: special },
  ];

  return (
    <div className="stats-panel stats-panel--compact">
      <span className="stats-panel__title">BASE STATS</span>
      {rows.map((row) => (
        <div className="stat-row" key={row.label}>
          <span className="stat-row__label">{row.label}</span>
          <span
            className="stat-row__track"
            role="meter"
            aria-label={`${row.label} base stat`}
            aria-valuenow={row.value}
            aria-valuemin={0}
            aria-valuemax={255}
          >
            <span
              className="stat-row__fill"
              style={{ width: `${statBarPercent(row.value)}%` }}
            />
          </span>
          <span className="stat-row__value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StatsView({ entry }: { entry: DexEntry }): JSX.Element {
  return (
    <div className="main__stats">
      <div className="main__sprite-cell">
        {entry.spriteUrl ? (
          <img
            className="main__sprite"
            src={entry.spriteUrl}
            alt={`${entry.displayName} front sprite`}
            width={96}
            height={96}
            decoding="async"
          />
        ) : (
          <span className="main__sprite--missing">NO SPRITE DATA</span>
        )}
      </div>
      <div className="stats-panel">
        <span className="stats-panel__title">BASE STATS</span>
        {entry.stats.map((stat) => (
          <div className="stat-row" key={stat.key}>
            <span className="stat-row__label">{stat.label}</span>
            <span
              className="stat-row__track"
              role="meter"
              aria-label={`${stat.label} base stat`}
              aria-valuenow={stat.value}
              aria-valuemin={0}
              aria-valuemax={255}
            >
              <span
                className="stat-row__fill"
                style={{ width: `${statBarPercent(stat.value)}%` }}
              />
            </span>
            <span className="stat-row__value">{stat.value}</span>
          </div>
        ))}
        <div className="stat-row stat-row--total">
          <span className="stat-row__label">TOTAL</span>
          <span className="stat-row__track" aria-hidden="true">
            <span
              className="stat-row__fill"
              style={{ width: `${statBarPercent(entry.statTotal, 720)}%` }}
            />
          </span>
          <span className="stat-row__value">{entry.statTotal}</span>
        </div>
      </div>
    </div>
  );
}
