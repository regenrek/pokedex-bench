import { useState } from 'react';
import type { PokemonDetail } from '../../domain/pokemon';
import { typeColor } from '../../domain/typeColors';
import {
  formatGenderRate,
  formatHatchCounter,
  formatKilograms,
  formatMetres,
  humanizeToken,
} from '../../utils/format';
import { usePokedex } from '../../state/pokedexContext';
import { rangeLevel, rarityLabel } from '../../domain/captureRate';
import { AreaMap } from './AreaMap';

export type AreaTabId = 'summary' | 'habitat' | 'behavior' | 'vitals' | 'notes';

const TABS: { id: AreaTabId; label: string; heading: string }[] = [
  { id: 'summary', label: 'SUMMARY', heading: 'SUMMARY' },
  { id: 'habitat', label: 'HABITAT', heading: 'AREA MAP' },
  { id: 'behavior', label: 'BEHAVIOR', heading: 'BEHAVIOR' },
  { id: 'vitals', label: 'VITALS', heading: 'VITALS' },
  { id: 'notes', label: 'NOTES', heading: 'NOTES' },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="area__row">
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function TabContent({ tab, detail }: { tab: AreaTabId; detail: PokemonDetail }) {
  switch (tab) {
    case 'summary':
      return (
        <>
          {detail.isLegendary || detail.isMythical ? (
            <span className="area__badge">{detail.isMythical ? 'MYTHICAL' : 'LEGENDARY'}</span>
          ) : null}
          <div className="area__rows">
            <Row label="SPECIES">{detail.genus.toUpperCase()}</Row>
            <Row label="TYPE">
              <span className="type-chips">
                {detail.types.map((type) => (
                  <span key={type} className="type-chip" style={{ ['--chip-color' as string]: typeColor(type) }}>
                    <span className="type-chip__swatch" aria-hidden="true" />
                    {type}
                  </span>
                ))}
              </span>
            </Row>
            {detail.abilities.map((ability) => (
              <Row key={ability.name} label={ability.hidden ? 'HIDDEN' : 'ABILITY'}>
                {ability.displayName.toUpperCase()}
              </Row>
            ))}
            <Row label="BASE TOTAL">{detail.statTotal}</Row>
          </div>
        </>
      );

    case 'habitat':
      return (
        <>
          <AreaMap seed={detail.id} label={detail.habitat ?? 'unknown'} />
          <div className="area__rows">
            <Row label="HABITAT">{detail.habitat ? humanizeToken(detail.habitat) : 'UNRECORDED'}</Row>
            <Row label="RARITY">{rarityLabel(detail.captureRate)}</Row>
            <Row label="CATCH RATE">{detail.captureRate} / 255</Row>
          </div>
        </>
      );

    case 'behavior':
      return (
        <div className="area__rows">
          <Row label="BASE HAPPY">{detail.baseHappiness ?? 'UNKNOWN'}</Row>
          <Row label="GROWTH">{detail.growthRate ? humanizeToken(detail.growthRate) : 'UNKNOWN'}</Row>
          <Row label="BASE EXP">{detail.baseExperience ?? 'UNKNOWN'}</Row>
          <Row label="CATCH RATE">{detail.captureRate} / 255</Row>
          <Row label="BODY">{detail.shape ? humanizeToken(detail.shape) : 'UNKNOWN'}</Row>
        </div>
      );

    case 'vitals':
      return (
        <div className="area__rows">
          <Row label="HEIGHT">{formatMetres(detail.heightM)}</Row>
          <Row label="WEIGHT">{formatKilograms(detail.weightKg)}</Row>
          <Row label="GENDER">{formatGenderRate(detail.genderRate)}</Row>
          <Row label="EGG GROUP">
            {detail.eggGroups.length > 0 ? detail.eggGroups.map(humanizeToken).join(', ') : 'NONE'}
          </Row>
          <Row label="HATCH">{formatHatchCounter(detail.hatchCounter)}</Row>
          <Row label="COLOUR">{detail.color ? humanizeToken(detail.color) : 'UNKNOWN'}</Row>
        </div>
      );

    case 'notes':
      return (
        <div className="area__rows">
          <p className="area__note">{detail.classicFlavorText || detail.flavorText || 'NO ENTRY ON FILE.'}</p>
          <Row label="LOGGED">
            {detail.flavorVersionCount} {detail.flavorVersionCount === 1 ? 'ENTRY' : 'ENTRIES'}
          </Row>
          <Row label="SOURCE">{detail.flavorVersion ? humanizeToken(detail.flavorVersion) : 'UNKNOWN'}</Row>
          <Row label="INDEX">No. {detail.dexNumber}</Row>
        </div>
      );

    default:
      return null;
  }
}

/** The right-hand information LCD: area map, tabbed reference data and range meter. */
export function RightScreen() {
  const dex = usePokedex();
  const detail = dex.state.detail;
  const [tab, setTab] = useState<AreaTabId>('habitat');
  const activeTab = TABS.find((entry) => entry.id === tab) ?? TABS[1];
  const level = detail ? rangeLevel(detail.captureRate) : 0;

  return (
    <div className="lcd">
      <div className="area">
        <div className="area__head">
          <span>{activeTab.heading}</span>
          <span className="range-meter" role="img" aria-label={`Encounter range ${level} of 5`}>
            {[1, 2, 3, 4, 5].map((step) => (
              <span
                key={step}
                className={`range-meter__bar${step <= level ? ' range-meter__bar--on' : ''}`}
                style={{ height: `${20 + step * 16}%` }}
              />
            ))}
          </span>
        </div>

        <div className="area__body">
          <div
            className="area__content"
            role="tabpanel"
            id={`area-panel-${tab}`}
            aria-labelledby={`area-tab-${tab}`}
          >
            {detail ? (
              <TabContent tab={tab} detail={detail} />
            ) : (
              <p className="area__note">
                {dex.state.detailStatus === 'error'
                  ? 'NO DATA — RELAY FAULT.'
                  : 'STANDBY. NO ENTRY LOADED.'}
              </p>
            )}
            {tab === 'habitat' ? (
              <div className="area__dots" aria-hidden="true">
                {TABS.map((entry) => (
                  <span
                    key={entry.id}
                    className={`area__dot${entry.id === tab ? ' area__dot--on' : ''}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="area__tabs" role="tablist" aria-label="Reference data">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`area-tab-${entry.id}`}
                aria-controls={`area-panel-${entry.id}`}
                aria-selected={entry.id === tab}
                className={`tab${entry.id === tab ? ' tab--active' : ''}`}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
