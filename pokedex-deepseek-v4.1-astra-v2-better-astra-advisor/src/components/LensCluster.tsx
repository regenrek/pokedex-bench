/** The blue lens and the three indicator lamps in the upper-left corner. */
import type { JSX } from 'react';

export type LampState = 'on' | 'off' | 'blink';
export type LampTone = 'red' | 'amber' | 'green';

export interface LampDescriptor {
  tone: LampTone;
  label: string;
  state: LampState;
}

export function StatusLamp({ tone, label, state }: LampDescriptor): JSX.Element {
  return (
    <span className="lamp">
      <span
        className="lamp__bulb"
        data-tone={tone}
        data-state={state}
        role="img"
        aria-label={`${label} lamp ${state === 'off' ? 'off' : state === 'blink' ? 'blinking' : 'on'}`}
      />
      <span className="lamp__label" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

export function LensCluster({ lamps }: { lamps: LampDescriptor[] }): JSX.Element {
  return (
    <div className="lens-cluster">
      <div className="lens">
        <span className="lens__glass">
          <span className="lens__gloss" />
          <span className="lens__spark" />
        </span>
      </div>
      <div className="lamps">
        {lamps.map((lamp) => (
          <StatusLamp key={lamp.label} {...lamp} />
        ))}
      </div>
      <div className="brand">
        <span className="brand__title">MONSTER INDEX</span>
        <span className="brand__model">MODEL MA-01</span>
      </div>
    </div>
  );
}
