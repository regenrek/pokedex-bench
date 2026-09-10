/** Right half: information display, keypad, confirm button and cartridge bay. */
import type { JSX } from 'react';
import type { DeviceController } from '../hooks/useDeviceController';
import { CartridgeBay, MarqueeDisplay, Screw, Speaker } from './Hardware';
import { InfoScreen } from './InfoScreen';
import { Keypad } from './Keypad';

export function RightPanel({ device }: { device: DeviceController }): JSX.Element {
  return (
    <section className="half half--right" aria-label="Pokédex control half">
      <div className="half__face">
        <Screw className="screw--tr" />
        <Screw className="screw--br" />

        <MarqueeDisplay lines={['A WIDER WORLD', 'A BRIGHTER TOMORROW']} />

        <Speaker />

        <InfoScreen
          entry={device.entry}
          section={device.infoSection}
          onSectionChange={device.setInfoSection}
          isNavigating={device.isNavigating}
          selectedId={device.selectedId}
        />

        <Keypad
          buffer={device.numberBuffer}
          onDigit={device.pressDigit}
          onClear={device.clearEntry}
          onEnter={device.commitEntry}
          disabled={device.status === 'error' && !device.entry}
        />

        <div className="confirm" data-active={device.indexOpen}>
          <button
            type="button"
            className="confirm__button"
            aria-label="Confirm — load entered number or open the Pokémon index"
            onClick={device.confirm}
          >
            <span className="confirm__ring" aria-hidden="true" />
          </button>
          <span className="btn__caption" aria-hidden="true">
            CONFIRM
          </span>
        </div>

        <p className="side-note">
          SMALL
          <br />
          CREATURES
          <br />
          BIG
          <br />
          POSSIBILITIES
        </p>

        <CartridgeBay />
      </div>
    </section>
  );
}
