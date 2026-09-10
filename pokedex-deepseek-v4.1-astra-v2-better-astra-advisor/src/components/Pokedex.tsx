/** Root device component: two red halves joined by the central hinge. */
import type { JSX } from 'react';
import type { DeviceController } from '../hooks/useDeviceController';
import { Hinge } from './Hardware';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';

export function Pokedex({ device }: { device: DeviceController }): JSX.Element {
  const spoken = device.entry
    ? `Now showing number ${device.entry.dexNumber}, ${device.entry.displayName}.`
    : 'Loading Pokédex record.';

  return (
    <div className="device" data-testid="pokedex-device">
      <div className="device__body">
        <LeftPanel device={device} />
        <Hinge />
        <RightPanel device={device} />
      </div>
      <p className="sr-only" aria-live="polite" data-testid="a11y-announcer">
        {spoken}
      </p>
    </div>
  );
}
