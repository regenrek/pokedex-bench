import { usePokedex } from '../state/pokedexContext';
import { Screw, SpeakerGrid } from './hardware/Chrome';
import { Keypad } from './hardware/Keypad';
import { RightScreen } from './screens/RightScreen';

/** Right casing: marquee, information LCD, keypad and the round confirm key. */
export function RightHalf() {
  const dex = usePokedex();

  return (
    <div className="pokedex__half pokedex__half--right">
      <div className="case case--right">
        <Screw position="case-tr" />
        <Screw position="case-br" />

        <div className="case-right">
          <div className="marquee">
            <span className="marquee__line">A wider world — a brighter tomorrow</span>
            <span className="marquee__line marquee__line--live" role="status">
              {dex.statusLine}
            </span>
          </div>

          <div className="right-panel">
            <div className="bezel bezel--sub">
              <RightScreen />
            </div>
            <div className="right-panel__side">
              <SpeakerGrid />
              <p className="right-panel__note">
                Small creatures
                <br />
                Big possibilities
              </p>
            </div>
          </div>

          <div className="right-controls">
            <Keypad
              onDigit={dex.pressDigit}
              onClear={dex.clearKeypad}
              onConfirm={dex.confirmKeypad}
              preview={dex.keypadPreview}
            />
            <div className="confirm">
              <button
                type="button"
                className="confirm__button"
                aria-label="Confirm — open the Kanto index"
                onClick={() => (dex.state.view === 'index' ? dex.submitSearch() : dex.setView('index'))}
              />
              <span className="confirm__label" aria-hidden="true">
                Confirm
              </span>
            </div>
          </div>

          <div className="cartridge">
            <span className="cartridge__slot" aria-hidden="true" />
            <span className="cartridge__screw cartridge__screw--l" aria-hidden="true" />
            <span className="cartridge__screw cartridge__screw--r" aria-hidden="true" />
            <span className="cartridge__label">Data cartridge ▲</span>
            <span className="cartridge__label">Push ▶</span>
          </div>
        </div>
      </div>
    </div>
  );
}
