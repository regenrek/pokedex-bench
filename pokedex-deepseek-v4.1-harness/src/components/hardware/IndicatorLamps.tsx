export type LampId = 'power' | 'scan' | 'link';

export interface LampState {
  id: LampId;
  label: string;
  on: boolean;
}

/**
 * The three status lamps. `POWER` is always lit, `SCAN` blinks while the
 * device is reading an entry, `LINK` lights while a request is in flight.
 */
export function IndicatorLamps({ lamps }: { lamps: LampState[] }) {
  return (
    <div className="lamps">
      {lamps.map((lamp) => (
        <div key={lamp.id} className={`lamp lamp--${lamp.id}${lamp.on ? ' lamp--on' : ''}`}>
          <span className="lamp__dome" />
          <span className="lamp__label" aria-hidden="true">
            {lamp.label}
          </span>
          <span className="visually-hidden">
            {lamp.label} lamp {lamp.on ? 'on' : 'off'}
          </span>
        </div>
      ))}
    </div>
  );
}
