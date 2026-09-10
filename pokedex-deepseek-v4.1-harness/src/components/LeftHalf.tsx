import type { RefObject } from 'react';
import { DEX_FIRST_ID, DEX_LAST_ID } from '../domain/pokemon';
import { usePokedex } from '../state/pokedexContext';
import { HardwareButton } from './hardware/HardwareButton';
import { Screw, SpeakerSlots } from './hardware/Chrome';
import { DPad } from './hardware/DPad';
import { IndicatorLamps, type LampState } from './hardware/IndicatorLamps';
import { Lens } from './hardware/Lens';
import { MainScreen } from './screens/MainScreen';

export interface LeftHalfProps {
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Left casing: lens, lamps, main display, D-pad and the amber control pills. */
export function LeftHalf({ inputRef }: LeftHalfProps) {
  const dex = usePokedex();
  const { state } = dex;

  const scanning = dex.isBooting || dex.isRefreshing || state.detailStatus === 'loading';
  const lamps: LampState[] = [
    { id: 'power', label: 'POWER', on: true },
    { id: 'scan', label: 'SCAN', on: scanning },
    { id: 'link', label: 'LINK', on: dex.linkActive },
  ];

  return (
    <div className="pokedex__half pokedex__half--left">
      <div className="case case--left">
        <Screw position="case-bl" />

        <div className="case-left">
          <div className="case-left__top">
            <Lens />
            <IndicatorLamps lamps={lamps} />
            <div className="brand">
              MONSTER INDEX
              <br />
              MODEL MA-01
            </div>
          </div>

          <div className="bezel bezel--main">
            <Screw position="tl" />
            <Screw position="tr" />
            <Screw position="bl" />
            <Screw position="br" />
            <MainScreen inputRef={inputRef} />
          </div>

          <div className="case-left__controls">
            <DPad
              onLeft={dex.previous}
              onRight={dex.next}
              onUp={() => dex.cycleView(-1)}
              onDown={() => dex.cycleView(1)}
              leftDisabled={state.selectedId <= DEX_FIRST_ID}
              rightDisabled={state.selectedId >= DEX_LAST_ID}
              leftLabel="Previous entry"
              rightLabel="Next entry"
              upLabel="Previous screen"
              downLabel="Next screen"
            />

            <div className="ab-cluster">
              <div className="ab-key">
                <span className="ab-key__label" aria-hidden="true">
                  A
                </span>
                <HardwareButton
                  variant="dark"
                  className="ab-key__button"
                  label="A button — next screen"
                  onClick={() => dex.cycleView(1)}
                >
                  A
                </HardwareButton>
              </div>
              <div className="ab-key">
                <span className="ab-key__label" aria-hidden="true">
                  B
                </span>
                <HardwareButton
                  variant="dark"
                  className="ab-key__button"
                  label="B button — previous screen"
                  onClick={() => dex.cycleView(-1)}
                >
                  B
                </HardwareButton>
              </div>
            </div>
          </div>

          <div className="case-left__foot">
            <SpeakerSlots />
            <div className="pill-row">
              <div className="pill-stack">
                <HardwareButton
                  label="DATA — open the species data screen"
                  onClick={() => dex.setView('species')}
                >
                  DATA
                </HardwareButton>
                <span className="pill-label" aria-hidden="true">
                  DATA
                </span>
              </div>
              <div className="pill-stack">
                <HardwareButton
                  label="CANCEL — clear the search and return to species data"
                  onClick={() => {
                    dex.setQuery('');
                    dex.clearKeypad();
                    dex.setView('species');
                  }}
                >
                  CANCEL
                </HardwareButton>
                <span className="pill-label" aria-hidden="true">
                  CANCEL
                </span>
              </div>
            </div>
          </div>

          <p className="case-left__tagline">Explore · Record · Discover</p>
        </div>
      </div>
    </div>
  );
}
